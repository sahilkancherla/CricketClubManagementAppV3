import { z } from 'zod';
import { PAYMENT_STATUSES } from '../constants';

// Create a payment and assign it. Either assign to everyone (`assign_all`)
// or to a specific set of users (`user_ids`).
export const createPaymentSchema = z
  .object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().max(5000).nullable().optional(),
    amount_cents: z.number().int().min(0, 'Amount must be positive'),
    due_date: z.string().nullable().optional(),
    year_id: z.string().uuid().nullable().optional(),
    assign_all: z.boolean().optional(),
    user_ids: z.array(z.string().uuid()).optional(),
  })
  .refine(
    (v) => v.assign_all === true || (v.user_ids && v.user_ids.length > 0),
    { message: 'Assign to all members or pick at least one', path: ['user_ids'] },
  );

export const updatePaymentSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().max(5000).nullable().optional(),
    amount_cents: z.number().int().min(0).optional(),
    due_date: z.string().nullable().optional(),
    year_id: z.string().uuid().nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field must be provided',
  });

export const updateAssignmentSchema = z.object({
  status: z.enum(PAYMENT_STATUSES),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;
