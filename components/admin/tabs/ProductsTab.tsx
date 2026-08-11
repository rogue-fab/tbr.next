// NOTE: This file intentionally contains explicit admin API error surfacing for team use.
'use client';

import { useEffect, useMemo, useState } from 'react';
import { generateAutoProsCons, type AutoProCon } from '../../../lib/proCons';
import {
  REQUIRED_SCORING_FIELDS,
  computeCompleteness,
  isModelActive,
  isRequiredFieldComplete,
  isFieldNotPublished,
  ACTIVE_THRESHOLD,
} from '../../../lib/completeness';
// Admin grid reads from /api/admin/products; writes hit /api/admin/products/[id]

// Fast lookup: field key -> required-field descriptor (kind/label) for the
// per-row "not published by manufacturer" controls + completeness meter.
const REQUIRED_BY_KEY = new Map(
  REQUIRED_SCORING_FIELDS.map((f) => [f.key, f] as const),
);

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
  sBendCapability?: string | boolean | null;
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

  // Persisted enabled states for generated pros/cons (draft/published overlay)
  autoProsCons?: AutoProCon[];

  // Dynamic per-field citation data (we don't enumerate every key here)
  [key: string]: any;
};

type RowCitationClipboard = {
  source1: string;
  source2: string;
  notes: string;
  userCode: string;
};

type ApiDebug = {
  at: string;
  url: string;
  endpoint: string;
  status: number;
  statusText: string;
  bodySnippet: string;
};

const isAuthStatus = (status: number) => status === 401 || status === 403;
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

