"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { useParams } from "next/navigation";
import { generateAutoProsCons, type AutoProCon } from "../../../../lib/proCons";

type OverlayFormState = {
  usaManufacturingTier: string;
  originTransparencyTier: string;
  singleSourceSystemTier: string;
  warrantyTier: string;
  portability: string;
  wallThicknessCapacity: string;
  materials: string;
  dieShapes: string;
  mandrel: string;
  hasPowerUpgradePath: boolean;
  lengthStop: boolean;
  rotationIndexing: boolean;
  angleMeasurement: boolean;
  autoStop: boolean;
  thickWallUpgrade: boolean;
  thinWallUpgrade: boolean;
  wiperDieSupport: boolean;
  sBendCapability: boolean | null;

  pros: string;
  cons: string;
  consSources: string;
  keyFeatures: string;
  highlights: string;
  citationsRaw: string;
};

export default function ProductOverlayAdminPage() {
  const params = useParams<{ id: string }>();
  const productId = (params?.id ?? "") as string;

  const inflightRef = useRef(false);
  const lastLoadedIdRef = useRef<string | null>(null);

  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"info" | "ok" | "error">(
    "info",
  );

  const [form, setForm] = useState<OverlayFormState>({
    usaManufacturingTier: "",
    originTransparencyTier: "",
    singleSourceSystemTier: "",
    warrantyTier: "",
    portability: "",
    wallThicknessCapacity: "",
    materials: "",
    dieShapes: "",
    mandrel: "",
    hasPowerUpgradePath: false,
    lengthStop: false,
    rotationIndexing: false,
    angleMeasurement: false,
    autoStop: false,
    thickWallUpgrade: false,
    thinWallUpgrade: false,
    wiperDieSupport: false,
  sBendCapability: null,

    pros: "",
    cons: "",
    consSources: "",
    keyFeatures: "",
    highlights: "",
    citationsRaw: "",
  });

  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [autoProsCons, setAutoProsCons] = useState<AutoProCon[]>([]);

  // Load existing overlay from Neon
  useEffect(() => {
    if (!productId) return;
    // Prevent duplicate loads for the same product id
    if (lastLoadedIdRef.current === productId) return;
    if (inflightRef.current) return;
    inflightRef.current = true;
    lastLoadedIdRef.current = productId;

    const run = async () => {
      setStatusMsg("Loading overlay from Neon…");
      setStatusKind("info");
      try {
        const res = await fetch(`/api/admin/products/${productId}`, {
          cache: "no-store",
        });

        if (res.status === 429) {
          setStatusMsg("Too many requests. Please wait a moment and refresh.");
          setStatusKind("error");
          setLoaded(true);
          return;
        }

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setStatusMsg(
            data?.error ?? "Failed to load overlay (auth or server error).",
          );
          setStatusKind("error");
          setLoaded(true);
          return;
        }

        const overlay = data?.overlay ?? null;

        if (overlay) {
          setForm((prev) => ({
            ...prev,
            usaManufacturingTier:
              overlay.usaManufacturingTier != null
                ? String(overlay.usaManufacturingTier)
                : "",
            originTransparencyTier:
              overlay.originTransparencyTier != null
                ? String(overlay.originTransparencyTier)
                : "",
            singleSourceSystemTier:
              overlay.singleSourceSystemTier != null
                ? String(overlay.singleSourceSystemTier)
                : "",
            warrantyTier:
              overlay.warrantyTier != null
                ? String(overlay.warrantyTier)
                : "",
            portability: overlay.portability ?? "",
            wallThicknessCapacity: overlay.wallThicknessCapacity ?? "",
            materials: overlay.materials ?? "",
            dieShapes: overlay.dieShapes ?? "",
            mandrel: overlay.mandrel ?? "",
            hasPowerUpgradePath: !!overlay.hasPowerUpgradePath,
            lengthStop: !!overlay.lengthStop,
            rotationIndexing: !!overlay.rotationIndexing,
            angleMeasurement: !!overlay.angleMeasurement,
            autoStop: !!overlay.autoStop,
            thickWallUpgrade: !!overlay.thickWallUpgrade,
            thinWallUpgrade: !!overlay.thinWallUpgrade,
            wiperDieSupport: !!overlay.wiperDieSupport,
    sBendCapability: overlay.sBendCapability ?? null,

            pros: overlay.pros ?? "",
            cons: overlay.cons ?? "",
            consSources: overlay.consSources ?? "",
            keyFeatures: overlay.keyFeatures ?? "",
            highlights: overlay.highlights ?? "",
            citationsRaw: overlay.citationsRaw ?? "",
          }));
          
          setStatusMsg("Loaded current overlay from Neon.");
          setStatusKind("ok");
        } else {
          setStatusMsg(
            "No overlay row exists yet for this product. You can create one with this form.",
          );
          setStatusKind("info");
        }

        setLoaded(true);
      } catch (err) {
        setStatusMsg(
          err instanceof Error
            ? err.message
            : "Unexpected error loading overlay.",
        );
        setStatusKind("error");
        setLoaded(true);
      } finally {
        inflightRef.current = false;
      }
    };

    run();
  }, [productId]);

  // Load all products and generate auto pros/cons when product data is available
  useEffect(() => {
    if (!productId || !loaded) return;
    
    const run = async () => {
      try {
        // Fetch all products for comparison (needed for auto pros/cons generation)
        const res = await fetch("/api/admin/products", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const products = data?.data ?? [];
        setAllProducts(products);
        
        // Find current product (merge form state with base product data)
        const baseProduct = products.find((p: any) => p.id === productId);
        if (!baseProduct) return;
        
        // Merge form state into product for accurate generation
        const currentProduct = {
          ...baseProduct,
          ...form,
          usaManufacturingTier: form.usaManufacturingTier ? Number(form.usaManufacturingTier) : baseProduct.usaManufacturingTier,
          originTransparencyTier: form.originTransparencyTier ? Number(form.originTransparencyTier) : baseProduct.originTransparencyTier,
          singleSourceSystemTier: form.singleSourceSystemTier ? Number(form.singleSourceSystemTier) : baseProduct.singleSourceSystemTier,
          warrantyTier: form.warrantyTier ? Number(form.warrantyTier) : baseProduct.warrantyTier,
        };
        
        // Generate auto pros/cons
        const generated = generateAutoProsCons(currentProduct, products);
        
        // Load persisted enabled state from overlay (if available)
        const overlayRes = await fetch(`/api/admin/products/${productId}`, { cache: "no-store" });
        let persisted: AutoProCon[] = [];
        if (overlayRes.ok) {
          const overlayData = await overlayRes.json();
          if (Array.isArray(overlayData?.overlay?.autoProsCons)) {
            persisted = overlayData.overlay.autoProsCons;
          }
        }
        
        const persistedMap = new Map<string, boolean>();
        for (const item of persisted) {
          persistedMap.set(item.text, item.enabled);
        }
        
        // Apply persisted enabled state, defaulting to true for new items
        const merged = generated.map((item) => ({
          ...item,
          enabled: persistedMap.has(item.text) ? persistedMap.get(item.text)! : true,
        }));
        
        setAutoProsCons(merged);
      } catch (err) {
        console.error("Failed to load products for auto pros/cons:", err);
      }
    };
    
    run();
  }, [productId, loaded, form]);
  
  function toggleAutoProCon(text: string) {
    setAutoProsCons((prev) =>
      prev.map((item) =>
        item.text === text ? { ...item, enabled: !item.enabled } : item
      )
    );
  }

  function updateField<K extends keyof OverlayFormState>(
    key: K,
    value: OverlayFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function parseIntOrNull(value: string): number | null {
    if (!value.trim()) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);

    const body = {
      usaManufacturingTier: parseIntOrNull(form.usaManufacturingTier),
      originTransparencyTier: parseIntOrNull(form.originTransparencyTier),
      singleSourceSystemTier: parseIntOrNull(form.singleSourceSystemTier),
      warrantyTier: parseIntOrNull(form.warrantyTier),
      portability: form.portability || null,
      wallThicknessCapacity: form.wallThicknessCapacity || null,
      materials: form.materials || null,
      dieShapes: form.dieShapes || null,
      mandrel: form.mandrel || null,
      hasPowerUpgradePath: form.hasPowerUpgradePath,
      lengthStop: form.lengthStop,
      rotationIndexing: form.rotationIndexing,
      angleMeasurement: form.angleMeasurement,
      autoStop: form.autoStop,
      thickWallUpgrade: form.thickWallUpgrade,
      thinWallUpgrade: form.thinWallUpgrade,
      wiperDieSupport: form.wiperDieSupport,
      sBendCapability: form.sBendCapability,
      pros: form.pros || null,
      cons: form.cons || null,
      consSources: form.consSources || null,
      keyFeatures: form.keyFeatures || null,
      highlights: form.highlights || null,
      citationsRaw: form.citationsRaw || null,
      autoProsCons: autoProsCons.length > 0 ? autoProsCons : null,
    };

    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatusMsg(data?.error ?? "Failed to save overlay.");
        setStatusKind("error");
        setSaving(false);
        return;
      }

      setStatusMsg("Overlay saved to Neon.");
      setStatusKind("ok");
    } catch (err) {
      setStatusMsg(
        err instanceof Error
          ? err.message
          : "Unexpected error saving overlay.",
      );
      setStatusKind("error");
    } finally {
      setSaving(false);
    }
  }

  if (!productId) {
    return (
      <div className="text-sm text-red-700">
        No product id in URL. Open{" "}
        <code className="rounded bg-gray-100 px-1">
          /admin/products/roguefab-m601
        </code>{" "}
        as an example.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900">
          Overlay &amp; review content for{" "}
          <span className="font-mono">{productId}</span>
        </h2>
        <p className="mt-1 text-xs text-gray-600">
          This edits the Neon{" "}
          <code className="rounded bg-gray-100 px-1">
            bender_overlays
          </code>{" "}
          row for this product. Later, the public scoring &amp; review pages
          will read from here instead of the JSON overlay.
        </p>
      </div>

      {statusMsg && (
        <div
          className={`rounded-md border px-3 py-2 text-xs ${
            statusKind === "ok"
              ? "border-green-200 bg-green-50 text-green-800"
              : statusKind === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-gray-200 bg-gray-50 text-gray-700"
          }`}
        >
          {statusMsg}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Tiers */}
          <div>
            <h3 className="text-xs font-semibold text-gray-800">
              Disclosure / scoring tiers
            </h3>
            <div className="mt-2 space-y-2 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-gray-700">
                  USA manufacturing tier (0–5)
                </label>
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={form.usaManufacturingTier}
                  onChange={(e) =>
                    updateField("usaManufacturingTier", e.target.value)
                  }
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-700">
                  Origin transparency tier (0–5)
                </label>
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={form.originTransparencyTier}
                  onChange={(e) =>
                    updateField("originTransparencyTier", e.target.value)
                  }
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-700">
                  Single-source system tier (0–2)
                </label>
                <input
                  type="number"
                  min={0}
                  max={2}
                  value={form.singleSourceSystemTier}
                  onChange={(e) =>
                    updateField("singleSourceSystemTier", e.target.value)
                  }
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-700">
                  Warranty tier (0–3)
                </label>
                <input
                  type="number"
                  min={0}
                  max={3}
                  value={form.warrantyTier}
                  onChange={(e) =>
                    updateField("warrantyTier", e.target.value)
                  }
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Capacity / text fields */}
          <div>
            <h3 className="text-xs font-semibold text-gray-800">
              Capacity &amp; normalized labels
            </h3>
            <div className="mt-2 space-y-2 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-gray-700">
                  Portability (normalized label)
                </label>
                <input
                  type="text"
                  placeholder="portable_with_rolling_option, fixed, rolling_standard…"
                  value={form.portability}
                  onChange={(e) => updateField("portability", e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-700">
                  Wall thickness capacity (for 1.75&quot; OD DOM)
                </label>
                <input
                  type="text"
                  placeholder=".156"
                  value={form.wallThicknessCapacity}
                  onChange={(e) =>
                    updateField("wallThicknessCapacity", e.target.value)
                  }
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-700">
                  Materials (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="Mild steel, 4130 chromoly, Stainless…"
                  value={form.materials}
                  onChange={(e) => updateField("materials", e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-700">
                  Die shapes (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="Round tube, Pipe, Square tube, EMT…"
                  value={form.dieShapes}
                  onChange={(e) => updateField("dieShapes", e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-700">
                  Mandrel (None, Economy, Available, Bronze, etc.)
                </label>
                <input
                  type="text"
                  value={form.mandrel}
                  onChange={(e) => updateField("mandrel", e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Boolean flags */}
        <div>
          <h3 className="text-xs font-semibold text-gray-800">
            Upgrade path &amp; capability flags
          </h3>
          <div className="mt-2 grid gap-2 text-xs md:grid-cols-3">
            {([
              ["hasPowerUpgradePath", "Power upgrade path"],
              ["lengthStop", "Length stop / backstop"],
              ["rotationIndexing", "Rotation indexing"],
              ["angleMeasurement", "Angle measurement"],
              ["autoStop", "Auto-stop for bend angle"],
              ["thickWallUpgrade", "Thick-wall upgrade"],
              ["thinWallUpgrade", "Thin-wall / AL / SS upgrade"],
              ["wiperDieSupport", "Wiper die support"],
              ["sBendCapability", "True S-bend capability"],
            ] as const).map(([key, label]) => (
              <label
                key={key}
                className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-1"
              >
                <input
                  type="checkbox"
                  checked={Boolean(form[key])}
                  onChange={(e) =>
                    updateField(key, e.target.checked as any)
                  }
                  className="h-3 w-3"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Editorial content */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="text-xs font-semibold text-gray-800">
              Pros / Cons &amp; sources
            </h3>
            <div className="mt-2 space-y-2 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-gray-700">
                  Pros (one per line or paragraph)
                </label>
                <textarea
                  rows={5}
                  value={form.pros}
                  onChange={(e) => updateField("pros", e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-700">
                  Cons (one per line or paragraph)
                </label>
                <textarea
                  rows={5}
                  value={form.cons}
                  onChange={(e) => updateField("cons", e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-700">
                  Cons sources (freeform, legacy field)
                </label>
                <textarea
                  rows={3}
                  value={form.consSources}
                  onChange={(e) =>
                    updateField("consSources", e.target.value)
                  }
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Auto-generated Pros/Cons (Category #7B) */}
          <div className="col-span-2">
            <h3 className="text-xs font-semibold text-gray-800">
              Auto-generated Pros / Cons (Category #7B)
            </h3>
            
            {/* Admin warning */}
            <div className="mt-2 rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
              <p className="font-semibold mb-1">⚠️ Legal &amp; Public Display Warning</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Pros/Cons are shown publicly on review pages.</li>
                <li>Auto-generated items come from scoring comparisons only (facts, not opinions).</li>
                <li>Any manual con not based on manufacturer documentation must include an inline source.</li>
                <li>This is legally sensitive; when in doubt, leave it OFF.</li>
              </ul>
            </div>

            {autoProsCons.length > 0 ? (
              <div className="mt-3 space-y-3">
                <div>
                  <h4 className="text-[11px] font-semibold text-emerald-700 mb-2">
                    Auto-generated Pros ({autoProsCons.filter((i) => i.type === "pro").length})
                  </h4>
                  <div className="space-y-2">
                    {autoProsCons
                      .filter((item) => item.type === "pro")
                      .map((item, idx) => (
                        <label
                          key={idx}
                          className="flex items-start gap-2 rounded-md border border-gray-200 bg-white p-2 text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={item.enabled}
                            onChange={() => toggleAutoProCon(item.text)}
                            className="mt-0.5 h-3 w-3 shrink-0"
                          />
                          <div className="flex-1">
                            <span className="font-semibold text-emerald-700">Pro:</span>{" "}
                            <span className="text-gray-800">{item.text}</span>
                          </div>
                        </label>
                      ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-[11px] font-semibold text-rose-700 mb-2">
                    Auto-generated Cons ({autoProsCons.filter((i) => i.type === "con").length})
                  </h4>
                  <div className="space-y-2">
                    {autoProsCons
                      .filter((item) => item.type === "con")
                      .map((item, idx) => (
                        <label
                          key={idx}
                          className="flex items-start gap-2 rounded-md border border-gray-200 bg-white p-2 text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={item.enabled}
                            onChange={() => toggleAutoProCon(item.text)}
                            className="mt-0.5 h-3 w-3 shrink-0"
                          />
                          <div className="flex-1">
                            <span className="font-semibold text-rose-700">Con:</span>{" "}
                            <span className="text-gray-800">{item.text}</span>
                          </div>
                        </label>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-xs text-gray-500">
                No auto-generated pros/cons available. Ensure product data is loaded and valid.
              </p>
            )}
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-800">
              Key features, highlights &amp; citations
            </h3>
            <div className="mt-2 space-y-2 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-gray-700">
                  Key features (one per line)
                </label>
                <textarea
                  rows={4}
                  value={form.keyFeatures}
                  onChange={(e) =>
                    updateField("keyFeatures", e.target.value)
                  }
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-700">
                  Highlights (short marketing copy)
                </label>
                <textarea
                  rows={3}
                  value={form.highlights}
                  onChange={(e) =>
                    updateField("highlights", e.target.value)
                  }
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-700">
                  Citations (one per line, pipe-separated fields)
                </label>
                <p className="mt-1 text-[11px] text-gray-500">
                  Format:{" "}
                  <code className="rounded bg-gray-50 px-1">
                    category | sourceType | urlOrRef | title | accessed |
                    note
                  </code>
                  . Example:{" "}
                  <code className="rounded bg-gray-50 px-1">
                    valueForMoney | web-page | https://roguefab.com/specs |
                    RogueFab M625 specs | 2025-12-01 | &quot;Max
                    capacity&quot; row
                  </code>
                  .
                </p>
                <textarea
                  rows={6}
                  value={form.citationsRaw}
                  onChange={(e) =>
                    updateField("citationsRaw", e.target.value)
                  }
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-xs font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[11px] text-gray-500">
            Saving writes directly to Neon table{" "}
            <code className="rounded bg-gray-100 px-1">
              bender_overlays
            </code>
            . This will ultimately become the single source of truth for
            scoring &amp; review text.
          </p>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {saving ? "Saving…" : "Save overlay"}
          </button>
        </div>
      </form>
    </div>
  );
}

