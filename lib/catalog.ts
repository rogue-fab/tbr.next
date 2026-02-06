export type ProductCitationSourceType =
  | "web-page"
  | "pdf"
  | "manual"
  | "email"
  | "other";

export type ProductCitation = {
  id: string;
  /** Scoring category key (e.g. "valueForMoney") */
  category: string;
  /** Optional: specific field within the category */
  field: string | null;
  sourceType: ProductCitationSourceType;
  /** URL or internal doc reference */
  urlOrRef: string;
  /** Short label for humans */
  title: string | null;
  /** YYYY-MM-DD preferred */
  accessed: string | null;
  /** Page/section/notes */
  note: string | null;
};

/**
 * Canonical, minimal catalog for TubeBenderReviews.
 * This file is the single source of truth used by pages and the public API.
 */
export type Product = {
  /** Stable canonical id used in routes and compare. */
  id: string;
  /** Optional route slug; defaults to id. */
  slug?: string;
  /** Human-friendly name; used for tiles/titles. */
  name?: string;
  brand?: string;
  model?: string;
  /** Public image path under /public (e.g., /images/products/<id>.jpg). */
  image?: string;
  /** Short bullets for the review page and tiles. */
  highlights?: string[];
  // Safe optional fields that may be shown on the review page:
  type?: string;
  country?: string;
  madeIn?: string;
  capacity?: string | number;
  max_od?: string | number;
  maxWall?: string | number;
  weight?: string | number;
  dimensions?: string;
  warranty?: string;
  price?: string | number;

  /**
   * Lawyer-safe, disclosure-based scoring tiers.
   * Optional and typically overlay-driven; kept here so catalog + overlay can share a single shape.
   */
  usaManufacturingTier?: string | number | null;
  originTransparencyTier?: string | number | null;
  singleSourceSystemTier?: string | number | null;
  warrantyTier?: string | number | null;

  // Review content fields (admin-editable via overlay)
  pros?: string | null;
  cons?: string | null;
  consSources?: string | null;
  keyFeatures?: string | null;
  materials?: string | null;

  // Citations (admin overlay / scoring audit)
  citationsRaw?: string | null;
  citations?: ProductCitation[] | null;
};

/**
 * Seed catalog for public compare/review UI.
 * These entries are intentionally simpler than the full DB schema from the old app:
 * we only expose fields the UI actually reads today.
 *
 * NOTE:
 * - The first 4 IDs are kept in sync with the public /api/tube-benders endpoint.
 * - Additional IDs are UI-only for now and can be wired to the API later.
 */
