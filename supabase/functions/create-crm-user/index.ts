// Supabase Edge Function: create-crm-user
// Creates a CRM login (auth user) + its profile in one privileged, admin-only call.
// The service-role key never leaves the server (it's an auto-provided env var here).
//
// Deploy: Supabase Dashboard → Edge Functions → create "create-crm-user" → paste
// this → Deploy. (Or CLI: `supabase functions deploy create-crm-user`.)
// No secrets to set: SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
// are provided to every function automatically.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const url        = Deno.env.get('SUPABASE_URL')!;
    const anonKey    = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // 1) Identify the caller from their JWT and require super-admin.
    const authHeader = req.headers.get('Authorization') ?? '';
    const asCaller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user: caller } } = await asCaller.auth.getUser();
    if (!caller) return json({ error: 'Not signed in' }, 401);

    const admin = createClient(url, serviceKey);
    const { data: callerProfile } = await admin
      .from('profiles').select('role, is_super_admin').eq('id', caller.id).single();
    const isAdmin = callerProfile?.role === 'super_admin' || callerProfile?.is_super_admin === true;
    if (!isAdmin) return json({ error: 'Only super admins can add users' }, 403);

    // 2) Validate input.
    const body = await req.json().catch(() => ({}));
    const { email, password, full_name, role, team_id, region_id } = body ?? {};
    if (!email || !password || !full_name || !role) {
      return json({ error: 'email, password, full_name and role are required' }, 400);
    }
    if (String(password).length < 6) {
      return json({ error: 'Password must be at least 6 characters' }, 400);
    }

    // 3) Create the auth login (email pre-confirmed so they can sign in immediately).
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (createErr || !created?.user) {
      return json({ error: createErr?.message ?? 'Could not create the login' }, 400);
    }
    const newId = created.user.id;

    // 4) Create/complete the profile (a signup trigger may have made a stub → upsert).
    const { error: profErr } = await admin.from('profiles').upsert({
      id:             newId,
      email,
      full_name,
      role,
      team_id:        team_id   || null,
      region_id:      region_id || null,
      is_super_admin: role === 'super_admin',
      is_active:      true,
    }, { onConflict: 'id' });

    if (profErr) {
      // Don't leave an orphaned login if the profile couldn't be saved.
      await admin.auth.admin.deleteUser(newId);
      return json({ error: profErr.message }, 400);
    }

    return json({ ok: true, id: newId });
  } catch (e) {
    return json({ error: (e as Error)?.message ?? 'Unexpected error' }, 500);
  }
});
