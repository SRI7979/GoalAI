function sanitizeUrl(url) {
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) return null
    return parsed.toString()
  } catch (_) {
    return null
  }
}

function buildReliableImageUrl(query = '') {
  const seed = encodeURIComponent(String(query || 'education').toLowerCase())
  return `https://picsum.photos/seed/${seed}/1200/700`
}

function buildImageSearchQuery({ concept, slideTitle, imageQuery, slideType }) {
  const base = String(imageQuery || '').trim() || `${slideTitle || concept} ${concept}`
  const typeHint = slideType === 'diagram' ? 'diagram chart' : 'education'
  return `${base} ${concept} ${typeHint}`.replace(/\s+/g, ' ').trim()
}

async function resolveRelevantImageFromWikipedia(query) {
  const endpoint = new URL('https://en.wikipedia.org/w/api.php')
  endpoint.searchParams.set('action', 'query')
  endpoint.searchParams.set('format', 'json')
  endpoint.searchParams.set('formatversion', '2')
  endpoint.searchParams.set('generator', 'search')
  endpoint.searchParams.set('gsrsearch', query)
  endpoint.searchParams.set('gsrlimit', '6')
  endpoint.searchParams.set('prop', 'pageimages|description')
  endpoint.searchParams.set('piprop', 'original|thumbnail')
  endpoint.searchParams.set('pithumbsize', '1200')
  try {
    const res = await fetch(endpoint.toString(), {
      headers: { 'User-Agent': 'PathAI-LessonGenerator/1.0 (educational)' },
    })
    if (!res.ok) return null
    const data = await res.json()
    const pages = Array.isArray(data?.query?.pages) ? data.query.pages : []
    for (const page of pages) {
      const url = page?.original?.source || page?.thumbnail?.source || null
      if (!url) continue
      if (url.toLowerCase().endsWith('.svg')) continue
      return { url, caption: page?.description || page?.title || '' }
    }
  } catch (_) { return null }
  return null
}

// ─── Detect if this is a programming/code topic ────────────────────────────
function isProgrammingTopic(concept = '', goal = '') {
  const text = `${concept} ${goal}`.toLowerCase()
  return /python|javascript|typescript|java\b|c\+\+|c#|rust\b|golang|ruby|swift|kotlin|sql|html|css|react|angular|vue|node|django|flask|express|api|rest|graphql|function|variable|loop|array|object|class|method|algorithm|data structure|programming|coding|code|syntax|terminal|bash|shell|git|database|query|recursion/.test(text)
}

