// lib/adminDraftSchema.ts
import { z } from "zod";

/**
 * Admin Save Draft payload (v0).
 * - `fields` is an opaque object for now (we'll tighten to gold semantics later).
 * - `evidence` is normalized, field-scoped evidence capture (FTC-safe).
 */
export const evidenceItemSchema = z.object({
  fieldKey: z.string().min(1),
  sourceType: z.enum(["web-page", "pdf", "manual", "other"]),
  url: z.string().url().optional(),
  quotedText: z.string().optional(),
  howGathered: z.string().optional(),
  notes: z.string().optional(),
  verifiedBy: z.string().optional(),
  verifiedAt: z.string().optional(), // ISO string (optional); server will default to now()
});

export const saveDraftBodySchema = z.object({
  fields: z.record(z.unknown()).default({}),
  evidence: z.array(evidenceItemSchema).default([]),
});

// Alias for consistency with route handlers
export const adminDraftSchema = saveDraftBodySchema;

export type SaveDraftBody = z.infer<typeof saveDraftBodySchema>;

