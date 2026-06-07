import { Router } from 'express';
import multer from 'multer';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requireClubRole } from '../middleware/roles';
import { requireMemberInClub } from '../middleware/scope';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errors';
import {
  createClubSchema,
  updateClubSchema,
  addMemberRoleSchema,
  updateMemberSchema,
  addMemberSchema,
  adminUpdateMemberProfileSchema,
  joinClubSchema,
} from '@cricket/shared';
import { supabase } from '../supabase';
import { IMAGE_MIME_EXT } from '../uploads';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

export const clubRoutes = Router();

// Helper: ensure an ACTIVE membership exists for (club, user), returning the id.
// Reactivates a previously-deactivated row so re-joins and admin re-adds work.
async function ensureMembership(
  clubId: string,
  userId: string,
  extra?: Record<string, any>,
): Promise<string> {
  const { data: existing, error: selErr } = await supabase
    .from('club_members')
    .select('id, status')
    .eq('club_id', clubId)
    .eq('user_id', userId)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) {
    const patch: Record<string, any> = { ...extra };
    if (existing.status !== 'active') patch.status = 'active';
    if (Object.keys(patch).length > 0) {
      const { error: updErr } = await supabase
        .from('club_members')
        .update(patch)
        .eq('id', existing.id);
      if (updErr) throw updErr;
    }
    return existing.id;
  }

  const { data: created, error: insErr } = await supabase
    .from('club_members')
    .insert({ club_id: clubId, user_id: userId, status: 'active', ...extra })
    .select('id')
    .single();
  if (insErr) throw insErr;
  return created.id;
}

const MEMBER_SELECT =
  'id, user_id, status, join_date, player_type, batting_hand, bowling_type, notes, created_at, profile:profiles(*), roles:club_member_roles(role)';
// Same columns but with an inner profile join, so a search filter on the
// referenced profiles table also restricts which member rows come back.
const MEMBER_SELECT_INNER = MEMBER_SELECT.replace('profile:profiles(*)', 'profile:profiles!inner(*)');

// Attach each member's running balance within this club:
//   balance = (payments they've made) − (expense shares assigned to them)
// A negative balance means the member owes the club; positive means credit.
// Derived live from current assignments, so editing an expense or payment is
// reflected on the next read. Returns a shallow-copied list.
async function attachBalance(clubId: string, members: any[]): Promise<any[]> {
  if (members.length === 0) return members;
  const userIds = Array.from(new Set(members.map((m) => m.user_id)));

  // Credits: payments the member has actually made (paid assignments).
  const { data: pays, error: payErr } = await supabase
    .from('payment_assignments')
    .select('user_id, payment:payments!inner(club_id, amount_cents)')
    .in('user_id', userIds)
    .eq('status', 'paid')
    .eq('payment.club_id', clubId);
  if (payErr) throw payErr;

  // Debits: every expense share assigned to the member.
  const { data: exps, error: expErr } = await supabase
    .from('expense_assignments')
    .select('user_id, share_cents, expense:expenses!inner(club_id)')
    .in('user_id', userIds)
    .eq('expense.club_id', clubId);
  if (expErr) throw expErr;

  const paid: Record<string, number> = {};
  const charged: Record<string, number> = {};
  for (const a of pays || []) {
    paid[(a as any).user_id] = (paid[(a as any).user_id] || 0) + ((a as any).payment?.amount_cents || 0);
  }
  for (const a of exps || []) {
    charged[(a as any).user_id] = (charged[(a as any).user_id] || 0) + ((a as any).share_cents || 0);
  }

  return members.map((m) => {
    const made = paid[m.user_id] || 0;
    const owed = charged[m.user_id] || 0;
    return {
      ...m,
      payments_made_cents: made,
      expenses_charged_cents: owed,
      balance_cents: made - owed,
    };
  });
}

