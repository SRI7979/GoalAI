import { generateLessonFromOpenAI } from '@/lib/lessonGenerator'
import { normalizeConceptLessonDoc } from '@/lib/conceptLesson'

const LESSON_META_BANNED_PHRASES = [
  'concepts are tools',
  'examples prove the idea works',
  'mistakes show the boundary',
  'practice turns memory into skill',
  'supports progress toward',
  'in plain language',
  'this is your foundation',
  'building blocks',
  'learning journey',
]

function lessonNeedsRetry(lessonDoc = {}) {
  const haystack = JSON.stringify(lessonDoc || {}).toLowerCase()
  return LESSON_META_BANNED_PHRASES.some((phrase) => haystack.includes(phrase))
    || haystack.includes('[lesson generation incomplete')
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function POST(request) {
  let concept = 'your topic'
  let body = null
  let lastError = null
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

    let lesson = null
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        lesson = await generateLessonFromOpenAI({
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
        if (lessonNeedsRetry(lesson?.lessonDoc)) {
          throw new Error('lesson_too_meta')
        }
        break
      } catch (error) {
        lastError = error
        console.warn('[PathAI] lesson_generation_attempt_failed', {
          attempt,
          reason: error?.code || error?.message || 'route_error',
          concept,
        })
        if (attempt < 2) await wait(700)
      }
    }

    if (!lesson?.lessonDoc) throw lastError || new Error('No concept lesson returned')

    console.info('[PathAI] lesson_generation', {
      mode: 'ai',
      concept,
      taskTitle,
      cacheable: false,
      attempts: lastError ? 2 : 1,
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
  } catch (error) {
    const finalError = lastError || error
    console.error('[PathAI] lesson_generation_failed', {
      stage: 'retry_exhausted',
      reason: finalError?.code || finalError?.message || 'route_error',
      concept,
    })
    return Response.json({
      error: 'Lesson generation failed after retry.',
      reason: finalError?.code || finalError?.message || 'route_error',
      cacheable: false,
    }, { status: body?.goal ? 502 : 500 })
  }
}
