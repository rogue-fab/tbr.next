// lib/analytics.ts
//
// Lightweight, privacy-respecting first-party pageview analytics. We store only:
// path, referrer HOST (not full URL), country (derived from the edge header, not
// the IP itself), device class, and a timestamp. No IPs, no cookies, no PII.
//
// Requires (owner runs once in the Neon SQL editor, as the owner role):
//   create table if not exists page_views (
//     id bigserial primary key,
//     path text not null,
//     referrer_host text,
//     country text,
//     device text,
//     created_at timestamptz not null default now()
//   );
//   create index if not exists page_views_created_at_idx on page_views (created_at);
//   grant select, insert on page_views to robot_app;
//   grant usage, select on sequence page_views_id_seq to robot_app;
//
// Until that table exists, tracking silently no-ops and the Analytics tab shows a
// "not initialized" note — the public site is never affected.

import { sql } from "./db";

export async function insertPageView(v: {
  path: string;
  referrerHost?: string | null;
  country?: string | null;
  device?: string | null;
}): Promise<void> {
  await sql`
    insert into page_views (path, referrer_host, country, device)
    values (${v.path}, ${v.referrerHost ?? null}, ${v.country ?? null}, ${v.device ?? null})
  `;
}

export type AnalyticsSummary = {
  total: number;
  last7: number;
  last24h: number;
  topPages: { path: string; views: number }[];
  topReferrers: { host: string; views: number }[];
  topCountries: { country: string; views: number }[];
  devices: { device: string; views: number }[];
  byDay: { day: string; views: number }[];
};

export async function getAnalytics(): Promise<AnalyticsSummary> {
  const [total] = await sql`select count(*)::int n from page_views`;
  const [last7] = await sql`select count(*)::int n from page_views where created_at > now() - interval '7 days'`;
  const [last24] = await sql`select count(*)::int n from page_views where created_at > now() - interval '24 hours'`;
  const topPages = await sql`
    select path, count(*)::int views from page_views group by path order by views desc limit 15`;
  const topReferrers = await sql`
    select coalesce(nullif(referrer_host, ''), '(direct)') host, count(*)::int views
    from page_views group by host order by views desc limit 10`;
  const topCountries = await sql`
    select coalesce(nullif(country, ''), '(unknown)') country, count(*)::int views
    from page_views group by country order by views desc limit 12`;
  const devices = await sql`
    select coalesce(nullif(device, ''), '(unknown)') device, count(*)::int views
    from page_views group by device order by views desc`;
  const byDay = await sql`
    select to_char(date_trunc('day', created_at), 'YYYY-MM-DD') day, count(*)::int views
    from page_views where created_at > now() - interval '30 days' group by day order by day`;

  return {
    total: (total as any).n,
    last7: (last7 as any).n,
    last24h: (last24 as any).n,
    topPages: topPages as any,
    topReferrers: topReferrers as any,
    topCountries: topCountries as any,
    devices: devices as any,
    byDay: byDay as any,
  };
}
