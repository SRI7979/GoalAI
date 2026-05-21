import { getOpenAIModel } from '@/lib/openaiModels'
import { formatLearningContractForPrompt } from '@/lib/conceptLesson'
import { formatDomainForPrompt, normalizeDomain, parseDomainFromConstraints } from '@/lib/domainAdapter'

function buildDomainPrompt({ domain, knowledge, learningContract } = {}) {
  const resolvedDomain = normalizeDomain(
    domain || learningContract?.domain || parseDomainFromConstraints([knowledge]),
    null,
  )
  return resolvedDomain ? `\nDOMAIN ADAPTER:\n${formatDomainForPrompt(resolvedDomain)}\n` : ''
}

function formatTaughtPointsForPrompt(learningContract = {}, concept = '') {
  const taughtPoints = Array.isArray(learningContract?.taughtPoints)
    ? learningContract.taughtPoints.map((point) => String(point || '').trim()).filter(Boolean)
    : []
  const lines = taughtPoints.length > 0
    ? taughtPoints
    : [String(learningContract?.canDoStatement || `Use ${learningContract?.conceptLabel || concept || 'the concept'} correctly in one concrete scenario`).trim()]
  return lines.map((line) => `- ${line}`).join('\n')
}

export async function POST(request) {
  try {
    const {
      concept,
      goal,
      knowledge,
      scope,
      coveredConcepts,
      questionCount,
      examTitle,
      moduleTitles,
      taskDescription,
      taskAction,
      taskOutcome,
      learningContract,
      domain,
    } = await request.json()
    if (!concept || !goal) return Response.json({ error: 'Missing concept or goal' }, { status: 400 })

    const isCourseFinal = scope === 'course_final'
    const totalQuestions = Number.isFinite(Number(questionCount))
      ? Math.max(5, Math.min(16, Number(questionCount)))
      : (isCourseFinal ? 12 : 5)
    const conceptList = Array.isArray(coveredConcepts) ? coveredConcepts.filter(Boolean) : []
    const moduleList = Array.isArray(moduleTitles) ? moduleTitles.filter(Boolean) : []
    const taughtPointsPrompt = formatTaughtPointsForPrompt(learningContract, concept)

    const prompt = isCourseFinal
      ? `You are designing the FINAL comprehensive exam for a premium learning app.

Create exactly ${totalQuestions} multiple-choice questions for the course "${goal}".
${buildDomainPrompt({ domain, knowledge, learningContract })}
EXAM TITLE: ${examTitle || `Final Course Exam: ${goal}`}
COURSE CONCEPTS TO COVER: ${conceptList.join(', ') || concept}
COURSE MODULES: ${moduleList.join(', ') || 'Use the full course progression'}
${knowledge ? `The learner started with this background: ${knowledge}.` : ''}
${taskDescription ? `DAY CONTEXT: ${taskDescription}` : ''}

Return ONLY valid JSON — no markdown, no backticks:
{
  "questions": [
    {
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Why this answer is correct and what the learner should remember."
    }
  ]
}

FINAL EXAM REQUIREMENTS:
- Cover the full breadth of the course, not just one concept
- Include a mix of foundation, application, debugging, comparison, synthesis, and transfer questions
- At least 40% of the exam should require combining 2 or more concepts
- At least 3 questions should feel like real-world scenarios or mini case studies
- Questions should become slightly more demanding as the exam progresses
- Each question must have exactly 4 options
- Wrong answers must be plausible and based on common misconceptions
- Explanations must be 2-3 sentences: why the answer is right, why a tempting distractor is wrong, and the key takeaway
- NEVER use "All of the above" or "None of the above"
- Avoid trivia and memorization; test durable understanding and decision-making`
      : `You are designing a quiz for a premium learning app. Create exactly ${totalQuestions} multiple-choice questions about "${concept}" for someone learning "${goal}".
${buildDomainPrompt({ domain, knowledge, learningContract })}
${knowledge ? `The student already knows: ${knowledge}. Don't test basics they already know.` : ''}
${taskDescription ? `DAY CONTEXT: ${taskDescription}` : ''}
${taskAction ? `TASK ACTION: ${taskAction}` : ''}
${taskOutcome ? `TARGET OUTCOME: ${taskOutcome}` : ''}
SPECIFIC SKILLS JUST TAUGHT:
${taughtPointsPrompt}
CONCEPT LABEL: ${learningContract?.conceptLabel || concept}
BY THE END OF TODAY, THE LEARNER CAN: ${learningContract?.canDoStatement || `use ${concept} correctly in one concrete situation`}
PROOF TYPE: ${learningContract?.proofType || 'short_answer'}
PROOF PROMPT: ${learningContract?.proofPrompt || `Show today's proof by using ${concept} in one short concrete answer.`}

LEARNING CONTRACT:
${formatLearningContractForPrompt(learningContract)}

Return ONLY valid JSON — no markdown, no backticks:
{
  "questions": [
    {
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Why this answer is correct and what the student should remember."
    }
  ]
}

QUIZ QUALITY REQUIREMENTS:
- Generate quiz questions that test SPECIFIC skills, not general understanding.
- NEVER generate a question like "Explain what ${concept} means" or "Describe how ${concept} works" — those are reflection questions, not quiz questions.
- NEVER generate a question that could be answered without knowing the specific concept. If someone who missed the lesson could still answer it, it is too generic.
- Every question must have ONE objectively correct answer.
- Include the concept name or a clear concept-specific context in the question stem.
- Question 1: Foundation — test basic understanding of core concept
- Question 2: Application — "given this scenario, what would happen?"
- Question 3: Comparison — "what's the difference between X and Y?"
- Question 4: Debugging — "what's wrong with this approach?" or "which would NOT work?"
- Question 5: Synthesis — requires combining multiple concepts to answer
- Each question must have exactly 4 options
- Wrong answers must be PLAUSIBLE — no obviously silly options. Use common misconceptions as distractors
- Explanations must be 2-3 sentences: (1) why the right answer is correct, (2) why the most tempting wrong answer is wrong, (3) a memorable takeaway
- Use real-world scenarios and code examples where relevant
- Frame questions as problems to solve, not definitions to recall
- NEVER use "All of the above" or "None of the above" as options
- AVOID questions that test memorization of arbitrary details — test understanding
- Stay strictly inside the allowed concepts and taught points from the learning contract
- Make the student THINK, not just remember`

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: getOpenAIModel('quizMulti'),
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: isCourseFinal ? 2600 : 1200,
      }),
    })
    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content?.trim() || ''
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const parsed = JSON.parse(clean)
    if (!Array.isArray(parsed?.questions) || parsed.questions.length === 0) throw new Error('Bad response')
    return Response.json({ questions: parsed.questions })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
