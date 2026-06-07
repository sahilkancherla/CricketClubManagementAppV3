import { z } from 'zod';

export const createGameSchema = z.object({
  opponent: z.string().min(1, 'Opponent is required'),
  location: z.string().max(300).nullable().optional(),
  game_date: z.string().min(1, 'Date is required'),
  game_time: z.string().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
});

export const updateGameSchema = z
  .object({
    opponent: z.string().min(1).optional(),
    location: z.string().max(300).nullable().optional(),
    game_date: z.string().min(1).optional(),
    game_time: z.string().nullable().optional(),
    notes: z.string().max(5000).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field must be provided',
  });

// Save the playing XI / squad selection for a game — replaces the whole set.
export const saveSelectionSchema = z.object({
  user_ids: z.array(z.string().uuid()).max(50),
});

export type CreateGameInput = z.infer<typeof createGameSchema>;
export type UpdateGameInput = z.infer<typeof updateGameSchema>;
export type SaveSelectionInput = z.infer<typeof saveSelectionSchema>;
