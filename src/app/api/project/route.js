import { getOpenAIModel } from '@/lib/openaiModels'
import {
  CODE_LANGUAGES,
  buildStarterForLanguage,
  detectCodeLanguageFromText,
  getLanguageMeta,
  normalizeCodeLanguage,
} from '@/lib/codeLanguages'
import { formatDomainForPrompt, normalizeDomain, parseDomainFromConstraints } from '@/lib/domainAdapter'

function buildDomainPrompt({ domain, knowledge } = {}) {
  const resolvedDomain = normalizeDomain(domain || parseDomainFromConstraints([knowledge]), null)
  return resolvedDomain ? `\nDOMAIN ADAPTER:\n${formatDomainForPrompt(resolvedDomain)}\n` : ''
}

function detectTargetStack({ goal, concept, taskTitle }) {
  const goalLanguage = detectCodeLanguageFromText(goal, '')
  if (goalLanguage) return goalLanguage
  return detectCodeLanguageFromText([concept, taskTitle].filter(Boolean).join(' '), 'javascript')
}

function stackLabel(stack) {
  return getLanguageMeta(stack).label
}

function projectIdeasFor(stack) {
  const ideas = {
    python: [
      'a calculator with named operations and input validation',
      'a command-line expense splitter for friends',
      'a quiz scorer that gives feedback by score band',
      'a text analyzer that counts words and finds the longest word',
      'a unit converter with reusable functions',
      'a tiny gradebook that averages scores and prints a report',
    ],
    sql: [
      'a movie theater database with films, showtimes, and ticket sales',
      'a bookstore order database with customers and purchases',
      'a music library query lab with artists, albums, and plays',
      'a food truck sales database with menu items and daily revenue',
      'a classroom attendance database with students and sessions',
    ],
    html: [
      'a simple personal landing page with sections and styled cards',
      'a recipe page with ingredients, steps, and responsive layout',
      'a profile card page with CSS states',
      'a small event page with schedule and call-to-action',
      'a gallery page with semantic HTML and clean styling',
    ],
    javascript: [
      'a tip calculator with validation and formatted output',
      'a to-do list state model with add, complete, and filter functions',
      'a small quiz engine that scores answers',
      'a shopping cart total calculator with discounts',
      'a DOM-free webpage state exercise that returns render data',
    ],
  }
  return ideas[stack] || [
    `a small ${stackLabel(stack)} console program with sample input and output`,
    `a ${stackLabel(stack)} function practice project with reusable helpers`,
    `a ${stackLabel(stack)} data transformation exercise with clear printed output`,
    `a ${stackLabel(stack)} mini app that validates input and reports results`,
  ]
}

function starterFor(stack, title) {
  return buildStarterForLanguage(stack, title, 'Complete the practice project.')
}

function fallbackProject({ stack, goal, concept, taskTitle, variationSeed }) {
  const ideas = projectIdeasFor(stack)
  const selectedIdea = ideas[Math.abs(Number(variationSeed) || Date.now()) % ideas.length]
  const title = stack === 'python'
    ? 'Build a Python Practice App'
    : stack === 'sql'
      ? 'Build a Query Lab'
      : stack === 'html'
        ? 'Build a Small Web Page'
        : 'Build a JavaScript Mini App'

  return {
    title,
    objective: `Create ${selectedIdea} while practicing ${concept || taskTitle || goal}.`,
    steps: [
      { id: 1, title: 'Read the starter code', description: `Identify what the shell already gives you and where the TODO lives. Keep the work in ${stackLabel(stack)}.` },
      { id: 2, title: 'Implement the core behavior', description: 'Replace the placeholder with the smallest working version first. Use clear names so the output is easy to understand.' },
      { id: 3, title: 'Test with sample data', description: 'Run the sandbox and compare the output with the project goal. Add one extra sample case so you are not only testing the default.' },
      { id: 4, title: 'Clean up the result', description: 'Make the output readable and remove dead placeholders. The final run should show visible proof that the project works.' },
    ],
    starter: starterFor(stack, title),
    starter_language: stack,
    hint: `Stay inside ${stackLabel(stack)}. If your idea starts becoming a different language or tool, shrink it back to one working sandbox result.`,
    successCriteria: `The ${stackLabel(stack)} sandbox runs and prints or renders a result that matches the project objective.`,
  }
}

