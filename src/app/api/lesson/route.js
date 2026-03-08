import { buildFallbackLesson, generateLessonFromOpenAI } from '@/lib/lessonGenerator'

export async function POST(request) {
  let concept = 'your topic'
  try {
    const body = await request.json()
    concept = body?.concept || concept
    const { taskTitle, goal, knowledge } = body

    if (!concept || !goal) {
      return Response.json({ error: 'Missing concept or goal' }, { status: 400 })
    }

    const lesson = await generateLessonFromOpenAI({
      concept,
      taskTitle,
      goal,
      knowledge,
      openaiApiKey: process.env.OPENAI_API_KEY,
    })

    return Response.json(lesson)
  } catch (error) {
    console.error('Lesson API error:', error)
    return Response.json(buildFallbackLesson(concept))
  }
}
