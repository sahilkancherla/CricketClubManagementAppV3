import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireClubRole, requireClubMember } from '../middleware/roles';
import { requireTeamInClub, requireGameInClub } from '../middleware/scope';
import { validate } from '../middleware/validate';
import { createGameSchema, updateGameSchema, saveSelectionSchema } from '@cricket/shared';
import { supabase } from '../supabase';

export const gameRoutes = Router();

// List games for a team (upcoming first by date)
gameRoutes.get(
  '/clubs/:clubId/teams/:teamId/games',
  requireAuth,
  requireClubMember(),
  requireTeamInClub(),
  async (req, res, next) => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*, selections:game_selections(count)')
        .eq('team_id', req.params.teamId)
        .order('game_date', { ascending: false });
      if (error) throw error;
      const shaped = (data || []).map((g: any) => ({
        ...g,
        selection_count: g.selections?.[0]?.count ?? 0,
        selections: undefined,
      }));
      res.json(shaped);
    } catch (err) {
      next(err);
    }
  },
);

// Create a game for a team (admin only)
gameRoutes.post(
  '/clubs/:clubId/teams/:teamId/games',
  requireAuth,
  requireClubRole('admin'),
  requireTeamInClub(),
  validate(createGameSchema),
  async (req, res, next) => {
    try {
      const { data, error } = await supabase
        .from('games')
        .insert({ ...req.body, team_id: req.params.teamId })
        .select()
        .single();
      if (error) throw error;
      res.status(201).json(data);
    } catch (err) {
      next(err);
    }
  },
);

// Get a single game with its team and saved selection (ordered by batting_order).
gameRoutes.get(
  '/clubs/:clubId/games/:gameId',
  requireAuth,
  requireClubMember(),
  requireGameInClub(),
  async (req, res, next) => {
    try {
      const { data: game, error: gameErr } = await supabase
        .from('games')
        .select('*, team:teams(id, name, club_id, year:years(id, year, label))')
        .eq('id', req.params.gameId)
        .single();
      if (gameErr) throw gameErr;

      const { data: selection, error: selErr } = await supabase
        .from('game_selections')
        .select('id, user_id, batting_order, profile:profiles(*)')
        .eq('game_id', req.params.gameId)
        .order('batting_order', { ascending: true, nullsFirst: false });
      if (selErr) throw selErr;

      res.json({ ...game, selection: selection || [] });
    } catch (err) {
      next(err);
    }
  },
);

// Update a game (admin only)
gameRoutes.put(
  '/clubs/:clubId/games/:gameId',
  requireAuth,
  requireClubRole('admin'),
  requireGameInClub(),
  validate(updateGameSchema),
  async (req, res, next) => {
    try {
      const { data, error } = await supabase
        .from('games')
        .update({ ...req.body, updated_at: new Date().toISOString() })
        .eq('id', req.params.gameId)
        .select()
        .single();
      if (error) throw error;
      res.json(data);
    } catch (err) {
      next(err);
    }
  },
);

// Delete a game (admin only)
gameRoutes.delete(
  '/clubs/:clubId/games/:gameId',
  requireAuth,
  requireClubRole('admin'),
  requireGameInClub(),
  async (req, res, next) => {
    try {
      const { error } = await supabase.from('games').delete().eq('id', req.params.gameId);
      if (error) throw error;
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
);

// Save the squad selection for a game (admin only) — replaces the whole set.
// Batting order follows the array order of user_ids.
gameRoutes.put(
  '/clubs/:clubId/games/:gameId/selection',
  requireAuth,
  requireClubRole('admin', 'captain'),
  requireGameInClub(),
  validate(saveSelectionSchema),
  async (req, res, next) => {
    try {
      const gameId = req.params.gameId as string;
      const { user_ids } = req.body as { user_ids: string[] };

      // Clear existing selection, then insert the new one in order.
      const { error: delErr } = await supabase
        .from('game_selections')
        .delete()
        .eq('game_id', gameId);
      if (delErr) throw delErr;

      if (user_ids.length > 0) {
        const rows = user_ids.map((user_id, idx) => ({
          game_id: gameId,
          user_id,
          batting_order: idx + 1,
        }));
        const { error: insErr } = await supabase.from('game_selections').insert(rows);
        if (insErr) throw insErr;
      }

      const { data: selection, error: selErr } = await supabase
        .from('game_selections')
        .select('id, user_id, batting_order, profile:profiles(*)')
        .eq('game_id', gameId)
        .order('batting_order', { ascending: true, nullsFirst: false });
      if (selErr) throw selErr;

      res.json(selection || []);
    } catch (err) {
      next(err);
    }
  },
);
