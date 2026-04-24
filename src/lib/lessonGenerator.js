import { getOpenAIModel } from '@/lib/openaiModels'
import {
  deriveDepthPolicy,
  formatLearningContractForPrompt,
  getLessonDisplayFocus,
  normalizeLearnerProfile,
  normalizeConceptLessonDoc,
} from '@/lib/conceptLesson'
import {
  buildDomainConfig,
  parseDomainFromConstraints,
  normalizeDomain,
} from '@/lib/domainAdapter'

function buildLessonError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

const STRING_ARRAY_SCHEMA = {
  type: 'array',
  items: { type: 'string' },
}

const VISUAL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['type', 'title', 'nodes', 'connections'],
  properties: {
    type: { type: 'string', enum: ['flowchart', 'hierarchy', 'comparison', 'steps', 'cycle'] },
    title: { type: 'string' },
    nodes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'label', 'color'],
        properties: {
          id: { type: 'string' },
          label: { type: 'string' },
          color: { type: 'string' },
        },
      },
    },
    connections: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['from', 'to', 'label'],
        properties: {
          from: { type: 'string' },
          to: { type: 'string' },
          label: { type: 'string' },
        },
      },
    },
  },
}

const INTERACTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'afterSection',
    'type',
    'statement',
    'correct',
    'sentence',
    'answer',
    'question',
    'code',
    'options',
    'correctIndex',
    'explanation',
  ],
  properties: {
    afterSection: { type: 'string', enum: ['hook', 'explanation', 'workedExample', 'commonMistake'] },
    type: { type: 'string', enum: ['ready_check', 'true_false', 'fill_blank', 'predict', 'spot_error', 'reflect'] },
    statement: { type: 'string' },
    correct: { type: 'boolean' },
    sentence: { type: 'string' },
    answer: { type: 'string' },
    question: { type: 'string' },
    code: { type: 'string' },
    options: STRING_ARRAY_SCHEMA,
    correctIndex: { type: 'integer' },
    explanation: { type: 'string' },
  },
}

const MENTAL_MODEL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['model', 'howToUse', 'watchOut'],
  properties: {
    model: { type: 'string' },
    howToUse: { type: 'string' },
    watchOut: { type: 'string' },
  },
}

const DEEP_DIVE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['question', 'answer', 'because'],
  properties: {
    question: { type: 'string' },
    answer: { type: 'string' },
    because: { type: 'string' },
  },
}

const PRACTICE_DRILL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['prompt', 'steps', 'modelAnswer', 'selfCheck'],
  properties: {
    prompt: { type: 'string' },
    steps: STRING_ARRAY_SCHEMA,
    modelAnswer: { type: 'string' },
    selfCheck: STRING_ARRAY_SCHEMA,
  },
}

const LESSON_RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'pathai_concept_lesson',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['lessonDoc'],
      properties: {
        lessonDoc: {
          type: 'object',
          additionalProperties: false,
          required: [
            'title',
            'learningObjectives',
            'hook',
            'mentalModel',
            'plainEnglishExplanation',
            'deepDive',
            'whyItMatters',
            'workedExample',
            'practiceDrill',
            'commonMistake',
            'keyTakeaways',
            'retrievalPrompts',
            'practiceBridge',
            'allowedConcepts',
            'taughtPoints',
            'completionCheck',
            'interactions',
          ],
          properties: {
            title: { type: 'string' },
            learningObjectives: STRING_ARRAY_SCHEMA,
            hook: { type: 'string' },
            mentalModel: MENTAL_MODEL_SCHEMA,
            plainEnglishExplanation: { type: 'string' },
            deepDive: DEEP_DIVE_SCHEMA,
            whyItMatters: { type: 'string' },
            workedExample: {
              type: 'object',
              additionalProperties: false,
              required: ['title', 'setup', 'walkthrough', 'result'],
              properties: {
                title: { type: 'string' },
                setup: { type: 'string' },
                walkthrough: STRING_ARRAY_SCHEMA,
                result: { type: 'string' },
              },
            },
            practiceDrill: PRACTICE_DRILL_SCHEMA,
            commonMistake: {
              type: 'object',
              additionalProperties: false,
              required: ['mistake', 'whyItHappens', 'fix'],
              properties: {
                mistake: { type: 'string' },
                whyItHappens: { type: 'string' },
                fix: { type: 'string' },
              },
            },
            keyTakeaways: STRING_ARRAY_SCHEMA,
            retrievalPrompts: STRING_ARRAY_SCHEMA,
            practiceBridge: { type: 'string' },
            allowedConcepts: STRING_ARRAY_SCHEMA,
            taughtPoints: STRING_ARRAY_SCHEMA,
            completionCheck: {
              type: 'object',
              additionalProperties: false,
              required: ['prompt', 'expectedSignals', 'nextStep'],
              properties: {
                prompt: { type: 'string' },
                expectedSignals: STRING_ARRAY_SCHEMA,
                nextStep: { type: 'string' },
              },
            },
            interactions: {
              type: 'array',
              minItems: 4,
              maxItems: 4,
              items: INTERACTION_SCHEMA,
            },
          },
        },
      },
    },
  },
}

