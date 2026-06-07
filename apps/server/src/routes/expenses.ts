import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requireClubRole, requireClubMember } from '../middleware/roles';
import { requireExpenseInClub } from '../middleware/scope';
import { validate } from '../middleware/validate';
import {
  createExpenseSchema,
  updateExpenseSchema,
  updateExpenseSplitSchema,
  updateAssignmentSchema,
} from '@cricket/shared';
import { supabase } from '../supabase';

export const expenseRoutes = Router();

// Two FKs run expenses -> profiles (created_by and paid_by_user_id), so the
// paid_by embed must name its constraint to disambiguate.
const EXPENSE_SELECT =
  'id, club_id, year_id, team_id, game_id, description, amount_cents, category, expense_date, created_by, paid_by_user_id, created_at, ' +
  'team:teams(id, name), game:games(id, opponent, game_date), year:years(id, year, label), ' +
  'paid_by:profiles!expenses_paid_by_user_id_fkey(id, first_name, last_name, email, avatar_url), ' +
  'assignments:expense_assignments(id, user_id, status, paid_at, share_cents)';

// Collapse an expense row's embedded assignments into a split summary. Unlike
// payments (flat amount per assignee), shares vary per member, so collected /
// outstanding are sums of share_cents — never count * amount.
function shapeExpense(row: any) {
  const assignments = row.assignments || [];
  const paid = assignments.filter((a: any) => a.status === 'paid');
  const pending = assignments.filter((a: any) => a.status === 'pending');
  return {
    ...row,
    assignments: undefined,
    assigned_count: assignments.length,
    paid_count: paid.length,
    collected_cents: paid.reduce((s: number, a: any) => s + (a.share_cents || 0), 0),
    outstanding_cents: pending.reduce((s: number, a: any) => s + (a.share_cents || 0), 0),
  };
}

// Split a total into n equal integer shares, distributing the cent remainder
// (+1) to the first `rem` members. Caller sorts member ids for determinism.
function splitShares(totalCents: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(totalCents / n);
  const rem = totalCents - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0));
}

// Resolve which members a split applies to. With `assignAll`, the pool follows
// the expense's scope: the game's selection (falling back to the team roster),
// then the team roster, then active club members. Otherwise it's the explicit
// `userIds` set.
async function resolveTargetUserIds(opts: {
  clubId: string;
  teamId?: string | null;
  gameId?: string | null;
  assignAll?: boolean;
  userIds?: string[];
}): Promise<string[]> {
  const { clubId, teamId, gameId, assignAll, userIds } = opts;

  if (!assignAll) return Array.from(new Set(userIds || []));

  if (gameId) {
    const { data: sel, error } = await supabase
      .from('game_selections')
      .select('user_id')
      .eq('game_id', gameId);
    if (error) throw error;
    const ids = (sel || []).map((s: any) => s.user_id);
    if (ids.length > 0) return ids;
  }

  if (teamId) {
    const { data: roster, error } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', teamId);
    if (error) throw error;
    return (roster || []).map((r: any) => r.user_id);
  }

  const { data: members, error } = await supabase
    .from('club_members')
    .select('user_id')
    .eq('club_id', clubId)
    .eq('status', 'active');
  if (error) throw error;
  return (members || []).map((m: any) => m.user_id);
}

// Reconcile an expense's shares to exactly `targetUserIds`, recomputing the
// equal split over the (sorted) target set. Members who remain keep their
// status/paid_at; dropped members are removed; new members start pending unless
// they are the payer (whose own share is auto-settled). An empty target set
// clears the split entirely.
async function reconcileSplit(
  expenseId: string,
  amountCents: number,
  targetUserIds: string[],
  payer: string | null,
): Promise<void> {
  const targets = Array.from(new Set(targetUserIds)).sort();

  const { data: existing, error: exErr } = await supabase
    .from('expense_assignments')
    .select('user_id')
    .eq('expense_id', expenseId);
  if (exErr) throw exErr;

  const existingIds = new Set((existing || []).map((a: any) => a.user_id));
  const targetSet = new Set(targets);

  const toRemove = (existing || [])
    .map((a: any) => a.user_id)
    .filter((uid: string) => !targetSet.has(uid));
  if (toRemove.length > 0) {
    const { error } = await supabase
      .from('expense_assignments')
      .delete()
      .eq('expense_id', expenseId)
      .in('user_id', toRemove);
    if (error) throw error;
  }

  if (targets.length === 0) return;

  const shares = splitShares(amountCents, targets.length);
  const now = new Date().toISOString();
  const toUpdate: any[] = [];
  const toInsert: any[] = [];

  for (let i = 0; i < targets.length; i++) {
    const uid = targets[i];
    const isPayer = uid === payer;
    if (existingIds.has(uid)) {
      // Re-divide the member's share. Keep their settlement status — except the
      // payer, who fronted the money, so their own share is always settled.
      const row: any = { expense_id: expenseId, user_id: uid, share_cents: shares[i] };
      if (isPayer) {
        row.status = 'paid';
        row.paid_at = now;
      }
      toUpdate.push(row);
    } else {
      toInsert.push({
        expense_id: expenseId,
        user_id: uid,
        share_cents: shares[i],
        status: isPayer ? 'paid' : 'pending',
        paid_at: isPayer ? now : null,
      });
    }
  }

  // Batch the writes (one upsert + one insert) instead of a query per member —
  // the unique (expense_id, user_id) constraint backs the upsert. For existing
  // rows the upsert only touches the columns we supply, preserving status/paid_at
  // for everyone except the payer.
  if (toUpdate.length > 0) {
    const { error } = await supabase
      .from('expense_assignments')
      .upsert(toUpdate, { onConflict: 'expense_id,user_id' });
    if (error) throw error;
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from('expense_assignments').insert(toInsert);
    if (error) throw error;
  }
}

