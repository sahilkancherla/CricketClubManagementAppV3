import { z } from 'zod';
import {
  ROLES,
  MEMBER_STATUSES,
  PLAYER_TYPES,
  BATTING_HANDS,
  BOWLING_TYPES,
} from '../constants';

export const createClubSchema = z.object({
  name: z.string().min(1, 'Club name is required'),
  contact_email: z.string().email('Valid email required').nullable().optional(),
});

export const updateClubSchema = z.object({
  name: z.string().min(1).optional(),
  logo_url: z.string().url().nullable().optional(),
  contact_email: z.string().email('Valid email required').nullable().optional(),
});

export const addMemberRoleSchema = z.object({
  role: z.enum(ROLES),
});

// Cricket role detail fields shared between add/update member flows.
const cricketDetailFields = {
  player_type: z.enum(PLAYER_TYPES).nullable().optional(),
  batting_hand: z.enum(BATTING_HANDS).nullable().optional(),
  bowling_type: z.enum(BOWLING_TYPES).nullable().optional(),
};

export const updateMemberSchema = z
  .object({
    status: z.enum(MEMBER_STATUSES).optional(),
    join_date: z.string().optional(),
    notes: z.string().max(10000).nullable().optional(),
    ...cricketDetailFields,
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field must be provided',
  });

// Add a member. A member can be:
//   - an existing app user (matched by email),
//   - an invited account (email + invite: true provisions a login),
//   - or a name-only placeholder (no account, email optional).
// At least a name or an email must be provided. Accepts a single `role` or a
// `roles` array; defaults to ['player'] when both are absent.
export const addMemberSchema = z
  .object({
    first_name: z.string().min(1).max(120).optional(),
    last_name: z.string().max(120).optional(),
    email: z
      .union([z.string().email('Valid email required'), z.literal('')])
      .optional(),
    invite: z.boolean().optional(),
    role: z.enum(ROLES).optional(),
    roles: z.array(z.enum(ROLES)).optional(),
    status: z.enum(MEMBER_STATUSES).optional(),
    join_date: z.string().optional(),
    ...cricketDetailFields,
  })
  .refine((v) => Boolean((v.first_name && v.first_name.trim()) || (v.email && v.email.trim())), {
    message: 'Provide a name or an email',
  })
  .refine((v) => !v.invite || Boolean(v.email && v.email.trim()), {
    message: 'An email is required to send an invite',
    path: ['email'],
  });

// Admin-initiated update to another member's profile + cricket details.
export const adminUpdateMemberProfileSchema = z.object({
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  phone: z.string().max(40).nullable().optional(),
  email: z
    .union([z.string().email('Valid email required'), z.literal('')])
    .nullable()
    .optional(),
  paypal_email: z
    .union([z.string().email('Valid email required'), z.literal('')])
    .nullable()
    .optional(),
});

export const joinClubSchema = z.object({
  player_type: z.enum(PLAYER_TYPES).nullable().optional(),
  batting_hand: z.enum(BATTING_HANDS).nullable().optional(),
  bowling_type: z.enum(BOWLING_TYPES).nullable().optional(),
});

export type CreateClubInput = z.infer<typeof createClubSchema>;
export type UpdateClubInput = z.infer<typeof updateClubSchema>;
export type AddMemberRoleInput = z.infer<typeof addMemberRoleSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type AdminUpdateMemberProfileInput = z.infer<typeof adminUpdateMemberProfileSchema>;
export type JoinClubInput = z.infer<typeof joinClubSchema>;
