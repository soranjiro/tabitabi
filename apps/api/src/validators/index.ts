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
  theme_preset_id: z.string().min(1).max(64).optional(),
  theme_id: z.string().optional(),
  palette_id: z.string().min(1).max(32).optional(),
  packing_enabled: z.boolean().optional(),
  memo: z.string().optional(),
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
  theme_preset_id: z.string().min(1).max(64).optional(),
  theme_id: z.string().optional(),
  palette_id: z.string().min(1).max(32).optional(),
  packing_enabled: z.boolean().optional(),
  prefecture_slugs: z.array(z.string().trim().min(1).max(32)).max(3).optional(),
  areas: z.array(z.string().trim().min(1).max(16)).max(3).optional(),
  tags: z.array(z.string().trim().min(1).max(24)).max(3).optional(),
  metadata_initialized: z.boolean().optional(),
  memo: z.string().optional(),
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

const moneyItemFields = z.object({
  title: z.string().trim().min(1, 'title is required').max(100, 'title must be at most 100 characters'),
  amount: z.number().int().positive('amount must be positive').max(100_000_000),
  paid_by_member_id: z.string().nullable().optional(),
  paid_from_fund: z.boolean().optional(),
  status: z.enum(['paid', 'planned']),
  is_settled: z.boolean().optional(),
  occurred_on: z.string().date().nullable().optional(),
  step_id: z.string().nullable().optional(),
  splits: z.array(z.object({
    member_id: z.string().min(1),
    amount: z.number().int().positive('split amount must be positive').max(100_000_000),
  })).min(1, 'at least one participant is required').max(50).optional(),
  split_member_ids: z.array(z.string()).min(1, 'at least one participant is required').max(50).optional(),
});

export const moneyItemSchema = moneyItemFields.superRefine((data, ctx) => {
  if (!data.splits?.length && !data.split_member_ids?.length) {
    ctx.addIssue({ code: 'custom', message: 'at least one participant is required', path: ['splits'] });
  }
  if (data.splits && new Set(data.splits.map((split) => split.member_id)).size !== data.splits.length) {
    ctx.addIssue({ code: 'custom', message: 'participants must be unique', path: ['splits'] });
  }
  if (data.splits && data.splits.reduce((sum, split) => sum + split.amount, 0) !== data.amount) {
    ctx.addIssue({ code: 'custom', message: 'split amounts must add up to amount', path: ['splits'] });
  }
});

export const fundTransactionSchema = z.object({
  member_id: z.string().min(1),
  kind: z.enum(['contribution', 'refund']),
  amount: z.number().int().positive('amount must be positive').max(100_000_000),
  note: z.string().trim().max(200).nullable().optional(),
  occurred_on: z.string().date(),
});

export const moneyFundSchema = z.object({
  target_amount: z.number().int().positive('target amount must be positive').max(1_000_000_000).nullable(),
});

// ── Packing ────────────────────────────────────────────

export const packingGroupSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(40, 'name must be at most 40 characters'),
});

export const packingItemSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(80, 'name must be at most 80 characters'),
  kind: z.enum(['personal', 'private', 'shared']),
  group_id: z.string().min(1),
  quantity: z.number().int().positive().max(999).optional(),
  assignee_member_id: z.string().nullable().optional(),
  owner_member_id: z.string().nullable().optional(),
});

export const updatePackingItemSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  group_id: z.string().min(1).optional(),
  quantity: z.number().int().positive().max(999).optional(),
  assignee_member_id: z.string().nullable().optional(),
  is_packed: z.boolean().optional(),
});

export const packingCheckSchema = z.object({
  checked: z.boolean(),
});

// ── Publishing / profile ───────────────────────────────

export const publishItinerarySchema = z.object({
  prefecture_slugs: z.array(z.string().trim().min(1).max(32)).min(1).max(3),
  areas: z.array(z.string().trim().min(1).max(16)).max(3).optional().default([]),
  tags: z.array(z.string().trim().min(1).max(24)).max(3).optional().default([]),
});

export const updateProfileSchema = z.object({
  username: z.string().trim().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/).optional(),
  prefecture: z.enum(PREFECTURES).optional(),
});

export const syncBookmarksSchema = z.object({
  itinerary_ids: z.array(z.string().min(1)).max(100),
});
