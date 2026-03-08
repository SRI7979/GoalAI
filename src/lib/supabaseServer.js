import { createClient } from '@supabase/supabase-js'

function resolveServiceRoleKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SERVICE_KEY
    || process.env.SUPABASE_SECRET_KEY
    || null
  )
}

export function getSupabaseServerClient({ accessToken } = {}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = resolveServiceRoleKey()
  const apiKey = serviceRoleKey || anonKey

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL for Supabase server client.')
  }

  if (!apiKey) {
    throw new Error(
      'Missing Supabase API key. Set SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    )
  }

  if (!serviceRoleKey && !accessToken) {
    throw new Error(
      'Missing access token for Supabase server client. Provide Authorization: Bearer <token> or include accessToken in request body.',
    )
  }

  return createClient(supabaseUrl, apiKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  })
}
