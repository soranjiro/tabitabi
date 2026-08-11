import { z } from 'zod';
import { PREFECTURES } from '@tabitabi/types';

// ── Users ──────────────────────────────────────────────

export const bootstrapProfileSchema = z.object({
  username: z
    .string()
    .min(3, 'username must be at least 3 characters')
    .max(20, 'username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'username must contain only alphanumeric characters and underscores')
    .optional(),
  prefecture: z.enum(PREFECTURES).optional(),
});

// ── Itineraries ────────────────────────────────────────

export const createItinerarySchema = z.object({
  title: z
    .string({ error: 'title is required' })
    .min(1, 'title is required')
    .max(100, 'title must be at most 100 characters'),
  theme_id: z.string().optional(),
  default_view_mode: z.enum(['dayCard', 'list', 'month', 'week']).optional(),
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
  default_view_mode: z.enum(['dayCard', 'list', 'month', 'week']).optional(),
  memo: z.string().optional(),
  walica_id: z.string().nullable().optional(),
  password: z.string().optional(),
  secret_settings: z.object({
    enabled: z.boolean(),
    offset_minutes: z.number(),
  }).nullable().optional(),
});

// ── Money management ──────────────────────────────────

export const tripMemberSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(40, 'name must be at most 40 characters'),
});

export const moneyMemberSchema = tripMemberSchema;

export const moneyItemSchema = z.object({
  title: z.string().trim().min(1, 'title is required').max(100, 'title must be at most 100 characters'),
  amount: z.number().int().positive('amount must be positive').max(100_000_000),
  paid_by_member_id: z.string().nullable().optional(),
  status: z.enum(['paid', 'planned']),
  is_settled: z.boolean().optional(),
  occurred_on: z.string().date().nullable().optional(),
  step_id: z.string().nullable().optional(),
  split_member_ids: z.array(z.string()).min(1, 'at least one participant is required').max(50),
});

export const updateMoneyItemSchema = moneyItemSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'at least one field is required' },
);

export const moneySettingsSchema = z.object({
  budget_amount: z.number().int().positive().max(100_000_000).nullable(),
});

// ── Packing list ──────────────────────────────────────

export const packingItemSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(100, 'name must be at most 100 characters'),
  quantity: z.number().int().min(1, 'quantity must be at least 1').max(999, 'quantity must be at most 999').optional(),
  kind: z.enum(['personal', 'shared']),
  group_id: z.string().min(1, 'group is required'),
  assignee_member_id: z.string().nullable().optional(),
});

export const updatePackingItemSchema = packingItemSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'at least one field is required' },
);

export const packingCheckSchema = z.object({
  member_id: z.string().nullable().optional(),
  checked: z.boolean(),
});

export const packingGroupSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(50, 'name must be at most 50 characters'),
});

// ── Profile / Password ─────────────────────────────────

export const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3, 'username must be at least 3 characters')
    .max(20, 'username must be at most 20 characters')
    .optional(),
  prefecture: z.enum(PREFECTURES).optional(),
}).refine(data => data.username !== undefined || data.prefecture !== undefined, {
  message: 'username or prefecture is required',
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
