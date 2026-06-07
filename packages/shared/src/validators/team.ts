import { z } from 'zod';

export const createTeamSchema = z.object({
  year_id: z.string().uuid('A valid year is required'),
  name: z.string().min(1, 'Team name is required'),
  description: z.string().max(2000).nullable().optional(),
});

export const updateTeamSchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().max(2000).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field must be provided',
  });

export const addTeamMemberSchema = z.object({
  user_id: z.string().uuid('A valid member is required'),
  is_captain: z.boolean().optional(),
});

export const updateTeamMemberSchema = z.object({
  is_captain: z.boolean(),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type AddTeamMemberInput = z.infer<typeof addTeamMemberSchema>;
export type UpdateTeamMemberInput = z.infer<typeof updateTeamMemberSchema>;