// List expenses for a club with optional ?year_id= / ?team_id= / ?game_id= filters
// and a `scope=club` filter (club-level only: no team and no game). Admin only.
expenseRoutes.get(
  '/clubs/:clubId/expenses',
  requireAuth,
  requireClubRole('admin'),
  async (req, res, next) => {
    try {
      let query = supabase
        .from('expenses')
        .select(EXPENSE_SELECT)
        .eq('club_id', req.params.clubId)
        .order('expense_date', { ascending: false });

      const { year_id, team_id, game_id, scope, no_year } = req.query as Record<string, string>;
      if (year_id) query = query.eq('year_id', year_id);
      if (team_id) query = query.eq('team_id', team_id);
      if (game_id) query = query.eq('game_id', game_id);
      if (scope === 'club') query = query.is('team_id', null).is('game_id', null);
      // General (no season) expenses: year_id is null.
      if (no_year === 'true') query = query.is('year_id', null);

      const { data, error } = await query;
      if (error) throw error;

      const expenses = (data || []).map(shapeExpense);
      const total = expenses.reduce((sum: number, e: any) => sum + (e.amount_cents || 0), 0);
      res.json({ expenses, total_cents: total });
    } catch (err) {
      next(err);
    }
  },
);

// (Game- and team-scoped expense lists are served by the general list endpoint
// above via `?game_id=` / `?team_id=` — no separate nested routes needed.)

// Current user's expense shares at a club (any member). Read-only — members
// reimburse the payer offline and an admin marks shares paid.
expenseRoutes.get(
  '/clubs/:clubId/my-expenses',
  requireAuth,
  requireClubMember(),
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const { data, error } = await supabase
        .from('expense_assignments')
        .select(
          'id, status, paid_at, share_cents, ' +
            'expense:expenses!inner(id, club_id, description, amount_cents, category, expense_date, ' +
            'paid_by:profiles!expenses_paid_by_user_id_fkey(id, first_name, last_name, email))',
        )
        .eq('user_id', user.id)
        .eq('expense.club_id', req.params.clubId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      res.json(data || []);
    } catch (err) {
      next(err);
    }
  },
);

// Get a single expense with full assignment detail (admin only).
expenseRoutes.get(
  '/clubs/:clubId/expenses/:expenseId',
  requireAuth,
  requireClubRole('admin'),
  async (req, res, next) => {
    try {
      const { data: expense, error: expErr } = await supabase
        .from('expenses')
        .select(EXPENSE_SELECT)
        .eq('id', req.params.expenseId)
        .eq('club_id', req.params.clubId)
        .single();
      if (expErr) throw expErr;

      const { data: assignments, error: aErr } = await supabase
        .from('expense_assignments')
        .select('id, user_id, status, paid_at, share_cents, profile:profiles(*)')
        .eq('expense_id', req.params.expenseId);
      if (aErr) throw aErr;

      res.json({ ...shapeExpense(expense), assignments: assignments || [] });
    } catch (err) {
      next(err);
    }
  },
);

