import { getSupabaseServerClient } from '@/lib/supabaseServer'
import { AI_INTERACTION_TYPES, getBossConfig } from '@/lib/learningEngine'

function extractAccessToken(request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!authHeader) return null
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim() || null
}

async function callOpenAI(prompt, options = {}) {
  const { temperature = 0.5, maxTokens = 1200 } = options
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: maxTokens,
    }),
  })
  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content?.trim() || ''
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}

// ── GUIDED PRACTICE ─────────────────────────────────────────────────────────
async function generateGuidedPractice({ concept, goal, difficulty, knowledge }) {
  const prompt = `You are a learning coach creating a guided practice exercise.

CONCEPT: ${concept}
GOAL: ${goal}
DIFFICULTY: ${difficulty}/5
PRIOR KNOWLEDGE: ${knowledge || 'Beginner'}

Create a scaffolded practice exercise with progressive hints. The student should apply what they just learned, NOT just recall facts.

Return ONLY valid JSON:
{
  "title": "Practice exercise title",
  "scenario": "A concrete, realistic scenario/problem to solve (2-3 sentences)",
  "task": "Clear instruction of what they need to do",
  "starter": "Starting point — partial code/template/framework to build on (if applicable, otherwise empty string)",
  "hints": [
    {"level": 1, "hint": "Gentle nudge in the right direction (no answer)"},
    {"level": 2, "hint": "More specific guidance with key insight"},
    {"level": 3, "hint": "Nearly complete solution with explanation of approach"}
  ],
  "solution": "The complete correct answer/approach",
  "explanation": "Why this solution works — connect it back to the concept",
  "checkpoints": [
    {"id": "cp1", "question": "Quick check: what's the first step you'd take?", "answer": "Expected reasoning"},
    {"id": "cp2", "question": "Why did you choose this approach?", "answer": "Expected reasoning"}
  ]
}

RULES:
- The scenario must be REALISTIC and SPECIFIC — not abstract
- Hints must be progressive: vague → specific → nearly complete
- Checkpoints verify understanding, not just completion
- Difficulty ${difficulty}: ${difficulty <= 2 ? 'straightforward application' : difficulty <= 3 ? 'moderate complexity, some reasoning needed' : 'complex scenario, multi-step reasoning'}
- Make it feel like a mentor is guiding them, not an exam`

  const raw = await callOpenAI(prompt, { temperature: 0.45 })
  return JSON.parse(raw)
}

// ── CHALLENGE MODE ──────────────────────────────────────────────────────────
async function generateChallenge({ concept, goal, difficulty, knowledge }) {
  const prompt = `You are creating a challenge problem that tests DEEP understanding, not surface recall.

CONCEPT: ${concept}
GOAL: ${goal}
DIFFICULTY: ${difficulty}/5
PRIOR KNOWLEDGE: ${knowledge || 'Beginner'}

Create a challenging problem that forces the student to think critically. This is harder than regular practice — minimal guidance.

Return ONLY valid JSON:
{
  "title": "Challenge title — make it sound intriguing",
  "description": "The challenge scenario (3-4 sentences, complex and layered)",
  "constraints": ["Constraint or requirement 1", "Must handle edge case X"],
  "testCases": [
    {"input": "Example input", "expectedOutput": "Expected result", "explanation": "Why this is correct"}
  ],
  "difficulty_stars": ${difficulty},
  "time_estimate_min": ${5 + difficulty * 3},
  "bonus_challenge": "Optional harder variant for students who finish early",
  "key_insight": "The core insight needed to solve this (shown after submission)",
  "evaluation_criteria": ["Criterion 1", "Criterion 2", "Criterion 3"]
}

RULES:
- This is a CHALLENGE — it should make them think hard
- Include edge cases or tricky aspects
- The problem should have multiple valid approaches
- Don't give away the solution in the description
- Test conceptual understanding, not memorization`

  const raw = await callOpenAI(prompt, { temperature: 0.55, maxTokens: 1000 })
  return JSON.parse(raw)
}

