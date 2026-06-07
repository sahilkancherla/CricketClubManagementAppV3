import type { Database } from './database';

type Tables = Database['public']['Tables'];

export type Profile = Tables['profiles']['Row'];
export type Club = Tables['clubs']['Row'];
export type ClubMember = Tables['club_members']['Row'];
export type ClubMemberRole = Tables['club_member_roles']['Row'];
export type Year = Tables['years']['Row'];
export type Team = Tables['teams']['Row'];
export type TeamMember = Tables['team_members']['Row'];
export type Game = Tables['games']['Row'];
export type GameSelection = Tables['game_selections']['Row'];
export type Expense = Tables['expenses']['Row'];
export type ExpenseAssignment = Tables['expense_assignments']['Row'];
export type Payment = Tables['payments']['Row'];
export type PaymentAssignment = Tables['payment_assignments']['Row'];
