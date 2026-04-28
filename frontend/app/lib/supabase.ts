/**
 * Supabase Client Configuration
 * 
 * Initializes and exports a singleton Supabase client instance.
 * Uses environment variables for configuration.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isConfigured =
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your_supabase') &&
  !supabaseAnonKey.includes('your_supabase')

/**
 * Singleton Supabase client instance.
 * Configured with automatic session refresh and persistence.
 */
export const supabase: SupabaseClient = isConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : ({} as SupabaseClient)

