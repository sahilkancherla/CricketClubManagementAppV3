import { Request, Response, NextFunction } from 'express';
import { supabase } from '../supabase';

// Ownership guards for nested resources.
//
// `requireClubRole` only proves the caller has a role in `:clubId`. It does NOT
// prove that a deeper resource id in the path (`:teamId`, `:gameId`, …) belongs
// to that club. Without these checks an admin of club A could read or mutate a
// resource in club B by pairing A's id (which passes the role check) with B's
// resource id — a cross-tenant IDOR. Mount the relevant guard AFTER
// `requireClubRole` on any route whose path carries such an id.

// Generic guard for tables that have a `club_id` column.
function requireInClub(table: string, param: string, label: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clubId = req.params.clubId;
      const id = req.params[param];
      const { data, error } = await supabase
        .from(table)
        .select('id')
        .eq('id', id)
        .eq('club_id', clubId)
        .maybeSingle();
      if (error) {
        next(error);
        return;
      }
      if (!data) {
        res.status(404).json({ error: `${label} not found in this club` });
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

export const requireTeamInClub = () => requireInClub('teams', 'teamId', 'Team');
export const requireExpenseInClub = () => requireInClub('expenses', 'expenseId', 'Expense');
export const requirePaymentInClub = () => requireInClub('payments', 'paymentId', 'Payment');
export const requireMemberInClub = () => requireInClub('club_members', 'memberId', 'Member');

// Games have no `club_id` of their own — they belong to a club through their
// team — so verify via an inner join on the parent team.
export function requireGameInClub() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clubId, gameId } = req.params;
      const { data, error } = await supabase
        .from('games')
        .select('id, team:teams!inner(club_id)')
        .eq('id', gameId)
        .eq('team.club_id', clubId)
        .maybeSingle();
      if (error) {
        next(error);
        return;
      }
      if (!data) {
        res.status(404).json({ error: 'Game not found in this club' });
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
