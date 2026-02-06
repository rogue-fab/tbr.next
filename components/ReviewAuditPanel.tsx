import Link from "next/link";

type Props = {
  /** The merged product object for this review (base + overlay). */
  product: Record<string, any>;
};

type CitationGroup = {
  fieldKey: string;
  fieldLabel: string;
  value: string;
  source1: string;
  accessed: string;
  notes: string;
  userCode: string;
};

// Human-readable labels for the fields we currently drive citations from.
// Anything not listed here will fall back to the raw field key.
const FIELD_LABELS: Record<string, string> = {
  maxCapacity: "Max diameter capacity",
  country: "Made in / origin claim",
  powerType: "Power type",
  bendAngle: "Max bend angle",
  wallThicknessCapacity: 'Wall thickness (1.75" DOM)',
  mandrel: "Mandrel option",
  sBendCapability: "S-bend capability",
  framePriceMin: "Frame price – Min",
  framePriceMax: "Frame price – Max",
  diePriceMin: "Die price – Min (180° complete)",
  diePriceMax: "Die price – Max (limiting OD / CLR)",
  hydraulicPriceMin: "Hydraulics price – Min",
  hydraulicPriceMax: "Hydraulics price – Max",
  standPriceMin: "Stand / cart price – Min",
  standPriceMax: "Stand / cart price – Max",
};

function normalizeValue(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "number") return String(raw);
  return String(raw);
}

function collectCitationGroups(product: Record<string, any>): CitationGroup[] {
  const groups: Record<string, CitationGroup> = {};

  for (const key of Object.keys(product)) {
    const match = key.match(/^(.*)(Source1|Source2|Notes|UserCode)$/);
    if (!match) continue;

    const fieldKey = match[1];
    const suffix = match[2] as "Source1" | "Source2" | "Notes" | "UserCode";

    if (!groups[fieldKey]) {
      const value = normalizeValue(product[fieldKey]);
      groups[fieldKey] = {
        fieldKey,
        fieldLabel: FIELD_LABELS[fieldKey] ?? fieldKey,
        value,
        source1: "",
        accessed: "",
        notes: "",
        userCode: "",
      };
    }

    const group = groups[fieldKey];
    const v = normalizeValue(product[key]);

    if (suffix === "Source1") group.source1 = v;
    else if (suffix === "Source2") group.accessed = v;
    else if (suffix === "Notes") group.notes = v;
    else if (suffix === "UserCode") group.userCode = v;
  }

  return Object.values(groups)
    // Drop groups with no actual audit content.
    .filter((g) => g.source1 || g.accessed || g.notes || g.userCode)
    // Stable sort by label so the table is predictable.
    .sort((a, b) => a.fieldLabel.localeCompare(b.fieldLabel));
}

export default function ReviewAuditPanel({ product }: Props) {
  const groups = collectCitationGroups(product);

  // If there is nothing to show yet for this model, don't render anything.
  if (!groups.length && !product.citationsRaw) {
    return null;
  }

  return (
    <section
      id="audit-details"
      className="mt-8 rounded-xl border border-gray-200 bg-white px-4 py-4 text-xs text-gray-700 shadow-sm"
    >
      <h2 className="text-sm font-semibold text-gray-900">
        Audit trail &amp; citations for this model
      </h2>
      <p className="mt-1 text-[0.7rem] text-gray-600">
        This section shows the proof behind the specs that drive scoring for this
        specific model — including where each spec came from, when it was pulled,
        and who verified it.
      </p>

      {/* Simple native disclosure so we don't need any client hooks here */}
      <details className="mt-3">
        <summary className="cursor-pointer text-[0.75rem] font-medium text-blue-700 hover:text-blue-800">
          Expand audit trail &amp; citation list for this model
        </summary>

        <div className="mt-3 space-y-4">
          {groups.length > 0 && (
            <div className="overflow-x-auto rounded border border-gray-200">
              <table className="min-w-full border-collapse text-[0.7rem]">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th className="px-2 py-1 text-left font-semibold text-gray-700">
                      Spec / field
                    </th>
                    <th className="px-2 py-1 text-left font-semibold text-gray-700">
                      Value used
                    </th>
                    <th className="px-2 py-1 text-left font-semibold text-gray-700">
                      Source / document
                    </th>
                    <th className="px-2 py-1 text-left font-semibold text-gray-700">
                      Accessed (YYYY-MM-DD)
                    </th>
                    <th className="px-2 py-1 text-left font-semibold text-gray-700">
                      Notes
                    </th>
                    <th className="px-2 py-1 text-left font-semibold text-gray-700">
                      Initials / Emp#
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => (
                    <tr key={g.fieldKey} className="border-t border-gray-100">
                      <td className="px-2 py-1 align-top text-gray-800">
                        <div className="font-semibold">{g.fieldLabel}</div>
                        {g.fieldKey !== g.fieldLabel && (
                          <div className="text-[0.65rem] text-gray-400">
                            ({g.fieldKey})
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-1 align-top text-gray-800">
                        {g.value || "—"}
                      </td>
                      <td className="px-2 py-1 align-top text-gray-800 break-all">
                        {g.source1 || "—"}
                      </td>
                      <td className="px-2 py-1 align-top text-gray-800">
                        {g.accessed || "—"}
                      </td>
                      <td className="px-2 py-1 align-top text-gray-800">
                        {g.notes || "—"}
                      </td>
                      <td className="px-2 py-1 align-top text-gray-800">
                        {g.userCode || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {product.citationsRaw && (
            <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
              <div className="mb-1 text-[0.7rem] font-semibold text-gray-900">
                Raw citation log
              </div>
              <p className="mb-1 text-[0.65rem] text-gray-600">
                This is the compact, machine-readable log pulled from the admin
                overlay. Format:{" "}
                <code className="font-mono text-[0.65rem]">
                  category | sourceType | urlOrRef | title | accessed (YYYY-MM-DD) | note
                </code>
                .
              </p>
              <pre className="mt-1 max-h-52 overflow-auto rounded bg-white px-2 py-1 text-[0.65rem] text-gray-800">
                {String(product.citationsRaw).trim()}
              </pre>
            </div>
          )}
        </div>
      </details>
    </section>
  );
}

