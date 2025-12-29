'use client';

import { useEffect, useState } from 'react';
// Admin grid reads from /api/admin/products; writes hit /api/admin/products/[id]

type Product = {
  id: string;
  brand?: string;
  model?: string;
  // Scoring-related fields (drive the 100-pt score)
  maxCapacity?: string;
  country?: string;
  powerType?: string;
  bendAngle?: string | number;
  wallThicknessCapacity?: string;
  sBendCapability?: string | boolean;
  // Other descriptive/display fields
  clrRange?: string;
  cycleTime?: string;
  weight?: string;
  mandrel?: string;
  // Newly added public-facing fields
  type?: string;
  max_od?: string;
  maxWall?: string;
  dimensions?: string;
  warranty?: string;
  yearsInBusiness?: string;

  // Disclosure-based scoring tiers (edited only from published claims)
  usaManufacturingTier?: string;
  originTransparencyTier?: string;
  /**
   * "How complete is the system from this one manufacturer?"
   */
  singleSourceSystemTier?: string;
  warrantyTier?: string;
  image?: string;
  highlights?: string; // stored comma-separated for simple admin editing
  dieShapes?: string; // comma-separated list of die shape families

  // Review content fields (all optional; stored in overlay)
  pros?: string;
  cons?: string;
  consSources?: string;
  keyFeatures?: string;
  materials?: string;

  // Pricing breakdown fields (all optional; stored in overlay)
  framePriceMin?: string;
  framePriceMax?: string;
  diePriceMin?: string;
  diePriceMax?: string;
  // Apples-to-apples 1.50" OD reference die (midpoint)
  diePrice150Mid?: string;
  hydraulicPriceMin?: string;
  hydraulicPriceMax?: string;
  standPriceMin?: string;
  standPriceMax?: string;

  // Upgrade path & modularity flags (YES/NO in admin; normalized to booleans in scoring)
  hasPowerUpgradePath?: string | boolean;
  lengthStop?: string | boolean;
  rotationIndexing?: string | boolean;
  angleMeasurement?: string | boolean;
  autoStop?: string | boolean;
  thickWallUpgrade?: string | boolean;
  thinWallUpgrade?: string | boolean;
  wiperDieSupport?: string | boolean;

  // Raw citations field (line-based, parsed into structured citations server-side)
  citationsRaw?: string;

  // Dynamic per-field citation data (we don't enumerate every key here)
  [key: string]: any;
};

type RowCitationClipboard = {
  source1: string;
  source2: string;
  notes: string;
  userCode: string;
};

