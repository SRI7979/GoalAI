import { createClient } from '@supabase/supabase-js'
import { clearStoredSupabaseSession } from '@/lib/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function resolveStorageKey() {
  try {
    if (!supabaseUrl) return 'pathai-auth-token'
    const hostname = new URL(supabaseUrl).hostname
    return `sb-${hostname.split('.')[0]}-auth-token`
  } catch {
    return 'pathai-auth-token'
  }
}

const storageKey = resolveStorageKey()

function getSearchParams() {
  if (typeof window === 'undefined') return new URLSearchParams()
  return new URLSearchParams(window.location.search)
}

function getHashParams() {
  if (typeof window === 'undefined') return new URLSearchParams()
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash
  return new URLSearchParams(hash)
}

function clearOtpParamsFromUrl() {
  if (typeof window === 'undefined') return

  const url = new URL(window.location.href)
  url.searchParams.delete('token_hash')
  url.searchParams.delete('type')
  url.searchParams.delete('error')
  url.searchParams.delete('error_code')
  url.searchParams.delete('error_description')
  window.history.replaceState(window.history.state, '', url.toString())
}

export function createSupabaseAuthClient(options = {}) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: false,
      skipAutoInitialize: true,
      detectSessionInUrl: false,
      storageKey,
      ...options,
    },
  })
}

export async function consumeSupabaseAuthRedirect() {
  if (typeof window === 'undefined') return { handled: false, error: null }

  const searchParams = getSearchParams()
  const hashParams = getHashParams()
  const hasPkceCode = searchParams.has('code')
  const hasImplicitTokens = hashParams.has('access_token') || hashParams.has('error_description')
  const hasOtpToken = searchParams.has('token_hash') && searchParams.has('type')

  if (!hasPkceCode && !hasImplicitTokens && !hasOtpToken) {
    return { handled: false, error: null }
  }

  let authClient = null

  try {
    if (hasOtpToken) {
      authClient = createSupabaseAuthClient()
      const result = await authClient.auth.verifyOtp({
        token_hash: searchParams.get('token_hash'),
        type: searchParams.get('type'),
      })
      clearOtpParamsFromUrl()
      return { handled: true, error: result.error || null }
    }

    authClient = createSupabaseAuthClient({
      detectSessionInUrl: true,
      flowType: hasPkceCode ? 'pkce' : 'implicit',
    })
    const result = await authClient.auth.initialize()
    return { handled: true, error: result.error || null }
  } catch (error) {
    clearStoredSupabaseSession()
    return { handled: true, error }
  } finally {
    if (authClient) {
      try {
        await authClient.auth.stopAutoRefresh()
      } catch {}
    }
  }
}
