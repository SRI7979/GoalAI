import { generateLessonFromOpenAI } from '@/lib/lessonGenerator'
import { buildStructuredConceptLessonDoc, normalizeConceptLessonDoc } from '@/lib/conceptLesson'

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
    } = body

    if (!concept || !goal) {
      return Response.json({ error: 'Missing concept or goal' }, { status: 400 })
    }

    const resource = resourceUrl ? { url: resourceUrl, title: resourceTitle || 'Primary resource' } : null

    const tryGenerate = () => generateLessonFromOpenAI({
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
      openaiApiKey: process.env.OPENAI_API_KEY,
    })

    try {
      const lesson = await tryGenerate()
      console.info('[PathAI] lesson_generation', {
        mode: 'ai',
        concept,
        taskTitle,
        cacheable: true,
      })
      return Response.json({
        lessonDoc: normalizeConceptLessonDoc(lesson.lessonDoc, body),
        generationMode: 'ai',
        cacheable: true,
        resource: lesson.resource || resource || null,
      })
    } catch (primaryError) {
      const primaryReason = primaryError?.code || 'unknown_generation_error'
      console.warn('[PathAI] lesson_generation_failed', {
        stage: 'primary',
        reason: primaryReason,
        concept,
        taskTitle,
      })

      try {
        const retriedLesson = await tryGenerate()
        console.info('[PathAI] lesson_generation', {
          mode: 'ai',
          concept,
          taskTitle,
          cacheable: true,
          recoveredFrom: primaryReason,
        })
        return Response.json({
          lessonDoc: normalizeConceptLessonDoc(retriedLesson.lessonDoc, body),
          generationMode: 'ai',
          cacheable: true,
          resource: retriedLesson.resource || resource || null,
        })
      } catch (retryError) {
        const retryReason = retryError?.code || primaryReason
        console.warn('[PathAI] lesson_generation_failed', {
          stage: 'retry',
          reason: retryReason,
          concept,
          taskTitle,
        })

        const fallbackLesson = buildStructuredConceptLessonDoc({
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
          fallbackReason: retryReason,
        })

        return Response.json({
          lessonDoc: normalizeConceptLessonDoc(fallbackLesson, body),
          generationMode: 'structured',
          cacheable: true,
          resource: fallbackLesson.resource || resource || null,
        })
      }
    }
  } catch (error) {
    console.error('Lesson API error:', error)
    if (body?.goal) {
      const fallbackLesson = buildStructuredConceptLessonDoc({
        concept,
        taskTitle: body?.taskTitle,
        goal: body?.goal,
        knowledge: body?.knowledge,
        taskDescription: body?.taskDescription,
        taskAction: body?.taskAction,
        taskOutcome: body?.taskOutcome,
        resourceUrl: body?.resourceUrl,
        resourceTitle: body?.resourceTitle,
        learningContract: body?.learningContract,
        fallbackReason: error?.code || error?.message || 'route_error',
      })
      return Response.json({
        lessonDoc: normalizeConceptLessonDoc(fallbackLesson, body),
        generationMode: 'structured',
        cacheable: true,
        resource: fallbackLesson.resource || null,
      })
    }
    return Response.json({ error: 'Unable to build lesson right now.' }, { status: 500 })
  }
}
