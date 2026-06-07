import { z } from 'zod';

export const createYearSchema = z.object({
  year: z
    .number()
    .int()
    .min(1900, 'Enter a valid year')
    .max(2200, 'Enter a valid year'),
  label: z.string().max(120).nullable().optional(),
  is_active: z.boolean().optional(),
});

export const updateYearSchema = z
  .object({
    label: z.string().max(120).nullable().optional(),
    is_active: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field must be provided',
  });

export type CreateYearInput = z.infer<typeof createYearSchema>;
export type UpdateYearInput = z.infer<typeof updateYearSchema>;
