import { EVENTS } from '@/lib/analytics'
import { planLessonVisuals } from '@/lib/lessonVisualPlanner'
import { getSupabaseServerClient } from '@/lib/supabaseServer'

function devRouteEnabled() {
  return process.env.NODE_ENV !== 'production' || process.env.PATHAI_ENABLE_DEV_ROUTES === 'true'
}

async function trackLessonVisualPlan({ body, result, success, error = null }) {
  try {
    const supabase = getSupabaseServerClient()
    const diagrams = result?.diagrams || []
    await supabase.from('analytics_events').insert({
      event_name: EVENTS.LESSON_VISUAL_PLAN_GENERATED,
      properties: {
        lesson_title: body?.lessonTitle || null,
        static_goal: body?.staticGoal || null,
        slot_count: Array.isArray(body?.diagramSlots) ? body.diagramSlots.length : 0,
        diagram_count: diagrams.length,
        template_count: diagrams.filter((diagram) => diagram.templatePath === 'template').length,
        freeform_count: diagrams.filter((diagram) => diagram.templatePath === 'freeform').length,
        model_used: result?.modelUsed || null,
        generation_ms: result?.ms || null,
        success,
        error: error ? String(error).slice(0, 600) : null,
      },
      client_timestamp: new Date().toISOString(),
    })
  } catch {
    // Dev telemetry should never break the preview.
  }
}

export async function POST(request) {
  if (!devRouteEnabled()) {
    return Response.json({ error: 'Lesson visual planning is disabled.' }, { status: 404 })
  }

  let body = {}
  try {
    body = await request.json()
    const diagramSlots = Array.isArray(body?.diagramSlots) ? body.diagramSlots : []
    if (!diagramSlots.length) return Response.json({ error: 'Missing diagramSlots.' }, { status: 400 })

    const result = await planLessonVisuals({
      lessonTitle: body.lessonTitle,
      staticGoal: body.staticGoal,
      slides: body.slides,
      diagramSlots,
    })
    await trackLessonVisualPlan({ body, result, success: true })

    return Response.json({
      diagrams: result.diagrams,
      modelUsed: result.modelUsed,
      ms: result.ms,
      attempts: result.attempts,
    })
  } catch (error) {
    await trackLessonVisualPlan({ body, result: null, success: false, error: error?.message || error })
    return Response.json({
      error: error?.message || 'Lesson visual planning failed.',
      code: error?.code || (error?.status === 429 ? 'rate_limited' : 'lesson_visual_plan_failed'),
      retryAfter: error?.retryAfter || null,
    }, { status: error?.status === 429 ? 429 : 500 })
  }
}
