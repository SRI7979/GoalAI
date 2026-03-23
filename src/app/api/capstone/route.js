import { getOpenAIModel } from '@/lib/openaiModels'

export async function POST(request) {
  try {
    const { concept, taskTitle, goal, knowledge } = await request.json()
    if (!concept || !goal) return Response.json({ error: 'Missing concept or goal' }, { status: 400 })

    const prompt = `You are a senior mentor designing a capstone project for a premium learning platform. Design a portfolio-worthy project about "${taskTitle || concept}" for someone learning "${goal}".
${knowledge ? `The student already knows: ${knowledge}. The project should challenge them beyond basics.` : ''}

Return ONLY valid JSON — no markdown, no backticks:
{
  "title": "A specific, portfolio-worthy project title",
  "description": "3-4 sentences: what they'll build, what real problem it solves, and what skills it demonstrates",
  "milestones": [
    {
      "title": "Milestone title",
      "tasks": ["Specific, actionable task with clear completion criteria"]
    }
  ],
  "deliverables": ["Tangible output with specifics"],
  "estimatedDays": 3
}

CAPSTONE QUALITY REQUIREMENTS:
- The project must solve a REAL problem or create something genuinely useful — not a toy example
- DESCRIPTION should sell the project: what it does, who it helps, and why the student should be excited to build it
- 3-4 MILESTONES that follow a natural build progression:
  * Milestone 1: Foundation — set up the core structure, define the data model or architecture
  * Milestone 2: Core features — implement the main functionality
  * Milestone 3: Polish — add error handling, edge cases, UX improvements
  * Milestone 4 (optional): Extend — bonus features, deployment, documentation
- Each milestone should have 3-5 TASKS that are:
  * Specific enough to be checked off ("Implement user input validation for the search field")
  * NOT vague ("Work on the project" is terrible)
  * Ordered in a logical sequence within the milestone
- 3-4 DELIVERABLES that are concrete outputs:
  * "A working [X] that [does Y]" — functional deliverable
  * "A README documenting [architecture decisions / setup / API]" — documentation
  * "Tests covering [specific scenarios]" — quality assurance
- estimatedDays: 2-5 (realistic for someone actively learning)
- The project should be something they'd genuinely put on GitHub and reference in interviews
- Include at least one "stretch goal" task in the final milestone for ambitious students`

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: getOpenAIModel('capstone'), messages: [{ role: 'user', content: prompt }], temperature: 0.45, max_tokens: 1200 }),
    })
    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content?.trim() || ''
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    return Response.json(JSON.parse(clean))
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
