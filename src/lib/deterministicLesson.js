function cleanText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function sanitizeUrl(url) {
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) return null
    return parsed.toString()
  } catch {
    return null
  }
}

function buildReliableImageUrl(query = '') {
  const seed = encodeURIComponent(String(query || 'education').toLowerCase())
  return `https://picsum.photos/seed/${seed}/1200/700`
}

function buildLessonResourceMeta(resourceUrl, resourceTitle) {
  const url = sanitizeUrl(resourceUrl)
  if (!url) return null
  return {
    url,
    title: cleanText(resourceTitle) || 'Primary resource',
  }
}

function titleCase(value = '') {
  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function isProgrammingTopic(concept = '', goal = '') {
  const text = `${concept} ${goal}`.toLowerCase()
  return /python|javascript|typescript|java\b|c\+\+|c#|rust\b|golang|ruby|swift|kotlin|sql|html|css|react|angular|vue|node|django|flask|express|api|rest|graphql|function|variable|loop|array|object|class|method|algorithm|data structure|programming|coding|code|syntax|terminal|bash|shell|git|database|query|recursion/.test(text)
}

function buildDeterministicFallbackQuiz({ concept, taskAction, taskOutcome, goal }) {
  const safeConcept = cleanText(concept)
  const safeAction = cleanText(taskAction)
  const safeOutcome = cleanText(taskOutcome)
  const safeGoal = cleanText(goal)

  if (!safeConcept || !safeAction || !safeOutcome) return null

  return {
    question: `What is the strongest sign that you understand ${safeConcept} in this lesson?`,
    options: [
      safeOutcome,
      `You can repeat the phrase "${safeConcept}" without applying it`,
      `You skip the task and move straight to the next part of ${safeGoal || 'your path'}`,
      'You collect vocabulary but never turn it into an example or explanation',
    ],
    correctIndex: 0,
    explanation: `The goal of this lesson is not passive exposure. The clearest sign of progress is: ${safeOutcome}.`,
  }
}

function buildProgrammingCodeBlocks(concept, goal) {
  const safeConcept = titleCase(concept)
  const safeGoal = titleCase(goal)

  return {
    concept: [{
      language: 'javascript',
      code: [
        `const focus = "${safeConcept}";`,
        `const goal = "${safeGoal}";`,
        '',
        'function explain(topic, target) {',
        '  return `${topic} helps you make progress toward ${target}.`;',
        '}',
        '',
        'console.log(explain(focus, goal));',
        '// Output: Introduction To UI/UX Design helps you make progress toward UI/UX Design.',
      ].join('\n'),
      caption: 'A tiny example that turns the concept into a concrete explanation.',
    }],
    example: [{
      language: 'javascript',
      code: [
        'const notes = [',
        '  "What problem does this concept solve?",',
        '  "Where would I use it in a real project?",',
        '  "What is one mistake to avoid?",',
        '];',
        '',
        'notes.forEach((note, index) => {',
        '  console.log(`${index + 1}. ${note}`);',
        '});',
        '// Output: a short checklist for studying the lesson.',
      ].join('\n'),
      caption: 'One way to turn the lesson into a repeatable study checklist.',
    }],
    practice: [{
      language: 'javascript',
      code: [
        'const draftTakeaway = "";',
        '',
        'if (!draftTakeaway.trim()) {',
        '  console.log("Write one sentence in your own words before moving on.");',
        '}',
        '// Output: Write one sentence in your own words before moving on.',
      ].join('\n'),
      caption: 'The practice step should end with a written takeaway, not just more reading.',
    }],
  }
}

function normalizeChallengeDifficulty(value = null) {
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase()
    if (['beginner', 'intermediate', 'advanced'].includes(lowered)) return lowered
  }

  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 'intermediate'
  if (numeric <= 2) return 'beginner'
  if (numeric >= 4) return 'advanced'
  return 'intermediate'
}

function getChallengeTimeLimit(difficulty) {
  if (difficulty === 'beginner') return 480
  if (difficulty === 'advanced') return 780
  return 600
}

