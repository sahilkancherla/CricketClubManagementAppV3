import { z } from 'zod';
import { EXPENSE_CATEGORIES } from '../constants';

// Create an expense. Scope is implied by which of year_id / team_id / game_id
// are set. `paid_by_user_id` records who fronted the cost (defaults server-side
// to the creating admin). The amount is optionally split into per-member shares:
// `assign_all` splits across the scope's members (team roster or active club
// members), or pass an explicit `user_ids` set. With neither, no split is made.
export const createExpenseSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount_cents: z.number().int().min(0, 'Amount must be positive'),
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  expense_date: z.string().optional(),
  year_id: z.string().uuid().nullable().optional(),
  team_id: z.string().uuid().nullable().optional(),
  game_id: z.string().uuid().nullable().optional(),
  paid_by_user_id: z.string().uuid().nullable().optional(),
  assign_all: z.boolean().optional(),
  user_ids: z.array(z.string().uuid()).optional(),
});

export const updateExpenseSchema = z
  .object({
    description: z.string().min(1).optional(),
    amount_cents: z.number().int().min(0).optional(),
    category: z.enum(EXPENSE_CATEGORIES).optional(),
    expense_date: z.string().optional(),
    year_id: z.string().uuid().nullable().optional(),
    team_id: z.string().uuid().nullable().optional(),
    game_id: z.string().uuid().nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field must be provided',
  });

// Re-split an existing expense. Re-resolves who the cost is divided across
// (`assign_all` over the expense's own scope, or an explicit `user_ids` set —
// an empty array clears the split) and recomputes per-member shares. Members
// who remain keep their paid/pending status; `paid_by_user_id`, when present,
// reassigns the payer (pass null to clear).
export const updateExpenseSplitSchema = z
  .object({
    assign_all: z.boolean().optional(),
    user_ids: z.array(z.string().uuid()).optional(),
    paid_by_user_id: z.string().uuid().nullable().optional(),
  })
  .refine((v) => v.assign_all === true || Array.isArray(v.user_ids), {
    message: 'Provide assign_all or user_ids (an empty array clears the split)',
    path: ['user_ids'],
  });

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type UpdateExpenseSplitInput = z.infer<typeof updateExpenseSplitSchema>;
