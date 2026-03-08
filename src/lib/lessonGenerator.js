function sanitizeUrl(url) {
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) return null
    return parsed.toString()
  } catch (_) {
    return null
  }
}

function fallbackImageQuery(topic = '') {
  return `${topic} education infographic`
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
      headers: {
        'User-Agent': 'PathAI-LessonGenerator/1.0 (educational)',
      },
    })
    if (!res.ok) return null
    const data = await res.json()
    const pages = Array.isArray(data?.query?.pages) ? data.query.pages : []
    for (const page of pages) {
      const url = page?.original?.source || page?.thumbnail?.source || null
      if (!url) continue
      const lower = url.toLowerCase()
      if (lower.endsWith('.svg')) continue
      return {
        url,
        caption: page?.description || page?.title || '',
      }
    }
  } catch (_) {
    return null
  }
  return null
}

export async function generateLessonFromOpenAI({ concept, taskTitle, goal, knowledge, openaiApiKey }) {
  if (!concept || !goal) {
    throw new Error('Missing concept or goal')
  }

  if (!openaiApiKey) {
    throw new Error('Missing OPENAI_API_KEY')
  }

  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 3200,
      temperature: 0.5,
      messages: [{
        role: 'user',
        content: `You are an expert teacher creating a visual, slide-based micro-lesson.

TOPIC: ${concept}
TASK: ${taskTitle || concept}
LEARNING GOAL: ${goal}
${knowledge ? `STUDENT KNOWS: ${knowledge}` : 'STUDENT LEVEL: Beginner'}

Create a lesson with 5-7 slides. Return ONLY valid JSON (no markdown, no backticks):

{"slides":[
  {
    "id": 1,
    "title": "Slide title",
    "type": "intro|concept|diagram|example|practice|summary",
    "content": "2-3 paragraphs of clear, engaging explanation. Use analogies. Be specific.",
    "diagram": {
      "type": "flowchart|hierarchy|comparison|steps|none",
      "nodes": [
        {"label": "Node text", "color": "teal|amber|blue|red|gray", "level": 0},
        {"label": "Node text", "color": "teal", "level": 1}
      ],
      "connections": [
        {"from": 0, "to": 1, "label": "relationship"}
      ]
    },
    "image": {
      "query": "short search query for an educational image matching this slide",
      "alt": "accessible alt text",
      "caption": "short explanatory caption"
    },
    "keyTakeaway": "One sentence summary of this slide"
  }
],
"quiz": {
  "question": "A question testing understanding of the full lesson",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctIndex": 0,
  "explanation": "Why the correct answer is right"
}}

RULES:
- Slide 1 should be "intro" type with a "What You Will Learn" overview
- Include at least 2 slides with diagrams (flowchart, hierarchy, comparison, or steps)
- Every slide must include an "image" object
- Image query must be tightly relevant to the slide topic (no generic nature/animals/abstract backgrounds)
- Slide types should vary: intro, concept, diagram, example, practice, summary
- Content should be specific and teach real knowledge, not generic filler
- Diagrams should have 3-6 nodes with meaningful connections
- The quiz should test conceptual understanding, not trivia
- Last slide should be "summary" type
- Keep language clear and concise, suitable for self-learners`,
      }],
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
    const imageQuery = String(slide?.image?.query || '').trim() || fallbackImageQuery(slide?.title || concept)
    const sourceUrl = sanitizeUrl(slide?.image?.url)
    const semanticQuery = buildImageSearchQuery({
      concept,
      slideTitle: slide?.title,
      imageQuery,
      slideType: slide?.type,
    })

    const wikiImage = await resolveRelevantImageFromWikipedia(semanticQuery)
    const imageUrl = sourceUrl && !sourceUrl.includes('source.unsplash.com')
      ? sourceUrl
      : (wikiImage?.url || buildReliableImageUrl(semanticQuery))

    return {
      id: Number(slide?.id) || index + 1,
      title: String(slide?.title || `Slide ${index + 1}`).trim(),
      type: String(slide?.type || 'concept').trim().toLowerCase(),
      content: String(slide?.content || '').trim(),
      diagram: slide?.diagram || { type: 'none', nodes: [], connections: [] },
      image: {
        query: imageQuery,
        alt: String(slide?.image?.alt || `Illustration for ${slide?.title || concept}`).trim(),
        caption: String(slide?.image?.caption || wikiImage?.caption || '').trim(),
        url: imageUrl,
      },
      keyTakeaway: String(slide?.keyTakeaway || '').trim(),
    }
  }))

  return {
    slides: normalizedSlides,
    quiz: parsed?.quiz || null,
  }
}

export function buildFallbackLesson(concept) {
  return {
    slides: [
      {
        id: 1,
        title: 'Welcome',
        type: 'intro',
        content: 'This lesson will cover the key concepts you need to understand. Let\'s get started with the fundamentals.',
        diagram: { type: 'none', nodes: [], connections: [] },
        image: {
          query: `${concept} introduction`,
          alt: `Introduction to ${concept}`,
          caption: `Overview of ${concept}`,
          url: buildReliableImageUrl(`${concept} education`),
        },
        keyTakeaway: 'Every expert was once a beginner.',
      },
      {
        id: 2,
        title: 'Core Concept',
        type: 'concept',
        content: 'We could not generate a custom lesson right now. Please use the linked resource for this task and come back to try again later.',
        diagram: { type: 'none', nodes: [], connections: [] },
        image: {
          query: `${concept} fundamentals`,
          alt: `Core concept for ${concept}`,
          caption: `Core concept`,
          url: buildReliableImageUrl(`${concept} fundamentals`),
        },
        keyTakeaway: 'Check the resource link for detailed learning material.',
      },
    ],
    quiz: null,
    fallback: true,
  }
}
