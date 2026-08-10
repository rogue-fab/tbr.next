// lib/imageSubmissions.ts
//
// Transient storage for user-submitted product photos. A photo is held here
// only between form submission and email confirmation (double opt-in); on
// verify it is emailed to the admin as an attachment and the row is deleted.
//
// Requires (run once in the Neon SQL editor):
//   CREATE TABLE IF NOT EXISTS image_submissions (
//     id text PRIMARY KEY,
//     image_bytes bytea NOT NULL,
//     image_type  text  NOT NULL,
//     image_name  text  NOT NULL,
//     created_at  timestamptz NOT NULL DEFAULT now()
//   );
//   GRANT SELECT, INSERT, UPDATE, DELETE ON image_submissions TO robot_app;
import crypto from "crypto";
import { sql } from "./db";

export type PendingImage = {
  imageBytes: Buffer;
  imageType: string;
  imageName: string;
};

export async function insertPendingImage(args: PendingImage): Promise<string> {
  const id = crypto.randomBytes(16).toString("hex");
  await sql`
    insert into image_submissions (id, image_bytes, image_type, image_name)
    values (${id}, ${args.imageBytes}, ${args.imageType}, ${args.imageName})
  `;
  // Opportunistic cleanup of anything never confirmed (token TTL is 48h).
  try {
    await sql`delete from image_submissions where created_at < now() - interval '48 hours'`;
  } catch {
    /* ignore cleanup errors */
  }
  return id;
}

export async function fetchAndDeletePendingImage(
  id: string,
): Promise<PendingImage | null> {
  const rows = (await sql`
    delete from image_submissions where id = ${id}
    returning image_bytes, image_type, image_name
  `) as unknown as Array<{
    image_bytes: Buffer | Uint8Array;
    image_type: string;
    image_name: string;
  }>;
  if (!rows || rows.length === 0) return null;
  const r = rows[0]!;
  return {
    imageBytes: Buffer.from(r.image_bytes as Uint8Array),
    imageType: r.image_type,
    imageName: r.image_name,
  };
}
