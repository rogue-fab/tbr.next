// lib/db.ts
//
// Minimal Neon-compatible SQL helper using `postgres` (porsager).
// Exports `sql` used by repo files like productVersionsRepo.ts.

import postgres, { type Sql } from "postgres";

declare global {
  // eslint-disable-next-line no-var
  var __tbr_sql__: Sql | undefined;
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("Missing DATABASE_URL env var");
}

// Reuse a single client per runtime instance (including production) to reduce
// cold-start connection churn in serverless.
export const sql: Sql = (globalThis.__tbr_sql__ ??= postgres(DATABASE_URL, {
  // With Neon *pooler* URLs, keep client-side max low.
  // The pooler handles concurrency; too many client connections can add overhead.
  max: 2,
  idle_timeout: 60,
  connect_timeout: 10,
  prepare: false,
}));
