import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const isValidUrl = supabaseUrl && (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://')) && !supabaseUrl.includes('your_supabase')

  if (!isValidUrl || !supabaseAnonKey || supabaseAnonKey.includes('your_supabase')) {
    // Return a dummy client if credentials are missing
    console.warn('⚠️  Supabase client initialization skipped due to missing/invalid credentials.')
    return null as any
  }

  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  )
}
