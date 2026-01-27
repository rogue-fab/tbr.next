// app/api/admin/products/[id]/draft/route.ts
import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ok, badRequest } from "../../../../../../lib/http";
import {
  getClientId,
  ratelimitAdminRead,
  ratelimitAdminWrite,
  enforceRateLimit,
} from "../../../../../../lib/rateLimit";
import {
  getLatestDraftVersion,
  getEvidenceForVersion,
  saveProductDraft,
} from "../../../../../../lib/productVersionsRepo";
import { adminDraftSchema } from "../../../../../../lib/adminDraftSchema";

const ADMIN_COOKIE_NAME = "admin_token";

function isAuthorized(request: NextRequest): boolean {
  const envToken = process.env.ADMIN_TOKEN?.trim();
  if (!envToken) return false;
  const cookieToken = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  return cookieToken === envToken;
}

function unauthorized() {
  return NextResponse.json(
    { ok: false, error: "Not authorized" },
    { status: 401 },
  );
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!isAuthorized(request)) {
    return unauthorized();
  }

  const productId = params?.id;
  if (!productId) {
    return badRequest("Missing product id");
  }

  const clientId = getClientId(request);
  const rateLimitResult = await enforceRateLimit(ratelimitAdminWrite, [
    "admin_api_write",
    clientId,
    "product_draft_write",
    productId,
  ]);
  if (!rateLimitResult.ok) {
    return Response.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimitResult.retryAfter ?? 60) },
      },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = adminDraftSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid draft payload",
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  const actor = `admin:${clientId}`;

  // NOTE: scoring is server-authoritative; the repo will persist computed score_json.
  // If you later want partial scoring, change repo signature instead of widening API.
  try {
    const scoreJson = {};
    const evidence = parsed.data.evidence.map((e) => {
      const verifiedBy = (e.verifiedBy?.trim() || actor).slice(0, 200);
      const verifiedAt = e.verifiedAt ? new Date(e.verifiedAt) : new Date();
      if (Number.isNaN(verifiedAt.getTime())) {
        throw new Error("Invalid verifiedAt");
      }
      return {
        fieldKey: e.fieldKey,
        sourceType: e.sourceType,
        url: e.url ?? undefined,
        // IMPORTANT: EvidenceInsert uses optional fields (string | undefined), not nullable fields.
        // Normalize null/empty to undefined to satisfy types + keep JSON clean.
        quotedText: e.quotedText ?? undefined,
        howGathered: e.howGathered ?? undefined,
        notes: e.notes ?? undefined,
        verifiedBy,
        verifiedAt,
      };
    });

    const { draftVersionId } = await saveProductDraft({
      productId,
      fieldsJson: parsed.data.fields,
      scoreJson,
      actor,
      evidence,
    });

    return ok({
      draftVersionId,
      productId,
      savedAt: new Date().toISOString(),
      actor,
    });
  } catch (err) {
    console.error("[product_versions] Failed to save draft:", err);
    return badRequest("Failed to save draft to Neon");
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!isAuthorized(request)) {
    return unauthorized();
  }

  const productId = params?.id;
  if (!productId) {
    return badRequest("Missing product id");
  }

  const clientId = getClientId(request);
  const rateLimitResult = await enforceRateLimit(ratelimitAdminRead, [
    "admin_api_read",
    clientId,
    "product_draft",
    productId,
  ]);
  if (!rateLimitResult.ok) {
    return Response.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimitResult.retryAfter ?? 60) },
      },
    );
  }

  try {
    const draft = await getLatestDraftVersion(productId);
    if (!draft) {
      return ok({ draft: null, evidence: [] });
    }
    const evidence = await getEvidenceForVersion(draft.id);
    return ok({
      draft: {
        id: draft.id,
        productId: draft.product_id,
        status: draft.status,
        version: draft.version,
        fields: draft.fields_json ?? {},
        score: draft.score_json ?? {},
        createdBy: draft.created_by,
        createdAt: draft.created_at,
        updatedAt: draft.updated_at,
      },
      evidence: evidence.map((e) => ({
        id: e.id,
        fieldKey: e.field_key,
        sourceType: e.source_type,
        url: e.url,
        quotedText: e.quoted_text,
        howGathered: e.how_gathered,
        notes: e.notes,
        verifiedBy: e.verified_by,
        verifiedAt: e.verified_at,
      })),
    });
  } catch (err) {
    console.error("[product_versions] Failed to load draft:", err);
    return badRequest("Failed to load draft from Neon");
  }
}

