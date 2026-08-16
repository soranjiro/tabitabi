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

export const updateMoneyItemSchema = moneyItemFields.partial().superRefine((data, ctx) => {
  if (!Object.keys(data).length) ctx.addIssue({ code: 'custom', message: 'at least one field is required' });
  if (data.splits && new Set(data.splits.map((split) => split.member_id)).size !== data.splits.length) {
    ctx.addIssue({ code: 'custom', message: 'participants must be unique', path: ['splits'] });
  }
  if (data.splits && data.amount !== undefined && data.splits.reduce((sum, split) => sum + split.amount, 0) !== data.amount) {
    ctx.addIssue({ code: 'custom', message: 'split amounts must add up to amount', path: ['splits'] });
  }
});

export const moneySettingsSchema = z.object({
  budget_amount: z.number().int().positive().max(100_000_000).nullable(),
});

export const moneyFundTransactionSchema = z.object({
  member_id: z.string().min(1),
  kind: z.enum(['contribution', 'refund']),
  amount: z.number().int().positive('amount must be positive').max(100_000_000),
  note: z.string().trim().max(100).nullable().optional(),
  occurred_on: z.string().date().optional(),
});

export const updateMoneyFundTransactionSchema = moneyFundTransactionSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'at least one field is required' },
);

// ── Packing list ──────────────────────────────────────

export const packingItemSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(100, 'name must be at most 100 characters'),
  quantity: z.number().int().min(1, 'quantity must be at least 1').max(10, 'quantity must be at most 10').optional(),
  kind: z.enum(['personal', 'private', 'shared']),
  group_id: z.string().min(1, 'group is required'),
  assignee_member_id: z.string().nullable().optional(),
  owner_member_id: z.string().nullable().optional(),
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

export const reorderPackingGroupsSchema = z.object({
  group_ids: z.array(z.string().min(1)).min(1, 'at least one group is required')
    .refine((ids) => new Set(ids).size === ids.length, 'group ids must be unique'),
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

export const publishItinerarySchema = z.object({
  prefecture_slugs: z.array(z.string().trim().min(1).max(32)).min(1).max(3),
  areas: z.array(z.string().trim().min(1).max(16)).max(3).default([]),
  tags: z.array(z.string().trim().min(1).max(24)).max(3).default([]),
});

// ── Bookmarks ──────────────────────────────────────────

export const syncBookmarksSchema = z.object({
  itinerary_ids: z
    .array(z.string().min(1, 'itinerary_id must be non-empty'))
    .max(50, 'too many itinerary_ids (max 50)'),
});
