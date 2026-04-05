import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const EXPIRY_MARGIN_MS = 90 * 1000
const LOCAL_ACCESS_KEY = 'pathai-local-access'

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

function normalizeStoredSession(value) {
  if (!value || typeof value !== 'object') return null
  if (value.currentSession && typeof value.currentSession === 'object') return value.currentSession
  if (value.session && typeof value.session === 'object') return value.session
  if (value.access_token || value.user) return value
  return null
}

function isExpiredSession(session) {
  if (!session || typeof session !== 'object') return true
  if (!session.access_token || typeof session.access_token !== 'string') return true

  const expiresAt = Number(session.expires_at)
  if (!Number.isFinite(expiresAt)) return true

  return (expiresAt * 1000) - Date.now() <= EXPIRY_MARGIN_MS
}

export function clearStoredSupabaseSession() {
  if (typeof window === 'undefined') return

  try { window.localStorage.removeItem(storageKey) } catch {}
  try { window.localStorage.removeItem(`${storageKey}-user`) } catch {}
  try { window.localStorage.removeItem(`${storageKey}-code-verifier`) } catch {}
  try { window.localStorage.removeItem(LOCAL_ACCESS_KEY) } catch {}
}

export function persistSupabaseSession(session) {
  if (typeof window === 'undefined') return

  if (!session || typeof session !== 'object') {
    clearStoredSupabaseSession()
    return
  }

  const expiresIn = Number(session.expires_in)
  const resolvedExpiresAt = Number.isFinite(Number(session.expires_at))
    ? Number(session.expires_at)
    : (Number.isFinite(expiresIn) ? Math.floor(Date.now() / 1000) + expiresIn : null)

  const storedSession = {
    ...session,
    expires_at: resolvedExpiresAt,
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(storedSession))
    try { window.localStorage.removeItem(`${storageKey}-user`) } catch {}
    try { window.localStorage.removeItem(LOCAL_ACCESS_KEY) } catch {}
  } catch {
    clearStoredSupabaseSession()
  }
}

export function persistLocalAccessSession({ email } = {}) {
  if (typeof window === 'undefined') return

  const normalizedEmail = typeof email === 'string' && email.trim()
    ? email.trim().toLowerCase()
    : 'guest@pathai.local'
  const name = normalizedEmail.split('@')[0] || 'Guest'
  const expiresAt = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30)

  const localSession = {
    access_token: null,
    refresh_token: null,
    token_type: 'bearer',
    expires_at: expiresAt,
    is_local_access: true,
    user: {
      id: 'pathai-local-user',
      email: normalizedEmail,
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: { provider: 'local' },
      user_metadata: { name },
    },
  }

  try {
    window.localStorage.setItem(LOCAL_ACCESS_KEY, JSON.stringify(localSession))
  } catch {
    clearStoredSupabaseSession()
  }
}

function readStoredSession() {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return null

    const session = normalizeStoredSession(JSON.parse(raw))
    if (!session || isExpiredSession(session)) {
      clearStoredSupabaseSession()
      return null
    }

    return session
  } catch {
    clearStoredSupabaseSession()
    return null
  }
}

function readLocalAccessSession() {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(LOCAL_ACCESS_KEY)
    if (!raw) return null

    const session = JSON.parse(raw)
    const expiresAt = Number(session?.expires_at)
    if (!session?.is_local_access || !session?.user?.id || !Number.isFinite(expiresAt)) {
      clearStoredSupabaseSession()
      return null
    }

    if ((expiresAt * 1000) - Date.now() <= 0) {
      clearStoredSupabaseSession()
      return null
    }

    return session
  } catch {
    clearStoredSupabaseSession()
    return null
  }
}

function getGlobalClient(key, factory) {
  if (typeof window === 'undefined') return factory()
  if (!globalThis[key]) globalThis[key] = factory()
  return globalThis[key]
}

export const supabaseData = getGlobalClient('__pathaiSupabaseDataClient', () => (
  createClient(supabaseUrl, supabaseAnonKey, {
    accessToken: async () => readStoredSession()?.access_token || supabaseAnonKey,
  })
))

export async function getSafeSupabaseSession() {
  return { session: readStoredSession() || readLocalAccessSession(), error: null }
}

export async function getSafeSupabaseUser() {
  const { session, error } = await getSafeSupabaseSession()
  return { user: session?.user || null, error }
}
