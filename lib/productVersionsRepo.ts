// lib/productVersionsRepo.ts
import { sql } from "./db";

// JSONValue type for Drizzle/postgres JSON column typing
type JSONValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JSONValue }
  | JSONValue[];

export type EvidenceInsert = {
  id?: string;
  fieldKey: string;
  sourceType: "web-page" | "pdf" | "manual" | "other";
  url?: string;
  quotedText?: string;
  howGathered?: string;
  notes?: string;
  verifiedBy: string;
  verifiedAt: Date;
};

export type ProductVersionRow = {
  id: string;
  product_id: string;
  status: "draft" | "published";
  version: number;
  fields_json: any;
  score_json: any;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type EvidenceRow = {
  id: string;
  product_version_id: string;
  field_key: string;
  source_type: "web-page" | "pdf" | "manual" | "other";
  url: string | null;
  quoted_text: string | null;
  how_gathered: string | null;
  notes: string | null;
  verified_by: string;
  verified_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Save (upsert) the current draft for a product and replace its evidence rows.
 * This is an explicit "one request per click" write path (no autosave).
 */
export async function saveProductDraft(args: {
  productId: string;
  fieldsJson: unknown;
  scoreJson: unknown;
  actor: string;
  evidence: EvidenceInsert[];
}): Promise<{ draftVersionId: string }> {
  const { productId, fieldsJson, scoreJson, actor, evidence } = args;

  return await sql.begin(async (tx) => {
    // Find existing draft version id (one draft row per product)
    const existing =
      await tx<{ id: string }[]>`
        select id
        from product_versions
        where product_id = ${productId} and status = 'draft'
        limit 1
      `;

    let draftVersionId: string;
    if (existing.length) {
      draftVersionId = existing[0]!.id;
      await tx`
        update product_versions
        set
          -- fields_json / score_json are validated upstream and intentionally
          -- stored as raw JSON snapshots; assert here to satisfy Drizzle typing.
          fields_json = ${tx.json(fieldsJson as JSONValue)},
          score_json  = ${tx.json(scoreJson as JSONValue)},
          created_by  = ${actor},
          updated_at  = now()
        where id = ${draftVersionId}
      `;
    } else {
      const inserted =
        await tx<{ id: string }[]>`
          insert into product_versions
            (product_id, status, version, fields_json, score_json, created_by)
          values
            (${productId}, 'draft', 0, ${tx.json(fieldsJson as JSONValue)}, ${tx.json(scoreJson as JSONValue)}, ${actor})
          returning id
        `;
      draftVersionId = inserted[0]!.id;
    }

    // Replace-on-save evidence rows for this draft version.
    await tx`
      delete from product_field_evidence
      where product_version_id = ${draftVersionId}
    `;

    if (evidence.length) {
      await tx`
        insert into product_field_evidence
          (product_version_id, field_key, source_type, url, quoted_text, how_gathered, notes, verified_by, verified_at)
        values
          ${sql.join(
            evidence.map(
              (e) => sql`(
                ${draftVersionId},
                ${e.fieldKey},
                ${e.sourceType},
                ${e.url ?? null},
                ${e.quotedText ?? null},
                ${e.howGathered ?? null},
                ${e.notes ?? null},
                ${e.verifiedBy},
                ${e.verifiedAt}
              )`
            ),
            sql`, `
          )}
      `;
    }

    return { draftVersionId };
  });
}

export async function getLatestDraftVersion(productId: string): Promise<ProductVersionRow | null> {
  const rows = (await sql`
    select
      id,
      product_id,
      status,
      version,
      fields_json,
      score_json,
      created_by,
      created_at,
      updated_at
    from product_versions
    where product_id = ${productId} and status = 'draft'
    order by updated_at desc
    limit 1
  `) as unknown as ProductVersionRow[];

  if (!rows || rows.length === 0) return null;
  return rows[0]!;
}

export async function getEvidenceForVersion(productVersionId: string): Promise<EvidenceRow[]> {
  const rows = (await sql`
    select
      id,
      product_version_id,
      field_key,
      source_type,
      url,
      quoted_text,
      how_gathered,
      notes,
      verified_by,
      verified_at,
      is_active,
      created_at,
      updated_at
    from product_field_evidence
    where product_version_id = ${productVersionId}
      and is_active = true
    order by verified_at desc, created_at desc
  `) as unknown as EvidenceRow[];

  return rows ?? [];
}

/**
 * Load the latest published version for a product (or null if none).
 * This is the read-side companion to POST publish.
 */
export async function getLatestPublishedVersion(productId: string) {
  const rows = await sql/* sql */`
    SELECT
      id,
      product_id,
      status,
      version,
      fields_json,
      score_json,
      created_by,
      created_at,
      updated_at
    FROM product_versions
    WHERE product_id = ${productId}
      AND status = 'published'
    ORDER BY version DESC, updated_at DESC
    LIMIT 1
  `;

  if (!rows || rows.length === 0) return null;
  return rows[0];
}

/**
 * Bulk-load latest published versions for many products.
 * Used by public catalog overlay merge to avoid N+1 queries.
 */
export async function getLatestPublishedVersionsForProducts(productIds: string[]) {
  const ids = (productIds ?? []).filter(Boolean);
  if (ids.length === 0) return [];

  // DISTINCT ON picks the highest-version published row per product_id.
  // If version ties ever occur, we prefer latest updated_at.
  const rows = await sql/* sql */`
    select distinct on (product_id)
      id,
      product_id,
      status,
      version,
      fields_json,
      score_json,
      created_by,
      created_at,
      updated_at
    from product_versions
    where status = 'published'
      and product_id = any(${sql.array(ids)})
    order by product_id, version desc, updated_at desc
  `;

  return rows as any[];
}


export async function publishCurrentDraft(args: {
  productId: string;
  actor: string;
}): Promise<{ publishedVersionId: string; version: number }> {
  const { productId, actor } = args;

  return await sql.begin(async (tx) => {
    // Load draft
    const draftRows = (await tx`
      select
        id,
        product_id,
        status,
        version,
        fields_json,
        score_json,
        created_by,
        created_at,
        updated_at
      from product_versions
      where product_id = ${productId} and status = 'draft'
      order by updated_at desc
      limit 1
    `) as unknown as ProductVersionRow[];

    if (!draftRows || draftRows.length === 0) {
      throw new Error("NO_DRAFT");
    }

    const draft = draftRows[0]!;

    // Compute next published version number
    const maxPub = await tx<{ max: number | null }[]>`
      select max(version) as max
      from product_versions
      where product_id = ${productId} and status = 'published'
    `;
    const nextVersion = (maxPub?.[0]?.max ?? 0) + 1;

    // Insert published version row
    const inserted = await tx<{ id: string }[]>`
      insert into product_versions
        (product_id, status, version, fields_json, score_json, created_by)
      values
        (${productId}, 'published', ${nextVersion}, ${tx.json(draft.fields_json as JSONValue)}, ${tx.json(draft.score_json as JSONValue)}, ${actor})
      returning id
    `;
    const publishedVersionId = inserted[0]!.id;

    // Copy evidence from draft -> published
    const evidence = (await tx`
      select
        field_key,
        source_type,
        url,
        quoted_text,
        how_gathered,
        notes,
        verified_by,
        verified_at
      from product_field_evidence
      where product_version_id = ${draft.id}
        and is_active = true
    `) as unknown as Array<{
      field_key: string;
      source_type: EvidenceInsert["sourceType"];
      url: string | null;
      quoted_text: string | null;
      how_gathered: string | null;
      notes: string | null;
      verified_by: string;
      verified_at: string;
    }>;

    if (evidence?.length) {
      await tx`
        insert into product_field_evidence
          (product_version_id, field_key, source_type, url, quoted_text, how_gathered, notes, verified_by, verified_at)
        values
          ${sql.join(
            evidence.map(
              (e) => sql`(
                ${publishedVersionId},
                ${e.field_key},
                ${e.source_type},
                ${e.url ?? null},
                ${e.quoted_text ?? null},
                ${e.how_gathered ?? null},
                ${e.notes ?? null},
                ${e.verified_by},
                ${new Date(e.verified_at)}
              )`
            ),
            sql`, `
          )}
      `;
    }

    return { publishedVersionId, version: nextVersion };
  });
}