export function buildDeterministicChallenge({
  concept,
  taskTitle,
  goal,
  knowledge,
  taskDescription,
  taskAction,
  taskOutcome,
  resourceUrl,
  resourceTitle,
  difficulty = null,
  fallbackReason = 'deterministic',
} = {}) {
  const safeConcept = cleanText(concept) || cleanText(taskTitle) || 'this concept'
  const safeTaskTitle = cleanText(taskTitle) || `${titleCase(safeConcept)} Challenge`
  const safeGoal = cleanText(goal) || `make progress in ${safeConcept}`
  const safeKnowledge = cleanText(knowledge)
  const safeDescription = cleanText(taskDescription)
  const safeAction = cleanText(taskAction) || `Apply ${safeConcept} in one concrete situation.`
  const safeOutcome = cleanText(taskOutcome) || `Produce one finished result that shows you can use ${safeConcept} with intent.`
  const normalizedDifficulty = normalizeChallengeDifficulty(difficulty)
  const timeLimit = getChallengeTimeLimit(normalizedDifficulty)
  const resource = buildLessonResourceMeta(resourceUrl, resourceTitle)
  const resourceLine = resource ? `Reference you can use if needed: ${resource.title} (${resource.url})` : ''
  const contextLine = safeKnowledge
    ? `You already know: ${safeKnowledge}. Start from there and push one step further.`
    : 'Assume beginner-to-intermediate context and keep the task practical instead of abstract.'

  return {
    title: titleCase(safeTaskTitle.replace(/: key ideas$/i, '')),
    prompt: [
      `You are working toward ${safeGoal}.`,
      `Challenge focus: ${safeConcept}.`,
      safeDescription ? `Context: ${safeDescription}` : contextLine,
      '',
      'Your mission:',
      `1. Read the task carefully and decide what a strong answer for ${safeConcept} would look like.`,
      `2. Complete this action: ${safeAction}`,
      `3. Make sure your result clearly shows this outcome: ${safeOutcome}`,
      '4. Before finishing, explain one decision you made and one mistake you intentionally avoided.',
      '',
      'Expected output:',
      '- A concrete answer, artifact, outline, or worked response',
      '- One short explanation of why your approach works',
      '- One sentence on how you would improve it if you had 10 more minutes',
      resourceLine,
    ].filter(Boolean).join('\n'),
    timeLimit,
    difficulty: normalizedDifficulty,
    hints: [
      `Start by defining what success looks like for ${safeConcept} before you try to produce anything.`,
      'Break the challenge into two parts: first create the core result, then add the explanation that proves why it works.',
      `Use this checkpoint: if your answer does not clearly demonstrate "${safeOutcome}", tighten it until it does.`,
    ],
    solution: [
      `A strong solution to this challenge should produce a concrete result tied directly to ${safeConcept}, not just a summary.`,
      `One reliable approach is to first restate the goal in your own words, then complete the core action: ${safeAction}`,
      `From there, polish the result until it clearly satisfies the target outcome: ${safeOutcome}`,
      '',
      `Why this works: it forces you to use ${safeConcept} as a decision-making tool, which is what real understanding looks like.`,
      'Common mistake: staying too vague, copying language from the resource, or skipping the explanation of why your answer works.',
      `Bonus thought: once you can complete this once, vary the context or add one extra constraint so ${safeConcept} becomes flexible instead of fragile.`,
    ].join('\n\n'),
    generationMode: 'deterministic',
    fallbackReason,
  }
}

