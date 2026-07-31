// app/api/admin/products/[id]/publish/route.ts
import { NextRequest } from "next/server";
import { ok, badRequest } from "../../../../../../lib/http";
import { isAuthorized, unauthorized } from "../../../../../../lib/adminAuth";
import {
  getClientId,
  ratelimitAdminRead,
  ratelimitAdminWrite,
  enforceRateLimit,
} from "../../../../../../lib/rateLimit";
import {
  publishCurrentDraft,
  getLatestPublishedVersion,
  getEvidenceForVersion,
} from "../../../../../../lib/productVersionsRepo";

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
    "product_published",
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
    const published = await getLatestPublishedVersion(productId);
    if (!published) {
      return ok({ published: null, evidence: [] });
    }
    const evidence = await getEvidenceForVersion(published.id);
    return ok({
      published: {
        id: published.id,
        productId: published.product_id,
        status: published.status,
        version: published.version,
        fields: published.fields_json ?? {},
        score: published.score_json ?? {},
        createdBy: published.created_by,
        createdAt: published.created_at,
        updatedAt: published.updated_at,
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
    console.error("[product_versions] Failed to load published:", err);
    return badRequest("Failed to load published from Neon");
  }
}

export async function POST(
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
    "product_publish",
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

  const actor = `admin:${clientId}`;

  try {
    const { publishedVersionId, version } = await publishCurrentDraft({
      productId,
      actor,
    });

    // Helpful for UI + debugging: return the canonical published object we just created.
    const published = await getLatestPublishedVersion(productId);
    const evidence = published ? await getEvidenceForVersion(published.id) : [];

    return ok({
      publishedVersionId,
      productId,
      version,
      publishedAt: new Date().toISOString(),
      actor,
      published: published
        ? {
            id: published.id,
            productId: (published as any).product_id,
            status: (published as any).status,
            version: (published as any).version,
            fields: (published as any).fields_json ?? {},
            score: (published as any).score_json ?? {},
            createdBy: (published as any).created_by,
            createdAt: (published as any).created_at,
            updatedAt: (published as any).updated_at,
          }
        : null,
      evidence: evidence.map((e: any) => ({
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
  } catch (err: any) {
    if (err?.message === "NO_DRAFT") {
      return badRequest("No draft exists for this product");
    }
    console.error("[product_versions] Failed to publish:", err);
    return badRequest("Failed to publish to Neon");
  }
}

