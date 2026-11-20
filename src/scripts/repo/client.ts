import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const ADMIN_EMAIL = import.meta.env.PUBLIC_ADMIN_EMAIL ?? '';

/** Null when the build has no Supabase settings: the page then says so instead of breaking the site. */
export function makeClient(): SupabaseClient | null {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  // sessionStorage: the admin login ends when the tab closes, so a school PC never stays logged in.
  return createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'mosouab.repo.auth', storage: window.sessionStorage },
  });
}
