// lib/appSettings.ts
//
// Tiny runtime key/value settings store (Neon `app_settings` table). Used for
// things that must be togglable at runtime WITHOUT a redeploy — currently the
// temp "placeholder data" banner.
//
// Requires (owner runs once in the Neon SQL editor, as the owner role):
//   create table if not exists app_settings (
//     key text primary key,
//     value jsonb not null,
//     updated_at timestamptz not null default now()
//   );
//   grant select, insert, update, delete on app_settings to robot_app;
//
// Until that table exists, reads fail SAFE (banner treated as ON) and writes
// surface an error in the admin — the public site is never affected.

import { sql } from "./db";

const TEMP_BANNER_KEY = "temp_banner";

export const DEFAULT_TEMP_BANNER_MESSAGE =
  "TEMP DATA — COME BACK LATER. This site is in placeholder mode; specs/compare may be inaccurate.";

export type TempBannerSetting = {
  /** Admin intent: does the owner want the banner shown? */
  enabled: boolean;
  /** Banner text. */
  message: string;
};

function normalize(v: any): TempBannerSetting {
  const enabled = typeof v?.enabled === "boolean" ? v.enabled : true;
  const message =
    typeof v?.message === "string" && v.message.trim()
      ? v.message
      : DEFAULT_TEMP_BANNER_MESSAGE;
  return { enabled, message };
}

/**
 * Read the temp-banner setting. Fails SAFE: on a missing table / DB error / no
 * row yet, returns { enabled: true, default message } so the banner is never
 * silently hidden by an infrastructure problem.
 */
export async function getTempBannerSetting(): Promise<TempBannerSetting> {
  try {
    const rows = await sql`
      select value from app_settings where key = ${TEMP_BANNER_KEY} limit 1
    `;
    if (rows.length > 0) return normalize(rows[0].value);
  } catch {
    // fall through to safe default
  }
  return { enabled: true, message: DEFAULT_TEMP_BANNER_MESSAGE };
}

/** Upsert the temp-banner setting. Throws if the settings table is missing. */
export async function setTempBannerSetting(
  next: Partial<TempBannerSetting>,
): Promise<TempBannerSetting> {
  const current = await getTempBannerSetting();
  const merged: TempBannerSetting = normalize({
    enabled: typeof next.enabled === "boolean" ? next.enabled : current.enabled,
    message:
      typeof next.message === "string" && next.message.trim()
        ? next.message.trim()
        : current.message,
  });

  await sql`
    insert into app_settings (key, value, updated_at)
    values (${TEMP_BANNER_KEY}, ${sql.json(merged as any)}, now())
    on conflict (key) do update
      set value = ${sql.json(merged as any)}, updated_at = now()
  `;

  return merged;
}
