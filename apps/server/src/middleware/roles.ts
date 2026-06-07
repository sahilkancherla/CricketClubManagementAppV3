import { Request, Response, NextFunction } from 'express';
import { supabase } from '../supabase';
import type { AuthenticatedRequest } from './auth';
import type { Role } from '@cricket/shared';

// Enforce that the current user holds at least one of the given roles in the
// club identified by `:clubId`. Reads from club_members + club_member_roles.
export function requireClubRole(...roles: Role[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { user } = req as AuthenticatedRequest;
    const clubId = req.params.clubId;

    if (!clubId) {
      res.status(400).json({ error: 'Missing clubId parameter' });
      return;
    }

    const { data, error } = await supabase
      .from('club_members')
      .select('id, roles:club_member_roles(role)')
      .eq('club_id', clubId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (error || !data) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    const memberRoles: string[] = (data.roles as any[] | null)?.map((r) => r.role) ?? [];
    const hasRole = memberRoles.some((r) => (roles as string[]).includes(r));

    if (!hasRole) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

export function requireClubMember() {
  return requireClubRole('admin', 'captain', 'player');
}