export async function generateLessonFromOpenAI({ concept, taskTitle, goal, knowledge, openaiApiKey }) {
  if (!concept || !goal) throw new Error('Missing concept or goal')
  if (!openaiApiKey)     throw new Error('Missing OPENAI_API_KEY')

  const isProg = isProgrammingTopic(concept, goal)

  const codeBlockSchema = isProg
    ? `"codeBlocks": [
      {
        "language": "python",
        "code": "# actual runnable code with output comments\\nx = 10\\nprint(x)  # Output: 10",
        "caption": "what this code demonstrates"
      }
    ],`
    : `"codeBlocks": [],`

  const codeBlockRules = isProg
    ? `- Slides 2–5 MUST each include 1–2 codeBlocks with real, runnable, commented code
- Language must match the topic (python, javascript, typescript, sql, bash, etc.)
- Include "# Output: ..." or "// Output: ..." comments so learners see results
- Code examples should progress: slide 2 = bare minimum, slide 4 = practical real-world use
- Use meaningful variable names (not x/y/z — use names like age, price, username)
- Practice slide: show a common mistake, then the correct fix
- Slide 1 (intro) and slide 6 (summary): codeBlocks can be empty []`
    : `- codeBlocks must be an empty array [] for non-programming topics`

  const prompt = `You are an expert teacher creating a rich, visual, slide-based micro-lesson.

TOPIC: ${concept}
TASK: ${taskTitle || concept}
LEARNING GOAL: ${goal}
${knowledge ? `STUDENT ALREADY KNOWS: ${knowledge}` : 'STUDENT LEVEL: Beginner — no prior knowledge assumed'}

Create a lesson with exactly 6 slides. Return ONLY valid JSON — no markdown, no backticks, no commentary outside the JSON.

{
  "slides": [
    {
      "id": 1,
      "title": "What You'll Learn",
      "type": "intro",
      "content": "Welcoming intro paragraph. Then bullet-point list (use \\n• format) of the 5 things covered.",
      "diagram": { "type": "none", "nodes": [], "connections": [] },
      "codeBlocks": [],
      "image": { "query": "specific educational image query", "alt": "alt text", "caption": "caption" },
      "keyTakeaway": "One memorable sentence."
    },
    {
      "id": 2,
      "title": "Core Concept",
      "type": "concept",
      "content": "2-3 paragraphs explaining the idea with a real-world analogy. Be specific, warm, and encouraging.",
      "diagram": {
        "type": "flowchart|hierarchy|comparison|steps",
        "nodes": [
          {"label": "meaningful label", "color": "teal|amber|blue|red|gray", "level": 0},
          {"label": "meaningful label", "color": "blue", "level": 1}
        ],
        "connections": [{"from": 0, "to": 1, "label": "relationship"}]
      },
      ${codeBlockSchema}
      "image": { "query": "specific query", "alt": "alt text", "caption": "caption" },
      "keyTakeaway": "One sentence."
    },
    {
      "id": 3,
      "title": "Visual Breakdown",
      "type": "diagram",
      "content": "Explain the diagram below. Walk through each part.",
      "diagram": {
        "type": "steps",
        "nodes": [
          {"label": "Step 1 label", "color": "teal", "level": 0},
          {"label": "Step 2 label", "color": "blue", "level": 1},
          {"label": "Step 3 label", "color": "amber", "level": 2},
          {"label": "Step 4 label", "color": "red", "level": 3}
        ],
        "connections": [
          {"from": 0, "to": 1, "label": "then"},
          {"from": 1, "to": 2, "label": "then"},
          {"from": 2, "to": 3, "label": "finally"}
        ]
      },
      ${codeBlockSchema}
      "image": { "query": "query", "alt": "alt", "caption": "" },
      "keyTakeaway": "One sentence."
    },
    {
      "id": 4,
      "title": "Worked Example",
      "type": "example",
      "content": "Walk through a real, concrete example step by step. Make it relatable.",
      "diagram": { "type": "none", "nodes": [], "connections": [] },
      ${codeBlockSchema}
      "image": { "query": "query", "alt": "alt", "caption": "" },
      "keyTakeaway": "One sentence."
    },
    {
      "id": 5,
      "title": "Try It Yourself",
      "type": "practice",
      "content": "A challenge with clear instructions. Show a common mistake and its fix. Give a hint.",
      "diagram": { "type": "none", "nodes": [], "connections": [] },
      ${codeBlockSchema}
      "image": { "query": "query", "alt": "alt", "caption": "" },
      "keyTakeaway": "One sentence."
    },
    {
      "id": 6,
      "title": "Summary",
      "type": "summary",
      "content": "Recap what was learned. Bullet list of key points. Mention what comes next.",
      "diagram": { "type": "none", "nodes": [], "connections": [] },
      "codeBlocks": [],
      "image": { "query": "query", "alt": "alt", "caption": "" },
      "keyTakeaway": "One sentence."
    }
  ],
  "quiz": {
    "question": "A question that tests genuine understanding, not trivia",
    "options": ["Plausible A", "Plausible B", "Plausible C", "Plausible D"],
    "correctIndex": 0,
    "explanation": "Why the correct answer is right and why the others are wrong"
  }
}

RULES:
${codeBlockRules}
- Diagrams must have 4–6 nodes with real, meaningful labels (no "Node 1", "Step A" etc.)
- Connection labels must be verbs: "calls", "returns", "stores", "extends", "passes to", etc.
- Image queries must be specific (e.g. "Python list indexing diagram tutorial", not "education")
- keyTakeaway must be one memorable, standalone sentence
- Quiz: all 4 options must be plausible — no obviously wrong answers
- Content paragraphs: 2-4 sentences, clear, warm, encouraging tone
- Never use generic filler text`

  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiApiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 4000,
      temperature: 0.35,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!openaiRes.ok) {
    const errText = await openaiRes.text()
    throw new Error(`OpenAI lesson error: ${errText}`)
  }

  const openaiData = await openaiRes.json()
  const text = openaiData.choices?.[0]?.message?.content || ''

  let jsonStr = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
  const firstBrace = jsonStr.indexOf('{')
  if (firstBrace >= 0) jsonStr = jsonStr.slice(firstBrace)

  const parsed = JSON.parse(jsonStr)
  if (!Array.isArray(parsed?.slides) || parsed.slides.length === 0) {
    throw new Error('No slides generated')
  }

  const normalizedSlides = await Promise.all(parsed.slides.map(async (slide, index) => {
    const imageQuery    = String(slide?.image?.query || '').trim() || `${slide?.title || concept} education`
    const sourceUrl     = sanitizeUrl(slide?.image?.url)
    const semanticQuery = buildImageSearchQuery({
      concept, slideTitle: slide?.title, imageQuery, slideType: slide?.type,
    })

    const wikiImage = await resolveRelevantImageFromWikipedia(semanticQuery)
    const imageUrl  = sourceUrl && !sourceUrl.includes('source.unsplash.com')
      ? sourceUrl
      : (wikiImage?.url || buildReliableImageUrl(semanticQuery))

    return {
      id:         Number(slide?.id) || index + 1,
      title:      String(slide?.title   || `Slide ${index + 1}`).trim(),
      type:       String(slide?.type    || 'concept').trim().toLowerCase(),
      content:    String(slide?.content || '').trim(),
      diagram:    slide?.diagram || { type: 'none', nodes: [], connections: [] },
      codeBlocks: Array.isArray(slide?.codeBlocks) ? slide.codeBlocks : [],
      image: {
        query:   imageQuery,
        alt:     String(slide?.image?.alt     || `Illustration for ${concept}`).trim(),
        caption: String(slide?.image?.caption || wikiImage?.caption || '').trim(),
        url:     imageUrl,
      },
      keyTakeaway: String(slide?.keyTakeaway || '').trim(),
    }
  }))

  return { slides: normalizedSlides, quiz: parsed?.quiz || null }
}

export function buildFallbackLesson(concept) {
  return {
    slides: [
      {
        id: 1, title: 'Getting Started', type: 'intro',
        content: `This lesson covers ${concept}. Let's explore the key ideas step by step. Use the resource link below the task for detailed reading material.`,
        diagram: { type: 'none', nodes: [], connections: [] },
        codeBlocks: [],
        image: { query: `${concept} introduction`, alt: `Introduction to ${concept}`, caption: '', url: buildReliableImageUrl(`${concept} education`) },
        keyTakeaway: 'Every expert was once a beginner.',
      },
      {
        id: 2, title: 'Core Concept', type: 'concept',
        content: `We could not generate a custom lesson right now. Please check the resource link for this task and come back to try again later.`,
        diagram: { type: 'none', nodes: [], connections: [] },
        codeBlocks: [],
        image: { query: `${concept} fundamentals`, alt: `Core concept`, caption: '', url: buildReliableImageUrl(`${concept} fundamentals`) },
        keyTakeaway: 'Check the resource link for detailed learning material.',
      },
    ],
    quiz: null,
    fallback: true,
  }
}