async function callOpenAI(prompt, openaiApiKey) {
  const model = getOpenAIModel('lesson')
  let response
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model,
        max_completion_tokens: 4000,
        response_format: LESSON_RESPONSE_FORMAT,
        messages: [
          {
            role: 'system',
            content: 'You output exactly one schema-valid JSON object. No markdown. No prose outside JSON.',
          },
          { role: 'user', content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(60000),
    })
  } catch (error) {
    throw buildLessonError('openai_request_failed', error?.message || 'OpenAI request failed')
  }

  if (!response.ok) {
    const errText = await response.text()
    throw buildLessonError('openai_http_error', `OpenAI lesson error: ${errText}`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content) throw buildLessonError('empty_openai_response', 'OpenAI returned an empty lesson')
  return content
}

function parseLessonJson(raw, context) {
  try {
    const parsed = JSON.parse(raw)
    return normalizeConceptLessonDoc(parsed?.lessonDoc || parsed, context)
  } catch (error) {
    throw buildLessonError('invalid_json', error?.message || 'Could not parse schema-locked lesson JSON')
  }
}

export async function generateLessonFromOpenAI({
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
  domain = null,
  domainConfig = null,
  userLevel = null,
  xp = 0,
  depthOverride = null,
  visualPreference = null,
  openaiApiKey,
}) {
  if (!concept || !goal) throw buildLessonError('missing_inputs', 'Missing concept or goal')
  if (!openaiApiKey) throw buildLessonError('missing_api_key', 'Missing OPENAI_API_KEY')

  const rawProfile = learnerProfile || learningContract?.learnerProfile || {}
  const profile = normalizeLearnerProfile(
    rawProfile,
    { knowledge, goal },
  )
  const resolvedDomain = normalizeDomain(
    domain
      || learningContract?.domain
      || rawProfile?.domain
      || rawProfile?.domainConfig?.domain
      || parseDomainFromConstraints([knowledge, learningContract?.domainKnowledgeLine]),
    null,
  )
  const resolvedDomainConfig = resolvedDomain
    ? (domainConfig || learningContract?.domainConfig || rawProfile?.domainConfig || buildDomainConfig(resolvedDomain))
    : null
  const depthPolicy = deriveDepthPolicy(profile, depthOverride)
  const context = {
    concept,
    taskTitle,
    goal,
    knowledge,
    taskDescription,
    taskAction,
    taskOutcome,
    resourceUrl,
    resourceTitle,
    learnerProfile: profile,
    domain: resolvedDomain,
    domainConfig: resolvedDomainConfig,
    depthOverride,
    visualPreference: visualPreference || profile.visualPreference,
    learningContract: {
      ...(learningContract || {}),
      domain: resolvedDomain,
      domainConfig: resolvedDomainConfig,
      learnerProfile: profile,
      depthPolicy,
      visualPreference: visualPreference || profile.visualPreference,
      prerequisiteMode: learningContract?.prerequisiteMode || 'compressed',
    },
  }
  const displayFocus = getLessonDisplayFocus(context)
  const depthInstruction = depthPolicy.level === 'foundational'
    ? 'Teach from first principles. Use simple language, clear cause/effect, one beginner-safe example, and short recaps after important moves.'
    : depthPolicy.level === 'advanced'
      ? 'Compress basics quickly, then teach the non-obvious part. Use a richer example, ask for transfer, and explain why the move works.'
      : 'Teach the core mental model, connect it to one applied example, and include only the reminders that make the next task easier.'

  const prompt = `You are a subject-matter expert teaching a specific concept for a premium learning app.

${resolvedDomain && resolvedDomainConfig ? `You are teaching a lesson on ${displayFocus} in the domain of ${resolvedDomain}.
Lesson tone: ${resolvedDomainConfig.lessonTone}
Use examples like: ${resolvedDomainConfig.exampleStyle}
The user is at level ${userLevel || rawProfile?.level || profile.level} with ${rawProfile?.xp ?? xp ?? 0} XP.
Adapt complexity accordingly.
` : ''}
GOAL: ${goal}
RAW TASK TITLE: ${taskTitle || concept}
RAW CONCEPT: ${concept}
LEARNER-FRIENDLY FOCUS TO USE IN THE LESSON: ${displayFocus}
${knowledge ? `PRIVATE LEARNER CONTEXT, DO NOT QUOTE: ${knowledge}` : 'PRIVATE LEARNER CONTEXT: beginner / assume very little'}
LEARNER PROFILE JSON, DO NOT QUOTE: ${JSON.stringify(profile)}
DEPTH INSTRUCTIONS: ${depthInstruction}
VISUAL PREFERENCE: ${visualPreference || profile.visualPreference || 'visual'}
${taskDescription ? `TASK DESCRIPTION: ${taskDescription}` : ''}
${taskAction ? `NEXT TASK HANDOFF: ${taskAction}` : ''}
${taskOutcome ? `TARGET OUTCOME: ${taskOutcome}` : ''}
${resourceTitle ? `PRIMARY RESOURCE: ${resourceTitle}${resourceUrl ? ` (${resourceUrl})` : ''}` : ''}

LEARNING CONTRACT:
${formatLearningContractForPrompt({ ...context.learningContract, dayFocus: displayFocus })}

Generate a lesson document that teaches this concept directly.

CRITICAL IDENTITY RULE:
- You are NOT a learning coach.
- Do NOT talk about "learning", "progress", "journey", "foundations", or "building blocks".
- Just teach the actual subject matter.

CONTENT RULES:
1. The hook must be a real-world scenario where this concept matters, NOT a statement about learning.
2. The explanation must teach the actual mechanics of the concept with precision.
3. The worked example MUST be a complete, concrete walkthrough. If the topic is code-related, include runnable code or a precise code walkthrough.
4. The common mistake must describe a specific, real beginner error with this concept.
5. Takeaways must be specific facts, rules, or decisions about the concept — not motivational or meta-learning statements.
6. taughtPoints must be concrete skills the learner can now do, not descriptions of the lesson structure.
7. Generate 4-5 taughtPoints. Each must be a SPECIFIC, TESTABLE skill or fact — something you could write a quiz question about.

NEVER USE THESE PHRASES ANYWHERE:
- "concepts are tools"
- "examples prove the idea works"
- "mistakes show the boundary"
- "practice turns memory into skill"
- "supports progress toward your goal"
- "in plain language"
- "this is your foundation"
- "building blocks"

Use visual teaching, but do not hide the explanation behind a diagram. The words must carry the teaching. Diagrams should clarify structure.
The API enforces the response schema. Fill every required field on the first pass.

Return JSON matching this exact shape:
{
  "lessonDoc": {
    "title": "short title, max 6 words, use the learner-friendly focus",
    "learningObjectives": [
      "what the learner can do after this lesson",
      "another specific ability, not a vague topic",
      "one mistake or judgment they can recognize"
    ],
    "hook": "2-3 short sentences, max 70 words total. Create curiosity by naming a real scenario and practical problem this concept solves.",
    "mentalModel": {
      "model": "a memorable mental picture or analogy for the concept, 1-2 sentences",
      "howToUse": "when the learner should reach for this idea in practice, 1-2 sentences",
      "watchOut": "the boundary or trap that keeps the model honest, 1 sentence"
    },
    "plainEnglishExplanation": "4-7 short sentences. Teach the actual concept from the ground up with concrete mechanics. Use paragraph breaks if helpful.",
    "deepDive": {
      "question": "the question a confused but motivated learner would ask",
      "answer": "2-4 sentences that explain the non-obvious part without handwaving",
      "because": "the causal reason this works or matters, 1-2 sentences"
    },
    "whyItMatters": "2-3 sentences. Connect the idea to decisions the learner will make soon.",
    "workedExample": {
      "title": "example title, max 6 words",
      "setup": "the scenario in 2-3 sentences. Make it realistic for the learner's goal and concrete enough to walk through step by step.",
      "walkthrough": [
        "step 1 with the reason it matters",
        "step 2 with the decision being made",
        "step 3 with what changes because of the concept",
        "step 4 with the final check"
      ],
      "result": "what the learner should notice, 1-2 sentences"
    },
    "practiceDrill": {
      "prompt": "a small active exercise the learner can do in 3-5 minutes",
      "steps": ["practice step 1", "practice step 2", "practice step 3"],
      "modelAnswer": "a compact example of what a strong answer could look like",
      "selfCheck": ["specific check 1", "specific check 2", "specific check 3"]
    },
    "commonMistake": {
      "mistake": "the mistake, 1 sentence",
      "whyItHappens": "why learners make it, 1-2 sentences",
      "fix": "how to avoid it, 1-2 sentences"
    },
    "keyTakeaways": ["specific fact or rule", "specific fact or rule", "specific fact or rule", "specific fact or rule"],
    "retrievalPrompts": [
      "a no-notes recall prompt",
      "an explain-it-to-a-beginner prompt",
      "a spot-the-mistake prompt"
    ],
    "practiceBridge": "clear handoff into the next practice task, 1-2 sentences",
    "allowedConcepts": ["short concept label", "short concept label"],
    "taughtPoints": ["specific, testable skill", "specific, testable skill", "specific, testable skill", "specific, testable skill"],
    "completionCheck": {
      "prompt": "reflection or self-check prompt that proves understanding",
      "expectedSignals": ["signal 1", "signal 2", "signal 3"],
      "nextStep": "what to do next, 1 sentence"
    },
    "interactions": [
      {
        "afterSection": "hook",
        "type": "true_false",
        "statement": "A statement about the concept the learner just read in the hook - true or false",
        "correct": true,
        "sentence": "",
        "answer": "",
        "question": "",
        "code": "",
        "options": [],
        "correctIndex": 0,
        "explanation": "Why this is true/false - 1 sentence"
      },
      {
        "afterSection": "explanation",
        "type": "fill_blank",
        "statement": "",
        "correct": false,
        "sentence": "A sentence with ___ where the key term goes",
        "answer": "the answer",
        "question": "",
        "code": "",
        "options": [],
        "correctIndex": 0,
        "explanation": "Why this answer is correct - 1 sentence"
      },
      {
        "afterSection": "workedExample",
        "type": "predict",
        "statement": "",
        "correct": false,
        "sentence": "",
        "answer": "",
        "question": "What will happen if...? (based on the worked example)",
        "code": "optional short code snippet if programming topic, else empty string",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctIndex": 0,
        "explanation": "Why this option is correct - 1 sentence"
      },
      {
        "afterSection": "commonMistake",
        "type": "spot_error",
        "statement": "",
        "correct": false,
        "sentence": "",
        "answer": "",
        "question": "What is wrong with this? (based on the common mistake)",
        "code": "optional short code or scenario showing the mistake",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctIndex": 0,
        "explanation": "Why this is the error - 1 sentence"
      }
    ]
  }
}

STRICT RULES:
- Teach, do not present. No slides, no images.
- First response must be complete and valid. Do not rely on any follow-up.
- Give enough depth to learn from. Avoid filler, motivational fluff, and repeating the goal.
- Explain the "why" behind each important step. A learner should not merely memorize labels.
- Focus on the concept itself, not the process of learning the concept.
- If the concept is technical, teach the syntax, mechanics, and edge cases clearly.
- If the concept is non-technical, teach the underlying rules, relationships, or causal structure clearly.
- The lesson must include active recall and practice, not only reading.
- For beginner/slow learners: scaffold with simpler examples, explicit cause/effect, and short recaps.
- For advanced/intensive learners: compress definitions and spend the depth on transfer, tradeoffs, or edge cases.
- Do not introduce concepts outside ALLOWED CONCEPTS or beyond TAUGHT POINTS.
- Do not repeat the full goal, raw task title, or raw concept title. Use "${displayFocus}" or shorter labels.
- Never expose private learner context such as diagnostic score, recommended level, pace, path style, or local offline mode.
- Avoid phrases like "Introduction To...", "key ideas", "inside [course name]", "as part of your larger goal", and "supporting resource".
- Do not write vague taughtPoints like "X in plain language", "How X supports progress", "A concrete example of X", or "A clear sign that X is starting to stick".
- The explanation must feel like a real teacher helping a motivated learner, not template filler.
- Use one concrete worked example and one active practice drill.
- The practiceBridge must prepare the learner for the next task, not repeat the whole lesson.
- For interactions: test the actual content of this lesson, not generic trivia. Keep code snippets short (≤5 lines). Use empty string, empty array, false, or 0 for fields that do not apply to a given type.
- Never mention being an AI, JSON, schema, or the prompt.
- Do not add markdown fences.`

  const raw = await callOpenAI(prompt, openaiApiKey)
  const lessonDoc = parseLessonJson(raw, context)

  return {
    lessonDoc: normalizeConceptLessonDoc(lessonDoc, context),
    generationMode: 'ai',
    cacheable: false,
    resource: lessonDoc.resource || (resourceUrl ? { url: resourceUrl, title: resourceTitle || 'Primary resource' } : null),
  }
}