// Create an expense (admin only). Scope is implied by which of
// year_id / team_id / game_id are set. Optionally splits the amount into
// per-member shares (assign_all over the scope, or an explicit user_ids set).
expenseRoutes.post(
  '/clubs/:clubId/expenses',
  requireAuth,
  requireClubRole('admin'),
  validate(createExpenseSchema),
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const clubId = req.params.clubId as string;
      const {
        description,
        amount_cents,
        category,
        expense_date,
        year_id,
        team_id,
        game_id,
        paid_by_user_id,
        assign_all,
        user_ids,
      } = req.body as {
        description: string;
        amount_cents: number;
        category?: string;
        expense_date?: string;
        year_id?: string | null;
        team_id?: string | null;
        game_id?: string | null;
        paid_by_user_id?: string | null;
        assign_all?: boolean;
        user_ids?: string[];
      };

      // A team belongs to a year — derive the year from the team when not given.
      let resolvedYearId = year_id ?? null;
      if (team_id) {
        const { data: team, error: teamErr } = await supabase
          .from('teams')
          .select('id, year_id, club_id')
          .eq('id', team_id)
          .eq('club_id', clubId)
          .maybeSingle();
        if (teamErr) throw teamErr;
        if (!team) {
          res.status(400).json({ error: 'Team not found in this club' });
          return;
        }
        if (!resolvedYearId) resolvedYearId = team.year_id;
      }

      // A game is owned by the club through its team — reject one from elsewhere.
      if (game_id) {
        const { data: game, error: gameErr } = await supabase
          .from('games')
          .select('id, team:teams!inner(club_id)')
          .eq('id', game_id)
          .eq('team.club_id', clubId)
          .maybeSingle();
        if (gameErr) throw gameErr;
        if (!game) {
          res.status(400).json({ error: 'Game not found in this club' });
          return;
        }
      }

      const payer = paid_by_user_id ?? user.id;

      const { data: expense, error } = await supabase
        .from('expenses')
        .insert({
          club_id: clubId,
          description,
          amount_cents,
          category: category ?? undefined,
          expense_date: expense_date ?? undefined,
          year_id: resolvedYearId,
          team_id: team_id ?? null,
          game_id: game_id ?? null,
          created_by: user.id,
          paid_by_user_id: payer,
        })
        .select('id')
        .single();
      if (error) throw error;

      // The expense and its split span multiple writes. If the split fails,
      // compensate by deleting the just-created expense (assignments cascade) so
      // we never persist an expense with a half-written split.
      try {
        // Resolve who the cost splits across, then write the per-member shares.
        const targetUserIds = await resolveTargetUserIds({
          clubId,
          teamId: team_id,
          gameId: game_id,
          assignAll: assign_all,
          userIds: user_ids,
        });
        await reconcileSplit(expense.id, amount_cents, targetUserIds, payer);

        // Re-read so the response carries the freshly inserted assignment summary.
        const { data: full, error: fullErr } = await supabase
          .from('expenses')
          .select(EXPENSE_SELECT)
          .eq('id', expense.id)
          .single();
        if (fullErr) throw fullErr;

        res.status(201).json(shapeExpense(full));
      } catch (splitErr) {
        await supabase.from('expenses').delete().eq('id', expense.id);
        throw splitErr;
      }
    } catch (err) {
      next(err);
    }
  },
);

// Update an expense (admin only). When the amount changes, the existing split is
// re-divided across the same members (their paid/pending statuses are kept). To
// change *who* the split covers, use the /split endpoint below.
expenseRoutes.put(
  '/clubs/:clubId/expenses/:expenseId',
  requireAuth,
  requireClubRole('admin'),
  validate(updateExpenseSchema),
  async (req, res, next) => {
    try {
      const { clubId, expenseId } = req.params as { clubId: string; expenseId: string };

      // Guard against repointing the expense at another club's team/game.
      if (req.body.team_id) {
        const { data: team, error: teamErr } = await supabase
          .from('teams')
          .select('id')
          .eq('id', req.body.team_id)
          .eq('club_id', clubId)
          .maybeSingle();
        if (teamErr) throw teamErr;
        if (!team) {
          res.status(400).json({ error: 'Team not found in this club' });
          return;
        }
      }
      if (req.body.game_id) {
        const { data: game, error: gameErr } = await supabase
          .from('games')
          .select('id, team:teams!inner(club_id)')
          .eq('id', req.body.game_id)
          .eq('team.club_id', clubId)
          .maybeSingle();
        if (gameErr) throw gameErr;
        if (!game) {
          res.status(400).json({ error: 'Game not found in this club' });
          return;
        }
      }

      const { data: updated, error } = await supabase
        .from('expenses')
        .update({ ...req.body, updated_at: new Date().toISOString() })
        .eq('id', expenseId)
        .eq('club_id', clubId)
        .select(EXPENSE_SELECT)
        .single();
      if (error) throw error;

      // A new amount changes everyone's share — re-divide across the current set.
      if ('amount_cents' in req.body) {
        const { data: meta, error: metaErr } = await supabase
          .from('expenses')
          .select('amount_cents, paid_by_user_id')
          .eq('id', expenseId)
          .single();
        if (metaErr) throw metaErr;
        const { data: existing, error: exErr } = await supabase
          .from('expense_assignments')
          .select('user_id')
          .eq('expense_id', expenseId);
        if (exErr) throw exErr;

        if (existing && existing.length > 0) {
          await reconcileSplit(
            expenseId,
            meta.amount_cents,
            existing.map((a: any) => a.user_id),
            meta.paid_by_user_id,
          );
          const { data: full, error: fullErr } = await supabase
            .from('expenses')
            .select(EXPENSE_SELECT)
            .eq('id', expenseId)
            .single();
          if (fullErr) throw fullErr;
          res.json(shapeExpense(full));
          return;
        }
      }

      res.json(shapeExpense(updated));
    } catch (err) {
      next(err);
    }
  },
);

