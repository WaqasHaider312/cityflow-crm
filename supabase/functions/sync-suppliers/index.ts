// Supabase Edge Function: sync-suppliers
// Pulls a published Google Sheet (CSV) of suppliers and upserts them into the
// `suppliers` table, keyed on supplier_uid. Run on a schedule (see cron below).
// Interim source until the backend supplier API exists — swap the URL later.
//
// Setup:
//   1) Deploy via Dashboard → Edge Functions → create "sync-suppliers" → paste this.
//   2) Add a secret SUPPLIER_SHEET_CSV_URL = the sheet's "Publish to web → CSV" link.
//   3) Schedule it every 15 min (Dashboard Cron, or the pg_cron SQL provided).
//
// Sheet columns are matched loosely (case/space/underscore-insensitive):
//   id | supplier_id | uid   → supplier_uid   (REQUIRED)
//   name | business_name     → business_name
//   city                     → city
//   address                  → address

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

// Minimal quote-aware CSV parser → array of {normalizedHeader: value}
function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cur: string[] = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { cur.push(field); field = ''; }
    else if (c === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || cur.length) { cur.push(field); rows.push(cur); }
  const norm = (h: string) => h.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const header = (rows.shift() ?? []).map(norm);
  return rows
    .filter(r => r.some(v => v.trim() !== ''))
    .map(r => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()])));
}

const pick = (row: Record<string, string>, keys: string[]) => {
  for (const k of keys) if (row[k]) return row[k];
  return '';
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const url        = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    // Published Google Sheet CSV (public). Override via the SUPPLIER_SHEET_CSV_URL secret.
    const csvUrl = Deno.env.get('SUPPLIER_SHEET_CSV_URL') ??
      'https://docs.google.com/spreadsheets/d/e/2PACX-1vQRM10t4SJFonShHtwShu7MIALujAYUG7-vE4J9JYjR6nbSOAZ-w9kBRN_zUtGXXSaNuRi7huySf7kD/pub?output=csv';

    const res = await fetch(csvUrl, { redirect: 'follow' });
    if (!res.ok) return json({ error: `Could not fetch sheet CSV (${res.status})` }, 502);
    const rows = parseCSV(await res.text());

    const suppliers = rows
      .map(r => ({
        supplier_uid:  pick(r, ['id', 'supplierid', 'supplieruid', 'uid']),
        business_name: pick(r, ['name', 'businessname', 'suppliername', 'supplier']) || null,
        city:          pick(r, ['city', 'cityname']) || null,
        address:       pick(r, ['address']) || null,
        is_active:     true,
      }))
      .filter(s => s.supplier_uid);

    if (suppliers.length === 0) return json({ ok: true, upserted: 0, note: 'No id column found or sheet empty' });

    const admin = createClient(url, serviceKey);
    let upserted = 0;
    for (let i = 0; i < suppliers.length; i += 500) {
      const batch = suppliers.slice(i, i + 500);
      const { error } = await admin.from('suppliers').upsert(batch, { onConflict: 'supplier_uid' });
      if (error) return json({ error: error.message, upsertedBeforeError: upserted }, 400);
      upserted += batch.length;
    }
    return json({ ok: true, upserted });
  } catch (e) {
    return json({ error: (e as Error)?.message ?? 'Unexpected error' }, 500);
  }
});