function shapeMember(row: any) {
  return {
    id: row.id,
    user_id: row.user_id,
    status: row.status,
    join_date: row.join_date,
    player_type: row.player_type ?? null,
    batting_hand: row.batting_hand ?? null,
    bowling_type: row.bowling_type ?? null,
    notes: row.notes ?? null,
    created_at: row.created_at,
    profile: row.profile,
    roles: (row.roles || []).map((r: any) => r.role),
  };
}

// Create a club (creator becomes admin)
clubRoutes.post('/clubs', requireAuth, validate(createClubSchema), async (req, res, next) => {
  try {
    const { user } = req as AuthenticatedRequest;

    const { data: club, error: clubError } = await supabase
      .from('clubs')
      .insert(req.body)
      .select()
      .single();
    if (clubError) throw clubError;

    // Creating the club, the creator's membership, and their admin role are
    // separate writes. If granting the admin role fails we'd be left with a club
    // that has no admin (unrecoverable through the API), so compensate by
    // deleting the club (membership cascades) on any failure here.
    try {
      const memberId = await ensureMembership(club.id, user.id);

      const { error: roleError } = await supabase
        .from('club_member_roles')
        .insert({ member_id: memberId, role: 'admin' });
      if (roleError) throw roleError;
    } catch (setupErr) {
      await supabase.from('clubs').delete().eq('id', club.id);
      throw setupErr;
    }

    res.status(201).json(club);
  } catch (err) {
    next(err);
  }
});

// List user's clubs (one row per club, with an array of roles)
clubRoutes.get('/clubs', requireAuth, async (req, res, next) => {
  try {
    const { user } = req as AuthenticatedRequest;

    const { data, error } = await supabase
      .from('club_members')
      .select('id, club_id, status, club:clubs(*), roles:club_member_roles(role)')
      .eq('user_id', user.id);
    if (error) throw error;

    const rolePriority: Record<string, number> = { admin: 3, captain: 2, player: 1 };
    const out = (data || []).map((row: any) => {
      const roles: string[] = (row.roles || []).map((r: any) => r.role);
      const primary =
        roles.sort((a, b) => (rolePriority[b] ?? 0) - (rolePriority[a] ?? 0))[0] ?? null;
      return {
        id: row.id,
        club_id: row.club_id,
        role: primary,
        roles,
        status: row.status,
        club: row.club,
      };
    });
    res.json(out);
  } catch (err) {
    next(err);
  }
});

// Search clubs by name (case-insensitive substring match). Used by join flow.
clubRoutes.get('/clubs/search', requireAuth, async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json([]);
    const { data, error } = await supabase
      .from('clubs')
      .select('*')
      .ilike('name', `%${q}%`)
      .limit(20);
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    next(err);
  }
});

