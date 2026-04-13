import { z } from 'zod';

// ── Users ──────────────────────────────────────────────

export const registerSchema = z.object({
  username: z
    .string({ error: 'username is required' })
    .min(3, 'username must be at least 3 characters')
    .max(20, 'username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'username must contain only alphanumeric characters and underscores'),
  email: z
    .string({ error: 'email is required' })
    .email('invalid email format'),
  password: z
    .string({ error: 'password is required' })
    .min(8, 'password must be at least 8 characters'),
});

export const loginSchema = z.object({
  email: z
    .string({ error: 'email is required' })
    .email('invalid email format'),
  password: z
    .string({ error: 'password is required' })
    .min(1, 'password is required'),
});

// ── Itineraries ────────────────────────────────────────

export const createItinerarySchema = z.object({
  title: z
    .string({ error: 'title is required' })
    .min(1, 'title is required')
    .max(100, 'title must be at most 100 characters'),
  theme_id: z.string().optional(),
  memo: z.string().optional(),
  walica_id: z.string().optional(),
  password: z.string().optional(),
  secret_settings: z.object({
    enabled: z.boolean(),
    offset_minutes: z.number(),
  }).optional(),
});

export const updateItinerarySchema = z.object({
  title: z
    .string()
    .min(1, 'title must not be empty')
    .max(100, 'title must be at most 100 characters')
    .optional(),
  theme_id: z.string().optional(),
  memo: z.string().optional(),
  walica_id: z.string().nullable().optional(),
  password: z.string().optional(),
  secret_settings: z.object({
    enabled: z.boolean(),
    offset_minutes: z.number(),
  }).nullable().optional(),
});

// ── Profile / Password ─────────────────────────────────

export const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3, 'username must be at least 3 characters')
    .max(20, 'username must be at most 20 characters')
    .optional(),
  email: z
    .string()
    .email('invalid email format')
    .optional(),
}).refine(data => data.username !== undefined || data.email !== undefined, {
  message: 'username or email is required',
});

export const updatePasswordSchema = z.object({
  current_password: z
    .string({ error: 'current_password is required' })
    .min(1, 'current_password is required'),
  new_password: z
    .string({ error: 'new_password is required' })
    .min(8, 'new_password must be at least 8 characters'),
});

export const updateVisibilitySchema = z.object({
  is_visible: z.boolean({ error: 'is_visible must be a boolean' }),
});

// ── Bookmarks ──────────────────────────────────────────

export const syncBookmarksSchema = z.object({
  itinerary_ids: z
    .array(z.string().min(1, 'itinerary_id must be non-empty'))
    .max(50, 'too many itinerary_ids (max 50)'),
});
