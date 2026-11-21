import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Both values are public by design: the anon key only grants what the
// database's row-level security policies allow. Never put the service_role
// key here — it bypasses every policy.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Accounts and sync stay switched off when no project is configured. */
export const isAccountsEnabled = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = isAccountsEnabled
  ? createClient(url as string, anonKey as string, {
      auth: {
        // PKCE returns the callback as ?code=… instead of a #hash, which would
        // otherwise collide with this app's hash-based routes.
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