export default function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [citationClipboard, setCitationClipboard] =
    useState<RowCitationClipboard | null>(null);

  // Draft/publish workflow state (explicit Save/Publish only)
  const [draftMeta, setDraftMeta] = useState<{
    id: string;
    status: string;
    version: number;
    updatedAt: string;
  } | null>(null);

  const [publishedMeta, setPublishedMeta] = useState<{
    id: string;
    status: string;
    version: number;
    updatedAt: string;
  } | null>(null);
  const [publishedLoadError, setPublishedLoadError] = useState<string | null>(
    null,
  );

  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [draftLoadError, setDraftLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const loadPublishedForProduct = async (productId: string) => {
    setPublishedLoadError(null);
    try {
      const res = await fetch(`/api/admin/products/${productId}/publish`, {
        method: "GET",
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("Load published failed:", res.status, txt);
        setPublishedMeta(null);
        setPublishedLoadError(`Failed to load published (${res.status})`);
        return;
      }
      const json = (await res.json()) as any;
      const p = json?.published ?? null;
      if (!p) {
        setPublishedMeta(null);
        return;
      }
      setPublishedMeta({
        id: String(p.id),
        status: String(p.status),
        version: Number(p.version ?? 0),
        updatedAt: String(p.updatedAt ?? p.updated_at ?? ""),
      });
    } catch (err) {
      console.error("Load published error:", err);
      setPublishedMeta(null);
      setPublishedLoadError("Failed to load published");
    }
  };

  const loadDraftForProduct = async (id: string) => {
    setDraftLoadError(null);
    try {
      const res = await fetch(`/api/admin/products/${id}/draft`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setDraftLoadError(`Failed to load draft (${res.status})`);
        setDraftMeta(null);
        return;
      }
      const json: any = await res.json();
      const draft = json?.draft ?? null;
      const fields = draft?.fields ?? {};
      const score = draft?.score ?? {};

      // Merge draft fields into the local editable product row (no writes).
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...(fields || {}) } : p)),
      );

      if (draft) {
        setDraftMeta({
          id: draft.id,
          status: draft.status,
          version: Number(draft.version ?? 0),
          updatedAt: String(draft.updatedAt ?? ""),
        });
      } else {
        setDraftMeta(null);
      }

      setIsDirty(false);
    } catch (e) {
      console.error("Failed to load draft:", e);
      setDraftLoadError("Failed to load draft");
      setDraftMeta(null);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/admin/products", { cache: "no-store" });

      if (!res.ok) {
        setError("Failed to fetch products");
        return;
      }
      const json: any = await res.json();
      // Accept either { ok, data } or a raw array (defensive)
      let rows: any[] = [];

      if (Array.isArray(json)) {
        rows = json;
      } else if (Array.isArray(json?.data)) {
        rows = json.data;
      } else if (json?.ok && Array.isArray(json?.data)) {
        rows = json.data;
      } else {
        rows = [];
      }
      setProducts(rows as Product[]);
      setError("");
    } catch {
      setError("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  // Update helper – keep type loose so we can use dynamic citation keys.
  // NOTE: Batch 4.1 removes autosave. All edits are local until Save Draft.
  const updateProduct = async (id: string, field: string, value: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
    setIsDirty(true);
  };

  // Local-only update helper so we can keep inputs responsive while typing
  // without refetching the entire product list on every keystroke.
  const updateProductLocalField = (id: string, field: string, value: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
    setIsDirty(true);
  };

  // Default to first product once loaded
  useEffect(() => {
    if (!selectedId && products.length > 0) {
      setSelectedId(products[0].id);
    }
  }, [products, selectedId]);

  // Load draft when selection changes (and after products first load).
  useEffect(() => {
    if (!selectedId) return;
    if (!products.find((p) => p.id === selectedId)) return;
    void loadDraftForProduct(selectedId);
    void loadPublishedForProduct(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, products.length]);

  if (loading) {
    return <div className="py-8 text-center">Loading products...</div>;
  }

  if (error) {
    return (
      <div className="py-8 text-center text-red-600">
        Error: {error}
      </div>
    );
  }

  const selectedProduct =
    products.find((p) => p.id === selectedId) ?? products[0] ?? null;

  const buildFieldsPayload = (p: Product) => {
    // Do not persist identity/display-only keys.
    // We intentionally keep this permissive: whatever the UI edits becomes draft fields.
    const {
      id,
      brand,
      model,
      image,
      ...rest
    } = (p as any) || {};

    // Remove undefined so Neon JSON stays clean.
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (typeof v !== "undefined") out[k] = v;
    }
    return out;
  };

  const saveDraft = async () => {
    if (!selectedProduct) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/products/${selectedProduct.id}/draft`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: buildFieldsPayload(selectedProduct),
          evidence: [],
        }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("Save draft failed:", res.status, txt);
        alert(`Save failed (${res.status}). Check console.`);
        return;
      }

      setIsDirty(false);

      // Reload draft so UI reflects canonical saved state (timestamps/version/evidence)
      await loadDraftForProduct(selectedProduct.id);
      // Published doesn't change on save, but loading keeps UI consistent if server
      // normalizes anything you might later mirror on the read side.
      await loadPublishedForProduct(selectedProduct.id);
    } finally {
      setSaving(false);
    }
  };

  const publishDraft = async () => {
    if (!selectedProduct) return;
    setPublishing(true);
    try {
      const res = await fetch(`/api/admin/products/${selectedProduct.id}/publish`, {
        method: "POST",
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("Publish failed:", res.status, txt);
        alert(`Publish failed (${res.status}). Check console.`);
        return;
      }
      // After publish, reload both draft and published views (status/version will change)
      await loadDraftForProduct(selectedProduct.id);
      await loadPublishedForProduct(selectedProduct.id);
    } finally {
      setPublishing(false);
    }
  };

  if (!selectedProduct) {
  return (
      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-sm text-gray-600">
          No products loaded. Check base catalog / overlay.
        </p>
      </div>
    );
  }

  // Derive a filesystem-safe slug from a slug or id.
  // - Lowercase
  // - Only allow [a-z0-9-]
  // - Replace everything else with "-"
  // - Collapse repeated "-" and trim from ends
  // If we somehow end up empty, fall back to "missing-slug" so the path is still stable.
  const computeSafeSlug = (slugOrId: string | null | undefined): string => {
    const raw = String(slugOrId ?? "")
      .toLowerCase()
      .trim();

    const safe =
      raw
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || "missing-slug";

    return safe;
  };

  const safeSlug = computeSafeSlug(
    (selectedProduct as any).slug ?? selectedProduct.id ?? "",
  );

  const specRows: {
    key: string;
    label: string;
    description: string;
    options?: string[];
  }[] = [
    {
      key: "maxCapacity",
      label: "* Max Capacity (OD, inches)",
      description: "Largest round tube OD this machine can bend.",
    },
    {
      key: "country",
      label: '* Country / Made In (FTC claim bucket)',
      description:
        'Origin / claim category. Only machines meeting FTC-unqualified "Made in USA" criteria receive USA Manufacturing points.',
      options: [
        'FTC-unqualified "Made in USA"',
        "Assembled in USA / qualified USA claim",
        "Non-USA or no USA claim",
      ],
    },
    {
      key: "usaManufacturingTier",
      label: "* USA manufacturing disclosure tier (0–5 pts)",
      description:
        "Disclosure-based only. This tier reflects how the manufacturer themselves describe where frame, dies, and hydraulics are made. We do not infer or guess origin and we do not verify supply chains – we simply score what they publicly claim.",
      options: [
        "5 – Frame + dies + hydraulics manufactured/assembled in USA (per manufacturer disclosure)",
        "4 – Frame + dies USA; hydraulics partially USA (per disclosure)",
        "3 – Frame USA; dies origin unclear; hydraulics clearly imported",
        "2 – Mostly USA fabrication with key imported components (per disclosure)",
        "1 – Minor USA contribution (assembly, hardware, or similar) per disclosure",
        "0 – No disclosed USA manufacturing / clearly imported",
      ],
    },
    {
      key: "originTransparencyTier",
      label: "* Origin / transparency tier (0–5 pts)",
      description:
        "How clearly the manufacturer documents the origin of major components. This is a transparency score only – it does NOT claim where anything is actually made.",
      options: [
        "5 – Full documentation of frame, dies, hydraulics, and major components",
        "4 – Clear origin info for all major components, with only minor gaps",
        "3 – Partial disclosure (some components documented, others omitted)",
        "2 – Minimal disclosure (scattered or vague origin language)",
        "0 – No meaningful origin disclosure or conflicting/unclear claims",
      ],
    },
    {
      key: "powerType",
      label: "* Power Type",
      description:
        "Check all that apply. For scoring, we treat any configuration that includes a hydraulic option as Hydraulic, and count Manual when a manual mode is available.",
      options: [
        "Manual",
        "Air / Hydraulic",
        "Electric / Hydraulic",
      ],
    },
    {
      key: "portability",
      label: "* Portability / base configuration",
      description:
        "How the machine lives in the shop. This directly feeds the Ease of Use & Setup score: fixed, portable, portable with rolling option, or rolling as standard.",
      // These values are normalized tokens consumed by the scoring engine.
      // They are intentionally plain to keep scoring deterministic.
      options: [
        "fixed",
        "portable",
        "portable_with_rolling_option",
        "rolling_standard",
      ],
    },
    {
      key: "bendAngle",
      label: "* Bend Angle (°)",
      description:
        "Maximum advertised single-pass bend angle in degrees (for the machine and tooling used in scoring).",
    },
    {
      key: "wallThicknessCapacity",
      label: '* Wall Thickness (1.75" DOM, inches)',
      description:
        'Max wall for 1.75" DOM used for wall thickness scoring. Use the thickest published spec.',
    },
    {
      key: "dieShapes",
      label: "* Die shapes (select all that apply)",
      description:
        "Check every tube/pipe family this machine has a real, supported die line for. Use 'Other' only when a major shape type isn't covered by the options.",
    },
    {
      key: "mandrel",
      label: "* Mandrel option",
      description:
        "Select the manufacturer-documented mandrel offering for this frame. If it is not explicitly documented, score is 0 (none).",
      // Canonical tokens consumed by the scoring engine. Keep these stable.
      options: ["none", "economy", "bronze"],
    },
    {
      key: "sBendCapability",
      label: "* S-Bend capable (Yes/No)",
      description:
        "Yes/No: documented ability to create a true S-bend: two opposite-direction bends with effectively no straight between them. For scoring we require ≤0.125\" straight (tangent) between bends, proven by specs, photos, or repeatable test pieces. Marketing examples with several inches of straight between bends do NOT qualify. This field is heavily weighted in scoring because true S-bend capability unlocks complex chassis and header work.",
      options: ["", "Yes", "No"],
    },
    {
      key: "hasPowerUpgradePath",
      label: "* Power upgrade path (Yes/No)",
      description:
        "Does the manufacturer document a supported power upgrade path on this frame (e.g. manual → hydraulic kit, higher-output power unit, or similar factory-supported power option)? Only mark Yes when it is clearly documented for this model.",
      options: ["", "Yes", "No"],
    },
    {
      key: "lengthStop",
      label: "* Length stop / backstop (Yes/No)",
      description:
        "Documented length stop or backstop system for repeatable bend locations along the tube. Only mark Yes when the manufacturer sells or documents it as a supported accessory or configuration for this model.",
      options: ["", "Yes", "No"],
    },
    {
      key: "rotationIndexing",
      label: "* Rotation indexing (Yes/No)",
      description:
        "Documented rotation indexing or fixture that helps the user repeat bend-to-bend rotation (LRA 'R'). This can be a chuck-style indexer, pinned index plate, or similar system sold for this machine.",
      options: ["", "Yes", "No"],
    },
    {
      key: "angleMeasurement",
      label: "* Built-in angle measurement (Yes/No)",
      description:
        "Built-in or securely machine-mounted angle measurement for bend angle (LRA 'A'). Loose angle cubes or protractors that simply sit on the tube do not count; the indicator must be part of, or lock solidly to, the machine.",
      options: ["", "Yes", "No"],
    },
    {
      key: "autoStop",
      label: "* Auto stop for bend angle (Yes/No)",
      description:
        "Auto-stop or similar feature that lets the user set a target bend angle and have the machine stop itself at that angle. Behaves like a light version of CNC on angle only. Rare but extremely valuable; only mark Yes when this is clearly documented.",
      options: ["", "Yes", "No"],
    },
    {
      key: "thickWallUpgrade",
      label: "* Thick-wall upgrade tooling (Yes/No)",
      description:
        "Any manufacturer-documented upgrade specifically aimed at improving performance on heavier wall / high-load work (for example longer or reinforced pressure dies, torque or pressure upgrades, or heavy-duty thick-wall packages for this frame).",
      options: ["", "Yes", "No"],
    },
    {
      key: "thinWallUpgrade",
      label: "* Thin-wall / quality upgrade tooling (Yes/No)",
      description:
        "Any manufacturer-documented upgrade specifically aimed at improving bend quality on thin wall, aluminum, stainless, or similar (for example translating or rolling pressure dies, or other thin-wall focused upgrades claimed to reduce wrinkling / distortion).",
      options: ["", "Yes", "No"],
    },
    {
      key: "wiperDieSupport",
      label: "* Wiper die support (Yes/No)",
      description:
        "Documented ability to use wiper dies on this frame. Important for thin-wall and high-precision work. We still keep mandrel in its own scoring category; this flag only covers the presence of wiper die support as an additional bend-quality lever.",
      options: ["", "Yes", "No"],
    },
    {
      key: "singleSourceSystemTier",
      label: "* Single-source system (0–2 pts, binary)",
      description:
        "Binary: either a complete, fully functional system (frame + dies + hydraulics / lever) can be bought from one primary manufacturer/storefront, or it cannot. Kit-bashers don't care; everyone else usually bails as soon as one major component isn't available from the main source.",
      options: [
        "2 – Frame + dies + hydraulics/lever all sold by one primary manufacturer/storefront",
        "0 – One or more required components must be sourced elsewhere",
      ],
    },
    {
      key: "warrantyTier",
      label: "* Warranty tier (0–3 pts; disclosure only)",
      description:
        "Score the strength and clarity of the written warranty only. We do NOT and cannot verify whether warranties are honored in practice – this is purely about what the manufacturer publicly promises.",
      options: [
        "3 – Strong, clearly written warranty (e.g. lifetime on frame or ≥3-year comprehensive coverage)",
        "2 – Standard limited warranty (e.g. 1–2 years on frame/components) clearly documented",
        "1 – Short or heavily limited warranty that is still explicitly documented",
        "0 – No meaningful written warranty, sold as-is, or warranty not mentioned",
      ],
    },
    {
      key: "framePriceMin",
      label: "Frame price – Min",
      description:
        "Lowest documented frame price we would actually recommend for a safe, usable system.",
    },
    {
      key: "framePriceMax",
      label: "Frame price – Max",
      description:
        "Highest documented frame price that is still a normal catalog option (no special-order / custom builds).",
    },
    {
      key: "diePriceMin",
      label: "Die price – Min (180° complete)",
      description:
        "Lowest priced 180° complete die (ready to bend in the machine), if available. Excludes exotic options (polishing, billet spacers, alternate alloys, specialty pressure-die upgrades).",
    },
    {
      key: "diePrice150Mid",
      label: 'Die price – 1.50" reference (midpoint)',
      description:
        'Lowest priced 1.50" OD 180° complete die (ready to bend in the machine). If no 180° 1.50" die is sold, use the lowest priced 1.50" die that reaches the highest published bend angle for that size. Excludes exotic options such as polishing, billet spacers, alternate alloys, or specialty pressure-die upgrades.',
    },
    {
      key: "diePriceMax",
      label: "Die price – Max (limiting OD / CLR)",
      description:
        "Lowest priced 180° complete die (ready to bend in the machine) that matches either the published max OD or the published max CLR for this machine (whichever represents the higher/limiting capability). Excludes optional upgrades like coatings, premium alloys, billet components, or special pressure-die materials.",
    },
    {
      key: "hydraulicPriceMin",
      label: "Hydraulics price – Min",
      description:
        "Lowest price manufacturer-endorsed hydraulic or power option (can be third-party if explicitly supported).",
    },
    {
      key: "hydraulicPriceMax",
      label: "Hydraulics price – Max",
      description:
        "Highest price normal catalog hydraulic / power option (no custom one-off systems).",
    },
    {
      key: "standPriceMin",
      label: "Stand / cart price – Min",
      description:
        "Lowest price stand or cart required for safe operation. If the machine is stable and usable with no stand, this can be left blank.",
    },
    {
      key: "standPriceMax",
      label: "Stand / cart price – Max",
      description:
        "Highest price normal catalog stand / cart that is still representative for a typical buyer (no boutique or specialty stands).",
    },
    {
      key: "clrRange",
      label: "CLR range (display only)",
      description:
        "Approximate min–max CLR coverage for specs tables and buyer guide copy.",
    },
    {
      key: "cycleTime",
      label: "Cycle time (display only)",
      description:
        "Bend cycle time as published. If multiple modes or power options exist, use the fastest documented case. Leave blank if not published.",
    },
    {
      key: "weight",
      label: "Typical system weight (display only)",
      description:
        "Our opinion of a real-world configuration weight (averaging between light/no-cart and heavy/cart setups). Only enter when we have enough data to be fair.",
    },
    {
      key: "yearsInBusiness",
      label: "Years in business (display / reference)",
      description:
        "Approximate years the manufacturer has been operating under this brand or product line. This is for transparency and review copy. The current scoring engine still uses conservative brand-based tiers for the 'Years in Business' category and does not read this field yet.",
    },
  ];

  const parseMoney = (v: unknown): number =>
    typeof v === "number"
      ? v
      : parseFloat(String(v ?? "").replace(/[^0-9.+-]/g, "")) || 0;

            const minTotal =
    parseMoney(selectedProduct.framePriceMin) +
    parseMoney(selectedProduct.diePriceMin) +
    parseMoney(selectedProduct.hydraulicPriceMin) +
    parseMoney(selectedProduct.standPriceMin);

            const maxTotal =
    parseMoney(selectedProduct.framePriceMax) +
    parseMoney(selectedProduct.diePriceMax) +
    parseMoney(selectedProduct.hydraulicPriceMax) +
    parseMoney(selectedProduct.standPriceMax);

              const DIE_SHAPE_OPTIONS = [
                "Round tube (OD)",
                "Pipe sizes (NPS)",
                "Square tube",
                "Rectangular tube",
                "EMT",
                "Metric round",
                "Metric square / rectangular",
                "Plastic / urethane pressure dies",
                "Other",
              ] as const;

              const MATERIAL_OPTIONS = [
                "Mild steel",
                "Stainless steel",
                "4130 chromoly",
                "Aluminum",
                "Titanium",
                "Copper",
                "Brass",
              ] as const;

  const dieShapesRaw = selectedProduct.dieShapes ?? "";
  const selectedDieShapes = new Set(
    String(dieShapesRaw)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );

  const materialsRaw = selectedProduct.materials ?? "";
              const selectedMaterials = new Set(
                String(materialsRaw)
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              );

              const toggleMaterial = (label: string) => {
                const next = new Set(selectedMaterials);
                if (next.has(label)) {
                  next.delete(label);
                } else {
                  next.add(label);
                }
                const serialized = Array.from(next).join(", ");
    updateProduct(selectedProduct.id, "materials", serialized);
  };

  const toggleDieShape = (label: string) => {
    const next = new Set(selectedDieShapes);
    if (next.has(label)) {
      next.delete(label);
    } else {
      next.add(label);
    }
    const serialized = Array.from(next).join(", ");
    updateProduct(selectedProduct.id, "dieShapes", serialized);
  };

            return (
    <div className="w-full rounded-lg bg-white shadow max-w-[1400px] mx-auto">
      {/* Header + product selector */}
      <div className="flex flex-col gap-3 border-b border-gray-200 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Products</h2>
          <p className="text-sm text-gray-500">
            Edit one model at a time. Fields marked{" "}
            <span className="font-semibold">*</span> directly influence scoring.
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Product photos are automatic. Each model loads{" "}
            <code className="font-mono text-[0.7rem]">
              /images/products/&lt;slug-or-id&gt;.jpg
            </code>{" "}
            from{" "}
            <code className="font-mono text-[0.7rem]">
              /public/images/products/
            </code>
            . The filename is derived from the slug or id using only lowercase
            letters, numbers, and dashes.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm md:items-end">
          <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Select model
          </label>
          <select
            className="w-full max-w-xs rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400"
            value={selectedProduct.id}
            onChange={(e) => {
              setSelectedId(e.target.value);
              setCitationClipboard(null);
            }}
          >
            {products.map((p) => {
              const safeSlug = computeSafeSlug(
                (p as any).slug ?? p.id ?? "",
              );

              // Prefer a clean Brand + Model label for humans, and only fall
              // back to the slug when we don't have anything better. This
              // avoids leaking any legacy junk that may be sitting in slug/id
              // (for example old "-typex" artifacts) into the dropdown.
              const brandModel = [p.brand, p.model]
                .filter((s) => !!s && String(s).trim().length > 0)
                .join(" ")
                .trim();

              const label =
                brandModel.length > 0 ? brandModel : safeSlug;

              return (
                <option key={p.id} value={p.id}>
                  {label}
                </option>
              );
            })}
          </select>

          {/* Explicit Save/Publish controls (no autosave) */}
          <div className="mt-2 flex w-full max-w-xs items-center justify-between gap-2">
            <div className="text-[0.7rem] text-gray-500 leading-tight">
              <div>
                {draftMeta ? (
                  <span>
                    Draft v{draftMeta.version} • {draftMeta.status} •{" "}
                    {draftMeta.updatedAt
                      ? new Date(draftMeta.updatedAt).toLocaleString()
                      : "—"}
                  </span>
                ) : (
                  <span>No draft loaded</span>
                )}
                {draftLoadError ? (
                  <span className="ml-2 text-red-600">{draftLoadError}</span>
                ) : null}
              </div>
              <div>
                {publishedMeta ? (
                  <span>
                    Published v{publishedMeta.version} •{" "}
                    {publishedMeta.updatedAt
                      ? new Date(publishedMeta.updatedAt).toLocaleString()
                      : "—"}
                  </span>
                ) : (
                  <span>Not published yet</span>
                )}
                {publishedLoadError ? (
                  <span className="ml-2 text-red-600">{publishedLoadError}</span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex w-full max-w-xs gap-2">
            <button
              onClick={saveDraft}
              disabled={saving || !isDirty}
              className={`flex-1 rounded border px-3 py-1 text-sm ${
                saving || !isDirty
                  ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400"
                  : "border-gray-900 bg-white text-gray-900 hover:bg-gray-50"
              }`}
              title={!isDirty ? "No changes to save" : "Save current draft"}
            >
              {saving ? "Saving..." : "Save draft"}
            </button>
            <button
              onClick={publishDraft}
              disabled={publishing || isDirty}
              className={`flex-1 rounded border px-3 py-1 text-sm ${
                publishing || isDirty
                  ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400"
                  : "border-gray-900 bg-gray-900 text-white hover:bg-black"
              }`}
              title={isDirty ? "Save draft before publishing" : "Publish current draft"}
            >
              {publishing ? "Publishing..." : "Publish"}
            </button>
          </div>
        </div>
      </div>

      {/* Per-field grid with row-level citation copy/paste */}
      <section className="mt-8">
        <div className="flex items-center justify-between gap-3 px-6">
                  <div>
            <h3 className="text-base font-semibold text-gray-900">
              Specs, scoring drivers &amp; citations
            </h3>
            <p className="mt-1 text-xs text-gray-500 max-w-4xl">
              Work row by row. For each spec, record the value plus how you proved
              it. Use the{" "}
              <span className="font-semibold">Copy</span> /{" "}
              <span className="font-semibold">Paste</span> buttons on the right to
              reuse citation details and your{" "}
              <span className="font-mono text-[0.7rem]">XXXNNNN</span> initials /
              employee code across rows.
            </p>
                    </div>
                    </div>

        {/* Full-width, scrollable specs grid */}
        <div className="mt-4 -mx-6 px-6">
          {/* One scroll container for both X and Y so scrollbars stay pinned */}
          <div className="max-h-[640px] overflow-auto">
            <div className="min-w-[1800px] rounded-lg border border-gray-300 bg-white">
              {/* Sticky header inside scrollport */}
              <div className="sticky top-0 z-10 border-b border-gray-400 bg-gray-50">
                <div className="grid grid-cols-[1.6fr_1fr_1.4fr_0.8fr_1.4fr_0.7fr_0.7fr] px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-wide text-gray-700">
                  <div className="border-r border-gray-400 pr-2">Field</div>
                  <div className="border-r border-gray-400 pr-2">Value</div>
                  <div className="border-r border-gray-400 pr-2">
                    Citation 1 (URL / doc ref)
                  </div>
                  <div className="border-r border-gray-400 pr-2">
                    Accessed (YYYY-MM-DD)
                    </div>
                  <div className="border-r border-gray-400 pr-2">
                    Notes / how we found it
                    </div>
                  <div className="border-r border-gray-400 pr-2">
                    Initials / Emp#
                    </div>
                  <div className="text-right pr-1">Row tools</div>
                    </div>
                  </div>

              <div className="divide-y divide-gray-300">
                {specRows.map((row) => {
                  const valueRaw = selectedProduct[row.key];
                  const value =
                    valueRaw == null
                      ? ""
                      : typeof valueRaw === "number"
                      ? String(valueRaw)
                      : String(valueRaw);

                  const source1Key = `${row.key}Source1`;
                  const source2Key = `${row.key}Source2`;
                  const notesKey = `${row.key}Notes`;
                  const userKey = `${row.key}UserCode`;

                  const source1 = String(selectedProduct[source1Key] ?? "");
                  const source2 = String(selectedProduct[source2Key] ?? "");
                  const notes = String(selectedProduct[notesKey] ?? "");
                  const userCode = String(selectedProduct[userKey] ?? "");

                  return (
                    <div
                      key={row.key}
                      className="grid grid-cols-[1.6fr_1fr_1.4fr_0.8fr_1.4fr_0.7fr_0.7fr] items-start bg-white px-3 py-2 text-[0.75rem]"
                    >
                      <div className="border-r border-gray-200 pr-2 text-[0.72rem] text-gray-600">
                        <div className="font-semibold text-gray-900">
                          {row.label}
                        </div>
                        {row.description && (
                          <div className="mt-0.5 text-[0.68rem] text-gray-500">
                            {row.description}
                          </div>
                        )}
                </div>

                      <div className="border-r border-gray-200 pr-2">
                        {row.key === "powerType" ? (
                          <PowerTypeMultiSelect
                            value={value}
                            onChange={(val) =>
                              updateProduct(selectedProduct.id, "powerType", val)
                            }
                          />
                        ) : row.key === "dieShapes" ? (
                          <DieShapesMultiSelect
                            value={value}
                            onChange={(val) =>
                              updateProduct(selectedProduct.id, "dieShapes", val)
                            }
                          />
                        ) : (
                        <EditableField
                            value={value}
                            onSave={(val) =>
                              updateProduct(selectedProduct.id, row.key, val)
                            }
                            options={row.options}
                          />
                        )}
                  </div>

                      <div className="border-r border-gray-200 pr-2">
                        <input
                          className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-[0.75rem] text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400"
                          value={source1}
                          onChange={(e) => {
                            updateProductLocalField(
                              selectedProduct.id,
                              source1Key,
                              e.target.value,
                            );
                          }}
                          placeholder="Spec page, PDF, catalog ref, etc."
                        />
                      </div>

                      <div className="border-r border-gray-200 pr-2">
                        <input
                          className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-[0.75rem] text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400"
                          value={source2}
                          onChange={(e) => {
                            updateProductLocalField(
                              selectedProduct.id,
                              source2Key,
                              e.target.value,
                            );
                          }}
                          placeholder="YYYY-MM-DD"
                        />
                  </div>

                      <div className="border-r border-gray-200 pr-2">
                        <input
                          className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-[0.75rem] text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400"
                          value={notes}
                          onChange={(e) => {
                            updateProductLocalField(
                              selectedProduct.id,
                              notesKey,
                              e.target.value,
                            );
                          }}
                          placeholder="How we found it, or cross-references"
                        />
                      </div>

                      <div className="border-r border-gray-200 pr-2">
                      <input
  className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-[0.75rem] text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400"
  value={userCode}
  onChange={(e) => {
    // Let the user type naturally; don't mutate on each keystroke.
    updateProductLocalField(
      selectedProduct.id,
      userKey,
      e.target.value,
    );
  }}
  onBlur={(e) => {
    // Only normalize to uppercase once editing is finished.
    const upper = e.target.value.toUpperCase();
    updateProductLocalField(selectedProduct.id, userKey, upper);
    // No autosave: Save Draft button commits changes.
  }}
  placeholder="XXXNNNN"
/>

                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="rounded border border-gray-400 px-2 py-0.5 text-[0.65rem] text-gray-800 hover:bg-gray-50"
                          onClick={() =>
                            setCitationClipboard({
                              source1,
                              source2,
                              notes,
                              userCode,
                            })
                          }
                        >
                          Copy
                        </button>
                        <button
                          type="button"
                          disabled={!citationClipboard}
                          className={`rounded border px-2 py-0.5 text-[0.65rem] ${
                            citationClipboard
                              ? "border-gray-400 text-gray-800 hover:bg-gray-50"
                              : "cursor-not-allowed border-gray-200 text-gray-300"
                          }`}
                          onClick={() => {
                            if (!citationClipboard) return;
                            // Optimistically update UI in one pass
                            updateProductLocalField(
                              selectedProduct.id,
                              source1Key,
                              citationClipboard.source1,
                            );
                            updateProductLocalField(
                              selectedProduct.id,
                              source2Key,
                              citationClipboard.source2,
                            );
                            updateProductLocalField(
                              selectedProduct.id,
                              notesKey,
                              citationClipboard.notes,
                            );
                            updateProductLocalField(
                              selectedProduct.id,
                              userKey,
                              citationClipboard.userCode,
                            );
                          }}
                        >
                          Paste
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
                      </div>
                    </div>
                  </div>

        <p className="mt-3 text-[0.7rem] text-gray-500 max-w-4xl">
          The last cell of every row is your{" "}
          <span className="font-mono">XXXNNNN</span> initials + employee #
          (letters + numbers, no spaces). This gives us a simple human-readable
          audit trail for who pulled which spec, when, and from where.
        </p>
      </section>

      {/* Summary of min/max system cost for this model */}
      <section className="border-b border-gray-200 px-6 py-5">
        <h3 className="text-base font-semibold text-gray-900">
          System cost snapshot (for Value for Money)
        </h3>
        <p className="mt-1 text-xs text-gray-500 max-w-3xl">
          These totals are the sums of the min/max components above. They are
          what the scoring engine uses as the "minimum safe operating system
          cost" and "upper range" price for this machine.
        </p>

        <div className="mt-3 inline-flex gap-8 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs">
                  <div>
            <div className="text-[0.7rem] uppercase tracking-wide text-gray-500">
              Min system total
                      </div>
            <div className="text-sm font-semibold text-gray-900">
              {minTotal > 0 ? `$${minTotal.toFixed(0)}` : "—"}
                      </div>
                    </div>
                    <div>
            <div className="text-[0.7rem] uppercase tracking-wide text-gray-500">
              Max system total
                  </div>
                      <div className="text-sm font-semibold text-gray-900">
              {maxTotal > 0 ? `$${maxTotal.toFixed(0)}` : "—"}
                </div>
              </div>
        </div>
      </section>

      {/* Raw citations blob for this model (optional, machine-readable) */}
      <section className="border-b border-gray-200 px-6 py-5">
        <h3 className="text-base font-semibold text-gray-900">
          Raw citation log (optional, machine-readable)
        </h3>
        <p className="mt-1 text-xs text-gray-500 max-w-3xl">
          This is a compact, line-based log of every citation you want to keep.
          It&apos;s another layer of defense on top of the per-row fields
          above. Format:
          {" "}
          <code className="font-mono text-[0.7rem]">
            category | sourceType | urlOrRef | title | accessed (YYYY-MM-DD) |
            note
          </code>
          .
        </p>
        <textarea
          className="mt-3 w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400"
          rows={5}
          defaultValue={selectedProduct.citationsRaw ?? ""}
          onBlur={(e) =>
            updateProduct(
              selectedProduct.id,
              "citationsRaw",
              e.target.value ?? "",
            )
          }
        />
      </section>

      {/* Review content (pros / cons / features / materials) for the selected model */}
      <section className="px-6 py-5">
        <h3 className="text-base font-semibold text-gray-900">
          Review content – {selectedProduct.id}
        </h3>
        <p className="mt-1 text-xs text-gray-500 max-w-3xl">
          Pros, cons, key features, and materials compatibility shown on this
          model&apos;s review page. For cons,{" "}
          <span className="font-semibold">
            every line must have a matching source line
          </span>{" "}
          (manufacturer docs, product page, or other verifiable reference).
        </p>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-gray-300 bg-white p-4 shadow-sm">
            <div className="mb-2 text-xs text-gray-500">
              {selectedProduct.brand || selectedProduct.model
                ? [selectedProduct.brand, selectedProduct.model]
                              .filter(Boolean)
                              .join(" ")
                          : "Unnamed product"}
                  </div>

                  <div className="grid gap-3 text-xs md:grid-cols-2">
                    <div>
                      <div className="mb-1 font-semibold text-gray-800">
                        Pros (one per line)
                      </div>
                      <textarea
                        className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400"
                        rows={5}
                  defaultValue={selectedProduct.pros ?? ""}
                        onBlur={(e) =>
                    updateProduct(
                      selectedProduct.id,
                      "pros",
                      e.target.value ?? "",
                    )
                        }
                      />
                    </div>

                    <div>
                      <div className="mb-1 font-semibold text-gray-800">
                        Cons (one per line) &amp; sources
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        <div>
                          <div className="mb-0.5 text-[0.7rem] text-gray-500">
                            Cons
                          </div>
                          <textarea
                            className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400"
                            rows={5}
                      defaultValue={selectedProduct.cons ?? ""}
                            onBlur={(e) =>
                        updateProduct(
                          selectedProduct.id,
                          "cons",
                          e.target.value ?? "",
                        )
                            }
                          />
                        </div>
                        <div>
                          <div className="mb-0.5 text-[0.7rem] text-gray-500">
                      Sources (matching lines)
                          </div>
                          <textarea
                            className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400"
                            rows={5}
                      defaultValue={selectedProduct.consSources ?? ""}
                            onBlur={(e) =>
                              updateProduct(
                          selectedProduct.id,
                                "consSources",
                                e.target.value ?? "",
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 text-xs md:grid-cols-2">
                    <div>
                      <div className="mb-1 font-semibold text-gray-800">
                        Key features (one per line)
                      </div>
                      <textarea
                        className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400"
                        rows={4}
                  defaultValue={selectedProduct.keyFeatures ?? ""}
                        onBlur={(e) =>
                    updateProduct(
                      selectedProduct.id,
                      "keyFeatures",
                      e.target.value ?? "",
                    )
                        }
                      />
                    </div>
                    <div>
                      <div className="mb-1 font-semibold text-gray-800">
                        Materials compatibility
                      </div>
                      <p className="mb-2 text-[0.7rem] text-gray-500">
                  Check all materials this machine is suitable for. Displayed
                  as read-only tags on the review page.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {MATERIAL_OPTIONS.map((label) => {
                          const active = selectedMaterials.has(label);
                          return (
                            <button
                              key={label}
                              type="button"
                              onClick={() => toggleMaterial(label)}
                              className={[
                                "rounded-full border px-2.5 py-0.5 text-[0.7rem]",
                                active
                                  ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                                  : "border-gray-300 bg-gray-50 text-gray-700",
                              ].join(" ")}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

            <div className="mt-3 grid gap-3 text-xs md:grid-cols-2">
              <div>
                <div className="mb-1 font-semibold text-gray-800">
                  Image file (read-only)
                </div>
                <p className="text-[0.7rem] text-gray-500">
                  Place this model&apos;s primary photo at:
                </p>
                <code className="mt-1 block rounded bg-gray-50 px-2 py-1 font-mono text-[0.7rem] text-gray-800">
                  /public/images/products/{safeSlug}.jpg
                </code>
                <p className="mt-1 text-[0.65rem] text-gray-500">
                  It will be served on the site as{" "}
                  <code className="font-mono text-[0.7rem]">
                    /images/products/{safeSlug}.jpg
                  </code>
                  .
                </p>
              </div>
              <div>
                <div className="mb-1 font-semibold text-gray-800">
                  Highlights (comma-separated)
                </div>
                <EditableField
                  value={
                    selectedProduct.highlights
                      ? Array.isArray(selectedProduct.highlights)
                        ? selectedProduct.highlights.join(", ")
                        : String(selectedProduct.highlights)
                      : ""
                  }
                  onSave={(val) =>
                    updateProduct(selectedProduct.id, "highlights", val)
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// EditableField component for inline editing
function EditableField({ 
  value, 
  onSave, 
  options,
}: { 
  value: string; 
  onSave: (value: string) => void; 
  options?: string[]; 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  // Sync editValue when value prop changes (e.g., after save)
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  // Cancel isn't wired; keep it simple and avoid extra state churn.

  if (isEditing) {
    if (options) {
      return (
        <select
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          autoFocus
          className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400"
        >
          {options.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      );
    }

    return (
      <input
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        autoFocus
        className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400"
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      onFocus={() => setIsEditing(true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsEditing(true);
        }
      }}
      tabIndex={0}
      className="cursor-pointer hover:bg-gray-50 px-2 py-1 rounded text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400"
    >
      {value || '-'}
    </div>
  );
}

function DieShapesMultiSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  // Canonical labels; scoring will depend on these exact strings.
  const SHAPES = [
    "Round tube",
    "Pipe",
    "Square tube",
    "Rectangular tube",
    "EMT",
    "Metric round / square",
    "Plastic / urethane pressure dies",
    "Other",
  ] as const;

  const selected = new Set(
    String(value ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );

  const toggle = (label: string) => {
    const next = new Set(selected);
    if (next.has(label)) {
      next.delete(label);
    } else {
      next.add(label);
    }
    const serialized = Array.from(next).join(", ");
    onChange(serialized);
  };

  return (
    <div className="flex flex-wrap gap-1">
      {SHAPES.map((label) => {
        const active = selected.has(label);
        return (
          <button
            key={label}
            type="button"
            onClick={() => toggle(label)}
            className={[
              "rounded-full border px-2.5 py-0.5 text-[0.7rem]",
              active
                ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                : "border-gray-300 bg-gray-50 text-gray-700",
            ].join(" ")}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function PowerTypeMultiSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const OPTIONS = ["Manual", "Air / Hydraulic", "Electric / Hydraulic"] as const;

  const normalizeToken = (s: string) =>
    s.replace(/\s+/g, " ").trim();

  const selected = new Set(
    String(value ?? "")
      .split(/[,+]/)
      .map(normalizeToken)
      .filter(Boolean),
  );

  const toggle = (opt: string) => {
    const next = new Set(selected);
    if (next.has(opt)) {
      next.delete(opt);
    } else {
      next.add(opt);
    }
    const serialized = Array.from(next).join(" + ");
    onChange(serialized);
  };

  return (
    <div className="flex flex-wrap gap-1">
      {OPTIONS.map((opt) => {
        const active = selected.has(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={[
              "rounded-full border px-2.5 py-0.5 text-[0.7rem]",
              active
                ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                : "border-gray-300 bg-gray-50 text-gray-700",
            ].join(" ")}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}