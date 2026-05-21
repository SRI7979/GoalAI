import { generateLessonFromOpenAI } from '@/lib/lessonGenerator'
import { normalizeConceptLessonDoc } from '@/lib/conceptLesson'

export async function POST(request) {
  let concept = 'your topic'
  let body = null
  try {
    body = await request.json()
    concept = body?.concept || concept
    const {
      taskTitle,
      goal,
      knowledge,
      taskDescription,
      taskAction,
      taskOutcome,
      resourceUrl,
      resourceTitle,
      learningContract,
      learnerProfile,
      domain,
      domainConfig,
      userLevel,
      xp,
      depthOverride,
      visualPreference,
    } = body

    if (!concept || !goal) {
      return Response.json({ error: 'Missing concept or goal' }, { status: 400 })
    }

    const resource = resourceUrl ? { url: resourceUrl, title: resourceTitle || 'Primary resource' } : null
    const lesson = await generateLessonFromOpenAI({
      concept,
      taskTitle,
      goal,
      knowledge,
      taskDescription,
      taskAction,
      taskOutcome,
      resourceUrl,
      resourceTitle,
      learningContract,
      learnerProfile,
      domain,
      domainConfig,
      userLevel,
      xp,
      depthOverride,
      visualPreference,
      openaiApiKey: process.env.OPENAI_API_KEY,
    })

    console.info('[PathAI] lesson_generation', {
      mode: 'ai',
      concept,
      taskTitle,
      cacheable: false,
    })
    return Response.json({
      lessonDoc: normalizeConceptLessonDoc(lesson.lessonDoc, {
        ...body,
        learnerProfile,
        domain,
        domainConfig,
        depthOverride,
        visualPreference,
      }),
      generationMode: 'ai',
      cacheable: false,
      resource: lesson.resource || resource || null,
    })
  } catch (err) {
    console.error('[PathAI] lesson_generation_failed', {
      stage: 'single_pass',
      reason: err?.code || err?.message || 'route_error',
      concept,
    })
    return Response.json({
      error: 'Lesson generation failed on the first pass.',
      reason: err?.code || err?.message || 'route_error',
      cacheable: false,
    }, { status: body?.goal ? 502 : 500 })
  }
}
