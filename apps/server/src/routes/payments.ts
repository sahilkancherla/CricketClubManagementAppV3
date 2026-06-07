import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requireClubRole, requireClubMember } from '../middleware/roles';
import { requirePaymentInClub } from '../middleware/scope';
import { validate } from '../middleware/validate';
import {
  createPaymentSchema,
  updatePaymentSchema,
  updateAssignmentSchema,
} from '@cricket/shared';
import { supabase } from '../supabase';
import { createOrder } from '../services/paypal';

export const paymentRoutes = Router();

// List payments for a club with assignment summary (admin only).
paymentRoutes.get(
  '/clubs/:clubId/payments',
  requireAuth,
  requireClubRole('admin'),
  async (req, res, next) => {
    try {
      let query = supabase
        .from('payments')
        .select(
          '*, year:years(id, year, label), ' +
            'assignments:payment_assignments(id, user_id, status, paid_at, profile:profiles(id, first_name, last_name, email))',
        )
        .eq('club_id', req.params.clubId)
        .order('created_at', { ascending: false });

      const { year_id, no_year } = req.query as Record<string, string>;
      if (year_id) query = query.eq('year_id', year_id);
      if (no_year === 'true') query = query.is('year_id', null);

      const { data, error } = await query;
      if (error) throw error;

      const shaped = (data || []).map((p: any) => {
        const assignments = p.assignments || [];
        const paid = assignments.filter((a: any) => a.status === 'paid').length;
        return {
          ...p,
          assignments: undefined,
          assigned_count: assignments.length,
          paid_count: paid,
          collected_cents: paid * p.amount_cents,
          outstanding_cents:
            assignments.filter((a: any) => a.status === 'pending').length * p.amount_cents,
          // For individual (single-assignee) payments, surface the one assignment
          // so the UI can show/manage it inline without expanding.
          sole_assignment: assignments.length === 1 ? assignments[0] : null,
        };
      });
      res.json(shaped);
    } catch (err) {
      next(err);
    }
  },
);

// Create a payment and assign it to all members or a specific set (admin only).
paymentRoutes.post(
  '/clubs/:clubId/payments',
  requireAuth,
  requireClubRole('admin'),
  validate(createPaymentSchema),
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const clubId = req.params.clubId as string;
      const { title, description, amount_cents, due_date, year_id, assign_all, user_ids } =
        req.body as {
          title: string;
          description?: string | null;
          amount_cents: number;
          due_date?: string | null;
          year_id?: string | null;
          assign_all?: boolean;
          user_ids?: string[];
        };

      const { data: payment, error: payErr } = await supabase
        .from('payments')
        .insert({
          club_id: clubId,
          title,
          description: description ?? null,
          amount_cents,
          due_date: due_date ?? null,
          year_id: year_id ?? null,
          created_by: user.id,
        })
        .select()
        .single();
      if (payErr) throw payErr;

      // The payment and its assignments span two writes that PostgREST can't run
      // in one transaction. If the assignment write fails, compensate by deleting
      // the just-created payment so we don't leave a payment with no assignees.
      // (A Postgres RPC would make this truly atomic — see notes.)
      try {
        // Resolve the target users.
        let targetUserIds: string[];
        if (assign_all) {
          const { data: members, error: memErr } = await supabase
            .from('club_members')
            .select('user_id')
            .eq('club_id', clubId)
            .eq('status', 'active');
          if (memErr) throw memErr;
          targetUserIds = (members || []).map((m: any) => m.user_id);
        } else {
          targetUserIds = Array.from(new Set(user_ids || []));
        }

        if (targetUserIds.length > 0) {
          const rows = targetUserIds.map((uid) => ({ payment_id: payment.id, user_id: uid }));
          const { error: insErr } = await supabase.from('payment_assignments').insert(rows);
          if (insErr) throw insErr;
        }

        res.status(201).json({ ...payment, assigned_count: targetUserIds.length });
      } catch (assignErr) {
        await supabase.from('payments').delete().eq('id', payment.id);
        throw assignErr;
      }
    } catch (err) {
      next(err);
    }
  },
);

