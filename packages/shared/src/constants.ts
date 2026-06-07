// App display name — single source of truth, reused across web, mobile, and
// server. Update here to rebrand everywhere (Expo's app.json is the one place
// that can't import this and must be kept in sync manually).
export const APP_NAME = 'QuickCric';

// Roles a user can hold within a club. A user can hold multiple.
export const ROLES = ['admin', 'captain', 'player'] as const;
export type Role = (typeof ROLES)[number];

export const MEMBER_STATUSES = ['active', 'inactive'] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

// Cricket role details for a member.
export const PLAYER_TYPES = ['batter', 'bowler', 'all_rounder'] as const;
export type PlayerType = (typeof PLAYER_TYPES)[number];

export const BATTING_HANDS = ['left', 'right'] as const;
export type BattingHand = (typeof BATTING_HANDS)[number];

export const BOWLING_TYPES = ['offspin', 'legspin', 'pace'] as const;
export type BowlingType = (typeof BOWLING_TYPES)[number];

// Expense categories — club, team, or game level spend.
export const EXPENSE_CATEGORIES = [
  'ground_booking',
  'equipment',
  'travel',
  'food',
  'umpire',
  'registration',
  'kit',
  'other',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

// Payment assignment lifecycle.
export const PAYMENT_STATUSES = ['pending', 'paid', 'cancelled'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

// Human-friendly labels for cricket role details.
export const PLAYER_TYPE_LABELS: Record<PlayerType, string> = {
  batter: 'Batter',
  bowler: 'Bowler',
  all_rounder: 'All-rounder',
};

export const BATTING_HAND_LABELS: Record<BattingHand, string> = {
  left: 'Left-handed',
  right: 'Right-handed',
};

export const BOWLING_TYPE_LABELS: Record<BowlingType, string> = {
  offspin: 'Off-spin',
  legspin: 'Leg-spin',
  pace: 'Pace',
};

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  ground_booking: 'Ground booking',
  equipment: 'Equipment',
  travel: 'Travel',
  food: 'Food',
  umpire: 'Umpire',
  registration: 'Registration',
  kit: 'Kit',
  other: 'Other',
};