// Edit an existing expense's split (admin only) — change who it's divided across
// and/or who paid, recomputing shares. Members who remain keep their status.
expenseRoutes.put(
  '/clubs/:clubId/expenses/:expenseId/split',
  requireAuth,
  requireClubRole('admin'),
  validate(updateExpenseSplitSchema),
  async (req, res, next) => {
    try {
      const { clubId, expenseId } = req.params as { clubId: string; expenseId: string };
      const { assign_all, user_ids, paid_by_user_id } = req.body as {
        assign_all?: boolean;
        user_ids?: string[];
        paid_by_user_id?: string | null;
      };

      const { data: expense, error: exErr } = await supabase
        .from('expenses')
        .select('id, club_id, amount_cents, team_id, game_id, paid_by_user_id')
        .eq('id', expenseId)
        .eq('club_id', clubId)
        .maybeSingle();
      if (exErr) throw exErr;
      if (!expense) {
        res.status(404).json({ error: 'Expense not found in this club' });
        return;
      }

      // Reassign the payer when provided (null clears it).
      let payer: string | null = expense.paid_by_user_id;
      if ('paid_by_user_id' in req.body) {
        payer = paid_by_user_id ?? null;
        const { error: payErr } = await supabase
          .from('expenses')
          .update({ paid_by_user_id: payer, updated_at: new Date().toISOString() })
          .eq('id', expenseId);
        if (payErr) throw payErr;
      }

      const targetUserIds = await resolveTargetUserIds({
        clubId,
        teamId: expense.team_id,
        gameId: expense.game_id,
        assignAll: assign_all,
        userIds: user_ids,
      });
      await reconcileSplit(expenseId, expense.amount_cents, targetUserIds, payer);

      const { data: full, error: fullErr } = await supabase
        .from('expenses')
        .select(EXPENSE_SELECT)
        .eq('id', expenseId)
        .single();
      if (fullErr) throw fullErr;
      const { data: assignments, error: aErr } = await supabase
        .from('expense_assignments')
        .select('id, user_id, status, paid_at, share_cents, profile:profiles(*)')
        .eq('expense_id', expenseId);
      if (aErr) throw aErr;

      res.json({ ...shapeExpense(full), assignments: assignments || [] });
    } catch (err) {
      next(err);
    }
  },
);

// Update one share's status (admin only) — e.g. mark a member's share paid.
expenseRoutes.put(
  '/clubs/:clubId/expenses/:expenseId/assignments/:userId',
  requireAuth,
  requireClubRole('admin'),
  requireExpenseInClub(),
  validate(updateAssignmentSchema),
  async (req, res, next) => {
    try {
      const { status } = req.body as { status: string };
      const patch: Record<string, any> = { status };
      patch.paid_at = status === 'paid' ? new Date().toISOString() : null;

      const { data, error } = await supabase
        .from('expense_assignments')
        .update(patch)
        .eq('expense_id', req.params.expenseId)
        .eq('user_id', req.params.userId)
        .select('id, user_id, status, paid_at, share_cents, profile:profiles(*)')
        .single();
      if (error) throw error;
      res.json(data);
    } catch (err) {
      next(err);
    }
  },
);

// Delete an expense (admin only) — assignments cascade via FK.
expenseRoutes.delete(
  '/clubs/:clubId/expenses/:expenseId',
  requireAuth,
  requireClubRole('admin'),
  async (req, res, next) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', req.params.expenseId)
        .eq('club_id', req.params.clubId);
      if (error) throw error;
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
);
