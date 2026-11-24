// lib/analytics.ts
//
// Lightweight, privacy-respecting first-party analytics. We store only: event
// kind (pageview / outbound click), path, referrer HOST (not full URL), UTM
// source/campaign, outbound target host, country (from the edge header, not the
// IP), device class, a DAILY-ROTATING anonymous visitor hash, and a timestamp.
// No cookies, no stored IPs, no PII. The visitor hash is sha256(daily secret +
// IP + user agent); the daily secret changes every UTC day and is never stored,
// so the same person can't be linked across days (the approach Plausible uses).
//
// Requires (owner runs once in the Neon SQL editor, as the owner role):
export const PAGE_VIEWS_DDL = `create table if not exists page_views (
  id bigserial primary key,
  kind text not null default 'view',
  path text not null,
  referrer_host text,
  utm_source text,
  utm_campaign text,
  target_host text,
  country text,
  device text,
  visitor text,
  created_at timestamptz not null default now()
);
create index if not exists page_views_created_at_idx on page_views (created_at);
grant select, insert on page_views to robot_app;
grant usage, select on sequence page_views_id_seq to robot_app;`;
//
// Until that table exists, tracking silently no-ops and the Analytics tab shows
// the DDL to run — the public site is never affected.

import { createHash, createHmac } from "node:crypto";
import { sql } from "./db";

/** Anonymous visitor id for TODAY only. Returns null when no secret is configured. */
export function dailyVisitorHash(ip: string, ua: string): string | null {
  const secret = process.env.ADMIN_TOKEN?.trim();
  if (!secret || !ip) return null;
  const day = new Date().toISOString().slice(0, 10);
  const dailySalt = createHmac("sha256", secret).update(`page_views:${day}`).digest("hex");
  return createHash("sha256").update(`${dailySalt}|${ip}|${ua}`).digest("hex").slice(0, 16);
}

export async function insertPageView(v: {
  kind?: "view" | "outbound";
  path: string;
  referrerHost?: string | null;
  utmSource?: string | null;
  utmCampaign?: string | null;
  targetHost?: string | null;
  country?: string | null;
  device?: string | null;
  visitor?: string | null;
}): Promise<void> {
  await sql`
    insert into page_views (kind, path, referrer_host, utm_source, utm_campaign, target_host, country, device, visitor)
    values (${v.kind ?? "view"}, ${v.path}, ${v.referrerHost ?? null}, ${v.utmSource ?? null}, ${v.utmCampaign ?? null},
            ${v.targetHost ?? null}, ${v.country ?? null}, ${v.device ?? null}, ${v.visitor ?? null})
  `;
}

export type AnalyticsSummary = {
  total: number;
  last7: number;
  last24h: number;
  visitors24h: number;
  visitors7: number;
  outbound7: number;
  topPages: { path: string; views: number }[];
  topReferrers: { host: string; views: number }[];
  topCampaigns: { source: string; views: number }[];
  topOutbound: { host: string; views: number }[];
  outboundByPage: { path: string; views: number }[];
  topCountries: { country: string; views: number }[];
  devices: { device: string; views: number }[];
  byDay: { day: string; views: number; visitors: number }[];
};

export async function getAnalytics(): Promise<AnalyticsSummary> {
  const [c] = await sql`
    select
      count(*) filter (where kind = 'view')::int total,
      count(*) filter (where kind = 'view' and created_at > now() - interval '7 days')::int last7,
      count(*) filter (where kind = 'view' and created_at > now() - interval '24 hours')::int last24,
      count(distinct visitor) filter (where kind = 'view' and created_at > now() - interval '24 hours')::int v24,
      count(*) filter (where kind = 'outbound' and created_at > now() - interval '7 days')::int out7
    from page_views`;
  // Weekly uniques = sum of distinct visitors per day (the hash rotates daily, so
  // a returning visitor counts once per day they visit).
  const [v7] = await sql`
    select coalesce(sum(n), 0)::int n from (
      select count(distinct visitor) n from page_views
      where kind = 'view' and created_at > now() - interval '7 days'
      group by date_trunc('day', created_at)) d`;
  const topPages = await sql`
    select path, count(*)::int views from page_views where kind = 'view'
    group by path order by views desc limit 15`;
  const topReferrers = await sql`
    select coalesce(nullif(referrer_host, ''), '(direct)') host, count(*)::int views
    from page_views where kind = 'view' group by host order by views desc limit 10`;
  const topCampaigns = await sql`
    select utm_source || coalesce(' / ' || nullif(utm_campaign, ''), '') source, count(*)::int views
    from page_views where kind = 'view' and coalesce(utm_source, '') <> ''
    group by source order by views desc limit 10`;
  const topOutbound = await sql`
    select coalesce(target_host, '(unknown)') host, count(*)::int views
    from page_views where kind = 'outbound' group by host order by views desc limit 12`;
  const outboundByPage = await sql`
    select path, count(*)::int views from page_views where kind = 'outbound'
    group by path order by views desc limit 12`;
  const topCountries = await sql`
    select coalesce(nullif(country, ''), '(unknown)') country, count(*)::int views
    from page_views where kind = 'view' group by country order by views desc limit 12`;
  const devices = await sql`
    select coalesce(nullif(device, ''), '(unknown)') device, count(*)::int views
    from page_views where kind = 'view' group by device order by views desc`;
  const byDay = await sql`
    select to_char(date_trunc('day', created_at), 'YYYY-MM-DD') day, count(*)::int views,
      count(distinct visitor)::int visitors
    from page_views where kind = 'view' and created_at > now() - interval '30 days' group by day order by day`;

  return {
    total: (c as any).total,
    last7: (c as any).last7,
    last24h: (c as any).last24,
    visitors24h: (c as any).v24,
    visitors7: (v7 as any).n,
    outbound7: (c as any).out7,
    topPages: topPages as any,
    topReferrers: topReferrers as any,
    topCampaigns: topCampaigns as any,
    topOutbound: topOutbound as any,
    outboundByPage: outboundByPage as any,
    topCountries: topCountries as any,
    devices: devices as any,
    byDay: byDay as any,
  };
}
