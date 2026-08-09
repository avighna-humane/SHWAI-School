// SERVER-ONLY. Never import this file from client code — it holds the service-role key.
//
// Interim auth model (documented, see src/server/auth-context.ts):
// There is no real Supabase Auth session yet — "current user" is a role +
// actorId selected from the demo app-state (see src/app/providers/app-state.tsx).
// Every table below has RLS enabled with zero policies, so the anon/browser
// client can never read or write them directly — all access goes through the
// server functions in src/server/*, which run with the service-role key and
// re-validate the caller's claimed identity against real mock relationship
// data (assigned classes, own student id, etc.) before touching any row.
//
// When real Supabase Auth is added, swap the trusted actorId parameter for a
// server-derived `auth.uid()` and mirror the same relationship checks into
// RLS policies instead of (or in addition to) these server-side checks.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables for the server-side Supabase admin client.",
  );
}

export const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const FILES_BUCKET = "shwai-files";