export const allTubeBenders: Product[] = [
  // --- Canonical RogueFab M6 family (split per model) ----------------------
  {
    id: "roguefab-m601",
    slug: "roguefab-m601",
    name: "RogueFab M601",
    brand: "RogueFab",
    model: "M601",
    image: "/images/products/roguefab-m600-series.jpg",
    country: "USA",
    capacity: '2-3/8" OD',
    warranty: "Lifetime (workmanship & material)",
    price: "Typical starter configuration pricing",
    highlights: [
      "High-end shop bender with serious capacity",
      "Extensive upgrade path (air/hydraulic, mandrel, tooling)",
      "Strong long-term ownership value",
    ],
  },
  {
    id: "roguefab-m605",
    slug: "roguefab-m605",
    name: "RogueFab M605",
    brand: "RogueFab",
    model: "M605",
    image: "/images/products/roguefab-m600-series.jpg",
    country: "USA",
    capacity: '2-3/8" OD',
    warranty: "Lifetime (workmanship & material)",
    price: "Typical starter configuration pricing",
    highlights: [
      "High-end shop bender with serious capacity",
      "Extensive upgrade path (air/hydraulic, mandrel, tooling)",
      "Strong long-term ownership value",
    ],
  },
  {
    id: "roguefab-m625",
    slug: "roguefab-m625",
    name: "RogueFab M625",
    brand: "RogueFab",
    model: "M625",
    image: "/images/products/roguefab-m600-series.jpg",
    country: "USA",
    capacity: '2-3/8" OD',
    warranty: "Lifetime (workmanship & material)",
    price: "Typical starter configuration pricing",
    highlights: [
      "High-end shop bender with serious capacity",
      "Extensive upgrade path (air/hydraulic, mandrel, tooling)",
      "Strong long-term ownership value",
    ],
  },

  // --- Remaining canonical models (match existing public API IDs) ----------
  {
    id: "jd2-model-32",
    slug: "jd2-model-32",
    name: "JD2 Model 32",
    brand: "JD2",
    model: "Model 32",
    image: "/images/products/jd2-model-32.jpg",
    country: "USA",
    capacity: '2" OD (typical roll cage sizes)',
    warranty: "Manufacturer standard",
    price: "$1,545 – $1,895",
    highlights: [
      "Well-known manual bender with long track record",
      "Simple, field-proven design with easy maintenance",
      "Huge installed base and community support",
    ],
  },
  {
    id: "pro-tools-105hd",
    slug: "pro-tools-105hd",
    name: "Pro-Tools 105HD",
    brand: "Pro-Tools",
    model: "105HD",
    image: "/images/products/pro-tools-105hd.jpg",
    country: "USA",
    capacity: '2" OD',
    warranty: "Manufacturer standard",
    price: "$1,264 – $1,609",
    highlights: [
      "Heavy-duty main frame with US-built components",
      "Common choice for small fab shops and hobby race teams",
      "Strong aftermarket die and accessory ecosystem",
    ],
  },
  {
    id: "baileigh-rdb-250",
    slug: "baileigh-rdb-250",
    name: "Baileigh RDB-250",
    brand: "Baileigh",
    model: "RDB-250",
    image: "/images/products/baileigh-rdb-250.jpg",
    country: "Imported",
    capacity: '2"–2.5" OD (varies by material)',
    warranty: "1 Year Limited",
    price: "Pro-tier pricing (varies by package)",
    highlights: [
      "Powered rotation with programmable bend angles",
      "Targeted at production/pro shops needing repeatability",
      "Requires commitment in budget and floor space",
    ],
  },

  // --- Additional models from the old seed data ---------------------------
  {
    id: "baileigh-rdb-050",
    slug: "baileigh-rdb-050",
    name: "Baileigh RDB-050",
    brand: "Baileigh",
    model: "RDB-050",
    image: "/images/products/baileigh-rdb-050.jpg",
    country: "Taiwan",
    capacity: '2.5" OD',
    warranty: "1 Year Limited",
    price: "$2,895 – $3,495",
    highlights: [
      "Manual rotary-draw bender with decent capacity",
      "Three-speed operation for flexibility with thicker tube",
      "Includes stand and degree dial in most packages",
    ],
  },
  {
    id: "jd2-model-32-hydraulic",
    slug: "jd2-model-32-hydraulic",
    name: "JD2 Model 32 Hydraulic",
    brand: "JD2",
    model: "Model 32 + Power Pack",
    image: "/images/products/jd2-model-32-hydraulic.jpg",
    country: "USA",
    capacity: '2" OD (hydraulic assist)',
    warranty: "Manufacturer standard",
    price: "$2,045 – $2,395",
    highlights: [
      "Hydraulic power pack upgrade for the Model 32",
      "Proven design with decades of field use",
      "Good bridge between manual and full production benders",
    ],
  },
  {
    id: "woodward-fab-wfb2",
    slug: "woodward-fab-wfb2",
    name: "Woodward Fab WFB2",
    brand: "Woodward Fab",
    model: "WFB2",
    image: "/images/products/woodward-fab-wfb2.jpg",
    country: "Imported",
    capacity: '2" OD (light wall)',
    warranty: "Limited",
    price: "$839 – $1,195",
    highlights: [
      "Very low entry price for a rotary-draw style bender",
      "CNC-machined components and engraved degree dial",
      "Aimed at budget-conscious hobby users",
    ],
  },
  {
    id: "jmr-tbm-250r-raceline",
    slug: "jmr-tbm-250r-raceline",
    name: "JMR TBM-250R RaceLine",
    brand: "JMR Manufacturing",
    model: "TBM-250R",
    image: "/images/products/jmr-tbm-250r-raceline.jpg",
    country: "USA",
    capacity: '2" OD',
    warranty: "Manufacturer standard",
    price: "$780 – $950",
    highlights: [
      "American-made manual bender aimed at race chassis work",
      "Three-speed manual operation for control over bend effort",
      "Heat-treated pins and hardware for long service life",
    ],
  },
  {
    id: "jmr-tbm-250-ultra",
    slug: "jmr-tbm-250-ultra",
    name: "JMR TBM-250 Ultra",
    brand: "JMR Manufacturing",
    model: "TBM-250 Ultra",
    image: "/images/products/jmr-tbm-250-ultra.jpg",
    country: "USA",
    capacity: '2" OD',
    warranty: "Manufacturer standard",
    price: "$1,000 – $1,250",
    highlights: [
      "Up-spec version of the TBM-250 with premium hardware",
      "Bronze bushings and upgraded finish for heavy use",
      "Targeted at serious fab shops needing durability",
    ],
  },
  {
    id: "pro-tools-brute",
    slug: "pro-tools-brute",
    name: "Pro-Tools BRUTE",
    brand: "Pro-Tools",
    model: "BRUTE",
    image: "/images/products/pro-tools-brute.jpg",
    country: "USA",
    capacity: 'Up to ~2.5" tube (by material)',
    warranty: "Manufacturer standard",
    price: "$4,500 – $6,500",
    highlights: [
      "Very high-capacity bender for heavy chassis and industrial work",
      "Hydraulic system with large cylinder and long stroke",
      "Built for pro shops where duty cycle matters",
    ],
  },
  {
    id: "mittler-bros-2500",
    slug: "mittler-bros-2500",
    name: "Mittler Bros 2500",
    brand: "Mittler Bros",
    model: "2500",
    image: "/images/products/mittler-bros-2500.jpg",
    country: "USA",
    capacity: '2.5" class with 25-ton ram (package dependent)',
    warranty: "Manufacturer standard",
    price: "$3,200 – $4,200",
    highlights: [
      "25-ton hydraulic ram with serious forming capability",
      "180° bending with appropriate die sets",
      "Common in circle track and race chassis applications",
    ],
  },
  {
    id: "hossfeld-no2",
    slug: "hossfeld-no2",
    name: "Hossfeld No. 2",
    brand: "Hossfeld",
    model: "No. 2",
    image: "/images/products/hossfeld-no2.jpg",
    country: "USA",
    capacity: 'Broad range depending on tooling',
    warranty: "Limited",
    price: "$1,800 – $2,500",
    highlights: [
      "Classic universal bender with 100+ years of history",
      "Huge tooling ecosystem for flat, bar, and tube",
      "Great for shops needing a general-purpose forming tool",
    ],
  },
  {
    id: "swag-offroad-rev2",
    slug: "swag-offroad-rev2",
    name: "SWAG Off Road REV 2",
    brand: "SWAG Off Road",
    model: "REV 2",
    image: "/images/products/swag-offroad-rev2.jpg",
    country: "USA",
    capacity: '2.0" OD (manual / hydraulic assist)',
    warranty: "1 Year Limited",
    price: "$970 – $1,250",
    highlights: [
      "Well-regarded DIY-friendly bender with tight tolerances",
      "Can be paired with bottle jack or hydraulic setups",
      "Popular in off-road and home-fabricator garages",
    ],
  },

  // --- Additional competitor families (stubs; enriched via admin overlay) ---
  {
    id: "jd2-model-4",
    slug: "jd2-model-4",
    name: "JD2 Model 4",
    brand: "JD2",
    model: "Model 4",
    image: "/images/products/placeholder.png",
    country: "USA",
    capacity: "Specs TBD via admin overlay",
    warranty: "Manufacturer standard",
    price: "Pricing TBD – research and confirm in admin overlay",
    highlights: [
      "Well-known JD2 platform competing directly with other manual shop benders",
      "Placeholder entry so scoring and admin overlay can be wired up",
      "Fill in capacity, pricing, and feature details from JD2 documentation",
    ],
  },
  {
    id: "affordable-bender",
    slug: "affordable-bender",
    name: "Affordable Bender (USA)",
    brand: "Affordable Bender",
    model: "Standard",
    image: "/images/products/placeholder.png",
    country: "USA",
    capacity: "Specs TBD via admin overlay",
    warranty: "Manufacturer standard",
    price: "Pricing TBD – research and confirm in admin overlay",
    highlights: [
      "Popular low-cost entry into rotary-draw style tube bending",
      "Frequently cross-shopped against RogueFab and JD2 by budget-focused buyers",
      "Full specs, USA-claim details, and die ecosystem to be documented in the admin overlay",
    ],
  },
  {
    id: "vevor-manual-240",
    slug: "vevor-manual-240",
    name: "Vevor Manual 240° Tube Bender",
    brand: "Vevor",
    model: "Manual 240°",
    image: "/images/products/placeholder.png",
    country: "Imported",
    capacity: "Specs TBD via admin overlay",
    warranty: "Limited (verify in docs)",
    price: "Aggressive budget pricing – confirm current ranges in admin overlay",
    highlights: [
      "Aggressively priced import bender that shows up in many marketplace and YouTube searches",
      "Important comparison point for buyers considering ultra-budget options",
      "Treat all specs and ratings as provisional until verified via citations in the overlay",
    ],
  },
  {
    id: "vevor-electric-3die",
    slug: "vevor-electric-3die",
    name: "Vevor Electric Tube Bending Machine (3-Die Kit)",
    brand: "Vevor",
    model: "Electric 3-Die",
    image: "/images/products/placeholder.png",
    country: "Imported",
    capacity: "Specs TBD via admin overlay",
    warranty: "Limited (verify in docs)",
    price: "Budget electric package – confirm current kit pricing in admin overlay",
    highlights: [
      "Low-cost powered tube bender bundle with three included dies",
      "Frequently purchased by first-time buyers looking for an electric option",
      "Requires careful verification of real-world capacity, duty cycle, and die fit before scoring",
    ],
  },
  {
    id: "tube-shark",
    slug: "tube-shark",
    name: "Tube Shark Bender",
    brand: "Tube Shark",
    model: "TS Series",
    image: "/images/products/placeholder.png",
    country: "USA",
    capacity: "Specs TBD via admin overlay",
    warranty: "Manufacturer standard",
    price: "Pricing TBD – research core configurations in admin overlay",
    highlights: [
      "Well-known shop bender family often compared against RogueFab M6-series machines",
      "Includes powered configurations and a distinct frame design; details to be documented",
      "Admin overlay should capture max OD, wall, bend angle, and die ecosystem before publishing review copy",
    ],
  },
  {
    id: "pdr-bender",
    slug: "pdr-bender",
    name: "PDR Bender (Randy Gabriel)",
    brand: "PDR",
    model: "Randy Gabriel Bender",
    image: "/images/products/placeholder.png",
    country: "USA",
    capacity: "Specs TBD via admin overlay",
    warranty: "Manufacturer standard",
    price: "Pricing TBD – confirm current packages promoted on Facebook/website",
    highlights: [
      "Heavily marketed on Facebook and social media as a competing chassis bender",
      "Important visibility competitor even if long-term track record is still being evaluated",
      "Use the admin overlay to log every claim with citations before scoring",
    ],
  },
  {
    id: "probender-105-manual",
    slug: "probender-105-manual",
    name: "ProBender 105 Manual",
    brand: "ProBender",
    model: "105 Manual",
    image: "/images/products/placeholder.png",
    country: "USA",
    capacity: "Specs TBD via admin overlay",
    warranty: "Manufacturer standard",
    price: "Pricing TBD – document base frame and starter die packages in overlay",
    highlights: [
      "Manual ProBender frame that competes directly with other 2\"-class shop benders",
      "Important baseline for comparing ProBender's ecosystem and upgrade path",
      "Overlay should capture real max OD, bend angle, and wall specs before scoring",
    ],
  },
  {
    id: "probender-105-hydraulic",
    slug: "probender-105-hydraulic",
    name: "ProBender 105 Hydraulic",
    brand: "ProBender",
    model: "105 Hydraulic",
    image: "/images/products/placeholder.png",
    country: "USA",
    capacity: "Specs TBD via admin overlay",
    warranty: "Manufacturer standard",
    price: "Pricing TBD – document hydraulic package pricing and options",
    highlights: [
      "Hydraulic version of the ProBender 105 aimed at serious fab shops",
      "Competes directly with other powered chassis benders in this capacity band",
      "Overlay should log cylinder size, power unit options, and duty-cycle claims with citations",
    ],
  },
  {
    id: "probender-302-one-shot",
    slug: "probender-302-one-shot",
    name: "ProBender 302 One Shot",
    brand: "ProBender",
    model: "302 One Shot",
    image: "/images/products/placeholder.png",
    country: "USA",
    capacity: "Specs TBD via admin overlay",
    warranty: "Manufacturer standard",
    price: "Pricing TBD – capture complete system pricing for common packages",
    highlights: [
      "Higher-capacity ProBender platform marketed for heavy chassis and industrial work",
      "One-shot style bending with serious tonnage potential – details to be documented",
      "Critical comparison point against other high-capacity hydraulic benders like BRUTE / Mittler",
    ],
  },
  {
    id: "probender-105-brute-hydraulic",
    slug: "probender-105-brute-hydraulic",
    name: "ProBender 105 BRUTE Hydraulic",
    brand: "ProBender",
    model: "105 BRUTE Hydraulic",
    image: "/images/products/placeholder.png",
    country: "USA",
    capacity: "Specs TBD via admin overlay",
    warranty: "Manufacturer standard",
    price: "Pricing TBD – confirm BRUTE package pricing and any included dies",
    highlights: [
      "Heavy-duty hydraulic ProBender configuration positioned as a BRUTE-level package",
      "Intended for users pushing the upper end of 2\"-class and heavier material work",
      "Overlay should document max OD, wall, bend angle, and recommended power unit for fair scoring",
    ],
  },
  {
    id: "eastwood-pro-former",
    slug: "eastwood-pro-former",
    name: "Eastwood Pro Former Tube Bender",
    brand: "Eastwood",
    model: "Pro Former",
    image: "/images/products/placeholder.png",
    country: "Imported",
    capacity: "Specs TBD via admin overlay",
    warranty: "Eastwood standard (confirm years / terms)",
    price: "Aggressive catalog pricing – confirm ranges in admin overlay",
    highlights: [
      "Widely sold Eastwood Pro Former kit that many hobby builders start with",
      "Extremely important for SEO because it's a common search / product-page path",
      "Overlay should capture max OD, bend angle, die coverage, and any known limitations from manuals/reviews",
    ],
  },
  {
    id: "eastwood-air-hydraulic-tube-bender",
    slug: "eastwood-air-hydraulic-tube-bender",
    name: "Eastwood Air-Hydraulic Tube Bender",
    brand: "Eastwood",
    model: "Air-Hydraulic Tube Bender",
    image: "/images/products/placeholder.png",
    country: "Imported",
    capacity: "Specs TBD via admin overlay",
    warranty: "Eastwood standard (confirm years / terms)",
    price: "Pricing TBD – confirm current catalog price and common kit bundles",
    highlights: [
      "Air-over-hydraulic Eastwood bender that competes with entry-level powered machines",
      "Common upgrade path for users stepping up from manual bottle-jack style benders",
      "Requires careful verification of real-world capacity and die fit before scoring",
    ],
  },
  {
    id: "eastwood-hydraulic-tube-bender",
    slug: "eastwood-hydraulic-tube-bender",
    name: "Eastwood Hydraulic Tube Bender",
    brand: "Eastwood",
    model: "Hydraulic Tube Bender",
    image: "/images/products/placeholder.png",
    country: "Imported",
    capacity: "Specs TBD via admin overlay",
    warranty: "Eastwood standard (confirm years / terms)",
    price: "Pricing TBD – confirm base hydraulic kit and included dies",
    highlights: [
      "Hydraulic-only Eastwood tube bender that appears in many \"budget hydraulic bender\" searches",
      "Key comparison point for buyers considering import hydraulic packages vs US-built systems",
      "Overlay should log tonnage, ram size, bend angle, and die ecosystem with citations before scoring",
    ],
  },
];

/**
 * Canonical IDs list for lightweight imports (e.g., landing page).
 * Kept in sync with `allTubeBenders`.
 */
export const VALID_IDS: string[] = allTubeBenders.map((p) => p.id);