import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireClubRole, requireClubMember } from '../middleware/roles';
import { requireTeamInClub } from '../middleware/scope';
import { validate } from '../middleware/validate';
import {
  createTeamSchema,
  updateTeamSchema,
  addTeamMemberSchema,
  updateTeamMemberSchema,
} from '@cricket/shared';
import { supabase } from '../supabase';

export const teamRoutes = Router();

// List teams for a club, optionally filtered by ?year_id=. Includes member count.
teamRoutes.get(
  '/clubs/:clubId/teams',
  requireAuth,
  requireClubMember(),
  async (req, res, next) => {
    try {
      let query = supabase
        .from('teams')
        .select('*, year:years(id, year, label), members:team_members(count)')
        .eq('club_id', req.params.clubId)
        .order('created_at', { ascending: false });

      const yearId = req.query.year_id as string | undefined;
      if (yearId) query = query.eq('year_id', yearId);

      const { data, error } = await query;
      if (error) throw error;

      const shaped = (data || []).map((t: any) => ({
        ...t,
        member_count: t.members?.[0]?.count ?? 0,
        members: undefined,
      }));
      res.json(shaped);
    } catch (err) {
      next(err);
    }
  },
);

// Create a team for a year (admin only)
teamRoutes.post(
  '/clubs/:clubId/teams',
  requireAuth,
  requireClubRole('admin'),
  validate(createTeamSchema),
  async (req, res, next) => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .insert({ ...req.body, club_id: req.params.clubId })
        .select('*, year:years(id, year, label)')
        .single();
      if (error) throw error;
      res.status(201).json(data);
    } catch (err) {
      next(err);
    }
  },
);

// Get a single team with its roster (member profiles + captain flag).
teamRoutes.get(
  '/clubs/:clubId/teams/:teamId',
  requireAuth,
  requireClubMember(),
  async (req, res, next) => {
    try {
      const { data: team, error: teamErr } = await supabase
        .from('teams')
        .select('*, year:years(id, year, label)')
        .eq('id', req.params.teamId)
        .eq('club_id', req.params.clubId)
        .single();
      if (teamErr) throw teamErr;

      const { data: members, error: memErr } = await supabase
        .from('team_members')
        .select('id, user_id, is_captain, created_at, profile:profiles(*)')
        .eq('team_id', req.params.teamId);
      if (memErr) throw memErr;

      res.json({ ...team, members: members || [] });
    } catch (err) {
      next(err);
    }
  },
);

// Update a team (admin only)
teamRoutes.put(
  '/clubs/:clubId/teams/:teamId',
  requireAuth,
  requireClubRole('admin'),
  validate(updateTeamSchema),
  async (req, res, next) => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .update({ ...req.body, updated_at: new Date().toISOString() })
        .eq('id', req.params.teamId)
        .eq('club_id', req.params.clubId)
        .select('*, year:years(id, year, label)')
        .single();
      if (error) throw error;
      res.json(data);
    } catch (err) {
      next(err);
    }
  },
);

// Delete a team (admin only)
teamRoutes.delete(
  '/clubs/:clubId/teams/:teamId',
  requireAuth,
  requireClubRole('admin'),
  async (req, res, next) => {
    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', req.params.teamId)
        .eq('club_id', req.params.clubId);
      if (error) throw error;
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
);

// Assign a member to the team (admin only)
teamRoutes.post(
  '/clubs/:clubId/teams/:teamId/members',
  requireAuth,
  requireClubRole('admin'),
  requireTeamInClub(),
  validate(addTeamMemberSchema),
  async (req, res, next) => {
    try {
      const { user_id, is_captain } = req.body as { user_id: string; is_captain?: boolean };

      const { data, error } = await supabase
        .from('team_members')
        .insert({ team_id: req.params.teamId, user_id, is_captain: is_captain ?? false })
        .select('id, user_id, is_captain, created_at, profile:profiles(*)')
        .single();
      if (error) {
        if (error.code === '23505') {
          res.status(409).json({ error: 'Member is already on this team' });
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

// Update a team member (toggle captain) (admin only)
teamRoutes.put(
  '/clubs/:clubId/teams/:teamId/members/:userId',
  requireAuth,
  requireClubRole('admin'),
  requireTeamInClub(),
  validate(updateTeamMemberSchema),
  async (req, res, next) => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .update({ is_captain: req.body.is_captain })
        .eq('team_id', req.params.teamId)
        .eq('user_id', req.params.userId)
        .select('id, user_id, is_captain, created_at, profile:profiles(*)')
        .single();
      if (error) throw error;
      res.json(data);
    } catch (err) {
      next(err);
    }
  },
);

// Remove a member from the team (admin only)
teamRoutes.delete(
  '/clubs/:clubId/teams/:teamId/members/:userId',
  requireAuth,
  requireClubRole('admin'),
  requireTeamInClub(),
  async (req, res, next) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', req.params.teamId)
        .eq('user_id', req.params.userId);
      if (error) throw error;
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
);