// Get club details
clubRoutes.get('/clubs/:clubId', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('clubs')
      .select('*')
      .eq('id', req.params.clubId)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Update club (admin only)
clubRoutes.put(
  '/clubs/:clubId',
  requireAuth,
  requireClubRole('admin'),
  validate(updateClubSchema),
  async (req, res, next) => {
    try {
      const { data, error } = await supabase
        .from('clubs')
        .update({ ...req.body, updated_at: new Date().toISOString() })
        .eq('id', req.params.clubId)
        .select()
        .single();
      if (error) throw error;
      res.json(data);
    } catch (err) {
      next(err);
    }
  },
);

// Upload club logo (admin only)
clubRoutes.post(
  '/clubs/:clubId/logo',
  requireAuth,
  requireClubRole('admin'),
  upload.single('logo'),
  async (req, res, next) => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: 'No file provided' });
        return;
      }
      // Only accept real image types, and derive the extension from the verified
      // MIME rather than the client-supplied filename — uploading e.g. an SVG or
      // HTML file to a public bucket would otherwise be a stored-XSS vector.
      const ext = IMAGE_MIME_EXT[file.mimetype];
      if (!ext) {
        res.status(400).json({ error: 'Unsupported image type' });
        return;
      }
      const filePath = `${req.params.clubId}/logo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('club-logos')
        .upload(filePath, file.buffer, { contentType: file.mimetype, upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('club-logos').getPublicUrl(filePath);

      const { data, error } = await supabase
        .from('clubs')
        .update({ logo_url: urlData.publicUrl, updated_at: new Date().toISOString() })
        .eq('id', req.params.clubId)
        .select()
        .single();
      if (error) throw error;
      res.json(data);
    } catch (err) {
      next(err);
    }
  },
);

// List club members (admin or captain) — one row per user, roles flattened.
// Always returns the envelope `{ members, total, page, limit }`. With no `page`
// param the whole roster is returned in one page (limit == total) so dashboards
// and pickers get everyone; pass `page`/`limit`/`search` to page the table view.
clubRoutes.get(
  '/clubs/:clubId/members',
  requireAuth,
  requireClubRole('admin', 'captain'),
  async (req, res, next) => {
    try {
      const clubId = req.params.clubId as string;
      const search = String(req.query.search || '').trim();
      const paginate = req.query.page !== undefined || req.query.limit !== undefined;

      const select = search ? MEMBER_SELECT_INNER : MEMBER_SELECT;
      let query = supabase
        .from('club_members')
        .select(select, { count: 'exact' })
        .eq('club_id', clubId)
        .order('created_at', { ascending: true });

      // Page only when asked; otherwise return the full roster in a single page.
      let page = 1;
      let limit = 0;
      if (paginate) {
        page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
        limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '10'), 10) || 10));
        const from = (page - 1) * limit;
        query = query.range(from, from + limit - 1);
      }

      if (search) {
        // Neutralize characters with meaning in PostgREST's filter grammar
        // (`,` separates conditions, `()` group, `*`/`%` are wildcards, `:`/`\`
        // are operators/escapes) before interpolating into the `.or()` string.
        const safe = search.replace(/[%,()*:\\]/g, ' ');
        query = query.or(
          `first_name.ilike.%${safe}%,last_name.ilike.%${safe}%,email.ilike.%${safe}%`,
          { referencedTable: 'profiles' },
        );
      }

      const { data, error, count } = await query;
      if (error) throw error;
      const members = await attachBalance(clubId, (data || []).map(shapeMember));
      res.json({
        members,
        total: count ?? members.length,
        page,
        limit: paginate ? limit : members.length,
      });
    } catch (err) {
      next(err);
    }
  },
);

// Member detail bundle (admin or captain): the member plus what they owe,
// their payment history, expenses they logged, and their teams/selections.
clubRoutes.get(
  '/clubs/:clubId/members/:memberId',
  requireAuth,
  requireClubRole('admin', 'captain'),
  async (req, res, next) => {
    try {
      const { clubId, memberId } = req.params as { clubId: string; memberId: string };

      const { data: row, error: memErr } = await supabase
        .from('club_members')
        .select(MEMBER_SELECT)
        .eq('id', memberId)
        .eq('club_id', clubId)
        .maybeSingle();
      if (memErr) throw memErr;
      if (!row) {
        res.status(404).json({ error: 'Member not found at this club' });
        return;
      }
      const member = shapeMember(row);
      const userId = member.user_id;

      // Payments assigned to this member within the club.
      const { data: pa, error: paErr } = await supabase
        .from('payment_assignments')
        .select(
          'id, status, paid_at, payment:payments!inner(id, club_id, title, amount_cents, due_date, created_at)',
        )
        .eq('user_id', userId)
        .eq('payment.club_id', clubId);
      if (paErr) throw paErr;

      const payments = (pa || []).map((a: any) => ({
        assignment_id: a.id,
        payment_id: a.payment?.id,
        title: a.payment?.title,
        amount_cents: a.payment?.amount_cents ?? 0,
        due_date: a.payment?.due_date ?? null,
        status: a.status,
        paid_at: a.paid_at,
      }));
      const owed_cents = payments
        .filter((p) => p.status === 'pending')
        .reduce((s, p) => s + p.amount_cents, 0);
      const paid_cents = payments
        .filter((p) => p.status === 'paid')
        .reduce((s, p) => s + p.amount_cents, 0);

      // Expense shares assigned to this member — the debit side of their balance.
      const { data: ea, error: eaErr } = await supabase
        .from('expense_assignments')
        .select(
          'id, share_cents, status, paid_at, expense:expenses!inner(id, club_id, description, amount_cents, category, expense_date, team:teams(id, name), game:games(id, opponent), year:years(id, year, label))',
        )
        .eq('user_id', userId)
        .eq('expense.club_id', clubId);
      if (eaErr) throw eaErr;

      const expenseAssignments = (ea || [])
        .map((a: any) => ({
          assignment_id: a.id,
          expense_id: a.expense?.id,
          description: a.expense?.description,
          category: a.expense?.category ?? null,
          expense_date: a.expense?.expense_date ?? null,
          share_cents: a.share_cents ?? 0,
          status: a.status,
          paid_at: a.paid_at,
          team: a.expense?.team ?? null,
          game: a.expense?.game ?? null,
          year: a.expense?.year ?? null,
        }))
        .sort((x, y) => String(y.expense_date || '').localeCompare(String(x.expense_date || '')));

      const expenses_charged_cents = expenseAssignments.reduce((s, e) => s + e.share_cents, 0);
      // Net balance: what they've paid minus what they've been charged.
      const balance_cents = paid_cents - expenses_charged_cents;

      // Teams they're on (within this club).
      const { data: tm, error: tmErr } = await supabase
        .from('team_members')
        .select('is_captain, team:teams!inner(id, name, club_id, year:years(id, year, label))')
        .eq('user_id', userId)
        .eq('team.club_id', clubId);
      if (tmErr) throw tmErr;
      const teams = (tm || []).map((t: any) => ({
        id: t.team?.id,
        name: t.team?.name,
        is_captain: t.is_captain,
        year: t.team?.year ?? null,
      }));

      // Recent game selections (within this club).
      const { data: sel, error: selErr } = await supabase
        .from('game_selections')
        .select(
          'batting_order, game:games!inner(id, opponent, game_date, team:teams!inner(id, name, club_id))',
        )
        .eq('user_id', userId)
        .eq('game.team.club_id', clubId)
        .order('game_date', { ascending: false, referencedTable: 'games' })
        .limit(20);
      if (selErr) throw selErr;
      const selections = (sel || []).map((s: any) => ({
        game_id: s.game?.id,
        opponent: s.game?.opponent,
        game_date: s.game?.game_date ?? null,
        team_name: s.game?.team?.name ?? null,
        batting_order: s.batting_order ?? null,
      }));

      res.json({
        ...member,
        payments,
        owed_cents,
        paid_cents,
        balance_cents,
        expenses_charged_cents,
        expenses: expenseAssignments,
        teams,
        selections,
      });
    } catch (err) {
      next(err);
    }
  },
);

// Add a member to a club (admin only). The member can be an existing app user
// (matched by email), an invited account (email + invite), or a name-only
// placeholder with no login.
clubRoutes.post(
  '/clubs/:clubId/members',
  requireAuth,
  requireClubRole('admin'),
  validate(addMemberSchema),
  async (req, res, next) => {
    try {
      const {
        first_name,
        last_name,
        email,
        invite,
        role,
        roles,
        status,
        join_date,
        player_type,
        batting_hand,
        bowling_type,
      } = req.body as {
        first_name?: string;
        last_name?: string;
        email?: string;
        invite?: boolean;
        role?: string;
        roles?: string[];
        status?: string;
        join_date?: string;
        player_type?: string | null;
        batting_hand?: string | null;
        bowling_type?: string | null;
      };
      const clubId = req.params.clubId as string;
      const targetEmail = (email || '').trim().toLowerCase();
      const firstName = (first_name || '').trim();
      const lastName = (last_name || '').trim();

      // Resolve the profile id this membership will point at.
      let targetUserId: string | null = null;

      if (targetEmail) {
        // 1. Find an existing profile with this email. The signup trigger writes
        //    every real user's email onto their profile, and placeholders carry
        //    one too, so a single indexed lookup on profiles covers both — no
        //    need to page through the entire auth user list. Prefer a real
        //    account over a placeholder if somehow both exist.
        const { data: prof, error: profErr } = await supabase
          .from('profiles')
          .select('id, is_placeholder')
          .ilike('email', targetEmail)
          .order('is_placeholder', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (profErr) throw profErr;
        if (prof) targetUserId = prof.id;

        // 2. No account yet — either invite a real one or stub a placeholder.
        if (!targetUserId) {
          if (invite) {
            const { data: invited, error: invErr } = await supabase.auth.admin.inviteUserByEmail(
              targetEmail,
              { data: { first_name: firstName, last_name: lastName } },
            );
            if (invErr) throw new AppError(400, `Could not send invite: ${invErr.message}`);
            targetUserId = invited.user?.id ?? null;
            // The signup trigger creates the profile; make sure name/email land.
            if (targetUserId) {
              await supabase
                .from('profiles')
                .update({
                  first_name: firstName || undefined,
                  last_name: lastName || undefined,
                  email: targetEmail,
                })
                .eq('id', targetUserId);
            }
          } else {
            const { data: created, error: cErr } = await supabase
              .from('profiles')
              .insert({
                first_name: firstName,
                last_name: lastName,
                email: targetEmail,
                is_placeholder: true,
              })
              .select('id')
              .single();
            if (cErr) throw cErr;
            targetUserId = created.id;
          }
        }
      } else {
        // No email at all — a pure name-only placeholder.
        const { data: created, error: cErr } = await supabase
          .from('profiles')
          .insert({ first_name: firstName, last_name: lastName, is_placeholder: true })
          .select('id')
          .single();
        if (cErr) throw cErr;
        targetUserId = created.id;
      }

      if (!targetUserId) {
        throw new AppError(500, 'Could not resolve a profile for this member');
      }

      const extra: Record<string, any> = {};
      if (status !== undefined) extra.status = status;
      if (join_date !== undefined) extra.join_date = join_date;
      if (player_type !== undefined) extra.player_type = player_type;
      if (batting_hand !== undefined) extra.batting_hand = batting_hand;
      if (bowling_type !== undefined) extra.bowling_type = bowling_type;

      const memberId = await ensureMembership(clubId, targetUserId, extra);

      const grantRoles: string[] =
        roles && roles.length > 0
          ? Array.from(new Set(roles))
          : role
          ? [role]
          : ['player'];
      for (const r of grantRoles) {
        const { error: roleErr } = await supabase
          .from('club_member_roles')
          .insert({ member_id: memberId, role: r });
        if (roleErr && roleErr.code !== '23505') throw roleErr;
      }

      const { data: row, error: rowErr } = await supabase
        .from('club_members')
        .select(MEMBER_SELECT)
        .eq('id', memberId)
        .single();
      if (rowErr) throw rowErr;

      res.status(201).json(shapeMember(row));
    } catch (err) {
      next(err);
    }
  },
);

// Add a role to an existing member (admin only). Addressed by member id.
clubRoutes.post(
  '/clubs/:clubId/members/:memberId/roles',
  requireAuth,
  requireClubRole('admin'),
  requireMemberInClub(),
  validate(addMemberRoleSchema),
  async (req, res, next) => {
    try {
      const { role } = req.body;
      const { memberId } = req.params as { memberId: string };

      const { data, error } = await supabase
        .from('club_member_roles')
        .insert({ member_id: memberId, role })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          res.status(409).json({ error: 'Member already has this role at this club' });
          return;
        }
        throw error;
      }

      res.status(201).json({ member_id: memberId, role: data.role });
    } catch (err) {
      next(err);
    }
  },
);

// Remove a role from a member (admin only). Addressed by member id.
clubRoutes.delete(
  '/clubs/:clubId/members/:memberId/roles/:role',
  requireAuth,
  requireClubRole('admin'),
  requireMemberInClub(),
  async (req, res, next) => {
    try {
      const { clubId, memberId, role } = req.params;

      // Prevent removing the last admin at the club
      if (role === 'admin') {
        const { count, error: countError } = await supabase
          .from('club_member_roles')
          .select('member_id, member:club_members!inner(club_id, status)', {
            count: 'exact',
            head: true,
          })
          .eq('role', 'admin')
          .eq('member.club_id', clubId)
          .eq('member.status', 'active');
        if (countError) throw countError;
        if ((count ?? 0) <= 1) {
          res.status(400).json({ error: 'Cannot remove the last admin from a club' });
          return;
        }
      }

      // Prevent leaving the membership with zero roles
      const { data: otherRoles, error: othersErr } = await supabase
        .from('club_member_roles')
        .select('role')
        .eq('member_id', memberId)
        .neq('role', role);
      if (othersErr) throw othersErr;
      if (!otherRoles || otherRoles.length === 0) {
        res.status(400).json({ error: 'Cannot remove the last role — remove the member instead' });
        return;
      }

      const { data, error } = await supabase
        .from('club_member_roles')
        .delete()
        .eq('member_id', memberId)
        .eq('role', role)
        .select()
        .single();
      if (error) throw error;
      if (!data) {
        res.status(404).json({ error: 'Role not found for this member' });
        return;
      }

      res.json({ message: 'Role removed successfully' });
    } catch (err) {
      next(err);
    }
  },
);

// Update member status / join_date / notes / cricket details (admin only)
clubRoutes.put(
  '/clubs/:clubId/members/:memberId',
  requireAuth,
  requireClubRole('admin'),
  validate(updateMemberSchema),
  async (req, res, next) => {
    try {
      const patch: Record<string, any> = {};
      for (const key of [
        'status',
        'join_date',
        'player_type',
        'batting_hand',
        'bowling_type',
      ] as const) {
        if (req.body[key] !== undefined) patch[key] = req.body[key];
      }
      if (req.body.notes !== undefined) {
        const n = req.body.notes;
        patch.notes = typeof n === 'string' && n.trim() === '' ? null : n;
      }

      const { data, error } = await supabase
        .from('club_members')
        .update(patch)
        .eq('id', req.params.memberId)
        .eq('club_id', req.params.clubId)
        .select(MEMBER_SELECT)
        .single();
      if (error) throw error;
      res.json(shapeMember(data));
    } catch (err) {
      next(err);
    }
  },
);

// Admin: update another member's profile (name, phone, paypal_email).
// Addressed by member id; the underlying profile is resolved from it.
clubRoutes.put(
  '/clubs/:clubId/members/:memberId/profile',
  requireAuth,
  requireClubRole('admin'),
  requireMemberInClub(),
  validate(adminUpdateMemberProfileSchema),
  async (req, res, next) => {
    try {
      const { memberId } = req.params as { memberId: string };

      const { data: membership, error: memErr } = await supabase
        .from('club_members')
        .select('user_id')
        .eq('id', memberId)
        .single();
      if (memErr) throw memErr;
      const userId = membership.user_id;

      const patch: Record<string, any> = { ...req.body };
      for (const key of ['paypal_email', 'phone', 'email'] as const) {
        if (typeof patch[key] === 'string' && patch[key].trim() === '') patch[key] = null;
      }
      if (typeof patch.email === 'string') patch.email = patch.email.trim().toLowerCase();
      patch.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', userId)
        .select()
        .single();
      if (error) throw error;
      res.json(data);
    } catch (err) {
      next(err);
    }
  },
);

// Request to join a club (current user). Creates a pending request that an
// admin must approve before membership is granted.
clubRoutes.post(
  '/clubs/:clubId/join',
  requireAuth,
  validate(joinClubSchema),
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const clubId = req.params.clubId as string;
      const { player_type, batting_hand, bowling_type } = req.body as Record<string, any>;

      // Already an active member? Nothing to request.
      const { data: existingMember, error: memErr } = await supabase
        .from('club_members')
        .select('id, status')
        .eq('club_id', clubId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (memErr) throw memErr;
      if (existingMember && existingMember.status === 'active') {
        res.status(409).json({ error: 'You are already a member of this club' });
        return;
      }

      // Upsert the request back to pending (covers re-requests after rejection).
      const { error: upErr } = await supabase
        .from('club_join_requests')
        .upsert(
          {
            club_id: clubId,
            user_id: user.id,
            status: 'pending',
            player_type: player_type ?? null,
            batting_hand: batting_hand ?? null,
            bowling_type: bowling_type ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'club_id,user_id' },
        );
      if (upErr) throw upErr;

      res.status(201).json({ message: 'Request sent', status: 'pending' });
    } catch (err) {
      next(err);
    }
  },
);

// Current user's join-request status for a club (so the join page can reflect it).
clubRoutes.get('/clubs/:clubId/join-request', requireAuth, async (req, res, next) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { data, error } = await supabase
      .from('club_join_requests')
      .select('id, status, created_at')
      .eq('club_id', req.params.clubId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;
    res.json(data ?? null);
  } catch (err) {
    next(err);
  }
});

// List pending join requests for a club (admin only).
clubRoutes.get(
  '/clubs/:clubId/join-requests',
  requireAuth,
  requireClubRole('admin'),
  async (req, res, next) => {
    try {
      const { data, error } = await supabase
        .from('club_join_requests')
        .select(
          'id, user_id, status, player_type, batting_hand, bowling_type, message, created_at, profile:profiles(*)',
        )
        .eq('club_id', req.params.clubId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      if (error) throw error;
      res.json(data || []);
    } catch (err) {
      next(err);
    }
  },
);

// Approve a join request → create/activate membership with the 'player' role.
clubRoutes.post(
  '/clubs/:clubId/join-requests/:requestId/approve',
  requireAuth,
  requireClubRole('admin'),
  async (req, res, next) => {
    try {
      const clubId = req.params.clubId as string;
      const { data: request, error: reqErr } = await supabase
        .from('club_join_requests')
        .select('*')
        .eq('id', req.params.requestId)
        .eq('club_id', clubId)
        .maybeSingle();
      if (reqErr) throw reqErr;
      if (!request) {
        res.status(404).json({ error: 'Request not found' });
        return;
      }

      const extra: Record<string, any> = {};
      if (request.player_type) extra.player_type = request.player_type;
      if (request.batting_hand) extra.batting_hand = request.batting_hand;
      if (request.bowling_type) extra.bowling_type = request.bowling_type;

      const memberId = await ensureMembership(clubId, request.user_id, extra);

      const { error: roleErr } = await supabase
        .from('club_member_roles')
        .insert({ member_id: memberId, role: 'player' });
      if (roleErr && roleErr.code !== '23505') throw roleErr;

      const { error: updErr } = await supabase
        .from('club_join_requests')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', request.id);
      if (updErr) throw updErr;

      res.json({ message: 'Request approved' });
    } catch (err) {
      next(err);
    }
  },
);

// Reject a join request (admin only).
clubRoutes.post(
  '/clubs/:clubId/join-requests/:requestId/reject',
  requireAuth,
  requireClubRole('admin'),
  async (req, res, next) => {
    try {
      const { error } = await supabase
        .from('club_join_requests')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', req.params.requestId)
        .eq('club_id', req.params.clubId);
      if (error) throw error;
      res.json({ message: 'Request rejected' });
    } catch (err) {
      next(err);
    }
  },
);
