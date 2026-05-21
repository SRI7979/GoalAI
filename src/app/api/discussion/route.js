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

export async function POST(request) {
  try {
    const { concept, taskTitle, goal, knowledge, taskDescription, taskAction, taskOutcome, learningContract, domain } = await request.json()
    if (!concept || !goal) return Response.json({ error: 'Missing concept or goal' }, { status: 400 })

    const prompt = `You are a Socratic mentor designing reflection exercises for a premium learning platform. Create thought-provoking prompts about "${taskTitle || concept}" for someone learning "${goal}".
${buildDomainPrompt({ domain, knowledge, learningContract })}
${knowledge ? `The student already knows: ${knowledge}. Push them beyond basics into deeper thinking.` : ''}
${taskDescription ? `DAY CONTEXT: ${taskDescription}` : ''}
${taskAction ? `TASK ACTION: ${taskAction}` : ''}
${taskOutcome ? `TARGET OUTCOME: ${taskOutcome}` : ''}

LEARNING CONTRACT:
${formatLearningContractForPrompt(learningContract)}

Return ONLY valid JSON — no markdown, no backticks:
{
  "prompts": [
    {
      "question": "Main reflection question",
      "followUp": "A deeper follow-up to push their thinking further"
    }
  ]
}

REFLECTION QUALITY REQUIREMENTS:
- Generate exactly 3 prompts with this progression:
  * Prompt 1 (Connect): Link the concept to something the student already understands or has experienced. "Think about a time when..." or "How does this relate to..."
  * Prompt 2 (Analyze): Challenge them to break down WHY something works the way it does. "What would happen if we changed X?" or "Why do you think the creators chose this approach instead of...?"
  * Prompt 3 (Create): Ask them to apply the concept to a novel situation. "How would you design..." or "If you were building X for Y, how would you use this concept?"
- Each question should be specific to the concept — not generic prompts that could apply to anything
- Follow-ups must challenge shallow answers: "What assumptions are you making?" or "Can you think of a case where that wouldn't hold?"
- NEVER use closed questions (yes/no). Every question should require explanation
- Questions should make the student feel smart when they answer well, not inadequate
- Use concrete scenarios grounded in real-world applications, not abstract theorizing
- Stay inside the taught scope from the learning contract
- The best questions are ones where there's no single "right" answer but some answers are more thoughtful than others`

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: getOpenAIModel('discussion'), messages: [{ role: 'user', content: prompt }], temperature: 0.5, max_tokens: 800 }),
    })
    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content?.trim() || ''
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const parsed = JSON.parse(clean)
    if (!Array.isArray(parsed?.prompts)) throw new Error('Bad response')
    return Response.json({ prompts: parsed.prompts })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
