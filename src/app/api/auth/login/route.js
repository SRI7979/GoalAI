import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabaseServer'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function errorResponse(message, status = 500) {
  return NextResponse.json({ error: message }, { status })
}

function resolveAuthErrorMessage(error) {
  const code = error?.cause?.code || error?.code || ''
  const message = String(error?.message || '')

  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return 'Supabase project URL is unreachable. Check NEXT_PUBLIC_SUPABASE_URL and make sure the project still exists.'
  }

  if (/fetch failed/i.test(message)) {
    return 'Unable to reach Supabase auth from the app server. Check NEXT_PUBLIC_SUPABASE_URL or your project status.'
  }

  return message || 'Login failed.'
}

function normalizeSession(payload) {
  if (!payload || typeof payload !== 'object') return null

  const expiresIn = Number(payload.expires_in)
  const expiresAt = Number.isFinite(Number(payload.expires_at))
    ? Number(payload.expires_at)
    : (Number.isFinite(expiresIn) ? Math.floor(Date.now() / 1000) + expiresIn : null)

  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    token_type: payload.token_type,
    expires_in: expiresIn,
    expires_at: expiresAt,
    user: payload.user || null,
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const email = typeof body?.email === 'string' ? body.email.trim() : ''
    const password = typeof body?.password === 'string' ? body.password : ''

    if (!email || !password) {
      return errorResponse('Email and password are required.', 400)
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      return errorResponse('Supabase auth is not configured.', 500)
    }

    const authResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    })

    const payload = await authResponse.json().catch(() => null)

    if (!authResponse.ok) {
      const errorMessage =
        payload?.msg
        || payload?.message
        || payload?.error_description
        || 'Unable to sign in.'

      return errorResponse(errorMessage, authResponse.status)
    }

    const session = normalizeSession(payload)

    if (!session?.access_token || !session?.refresh_token || !session?.user?.id) {
      return errorResponse('Supabase login response was incomplete.', 502)
    }

    let hasGoal = false

    try {
      const supabase = getSupabaseServerClient({ accessToken: session.access_token })
      const { count, error } = await supabase
        .from('goals')
        .select('id', { head: true, count: 'exact' })
        .eq('user_id', session.user.id)
        .limit(1)

      if (!error) {
        hasGoal = (count || 0) > 0
      }
    } catch {
      hasGoal = false
    }

    return NextResponse.json({ session, hasGoal })
  } catch (error) {
    return errorResponse(resolveAuthErrorMessage(error), 502)
  }
}