// ── AI INTERACTION ──────────────────────────────────────────────────────────
async function generateAIInteraction({ concept, goal, interactionType, knowledge }) {
  const typeConfig = AI_INTERACTION_TYPES[interactionType] || AI_INTERACTION_TYPES.explain

  const prompts = {
    explain: `Create a scenario where the student must EXPLAIN "${concept}" in their own words.

Return ONLY valid JSON:
{
  "scenario": "Imagine you're explaining ${concept} to a teammate who has never seen it before. They ask:",
  "prompt_to_student": "A specific question the student must answer by explaining the concept",
  "evaluation_keywords": ["keyword1", "keyword2", "keyword3"],
  "model_explanation": "An excellent explanation that covers all key points",
  "follow_up": "A deeper follow-up question to push their understanding further"
}`,

    debug: `Create a DEBUGGING scenario about "${concept}" for a ${knowledge || 'beginner'} learner.

Return ONLY valid JSON:
{
  "scenario": "Description of a broken piece of code/logic related to ${concept}",
  "buggy_code": "The code or logic with 1-2 intentional bugs",
  "bugs": [
    {"line": "where the bug is", "description": "what's wrong", "fix": "how to fix it"}
  ],
  "explanation": "Why these bugs occur and how to avoid them",
  "follow_up": "What would happen if the bug went undetected?"
}`,

    predict: `Create a PREDICTION exercise about "${concept}".

Return ONLY valid JSON:
{
  "scenario": "Setup description — what's about to happen",
  "code_or_situation": "The code or scenario to analyze",
  "question": "What will the output/result be?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct_index": 0,
  "explanation": "Step-by-step explanation of why this is the correct answer",
  "deeper_question": "Now what if we changed X to Y?"
}`,

    whatif: `Create a WHAT-IF exploration for "${concept}".

Return ONLY valid JSON:
{
  "scenario": "A working example using ${concept}",
  "original": "The original code/approach",
  "modification": "What if we changed THIS specific thing?",
  "question": "What would happen and why?",
  "answer": "The correct analysis of the change",
  "misconception": "A common wrong answer and why it's wrong",
  "insight": "The deeper principle this reveals"
}`,
  }

  const prompt = `You are a learning coach for "${goal}". ${typeConfig.description}.

CONCEPT: ${concept}
PRIOR KNOWLEDGE: ${knowledge || 'Beginner'}

${prompts[interactionType] || prompts.explain}

RULES:
- Make it specific to ${concept}, not generic
- The scenario should feel like a real conversation with a mentor
- Tailor complexity to the learner's level`

  const raw = await callOpenAI(prompt, { temperature: 0.5 })
  return { ...JSON.parse(raw), interactionType, typeConfig }
}

// ── EVALUATE AI INTERACTION RESPONSE ────────────────────────────────────────
async function evaluateInteraction({ concept, interactionType, studentResponse, originalPrompt }) {
  const prompt = `A student responded to a ${interactionType} exercise about "${concept}".

ORIGINAL PROMPT: ${originalPrompt}
STUDENT'S RESPONSE: "${studentResponse}"

Evaluate their response. Return ONLY valid JSON:
{
  "score": 75,
  "passed": true,
  "feedback": "Encouraging, specific feedback (2-3 sentences)",
  "strengths": ["What they got right"],
  "gaps": ["What they missed or could improve"],
  "depth_score": 70,
  "follow_up_suggestion": "What they should explore next to deepen understanding"
}

RULES:
- Score 0-100, pass at 50+
- Be encouraging but honest
- depth_score measures how deeply they engaged (surface vs. deep understanding)
- Focus on conceptual understanding, not exact wording`

  const raw = await callOpenAI(prompt, { temperature: 0.3 })
  return JSON.parse(raw)
}

// ── EVALUATE REFLECTION ─────────────────────────────────────────────────────
async function evaluateReflection({ concept, goal, reflections }) {
  const reflectionText = reflections
    .map(r => `Q: ${r.prompt}\nA: ${r.response}`)
    .join('\n\n')

  const prompt = `A student completed a reflection exercise after learning about "${concept}" for their goal of "${goal}".

REFLECTIONS:
${reflectionText}

Evaluate the quality and depth of their reflections. Return ONLY valid JSON:
{
  "quality_score": 75,
  "self_awareness_score": 70,
  "actionable": true,
  "feedback": "Brief encouraging feedback about their reflection quality (1-2 sentences)",
  "insight": "One insight you noticed about their learning based on their reflections",
  "confused_topics": ["topic they mentioned being confused about"],
  "suggestion": "One specific thing they should do next based on their reflections"
}

RULES:
- quality_score: How thoughtful and specific are their reflections? (0-100)
- self_awareness_score: Do they accurately identify what they know vs don't know? (0-100)
- Be warm and encouraging — reflection itself is valuable
- Pull out confused_topics from their responses to feed back into the learning system`

  const raw = await callOpenAI(prompt, { temperature: 0.3 })
  return JSON.parse(raw)
}