export default function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiDebug, setApiDebug] = useState<ApiDebug | null>(null);
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

  const pageUrl = useMemo(() => {
    try {
      return window.location.href;
    } catch {
      return '';
    }
  }, []);

  async function readBodySnippet(res: Response): Promise<string> {
    // Defensive: admins sometimes return JSON errors, sometimes plain text.
    // We want something short + safe to display.
    const text = await res.text().catch(() => '');
    const trimmed = (text || '').trim();
    return clip(trimmed, 400);
  }

  function setApiError(opts: {
    endpoint: string;
    status: number;
    statusText: string;
    bodySnippet: string;
  }) {
    setApiDebug({
      at: new Date().toISOString(),
      url: pageUrl || (typeof window !== 'undefined' ? window.location.href : ''),
      endpoint: opts.endpoint,
      status: opts.status,
      statusText: opts.statusText,
      bodySnippet: opts.bodySnippet,
    });
  }

  function clearApiError() {
    setApiDebug(null);
  }

  async function copyDebugToClipboard() {
    if (!apiDebug) return;
    const msg = [
      `[TBR Admin Debug] ${apiDebug.at}`,
      `URL: ${apiDebug.url}`,
      `Endpoint: ${apiDebug.endpoint}`,
      `Status: ${apiDebug.status} ${apiDebug.statusText}`,
      `Body: ${apiDebug.bodySnippet || '(empty)'}`,
      isAuthStatus(apiDebug.status)
        ? `Hint: 401/403 usually means you need to re-login at /admin (admin_token cookie is httpOnly).`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await navigator.clipboard.writeText(msg);
      alert('Copied debug details to clipboard.');
    } catch {
      // Fallback: at least show the text so the user can copy manually.
      prompt('Copy debug details:', msg);
    }
  }

  async function retryAll() {
    setError(null);
    clearApiError();
    await fetchProducts();
    if (selectedId) {
      void loadDraftForProduct(selectedId);
      void loadPublishedForProduct(selectedId);
    }
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  const loadPublishedForProduct = async (productId: string) => {
    setPublishedLoadError(null);
    try {
      const endpoint = `/api/admin/products/${productId}/publish`;
      const res = await fetch(endpoint, {
        method: "GET",
      });
      if (!res.ok) {
        const snippet = await readBodySnippet(res);
        console.error("Load published failed:", res.status, snippet);
        setApiError({
          endpoint,
          status: res.status,
          statusText: res.statusText || 'Error',
          bodySnippet: snippet,
        });
        setPublishedMeta(null);
        setPublishedLoadError(
          isAuthStatus(res.status)
            ? `Failed to load published (${res.status}). Not authorized — re-login at /admin.`
            : `Failed to load published (${res.status})`,
        );
        return;
      }
      clearApiError();
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
      const endpoint = `/api/admin/products/${id}/draft`;
      const res = await fetch(endpoint, {
        cache: "no-store",
      });
      if (!res.ok) {
        const snippet = await readBodySnippet(res);
        setApiError({
          endpoint,
          status: res.status,
          statusText: res.statusText || 'Error',
          bodySnippet: snippet,
        });
        setDraftLoadError(
          isAuthStatus(res.status)
            ? `Failed to load draft (${res.status}). Not authorized — re-login at /admin.`
            : `Failed to load draft (${res.status})`,
        );
        setDraftMeta(null);
        return;
      }
      clearApiError();
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
      const endpoint = "/api/admin/products";
      const res = await fetch(endpoint, { cache: "no-store" });

      if (!res.ok) {
        const snippet = await readBodySnippet(res);
        setApiError({
          endpoint,
          status: res.status,
          statusText: res.statusText || 'Error',
          bodySnippet: snippet,
        });
        setError(
          isAuthStatus(res.status)
            ? `Failed to fetch products (${res.status}). Not authorized — re-login at /admin.`
            : `Failed to fetch products (${res.status}).`,
        );
        return;
      }
      clearApiError();
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
      setApiError({
        endpoint: "/api/admin/products",
        status: 0,
        statusText: "Network error",
        bodySnippet: "Fetch threw before receiving a response (network/DNS/CORS/runtime).",
      });
      setError("Failed to fetch products (network error).");
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

  // Mark/unmark a required scoring field as "not published by manufacturer".
  // Marking it clears the value so the scoring engine treats it as a documented 0
  // (no guessing), while completeness still counts the field as accounted for.
  const toggleNotPublished = (id: string, key: string, next: boolean) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const prevMap =
          p.notPublished && typeof p.notPublished === 'object' && !Array.isArray(p.notPublished)
            ? (p.notPublished as Record<string, boolean>)
            : {};
        const nextMap: Record<string, boolean> = { ...prevMap };
        if (next) nextMap[key] = true;
        else delete nextMap[key];
        const updated: Product = { ...p, notPublished: nextMap };
        // Clear the underlying value when marking not-published.
        if (next) (updated as any)[key] = '';
        return updated;
      }),
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

  // Debug / API status panel (kept compact but explicit).
  // This is critical when rolling the admin to a team: failures must be self-explanatory.
  const DebugPanel = () => {
    if (!apiDebug && !error && !draftLoadError && !publishedLoadError) return null;

    const headline = apiDebug
      ? `API issue: ${apiDebug.endpoint} → ${apiDebug.status} ${apiDebug.statusText}`
      : `API issue detected`;

    const hint =
      apiDebug && isAuthStatus(apiDebug.status)
        ? `Auth hint: 401/403 usually means you need to re-login at /admin (admin_token cookie is httpOnly).`
        : null;

    return (
      <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="font-semibold">{headline}</div>
            {apiDebug ? (
              <div className="mt-1 space-y-1">
                <div className="text-[0.7rem] text-amber-800">
                  <span className="font-semibold">When:</span> {apiDebug.at}
                </div>
                <div className="text-[0.7rem] text-amber-800 break-all">
                  <span className="font-semibold">URL:</span> {apiDebug.url}
                </div>
                <div className="rounded border border-amber-200 bg-white p-2 font-mono text-[0.7rem] text-amber-900 whitespace-pre-wrap">
                  {apiDebug.bodySnippet || "(empty response body)"}
                </div>
                {hint ? <div className="text-[0.7rem]">{hint}</div> : null}
              </div>
            ) : (
              <div className="mt-1 text-[0.7rem] text-amber-800">
                Something failed, but no structured API debug is available.
              </div>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={retryAll}
              className="rounded border border-amber-400 bg-white px-2 py-1 text-[0.7rem] font-semibold text-amber-900 hover:bg-amber-100"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={copyDebugToClipboard}
              disabled={!apiDebug}
              className={`rounded border px-2 py-1 text-[0.7rem] font-semibold ${
                apiDebug
                  ? "border-amber-400 bg-white text-amber-900 hover:bg-amber-100"
                  : "cursor-not-allowed border-amber-200 bg-amber-50 text-amber-300"
              }`}
            >
              Copy debug
            </button>
          </div>
        </div>
      </div>
    );
  };

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
      const endpoint = `/api/admin/products/${selectedProduct.id}/draft`;
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: buildFieldsPayload(selectedProduct),
          evidence: [],
        }),
      });

      if (!res.ok) {
        const snippet = await readBodySnippet(res);
        setApiError({
          endpoint,
          status: res.status,
          statusText: res.statusText || 'Error',
          bodySnippet: snippet,
        });
        console.error("Save draft failed:", res.status, snippet);
        alert(
          isAuthStatus(res.status)
            ? `Save failed (${res.status}). Not authorized — re-login at /admin.`
            : `Save failed (${res.status}). See debug panel for details.`,
        );
        return;
      }

      clearApiError();
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
      const endpoint = `/api/admin/products/${selectedProduct.id}/publish`;
      const res = await fetch(endpoint, {
        method: "POST",
      });
      if (!res.ok) {
        const snippet = await readBodySnippet(res);
        setApiError({
          endpoint,
          status: res.status,
          statusText: res.statusText || 'Error',
          bodySnippet: snippet,
        });
        console.error("Publish failed:", res.status, snippet);
        alert(
          isAuthStatus(res.status)
            ? `Publish failed (${res.status}). Not authorized — re-login at /admin.`
            : `Publish failed (${res.status}). See debug panel for details.`,
        );
        return;
      }
      clearApiError();
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
    // --- Ease of Use & Setup (Category #2) – Evidence-only, robotic, reproducible ---
    {
      key: "hasManual",
      label: "* Manual available (online or explicitly included) (Yes/No)",
      description:
        "1 pt if the manufacturer provides a downloadable manual OR explicitly states a manual is included. If not shown/promised, score 0.",
      options: ["", "Yes", "No"],
    },
    {
      key: "hasOnMachineInstructions",
      label: "* On-machine operation instructions/tips shown/promised (Yes/No)",
      description:
        "1 pt only if photos/video/listing show printed/engraved/label instructions on the machine, OR the listing explicitly promises them. Not obvious = 0.",
      options: ["", "Yes", "No"],
    },
    {
      key: "hasAngleReference",
      label: "* Built-in bend angle reference (scale/reference, not a loose cube) (Yes/No)",
      description:
        "1 pt if the machine/tooling has a built-in scale or reference for bend angle (shown or promised). Loose magnetic angle cubes on the tube do NOT count.",
      options: ["", "Yes", "No"],
    },
    {
      key: "hasAngleStop",
      label: "* Angle stop available (mechanical or equivalent) (Yes/No)",
      description:
        "1 pt if the manufacturer documents a bend-angle stop (mechanical or equivalent). Auto-stop (electronic) is already tracked elsewhere; this is for simple stops too.",
      options: ["", "Yes", "No"],
    },
    {
      key: "rotationAid",
      label: "* Rotation aid type (evidence-only)",
      description:
        "Scores 1 pt ONLY for: chuck/indexer, clamp-on analog, or clamp-on digital. Magnet-only-on-tube scores 0 (fails on non-ferrous like aluminum). None/unknown = 0.",
      options: [
        "none",
        "magnet_on_tube",
        "clamp_on_analog",
        "clamp_on_digital",
        "chuck_or_indexer",
      ],
    },
    {
      key: "quickDieChange",
      label: "* Quick die change engineered aid (documented) (Yes/No)",
      description:
        "1 pt ONLY if the manufacturer documents an engineered process/tool/feature that materially reduces die-change friction (e.g., lock/retainer/tooling that enables one-hand change or eliminates juggling parts). If not documented, 0.",
      options: ["", "Yes", "No"],
    },
    {
      key: "hasMfrYoutubeModelContent",
      label: "* Official YouTube content for this exact model (robotic rule) (Yes/No)",
      description:
        "1 pt ONLY if the manufacturer-owned YouTube channel has instructional content featuring this exact model AND it appears in the top 10 YouTube search results for: (BRAND + MODEL). Otherwise 0.",
      options: ["", "Yes", "No"],
    },
    // NOTE: Ease-of-use checklist items are now handled by explicit, evidence-only flags
    // in the scoring engine + customer-facing /scoring page. We intentionally removed the
    // old "setup/mounting guidance" checklist item because it was too collinear with
    // "manual available" and didn't add defensible signal. Do not re-add it unless the
    // scoring rules change.
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
        "Select the highest documented mandrel capability for this frame. If the manufacturer does not clearly document mandrel support for this specific model, pick None.",
      // IMPORTANT: these are canonical tokens consumed by scoring + UI.
      // Keep them stable and machine-readable (no marketing labels).
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
      label: "* Years in business (Track Record score, 0–3 pts)",
      description:
        "Approximate years the manufacturer has been operating under this brand or product line. This drives the Track Record category: ≥25 yrs = 3 pts, ≥10 = 2, >0 = 1. If the manufacturer doesn't publish a founding date, tick “Not published by mfr” (scores 0, model still counts as complete).",
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

  // --- Auto Pros/Cons (generated) -------------------------------------------
  const splitLines = (raw?: string | null): string[] =>
    String(raw ?? "")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);

  const manualPros = splitLines((selectedProduct as any).pros);
  const manualCons = splitLines((selectedProduct as any).cons);
  const manualOverridesAuto = manualPros.length > 0 || manualCons.length > 0;

  // Generate using current in-memory rows (includes draft field merges).
  const autoItems: AutoProCon[] = generateAutoProsCons(
    selectedProduct as any,
    (products as any[]) ?? []
  );

  // Persist enabled states by writing the full list (type/text/enabled) to the product draft field.
  // This matches lib/proCons behavior (it reads p.autoProsCons and keys by text).
  const setAutoItemEnabled = (text: string, enabled: boolean) => {
    const next = autoItems.map((it) =>
      it.text === text ? { ...it, enabled } : it
    );
    // Store as a proper array (not CSV) so we can evolve safely.
    updateProduct(selectedProduct.id, "autoProsCons", next as any);
  };
  // --------------------------------------------------------------------------

  // --- Completeness / activation status -------------------------------------
  // A model goes ACTIVE (and shows on the public site) only when every scoring
  // field is filled or marked "not published by manufacturer".
  const completeness = computeCompleteness(selectedProduct);
  const selectedActive = completeness.complete;
  const activeCount = products.filter((p) => isModelActive(p)).length;
  const thresholdMet = activeCount >= ACTIVE_THRESHOLD;
  const adminWantsBannerOn =
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_SHOW_TEMP_BANNER === "1";
  const bannerVisible = adminWantsBannerOn || !thresholdMet;
  // --------------------------------------------------------------------------

            return (
    <div className="w-full rounded-lg bg-white shadow max-w-[1400px] mx-auto">
      {/* Debug panel for explicit API/auth failures */}
      <div className="px-6 pt-4">
        <DebugPanel />
      </div>

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

      {/* Completeness + activation status */}
      <section className="px-6 pt-5">
        <div
          className={`rounded-lg border p-4 ${
            selectedActive
              ? "border-emerald-300 bg-emerald-50"
              : "border-amber-300 bg-amber-50"
          }`}
        >
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    selectedActive
                      ? "bg-emerald-600 text-white"
                      : "bg-amber-500 text-white"
                  }`}
                >
                  {selectedActive ? "ACTIVE — shows on site" : "INCOMPLETE — hidden from site"}
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {completeness.filled}/{completeness.total} scoring fields complete
                </span>
              </div>

              {completeness.missing.length > 0 ? (
                <div className="mt-2 text-xs text-amber-900">
                  <div className="font-semibold">
                    Still needed ({completeness.missing.length}) — enter a value or tick
                    “Not published by mfr”:
                  </div>
                  <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 pl-1">
                    {completeness.missing.map((m) => (
                      <li key={m.key} className="list-disc list-inside">
                        {m.label}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="mt-2 text-xs text-emerald-800">
                  Every scoring field is accounted for. This model is live on the public site.
                </div>
              )}
            </div>

            {/* Site-wide status: active count + temp banner state */}
            <div className="shrink-0 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 md:max-w-xs">
              <div>
                <span className="font-semibold">{activeCount}</span> of {products.length} models
                active
                {" "}
                <span className="text-gray-400">
                  (need {ACTIVE_THRESHOLD} to retire the banner)
                </span>
              </div>
              <div className="mt-1">
                {adminWantsBannerOn ? (
                  <span>
                    Temp banner: <span className="font-semibold text-red-600">ON</span> (config).
                    Set <code className="font-mono">NEXT_PUBLIC_SHOW_TEMP_BANNER≠1</code> to turn it
                    off — it hides once {ACTIVE_THRESHOLD} models are active.
                  </span>
                ) : bannerVisible ? (
                  <span>
                    Temp banner: <span className="font-semibold text-amber-600">OFF by config,
                    still showing</span> — only {activeCount}/{ACTIVE_THRESHOLD} models complete. It
                    auto-hides at {ACTIVE_THRESHOLD}.
                  </span>
                ) : (
                  <span>
                    Temp banner: <span className="font-semibold text-emerald-700">OFF (hidden)</span>.
                    {" "}
                    {activeCount} models are live.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

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
                        {(() => {
                          const reqField = REQUIRED_BY_KEY.get(row.key);
                          const notPublished = reqField
                            ? isFieldNotPublished(selectedProduct, row.key)
                            : false;
                          const fieldComplete = reqField
                            ? isRequiredFieldComplete(selectedProduct, reqField)
                            : true;

                          return (
                            <>
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
                              ) : notPublished ? (
                                <div className="px-2 py-1 text-[0.72rem] italic text-gray-500">
                                  Not published by manufacturer
                                </div>
                              ) : (
                                <EditableField
                                  value={value}
                                  onSave={(val) =>
                                    updateProduct(selectedProduct.id, row.key, val)
                                  }
                                  options={row.options}
                                />
                              )}

                              {reqField && (
                                <label className="mt-1 flex items-center gap-1 text-[0.65rem] text-gray-600">
                                  <input
                                    type="checkbox"
                                    className="h-3 w-3"
                                    checked={notPublished}
                                    onChange={(e) =>
                                      toggleNotPublished(
                                        selectedProduct.id,
                                        row.key,
                                        e.target.checked,
                                      )
                                    }
                                  />
                                  <span>Not published by mfr</span>
                                </label>
                              )}
                              {reqField && !fieldComplete && (
                                <div className="mt-0.5 text-[0.6rem] font-semibold text-amber-600">
                                  Required — empty
                                </div>
                              )}
                            </>
                          );
                        })()}
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

      {/* Auto Pros/Cons (generated) */}
      <section className="border-b border-gray-200 px-6 py-5">
        <h3 className="text-base font-semibold text-gray-900">
          Auto Pros / Cons (generated)
        </h3>
        <p className="mt-1 text-xs text-gray-500 max-w-4xl">
          These bullets are mechanically generated from documented fields + dataset rank
          (no opinions). They will appear on the review page{" "}
          <span className="font-semibold">only when manual Pros/Cons are empty</span>.
          Toggle items on/off to control what can appear as "auto".
        </p>
        {manualOverridesAuto ? (
          <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Manual Pros/Cons exist for this product right now, so the review page will
            display the manual lists instead of auto-generated items.
          </div>
        ) : null}

        {autoItems.length === 0 ? (
          <div className="mt-3 text-xs text-gray-500">
            No auto items generated. (This usually means key spec fields are missing across the dataset.)
          </div>
        ) : (
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            {/* Pros */}
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs">
                  ✔
                </span>
                <h4 className="text-sm font-semibold text-gray-900">Auto Pros</h4>
              </div>
              <div className="mt-3 space-y-2">
                {autoItems.filter((it) => it.type === "pro").map((it) => (
                  <label key={it.text} className="flex gap-2 text-sm text-gray-800">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={!!it.enabled}
                      onChange={(e) => setAutoItemEnabled(it.text, e.target.checked)}
                    />
                    <span className={it.enabled ? "" : "text-gray-400 line-through"}>
                      {it.text}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Cons */}
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs">
                  !
                </span>
                <h4 className="text-sm font-semibold text-gray-900">Auto Cons</h4>
              </div>
              <div className="mt-3 space-y-2">
                {autoItems.filter((it) => it.type === "con").map((it) => (
                  <label key={it.text} className="flex gap-2 text-sm text-gray-800">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={!!it.enabled}
                      onChange={(e) => setAutoItemEnabled(it.text, e.target.checked)}
                    />
                    <span className={it.enabled ? "" : "text-gray-400 line-through"}>
                      {it.text}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mt-3 text-[0.7rem] text-gray-500 max-w-4xl">
          Notes:
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>
              Enabled states are saved into <code className="rounded bg-gray-50 px-1">autoProsCons</code>{" "}
              when you click <span className="font-semibold">Save draft</span>.
            </li>
            <li>
              The generator keys enabled state by exact <span className="font-semibold">text</span>. If you later change the generator wording, old saved toggles won't match.
            </li>
          </ul>
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