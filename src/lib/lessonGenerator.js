import { getOpenAIModel } from '@/lib/openaiModels'
import {
  buildStructuredConceptLessonDoc,
  extractJsonObject,
  formatLearningContractForPrompt,
  normalizeConceptLessonDoc,
  repairJsonString,
} from '@/lib/conceptLesson'

function buildLessonError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

async function callOpenAI(prompt, openaiApiKey) {
  let response
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: getOpenAIModel('lesson'),
        max_tokens: 2800,
        temperature: 0.28,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
  } catch (error) {
    throw buildLessonError('openai_request_failed', error?.message || 'OpenAI request failed')
  }

  if (!response.ok) {
    const errText = await response.text()
    throw buildLessonError('openai_http_error', `OpenAI lesson error: ${errText}`)
  }

  const data = await response.json()
  return data?.choices?.[0]?.message?.content || ''
}

function parseLessonJson(raw, context) {
  const extracted = extractJsonObject(raw)
  if (!extracted) {
    throw buildLessonError('invalid_json', 'No JSON object returned for lesson')
  }

  try {
    const parsed = JSON.parse(extracted)
    return normalizeConceptLessonDoc(parsed?.lessonDoc || parsed, context)
  } catch (_) {
    try {
      const repaired = repairJsonString(raw)
      const parsed = JSON.parse(repaired)
      return normalizeConceptLessonDoc(parsed?.lessonDoc || parsed, context)
    } catch (error) {
      throw buildLessonError('invalid_json', error?.message || 'Could not parse lesson JSON')
    }
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
  openaiApiKey,
}) {
  if (!concept || !goal) throw buildLessonError('missing_inputs', 'Missing concept or goal')
  if (!openaiApiKey) throw buildLessonError('missing_api_key', 'Missing OPENAI_API_KEY')

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
    learningContract,
  }

  const prompt = `You are an elite teacher writing a concept lesson for a premium learning app.

GOAL: ${goal}
TASK TITLE: ${taskTitle || concept}
CONCEPT FOCUS: ${concept}
${knowledge ? `PRIOR KNOWLEDGE: ${knowledge}` : 'PRIOR KNOWLEDGE: beginner / assume very little'}
${taskDescription ? `TASK DESCRIPTION: ${taskDescription}` : ''}
${taskAction ? `NEXT TASK HANDOFF: ${taskAction}` : ''}
${taskOutcome ? `TARGET OUTCOME: ${taskOutcome}` : ''}
${resourceTitle ? `PRIMARY RESOURCE: ${resourceTitle}${resourceUrl ? ` (${resourceUrl})` : ''}` : ''}

LEARNING CONTRACT:
${formatLearningContractForPrompt(learningContract)}

Write a single-page teaching lesson. The student should finish understanding the concept well enough to enter guided practice without encountering brand-new ideas.

Return ONLY valid JSON with this exact shape:
{
  "lessonDoc": {
    "title": "specific title",
    "hook": "2-3 sentence opening that makes the topic feel important and approachable",
    "plainEnglishExplanation": "2-4 short paragraphs in plain language. No filler. Teach the actual concept.",
    "whyItMatters": "1 short paragraph connecting the idea to the learner's real goal",
    "workedExample": {
      "title": "example title",
      "setup": "the scenario in 2-3 sentences",
      "walkthrough": ["step 1", "step 2", "step 3"],
      "result": "what the learner should notice from the example"
    },
    "commonMistake": {
      "mistake": "the mistake",
      "whyItHappens": "why beginners make it",
      "fix": "how to avoid it"
    },
    "keyTakeaways": ["takeaway 1", "takeaway 2", "takeaway 3"],
    "practiceBridge": "clear handoff into the next practice task",
    "allowedConcepts": ["concept 1", "concept 2"],
    "taughtPoints": ["point 1", "point 2", "point 3"],
    "completionCheck": {
      "prompt": "short reflection or self-check prompt",
      "expectedSignals": ["signal 1", "signal 2", "signal 3"],
      "nextStep": "what to do next"
    },
    "interactions": [
      {
        "afterSection": "hook",
        "type": "true_false",
        "statement": "A statement about the concept the learner just read in the hook — true or false",
        "correct": true,
        "explanation": "Why this is true/false — 1 sentence"
      },
      {
        "afterSection": "explanation",
        "type": "fill_blank",
        "sentence": "A sentence with ___ where the key term goes",
        "answer": "the answer",
        "explanation": "Why this answer is correct — 1 sentence"
      },
      {
        "afterSection": "workedExample",
        "type": "predict",
        "question": "What will happen if...? (based on the worked example)",
        "code": "optional short code snippet if programming topic, else omit",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctIndex": 0,
        "explanation": "Why this option is correct — 1 sentence"
      },
      {
        "afterSection": "commonMistake",
        "type": "spot_error",
        "question": "What is wrong with this? (based on the common mistake)",
        "code": "optional short code or scenario showing the mistake",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctIndex": 0,
        "explanation": "Why this is the error — 1 sentence"
      },
      {
        "afterSection": "takeaways",
        "type": "reflect",
        "question": "In your own words, what will you use from this lesson in the next task?"
      }
    ]
  }
}

STRICT RULES:
- Teach, do not present. No slides. No images.
- Do not introduce concepts outside ALLOWED CONCEPTS or beyond TAUGHT POINTS.
- The explanation must feel like a real teacher helping a motivated learner, not template filler.
- Use one concrete worked example.
- Keep the writing specific to ${goal}, not generic study advice.
- The practiceBridge must prepare the learner for the next task, not repeat the whole lesson.
- For interactions: make them test the actual content of this lesson, not generic trivia. Keep code snippets short (≤5 lines). If the topic is not programming, omit the code field entirely.
- Include exactly 5 interactions: hook, explanation, workedExample, commonMistake, and takeaways.
- Never mention being an AI, JSON, schema, or the prompt.
- Do not add markdown fences.`

  const raw = await callOpenAI(prompt, openaiApiKey)
  const lessonDoc = parseLessonJson(raw, context)

  return {
    lessonDoc: normalizeConceptLessonDoc(lessonDoc, context),
    generationMode: 'ai',
    cacheable: true,
    resource: lessonDoc.resource || buildStructuredConceptLessonDoc(context).resource || null,
  }
}
