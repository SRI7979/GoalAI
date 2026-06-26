import { EVENTS } from '@/lib/analytics'
import {
  listQualityIssues,
  queuePromptFeedback,
  summarizeQualityIssues,
  syncRecentQualityIssues,
  updateQualityIssueStatus,
} from '@/lib/outcomeQuality'
import { getSupabaseServerClient } from '@/lib/supabaseServer'

function qualityDevEnabled() {
  return process.env.NODE_ENV !== 'production' || process.env.ENABLE_QUALITY_DEV === 'true'
}

async function trackQualityEvent({ supabase, eventName, properties = {} }) {
  try {
    await supabase.from('analytics_events').insert({
      event_name: eventName,
      properties,
      client_timestamp: new Date().toISOString(),
    })
  } catch {
    // Quality-loop telemetry should never block the admin view.
  }
}

export async function GET(request) {
  if (!qualityDevEnabled()) {
    return Response.json({ error: 'Quality dev surface disabled.' }, { status: 404 })
  }

  try {
    const url = new URL(request.url)
    const status = url.searchParams.get('status') || 'open'
    const limit = Number(url.searchParams.get('limit')) || 80
    const shouldSync = url.searchParams.get('sync') !== 'false'
    const supabase = getSupabaseServerClient()

    let sync = { inserted: 0 }
    if (shouldSync) {
      sync = await syncRecentQualityIssues({ supabase, limit: 500 }).catch((error) => ({
        inserted: 0,
        error: error?.message || 'sync_failed',
      }))
    }

    const issues = await listQualityIssues({ supabase, status, limit })
    return Response.json({
      issues,
      summary: summarizeQualityIssues(issues),
      sync,
    })
  } catch (error) {
    return Response.json({ error: error?.message || 'Failed to load quality issues' }, { status: 500 })
  }
}

export async function POST(request) {
  if (!qualityDevEnabled()) {
    return Response.json({ error: 'Quality dev surface disabled.' }, { status: 404 })
  }

  try {
    const body = await request.json()
    const action = String(body?.action || '').trim()
    const issueId = String(body?.issueId || body?.issue_id || '').trim()
    const supabase = getSupabaseServerClient()

    if (action === 'queue_prompt_feedback') {
      const item = await queuePromptFeedback({
        supabase,
        issueId,
        feedback: body?.feedback,
      })
      await trackQualityEvent({
        supabase,
        eventName: EVENTS.PROMPT_FEEDBACK_QUEUED,
        properties: {
          quality_issue_id: issueId,
          prompt_key: item.prompt_key,
          prompt_file: item.prompt_file,
        },
      })
      return Response.json({ ok: true, promptFeedback: item })
    }

    if (action === 'update_status') {
      const issue = await updateQualityIssueStatus({
        supabase,
        issueId,
        status: String(body?.status || '').trim(),
      })
      return Response.json({ ok: true, issue })
    }

    if (action === 'sync') {
      const sync = await syncRecentQualityIssues({ supabase, limit: Number(body?.limit) || 500 })
      return Response.json({ ok: true, sync })
    }

    return Response.json({ error: 'Unknown quality action' }, { status: 400 })
  } catch (error) {
    return Response.json({ error: error?.message || 'Quality action failed' }, { status: 500 })
  }
}
