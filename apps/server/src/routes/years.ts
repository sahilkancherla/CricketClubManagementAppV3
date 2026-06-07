import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireClubRole, requireClubMember } from '../middleware/roles';
import { validate } from '../middleware/validate';
import { createYearSchema, updateYearSchema } from '@cricket/shared';
import { supabase } from '../supabase';

export const yearRoutes = Router();

// List years for a club (most recent first) — any member can view history.
yearRoutes.get(
  '/clubs/:clubId/years',
  requireAuth,
  requireClubMember(),
  async (req, res, next) => {
    try {
      const { data, error } = await supabase
        .from('years')
        .select('*')
        .eq('club_id', req.params.clubId)
        .order('year', { ascending: false });
      if (error) throw error;
      res.json(data || []);
    } catch (err) {
      next(err);
    }
  },
);

// Create a year (admin only)
yearRoutes.post(
  '/clubs/:clubId/years',
  requireAuth,
  requireClubRole('admin'),
  validate(createYearSchema),
  async (req, res, next) => {
    try {
      const { data, error } = await supabase
        .from('years')
        .insert({ ...req.body, club_id: req.params.clubId })
        .select()
        .single();
      if (error) {
        if (error.code === '23505') {
          res.status(409).json({ error: 'That year already exists for this club' });
          return;
        }
        throw error;
      }
      res.status(201).json(data);
    } catch (err) {
      next(err);
    }
  },
);

// Update a year (admin only)
yearRoutes.put(
  '/clubs/:clubId/years/:yearId',
  requireAuth,
  requireClubRole('admin'),
  validate(updateYearSchema),
  async (req, res, next) => {
    try {
      const { data, error } = await supabase
        .from('years')
        .update(req.body)
        .eq('id', req.params.yearId)
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

// Delete a year (admin only) — cascades to teams/games via FKs.
yearRoutes.delete(
  '/clubs/:clubId/years/:yearId',
  requireAuth,
  requireClubRole('admin'),
  async (req, res, next) => {
    try {
      const { error } = await supabase
        .from('years')
        .delete()
        .eq('id', req.params.yearId)
        .eq('club_id', req.params.clubId);
      if (error) throw error;
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
);
