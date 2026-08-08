/**
 * Service-role Supabase client. SERVER-ONLY — never import this from a route
 * component or anything that ends up in the browser bundle. It is only ever
 * imported from files under `src/server/` and used inside `createServerFn`
 * handlers, which run exclusively on the server.
 *
 * RLS is enabled on every table this client touches, with zero policies for
 * `anon`/`authenticated`. That means the browser can never read or write
 * these tables directly — even with the anon key — and this service-role
 * client is the *only* path in. Every server function that uses it MUST
 * re-validate the caller's claimed identity via `resolveActor` /
 * `assert*` helpers in `auth-context.ts` before returning or mutating data.
 */
import { createClient } from "@supabase/supabase-js";

let cached: ReturnType<typeof createClient> | null = null;

export function supabaseAdmin() {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Supabase service-role credentials are not configured on the server.");
  }

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export const SHWAI_BUCKET = "shwai-files";
