// Backfill published versions for the 2 gap products (jmr-tbm-250-ultra, hossfeld-no2).
// Lives inside the repo so `require('postgres')` resolves from ./node_modules
// (no NODE_PATH needed). Run: cd /c/repos/tbr && node backfill.cjs
// Safe to delete after: rm backfill.cjs
const fs = require("fs");
const url = fs.readFileSync("C:/repos/tbr/.env","utf8").match(/^\s*DATABASE_URL\s*=\s*(.+?)\s*$/m)[1].trim().replace(/^["']|["']$/g,"");
const postgres = require("postgres");
const sql = postgres(url,{max:1,idle_timeout:10,connect_timeout:10,prepare:false,ssl:"require"});
const proposals = JSON.parse(fs.readFileSync("C:/repos/tbr-docs/backups/sot-backfill-proposals.json","utf8"));

(async () => {
  try {
    await sql.begin(async (tx) => {
      for (const [pid, fields] of Object.entries(proposals)) {
        const already = await tx`select 1 from product_versions where product_id=${pid} and status='published' and created_by='sot-backfill' limit 1`;
        if (already.length) { console.log(`  ${pid}: already backfilled, skipping`); continue; }
        const mp = await tx`select coalesce(max(version),0) as m from product_versions where product_id=${pid} and status='published'`;
        const nextVersion = Number(mp[0].m) + 1;
        await tx`insert into product_versions (product_id, status, version, fields_json, score_json, created_by)
          values (${pid}, 'published', ${nextVersion}, ${tx.json(fields)}, ${tx.json({})}, ${'sot-backfill'})`;
        console.log(`  inserted ${pid} v${nextVersion} (${Object.keys(fields).length} fields)`);
      }
    });
    console.log("BACKFILL COMMITTED");
    const chk = await sql`select product_id, max(version) v from product_versions where product_id in ('jmr-tbm-250-ultra','hossfeld-no2') and status='published' group by product_id order by product_id`;
    chk.forEach(r=>console.log(`  ${r.product_id} latest published v${r.v}`));
  } catch(e){ console.error("ERROR:", e.message); process.exitCode=1; }
  finally { await sql.end({timeout:5}); }
})();