// ── BOSS CHALLENGE ──────────────────────────────────────────────────────────
async function generateBossChallenge({ moduleName, concepts, goal, difficulty, knowledge }) {
  const bossConfig = getBossConfig(0, moduleName)

  const prompt = `You are creating a BOSS CHALLENGE — a multi-phase comprehensive test for a learning module.

MODULE: ${moduleName}
GOAL: ${goal}
CONCEPTS COVERED: ${concepts.join(', ')}
DIFFICULTY: ${difficulty}/5
BOSS NAME: ${bossConfig.name}
PRIOR KNOWLEDGE: ${knowledge || 'Beginner'}

Create a 3-phase boss challenge that tests ALL concepts from this module.

Return ONLY valid JSON:
{
  "boss_name": "${bossConfig.name}",
  "boss_intro": "Dramatic intro text — make it feel like a game boss encounter (2 sentences)",
  "phases": [
    {
      "phase": 1,
      "title": "Phase 1: Knowledge Check",
      "description": "Test conceptual understanding",
      "type": "quiz",
      "questions": [
        {
          "question": "Challenging question covering ${concepts[0] || 'key concept'}",
          "options": ["A", "B", "C", "D"],
          "correctIndex": 0,
          "explanation": "Why this is correct"
        },
        {
          "question": "Another question covering a different concept",
          "options": ["A", "B", "C", "D"],
          "correctIndex": 1,
          "explanation": "Why this is correct"
        }
      ]
    },
    {
      "phase": 2,
      "title": "Phase 2: Application",
      "description": "Apply concepts to a real scenario",
      "type": "challenge",
      "scenario": "A complex scenario requiring multiple concepts",
      "task": "What the student needs to do",
      "evaluation_criteria": ["Criterion 1", "Criterion 2"]
    },
    {
      "phase": 3,
      "title": "Phase 3: Synthesis",
      "description": "Combine everything — explain the big picture",
      "type": "explain",
      "prompt": "Explain how ${concepts.slice(0, 3).join(', ')} work together in a real project",
      "evaluation_keywords": ["keyword1", "keyword2", "keyword3"],
      "model_answer": "What a strong answer looks like"
    }
  ],
  "victory_message": "Congratulations message for defeating the boss",
  "defeat_message": "Encouraging message if they need to retry"
}

RULES:
- Each phase tests different cognitive skills (recall, apply, synthesize)
- Questions should be harder than regular quizzes
- Phase 3 should require combining multiple concepts
- Make it feel epic and game-like
- Boss name: ${bossConfig.name}`

  const raw = await callOpenAI(prompt, { temperature: 0.5, maxTokens: 2000 })
  return JSON.parse(raw)
}

// ── EVALUATE BOSS PHASE ─────────────────────────────────────────────────────
async function evaluateBossPhase({ phase, studentResponse, concept }) {
  if (phase.type === 'quiz') {
    // Quiz phases are auto-graded
    return null // handled client-side
  }

  const prompt = `A student is fighting a Boss Challenge and just completed a phase.

PHASE: ${phase.title}
TASK: ${phase.scenario || phase.prompt}
STUDENT'S RESPONSE: "${studentResponse}"
${phase.evaluation_criteria ? `CRITERIA: ${phase.evaluation_criteria.join(', ')}` : ''}
${phase.evaluation_keywords ? `KEY CONCEPTS: ${phase.evaluation_keywords.join(', ')}` : ''}

Evaluate their response. Return ONLY valid JSON:
{
  "passed": true,
  "score": 80,
  "feedback": "Brief feedback (1-2 sentences)",
  "damage_dealt": 35,
  "boss_response": "A short dramatic response from the boss based on how well they did"
}

RULES:
- passed: true if score >= 60
- damage_dealt: 20-40 based on score (higher score = more damage to boss)
- boss_response should be in-character, dramatic, game-like
- Be encouraging even on failure`

  const raw = await callOpenAI(prompt, { temperature: 0.4 })
  return JSON.parse(raw)
}


// ── MAIN API HANDLER ────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json()
    const { action } = body

    if (!action) {
      return Response.json({ error: 'Missing action' }, { status: 400 })
    }

    // Auth check for actions that need it
    const needsAuth = ['evaluate_interaction', 'evaluate_reflection', 'evaluate_boss_phase']
    if (needsAuth.includes(action)) {
      const accessToken = extractAccessToken(request) || body?.accessToken || null
      const supabase = getSupabaseServerClient({ accessToken })
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
    }

    switch (action) {
      case 'guided_practice': {
        const result = await generateGuidedPractice(body)
        return Response.json(result)
      }

      case 'challenge': {
        const result = await generateChallenge(body)
        return Response.json(result)
      }

      case 'ai_interaction': {
        const result = await generateAIInteraction(body)
        return Response.json(result)
      }

      case 'evaluate_interaction': {
        const result = await evaluateInteraction(body)
        return Response.json(result)
      }

      case 'evaluate_reflection': {
        const result = await evaluateReflection(body)
        return Response.json(result)
      }

      case 'boss_challenge': {
        const result = await generateBossChallenge(body)
        return Response.json(result)
      }

      case 'evaluate_boss_phase': {
        const result = await evaluateBossPhase(body)
        return Response.json(result)
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