function starterLooksWrongForStack(starter, stack) {
  const text = String(starter || '').toLowerCase()
  if (!text.trim()) return true
  if (stack === 'python') return /\bselect\b|\bfrom\b|create table|insert into|<html|function\s+\w+\s*\(/.test(text) && !/def\s+\w+\s*\(/.test(text)
  if (stack === 'sql') return !(/\bselect\b|create table|insert into/.test(text))
  if (stack === 'html') return !(/<html|<main|<section|<div/.test(text))
  if (stack === 'javascript') return !(/function|const|let|=>|console\.log/.test(text))
  return false
}

function repairProject(parsed, context) {
  const stack = context.stack
  const fallback = fallbackProject(context)
  const project = {
    ...fallback,
    ...parsed,
    steps: Array.isArray(parsed?.steps) && parsed.steps.length >= 3 ? parsed.steps : fallback.steps,
    starter_language: stack,
  }
  if (starterLooksWrongForStack(project.starter, stack)) {
    project.starter = starterFor(stack, project.title || fallback.title)
  }
  return project
}

export async function POST(request) {
  let requestBody = {}
  try {
    requestBody = await request.json()
    const {
      concept,
      taskTitle,
      goal,
      knowledge,
      taskType,
      domain,
      variationSeed = Date.now(),
    } = requestBody
    if (!concept || !goal) return Response.json({ error: 'Missing concept or goal' }, { status: 400 })

    const stack = detectTargetStack({ goal, concept, taskTitle })
    const ideas = projectIdeasFor(stack)
    const forbidden = stack === 'python'
      ? 'Do NOT create SQL, database-query, HTML, JavaScript, React, or web-page work.'
      : stack === 'sql'
        ? 'Do NOT create Python, JavaScript, React, or HTML app work.'
        : stack === 'html'
          ? 'Do NOT create Python or SQL query work.'
          : stack === 'javascript'
            ? 'Do NOT create Python or SQL query work unless the goal explicitly asks for it.'
            : `Do NOT switch away from ${stackLabel(stack)}.`

    const prompt = `You are a senior learning designer creating a fresh hands-on ${taskType === 'exercise' ? 'coding exercise' : 'practice project'}.

TARGET STACK: ${stackLabel(stack)}
GOAL: ${goal}
${buildDomainPrompt({ domain, knowledge })}
CONCEPT: ${concept}
TASK TITLE: ${taskTitle || concept}
VARIATION SEED: ${variationSeed}
${knowledge ? `The student already knows: ${knowledge}. Challenge them appropriately.` : ''}

Create ONE practical ${stackLabel(stack)} exercise. It must stay inside TARGET STACK even if TASK TITLE is noisy or mentions another technology.
The PathAI editor can show 30+ languages. For this specific practice, use only ${stackLabel(stack)}.

Good project directions for this stack:
${ideas.map((idea) => `- ${idea}`).join('\n')}

Available editor languages include:
${CODE_LANGUAGES.map((language) => language.label).join(', ')}

Return ONLY valid JSON, no markdown, no backticks:
{
  "title": "Specific project title",
  "objective": "What they'll build and what skill it reinforces",
  "steps": [
    { "id": 1, "title": "Step title", "description": "Detailed instruction with specific actions" }
  ],
  "starter": "Starter shell code/query/template for the built-in editor",
  "starter_language": "${stack}",
  "hint": "A strategic hint that unblocks without giving away the answer",
  "successCriteria": "Specific, testable criteria for the sandbox output"
}

RULES:
- starter_language MUST be exactly "${stack}".
- ${forbidden}
- Every step should mention concrete actions in ${stackLabel(stack)}, not abstract study advice.
- 4-6 steps that build on each other in a logical sequence.
- Starter must be runnable in a sandbox with TODO comments where the learner works.
- The exercise should be different from generic calculator/query examples unless that example is the best fit for the concept.
- Make it feel like building something useful in 10-15 minutes.`

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: getOpenAIModel('projectIdea'),
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.72,
        max_tokens: 1300,
      }),
    })
    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content?.trim() || ''
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const parsed = JSON.parse(clean)
    return Response.json(repairProject(parsed, { stack, goal, concept, taskTitle, variationSeed }))
  } catch (err) {
    const stack = normalizeCodeLanguage(detectTargetStack(requestBody))
    return Response.json(fallbackProject({ ...requestBody, stack }))
  }
}