export function buildDeterministicLesson({
  concept,
  taskTitle,
  goal,
  knowledge,
  taskDescription,
  taskAction,
  taskOutcome,
  resourceUrl,
  resourceTitle,
  fallbackReason = 'deterministic',
} = {}) {
  const safeConcept = cleanText(concept) || cleanText(taskTitle) || 'this topic'
  const safeTaskTitle = cleanText(taskTitle) || `Concept: ${safeConcept}`
  const safeGoal = cleanText(goal) || `build skill in ${safeConcept}`
  const safeKnowledge = cleanText(knowledge)
  const safeDescription = cleanText(taskDescription)
  const safeAction = cleanText(taskAction) || `Study the core idea behind ${safeConcept} and write down one useful application.`
  const safeOutcome = cleanText(taskOutcome) || `Explain ${safeConcept} in your own words and connect it back to ${safeGoal}.`
  const resource = buildLessonResourceMeta(resourceUrl, resourceTitle)
  const isProgramming = isProgrammingTopic(safeConcept, safeGoal)
  const codeBlocks = isProgramming ? buildProgrammingCodeBlocks(safeConcept, safeGoal) : { concept: [], example: [], practice: [] }

  const overviewBullets = [
    `Define ${safeConcept} in clear, simple language`,
    `See where ${safeConcept} fits inside ${safeGoal}`,
    'Walk through one concrete example',
    'Turn the idea into one short action you can complete now',
    'Leave the lesson with one takeaway worth remembering',
  ].map((item) => `• ${item}`).join('\n')

  const knowledgeLine = safeKnowledge
    ? `You already know: ${safeKnowledge}. Use that as the bridge into the new idea.`
    : `Start from first principles and keep the explanation concrete instead of abstract.`

  const resourceLine = resource
    ? `Use ${resource.title} as your main reference while you work through the example and practice step.`
    : 'Use the lesson itself as your reference and pause after each section to restate the idea in your own words.'

  const slides = [
    {
      id: 1,
      title: safeTaskTitle,
      type: 'intro',
      content: [
        `This lesson is about ${safeConcept} inside your larger goal to ${safeGoal}.`,
        knowledgeLine,
        overviewBullets,
      ].join('\n\n'),
      diagram: {
        type: 'steps',
        nodes: [
          { label: `Goal: ${safeGoal}`, color: 'teal', level: 0 },
          { label: `Focus: ${safeConcept}`, color: 'blue', level: 1 },
          { label: 'Apply one concrete takeaway', color: 'amber', level: 2 },
          { label: 'Move forward with confidence', color: 'gray', level: 3 },
        ],
        connections: [
          { from: 0, to: 1, label: 'focus' },
          { from: 1, to: 2, label: 'practice' },
          { from: 2, to: 3, label: 'advance' },
        ],
      },
      codeBlocks: [],
      image: {
        query: `${safeConcept} learning overview`,
        alt: `Overview for ${safeConcept}`,
        caption: resource ? `Primary resource: ${resource.title}` : '',
        url: buildReliableImageUrl(`${safeConcept} learning overview`),
      },
      keyTakeaway: `${safeConcept} becomes useful once you can explain it simply and use it once on purpose.`,
    },
    {
      id: 2,
      title: `Core idea: ${safeConcept}`,
      type: 'concept',
      content: [
        safeDescription || `${safeConcept} is a working idea inside ${safeGoal}. The goal is to understand what it does, where it shows up, and how it changes the decisions you make.`,
        `As you study, keep asking: what job does ${safeConcept} do, what problem does it solve, and how would I notice it in a real workflow?`,
      ].join('\n\n'),
      diagram: {
        type: 'comparison',
        nodes: [
          { label: `${safeConcept}\nwhat it is`, color: 'teal', level: 0 },
          { label: 'When it shows up', color: 'blue', level: 1 },
          { label: 'Common confusion', color: 'red', level: 2 },
          { label: 'What to remember', color: 'amber', level: 3 },
        ],
      },
      codeBlocks: codeBlocks.concept,
      image: {
        query: `${safeConcept} concept explanation`,
        alt: `Concept explanation for ${safeConcept}`,
        caption: '',
        url: buildReliableImageUrl(`${safeConcept} concept explanation`),
      },
      keyTakeaway: `If you can say what ${safeConcept} does and when it matters, the lesson is already landing.`,
    },
    {
      id: 3,
      title: `How ${safeConcept} fits together`,
      type: 'diagram',
      content: [
        `${safeConcept} is easiest to remember when you see how it connects to the rest of the goal.`,
        `Use the flow below to connect the concept, the context where it matters, and the output you are expected to produce.`,
      ].join('\n\n'),
      diagram: {
        type: 'steps',
        nodes: [
          { label: `Start with ${safeConcept}`, color: 'teal', level: 0 },
          { label: 'Notice where it appears', color: 'blue', level: 1 },
          { label: 'Use it in one decision', color: 'amber', level: 2 },
          { label: `Produce ${safeOutcome}`, color: 'red', level: 3 },
        ],
        connections: [
          { from: 0, to: 1, label: 'observe' },
          { from: 1, to: 2, label: 'apply' },
          { from: 2, to: 3, label: 'deliver' },
        ],
      },
      codeBlocks: [],
      image: {
        query: `${safeConcept} visual breakdown`,
        alt: `Visual breakdown of ${safeConcept}`,
        caption: '',
        url: buildReliableImageUrl(`${safeConcept} visual breakdown`),
      },
      keyTakeaway: `A concept sticks faster when you connect it to a real output instead of keeping it abstract.`,
    },
    {
      id: 4,
      title: `Worked example`,
      type: 'example',
      content: [
        `Imagine you are making progress on ${safeGoal}. ${safeConcept} matters because it changes what you pay attention to and what you produce next.`,
        `A good example is this lesson's target outcome: ${safeOutcome}. That gives the concept a job, not just a definition.`,
        resourceLine,
      ].join('\n\n'),
      diagram: {
        type: 'flow',
        nodes: [
          { label: safeConcept, color: 'teal', level: 0 },
          { label: 'Use it in context', color: 'blue', level: 1 },
          { label: safeOutcome, color: 'amber', level: 2 },
        ],
        connections: [
          { from: 0, to: 1, label: 'guides' },
          { from: 1, to: 2, label: 'creates' },
        ],
      },
      codeBlocks: codeBlocks.example,
      image: {
        query: `${safeConcept} worked example`,
        alt: `Worked example for ${safeConcept}`,
        caption: '',
        url: buildReliableImageUrl(`${safeConcept} worked example`),
      },
      keyTakeaway: `Examples make the concept real because they force you to see what changes in practice.`,
    },
    {
      id: 5,
      title: `Try it yourself`,
      type: 'practice',
      content: [
        `Use this action as your starting point: ${safeAction}`,
        'Then follow this sequence:',
        '• Write 2 or 3 short notes in your own words',
        '• Turn one note into a concrete decision or example',
        `• Finish by producing: ${safeOutcome}`,
        '• Before moving on, check whether your explanation would make sense to a beginner',
      ].join('\n'),
      diagram: {
        type: 'steps',
        nodes: [
          { label: 'Study the idea', color: 'teal', level: 0 },
          { label: 'Write your notes', color: 'blue', level: 1 },
          { label: 'Apply one example', color: 'amber', level: 2 },
          { label: 'Check your takeaway', color: 'gray', level: 3 },
        ],
        connections: [
          { from: 0, to: 1, label: 'capture' },
          { from: 1, to: 2, label: 'turn into' },
          { from: 2, to: 3, label: 'review' },
        ],
      },
      codeBlocks: codeBlocks.practice,
      image: {
        query: `${safeConcept} practice task`,
        alt: `Practice task for ${safeConcept}`,
        caption: resource ? `Use ${resource.title} while you work` : '',
        url: buildReliableImageUrl(`${safeConcept} practice task`),
      },
      keyTakeaway: `The lesson is complete when you can produce one small proof of understanding, not when you have merely read enough.`,
    },
    {
      id: 6,
      title: 'Summary',
      type: 'summary',
      content: [
        `You just built a first working understanding of ${safeConcept}.`,
        [
          `• ${safeConcept} matters because it supports progress toward ${safeGoal}`,
          `• Strong understanding shows up in the outcome: ${safeOutcome}`,
          '• The fastest way to lock this in is to explain it once in your own words',
          '• Move on when you can name the idea, give one example, and point to one takeaway',
        ].join('\n'),
      ].join('\n\n'),
      diagram: {
        type: 'none',
        nodes: [],
        connections: [],
      },
      codeBlocks: [],
      image: {
        query: `${safeConcept} summary`,
        alt: `Summary of ${safeConcept}`,
        caption: '',
        url: buildReliableImageUrl(`${safeConcept} summary`),
      },
      keyTakeaway: `Keep one sentence, one example, and one action from this lesson, and the concept will stay useful.`,
    },
  ]

  return {
    slides,
    quiz: buildDeterministicFallbackQuiz({
      concept: safeConcept,
      taskAction: safeAction,
      taskOutcome: safeOutcome,
      goal: safeGoal,
    }),
    fallback: false,
    generationMode: 'deterministic',
    cacheable: true,
    resource,
    fallbackReason,
  }
}