// Get a payment with full assignment detail (admin only).
paymentRoutes.get(
  '/clubs/:clubId/payments/:paymentId',
  requireAuth,
  requireClubRole('admin'),
  async (req, res, next) => {
    try {
      const { data: payment, error: payErr } = await supabase
        .from('payments')
        .select('*')
        .eq('id', req.params.paymentId)
        .eq('club_id', req.params.clubId)
        .single();
      if (payErr) throw payErr;

      const { data: assignments, error: aErr } = await supabase
        .from('payment_assignments')
        .select('id, user_id, status, paid_at, profile:profiles(*)')
        .eq('payment_id', req.params.paymentId);
      if (aErr) throw aErr;

      res.json({ ...payment, assignments: assignments || [] });
    } catch (err) {
      next(err);
    }
  },
);

// Update a payment's details (admin only)
paymentRoutes.put(
  '/clubs/:clubId/payments/:paymentId',
  requireAuth,
  requireClubRole('admin'),
  validate(updatePaymentSchema),
  async (req, res, next) => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .update({ ...req.body, updated_at: new Date().toISOString() })
        .eq('id', req.params.paymentId)
        .eq('club_id', req.params.clubId)
        .select()
        .single();
      if (error) throw error;
      res.json(data);
    } catch (err) {
      next(err);
    }
  },
);

// Update one assignment's status (admin only) — e.g. mark paid manually.
paymentRoutes.put(
  '/clubs/:clubId/payments/:paymentId/assignments/:userId',
  requireAuth,
  requireClubRole('admin'),
  requirePaymentInClub(),
  validate(updateAssignmentSchema),
  async (req, res, next) => {
    try {
      const { status } = req.body as { status: string };
      const patch: Record<string, any> = { status };
      patch.paid_at = status === 'paid' ? new Date().toISOString() : null;

      const { data, error } = await supabase
        .from('payment_assignments')
        .update(patch)
        .eq('payment_id', req.params.paymentId)
        .eq('user_id', req.params.userId)
        .select('id, user_id, status, paid_at, profile:profiles(*)')
        .single();
      if (error) throw error;
      res.json(data);
    } catch (err) {
      next(err);
    }
  },
);

// Delete a payment (admin only)
paymentRoutes.delete(
  '/clubs/:clubId/payments/:paymentId',
  requireAuth,
  requireClubRole('admin'),
  async (req, res, next) => {
    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', req.params.paymentId)
        .eq('club_id', req.params.clubId);
      if (error) throw error;
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
);

// Current user's payments at a club (any member).
paymentRoutes.get(
  '/clubs/:clubId/my-payments',
  requireAuth,
  requireClubMember(),
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const { data, error } = await supabase
        .from('payment_assignments')
        .select('id, status, paid_at, payment:payments!inner(id, club_id, title, description, amount_cents, due_date, created_at)')
        .eq('user_id', user.id)
        .eq('payment.club_id', req.params.clubId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      res.json(data || []);
    } catch (err) {
      next(err);
    }
  },
);

// Stub: initiate a PayPal order for the current user's assignment.
// Returns a stub order — real PayPal capture happens in P1 via webhooks.
paymentRoutes.post(
  '/clubs/:clubId/payments/:paymentId/pay',
  requireAuth,
  requireClubMember(),
  requirePaymentInClub(),
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const { data: assignment, error } = await supabase
        .from('payment_assignments')
        .select('id, status, payment:payments(amount_cents, title)')
        .eq('payment_id', req.params.paymentId)
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      if (!assignment) {
        res.status(404).json({ error: 'No assignment found for you on this payment' });
        return;
      }

      const order = createOrder({
        amountCents: (assignment as any).payment?.amount_cents ?? 0,
        payerEmail: user.email,
        description: (assignment as any).payment?.title,
      });

      res.json({ order, message: 'PayPal is stubbed for P0 — no charge was made.' });
    } catch (err) {
      next(err);
    }
  },
);
