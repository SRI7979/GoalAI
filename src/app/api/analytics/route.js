import { getSupabaseServerClient } from '@/lib/supabaseServer'
import { recordQualityIssuesForAnalyticsRows } from '@/lib/outcomeQuality'

const MAX_EVENTS_PER_BATCH = 50

function normalizeEvent(event = {}) {
  const eventName = String(event.event || event.event_name || '').trim()
  if (!eventName) return null

  return {
    event_name: eventName,
    user_id: event.user_id ? String(event.user_id) : null,
    goal_id: event.goal_id ? String(event.goal_id) : null,
    mission_id: event.mission_id ? String(event.mission_id) : null,
    energy_mode: event.energy_mode ? String(event.energy_mode) : null,
    streak_value: Number.isFinite(Number(event.streak_value)) ? Number(event.streak_value) : null,
    xp_balance: Number.isFinite(Number(event.xp_balance)) ? Number(event.xp_balance) : null,
    properties: event.properties && typeof event.properties === 'object' ? event.properties : {},
    client_timestamp: event.client_timestamp || new Date().toISOString(),
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const incoming = Array.isArray(body?.events) ? body.events : []
    const events = incoming
      .slice(0, MAX_EVENTS_PER_BATCH)
      .map(normalizeEvent)
      .filter(Boolean)

    if (!events.length) {
      return Response.json({ error: 'No valid analytics events.' }, { status: 400 })
    }

    const supabase = getSupabaseServerClient()
    const { data: insertedRows, error } = await supabase
      .from('analytics_events')
      .insert(events)
      .select('*')

    if (error) {
      return Response.json({ error: error.message || 'Analytics insert failed.' }, { status: 500 })
    }

    let qualityIssues = 0
    try {
      const result = await recordQualityIssuesForAnalyticsRows({ supabase, rows: insertedRows || [] })
      qualityIssues = result.inserted || 0
    } catch {
      // Quality-loop writes are best-effort; analytics persistence is primary.
    }

    return Response.json({ ok: true, inserted: events.length, qualityIssues })
  } catch (error) {
    return Response.json({ error: error?.message || 'Analytics request failed.' }, { status: 500 })
  }
}
