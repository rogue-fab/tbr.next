/**
 * Inspect what the bundler included from our data modules.
 * GET /api/_debug/datasets -> JSON summary (keys, lengths, sample shapes)
 */
import { NextResponse, type NextRequest } from "next/server";
import * as catalogNS from "../../../../lib/catalog";
import { isAuthorized, unauthorized } from "../../../../lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnyRec = Record<string, unknown>;

function peek(val: unknown) {
  if (Array.isArray(val)) {
    return {
      type: "array",
      length: val.length,
      sample: val.slice(0, 2).map((x) =>
        x && typeof x === "object" ? Object.keys(x as AnyRec) : typeof x
      ),
    };
  }
  if (val && typeof val === "object") {
    const o = val as AnyRec;
    const values = Object.values(o);
    const first = values.length ? values[0] : null;
    return {
      type: "object",
      keys: Object.keys(o).slice(0, 6),
      sampleFirst: first && typeof first === "object" ? Object.keys(first as AnyRec) : typeof first,
    };
  }
  return { type: typeof val };
}

function describe(ns: AnyRec) {
  const keys = Object.keys(ns);
  const inspect = [
    "default",
    "CATALOG",
    "CATALOG_MAP",
    "SLUGS",
    "ITEMS",
    "MODELS",
    "BENDERS",
    "TUBE_BENDERS",
    "list",
    "catalog",
    "benders",
  ];
  const out: AnyRec = { exportKeys: keys };
  for (const k of inspect) {
    if (k in ns) out[k] = peek(ns[k]);
  }
  return out;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();

  return NextResponse.json({
    ok: true,
    catalog: describe(catalogNS as AnyRec),
  });
}
