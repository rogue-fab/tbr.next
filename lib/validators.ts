import { z } from "zod";

/**
 * Canonical mandrel capability tiers used across UI, filters, and scoring inputs.
 * - none: no documented mandrel capability
 * - economy: non-bronze mandrel systems (plastic/aluminum/steel)
 * - bronze: bronze-class (nickel/bronze) or explicitly equivalent factory-supported system
 */
export const MandrelTierEnum = z.enum(["none", "economy", "bronze"]);
export type MandrelTier = z.infer<typeof MandrelTierEnum>;

export const TubeBenderSchema = z.object({
  id: z.string(),
  brand: z.string(),
  model: z.string(),
  maxCapacity: z.string(),
  clrRange: z.string(),
  dieCost: z.string(),
  cycleTime: z.string(),
  weight: z.string(),
  price: z.string(),
  mandrel: MandrelTierEnum,
  totalScore: z.number().min(0).max(10),
  imageUrl: z.string().optional(),
  description: z.string().optional(),
});

export type TubeBender = z.infer<typeof TubeBenderSchema>;

export const TubeBenderArraySchema = z.array(TubeBenderSchema);

