function cleanText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function titleCase(value = '') {
  return cleanText(value)
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function escapeRegExp(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const META_LESSON_REWRITES = [
  { pattern: /\bconcepts are tools\b/gi, replacement: 'specific ideas only matter when you use them' },
  { pattern: /\bexamples prove the idea works\b/gi, replacement: 'examples show how the idea works in practice' },
  { pattern: /\bmistakes show the boundary\b/gi, replacement: 'mistakes reveal where the rule stops working' },
  { pattern: /\bpractice turns memory into skill\b/gi, replacement: 'repeated use makes the skill easier to apply' },
  { pattern: /\bsupports progress toward (?:your|the) goal\b/gi, replacement: 'matters in real tasks' },
  { pattern: /\bin plain language\b/gi, replacement: 'clearly' },
  { pattern: /\bthis is your foundation\b/gi, replacement: 'this is the core idea' },
  { pattern: /\bbuilding blocks\b/gi, replacement: 'core parts' },
  { pattern: /\bhelps you on your journey\b/gi, replacement: 'helps in practice' },
]

const BANNED_TAUGHT_POINT_PATTERNS = [
  'in plain language',
  'supports progress',
  'concrete example of',
  'clear sign that',
  'starting to stick',
  'helps you',
  'building block',
  'foundation for',
]

function stripMetaLessonLanguage(value = '') {
  return META_LESSON_REWRITES.reduce(
    (text, rule) => text.replace(rule.pattern, rule.replacement),
    String(value || ''),
  )
}

function sentenceLimit(value = '', max = 2) {
  if (!max) return cleanText(value)
  const sentences = cleanText(value)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
  return sentences.slice(0, max).join(' ')
}

function humanizeGoalSubject(goal = '') {
  const text = cleanText(goal)
    .replace(/^i\s+want\s+to\s+learn\s+(?:how\s+to\s+)?/i, '')
    .replace(/^(learn|master|understand|build|study)\s+/i, '')
    .replace(/\s+from\s+(?:complete\s+)?scratch$/i, '')
    .trim()
  const lower = text.toLowerCase()
  if (/\bgit\b/.test(lower)) return 'Git workflow'
  if (/\bios\b|swift|xcode|swiftui/.test(lower)) return 'iOS apps'
  if (/python/.test(lower)) return 'Python'
  if (/javascript/.test(lower)) return 'JavaScript'
  if (/react/.test(lower)) return 'React'
  if (/sql/.test(lower)) return 'SQL'
  if (/machine learning|\bml\b/.test(lower)) return 'machine learning'
  const words = titleCase(text).split(' ').filter(Boolean)
  return words.slice(0, 4).join(' ') || 'this skill'
}

export function getLessonDisplayFocus({ concept, taskTitle, goal } = {}) {
  const raw = cleanText(taskTitle || concept || 'Today\'s concept')
  const subject = humanizeGoalSubject(goal)
  let focus = raw
    .replace(/:?\s*key\s+ideas?$/i, '')
    .replace(/^introduction\s+to\s+/i, '')
    .replace(/^intro\s+to\s+/i, '')
    .replace(/^learn\s+/i, '')
    .replace(/\s+for\s+real\s+development\s+workflows/i, '')
    .trim()

  focus = focus
    .replace(/\bfoundations?\b/gi, '')
    .replace(/\bbasics?\b/gi, '')
    .replace(/\boverview\b/gi, '')
    .trim()

  const lower = focus.toLowerCase()
  if (/^introduction$|^intro$/.test(lower)) {
    return subject
  }

  const subjectNeedle = subject.toLowerCase().replace(/\s+workflow$/, '')
  if (subjectNeedle && lower.includes(subjectNeedle) && focus.split(/\s+/).length > 6) {
    return subject
  }

  focus = titleCase(focus)
  const words = focus.split(' ').filter(Boolean)
  return words.length > 7 ? words.slice(0, 7).join(' ') : (focus || subject)
}

function stripInternalContext(value = '') {
  return cleanText(value)
    .replace(/You already have a starting point:\s*.*?(?:Today|Now)\s+/i, '')
    .replace(/\bRecommended level:\s*[^.]+\.?/gi, '')
    .replace(/\bDiagnostic score:\s*[^.]+\.?/gi, '')
    .replace(/\bPreferred pace:\s*[^.]+\.?/gi, '')
    .replace(/\bPace:\s*[^.]+\.?/gi, '')
    .replace(/\bPath style:\s*[^.]+\.?/gi, '')
    .replace(new RegExp('\\bLocal\\s+' + 'fall' + 'back\\s+mode\\.?', 'gi'), '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function sanitizeLessonCopy(value = '', context = {}, maxSentences = 0) {
  const displayFocus = getLessonDisplayFocus(context)
  const goalSubject = humanizeGoalSubject(context?.goal)
  const rawFocus = cleanText(context?.taskTitle || context?.concept || '')
  const rawConcept = cleanText(context?.concept || '')
  const rawGoal = cleanText(context?.goal || '')
  let text = stripMetaLessonLanguage(stripInternalContext(value))

  ;[rawFocus, titleCase(rawFocus), rawConcept, titleCase(rawConcept)].filter(Boolean).forEach((needle) => {
    if (needle.length < 8) return
    text = text.replace(new RegExp(escapeRegExp(needle), 'gi'), displayFocus)
  })
  ;[rawGoal, titleCase(rawGoal)].filter(Boolean).forEach((needle) => {
    if (needle.length < 8) return
    text = text.replace(new RegExp(escapeRegExp(needle), 'gi'), goalSubject)
  })

  text = text
    .replace(/\bIntroduction\s+To\s+/gi, '')
    .replace(/\bkey ideas\b/gi, 'key moves')
    .replace(/\s+inside\s+inside\s+/gi, ' inside ')
    .replace(/\s{2,}/g, ' ')
    .trim()

  return maxSentences ? sentenceLimit(text, maxSentences) : text
}

function sanitizeLessonList(values = [], context = {}, limit = 4) {
  return dedupeStrings(values.map((value) => sanitizeLessonCopy(value, context, 1))).slice(0, limit)
}

function buildTaughtPointFallbacks(conceptName = 'this concept') {
  const concept = cleanText(conceptName || 'this concept')
  return [
    `Define ${concept} and state when to use it`,
    `Use ${concept} in one concrete example`,
    `Identify the result ${concept} should produce when used correctly`,
    `Spot one common mistake with ${concept}`,
    `Compare a correct and incorrect use of ${concept}`,
  ]
}

export function validateTaughtPoints(points = [], conceptName = '') {
  const fallbacks = buildTaughtPointFallbacks(conceptName)
  const cleaned = (Array.isArray(points) ? points : [points])
    .map((point) => cleanText(point))
    .filter(Boolean)
    .map((point, index) => {
      const lower = point.toLowerCase()
      const isBanned = BANNED_TAUGHT_POINT_PATTERNS.some((pattern) => lower.includes(pattern))
      return isBanned ? (fallbacks[index] || `Apply ${conceptName || 'this concept'} in a practical scenario`) : point
    })

  return dedupeStrings([...cleaned, ...fallbacks]).slice(0, 5)
}

function dedupeStrings(values = []) {
  const seen = new Set()
  return (Array.isArray(values) ? values : [])
    .map((value) => cleanText(value))
    .filter(Boolean)
    .filter((value) => {
      const normalized = value.toLowerCase()
      if (seen.has(normalized)) return false
      seen.add(normalized)
      return true
    })
}

function toSentence(value, base = '') {
  const cleaned = cleanText(value || base)
  if (!cleaned) return ''
  return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`
}

function splitList(value, base = []) {
  if (Array.isArray(value)) return dedupeStrings(value)
  const cleaned = cleanText(value)
  if (!cleaned) return dedupeStrings(base)
  return dedupeStrings(
    cleaned
      .split(/\n|•|,|;/)
      .map((part) => cleanText(part))
      .filter(Boolean),
  )
}

function buildVocabulary(dayFocus, relatedConcepts = []) {
  return dedupeStrings([dayFocus, ...relatedConcepts]).slice(0, 6)
}

function normalizeChoice(value = '', base = '') {
  return cleanText(value || base).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

export function parseLearnerProfileFromKnowledge(knowledge = '') {
  if (!knowledge) return {}
  const text = Array.isArray(knowledge) ? knowledge.join('. ') : String(knowledge)
  const marker = text.match(/Learner profile JSON:\s*(\{.*?\})(?:\.|$)/i)
  if (marker?.[1]) {
    try {
      return JSON.parse(marker[1])
    } catch {
      // Fall through to lightweight inference.
    }
  }

  const level = /advanced/i.test(text)
    ? 'advanced'
    : /intermediate|some exposure|basic/i.test(text)
      ? 'intermediate'
      : 'beginner'
  const pace = /intensive/i.test(text) ? 'intensive' : /relaxed|slow/i.test(text) ? 'relaxed' : 'balanced'
  const visualPreference = /visual|diagram|picture/i.test(text) ? 'visual' : 'balanced'

  return { level, pace, visualPreference }
}

export function normalizeLearnerProfile(profile = {}, context = {}) {
  const parsed = parseLearnerProfileFromKnowledge(context?.knowledge)
  const source = {
    ...parsed,
    ...(profile && typeof profile === 'object' ? profile : {}),
  }
  const level = normalizeChoice(
    source.level || source.experienceLevel || source.recommendedLevel,
    'beginner',
  )
  const pace = normalizeChoice(source.pace || source.preferredPace, 'balanced')
  const learningStyle = normalizeChoice(source.learningStyle || source.visualPreference, 'visual')
  const desiredOutcome = cleanText(source.desiredOutcome || source.outcome || 'Build usable skill')
  const prereqComfort = normalizeChoice(source.prereqComfort || source.comfortWithPrereqs, 'compress')
  const repetition = normalizeChoice(source.repetition || (pace === 'relaxed' ? 'more' : 'normal'), 'normal')
  const pathStyle = normalizeChoice(source.pathStyle || context?.pathStyle, 'goal')

  const normalizedLevel = ['advanced', 'expert', 'experienced'].includes(level)
    ? 'advanced'
    : ['intermediate', 'some', 'familiar'].includes(level)
      ? 'intermediate'
      : 'beginner'

  return {
    level: normalizedLevel,
    pace: ['relaxed', 'balanced', 'intensive'].includes(pace) ? pace : 'balanced',
    learningStyle: learningStyle || 'visual',
    visualPreference: learningStyle === 'text' ? 'balanced' : 'visual',
    desiredOutcome,
    prereqComfort,
    repetition,
    pathStyle,
  }
}

export function deriveDepthPolicy(profile = {}, depthOverride = null) {
  const learner = normalizeLearnerProfile(profile)
  const override = normalizeChoice(depthOverride)
  if (override === 'simpler') {
    return {
      level: 'foundational',
      explanationSentences: 8,
      paragraphLimit: 3,
      recapCount: 1,
      exampleDifficulty: 'small concrete example',
      transferPrompt: 'guided',
      repetitionAllowance: 'brief recap allowed',
    }
  }
  if (override === 'deeper') {
    return {
      level: 'advanced',
      explanationSentences: 8,
      paragraphLimit: 3,
      recapCount: 0,
      exampleDifficulty: 'realistic transfer example',
      transferPrompt: 'harder what-if prompt',
      repetitionAllowance: 'no recap unless essential',
    }
  }
  if (learner.level === 'advanced' || learner.pace === 'intensive') {
    return {
      level: 'advanced',
      explanationSentences: 7,
      paragraphLimit: 3,
      recapCount: 0,
      exampleDifficulty: 'realistic transfer example',
      transferPrompt: 'harder what-if prompt',
      repetitionAllowance: 'avoid reminders',
    }
  }
  if (learner.level === 'beginner' || learner.pace === 'relaxed') {
    return {
      level: 'foundational',
      explanationSentences: learner.pace === 'relaxed' ? 9 : 8,
      paragraphLimit: 3,
      recapCount: learner.pace === 'relaxed' ? 2 : 1,
      exampleDifficulty: 'tiny beginner-safe example',
      transferPrompt: 'guided',
      repetitionAllowance: learner.pace === 'relaxed' ? 'one short recap per section' : 'brief recap allowed',
    }
  }
  return {
    level: 'standard',
    explanationSentences: 7,
    paragraphLimit: 3,
    recapCount: 0,
    exampleDifficulty: 'practical example',
    transferPrompt: 'applied',
    repetitionAllowance: 'minimal repetition',
  }
}

function normalizeVisualNodes(nodes = [], accent = '#0ef5c2') {
  return (Array.isArray(nodes) ? nodes : [])
    .slice(0, 8)
    .map((node, index) => ({
      id: cleanText(node?.id) || `node-${index + 1}`,
      label: sanitizeLessonCopy(node?.label || node?.title || `Step ${index + 1}`, {}, 1).slice(0, 72),
      color: /^#[0-9a-f]{6}$/i.test(node?.color || '') ? node.color : accent,
      edgeLabel: cleanText(node?.edgeLabel || ''),
    }))
    .filter((node) => node.label)
}

function normalizeVisualConnections(connections = []) {
  return (Array.isArray(connections) ? connections : [])
    .slice(0, 10)
    .map((connection, index) => ({
      id: cleanText(connection?.id) || `edge-${index + 1}`,
      from: connection?.from,
      to: connection?.to,
      label: cleanText(connection?.label || '').slice(0, 24),
    }))
    .filter((connection) => connection.from !== undefined && connection.to !== undefined)
}

function buildDefaultVisuals({ title, taughtPoints = [], keyTakeaways = [], commonMistake = null }, accent = '#0ef5c2') {
  const main = shortVisualLabel(title || 'Today')
  const first = shortVisualLabel(taughtPoints[0] || keyTakeaways[0] || 'Name the idea')
  const second = shortVisualLabel(taughtPoints[1] || keyTakeaways[1] || 'Use an example')
  const third = shortVisualLabel(taughtPoints[2] || keyTakeaways[2] || 'Avoid the trap')
  return {
    hook: {
      type: 'hierarchy',
      title: "Today's map",
      nodes: [
        { id: 'focus', label: main, color: accent },
        { id: 'model', label: 'Mental model', color: '#00d4ff' },
        { id: 'example', label: 'Example', color: '#a78bfa' },
        { id: 'practice', label: 'Practice', color: '#fbbf24' },
      ],
    },
    explanation: {
      type: 'flowchart',
      title: 'Core picture',
      nodes: [
        { id: 'notice', label: first, color: accent, edgeLabel: 'then' },
        { id: 'decide', label: second, color: '#00d4ff', edgeLabel: 'so' },
        { id: 'use', label: third, color: '#a78bfa' },
      ],
    },
    whyItMatters: {
      type: 'comparison',
      title: 'Before / after',
      nodes: [
        { id: 'before', label: 'Guessing', color: '#fbbf24' },
        { id: 'after', label: 'Clear move', color: accent },
        { id: 'foggy', label: 'Vague progress', color: '#ff8c42' },
        { id: 'usable', label: 'Usable skill', color: '#34d399' },
      ],
    },
    workedExample: {
      type: 'steps',
      title: 'Example path',
      nodes: [
        { id: 'step-1', label: 'Notice', color: accent },
        { id: 'step-2', label: 'Choose', color: '#00d4ff' },
        { id: 'step-3', label: 'Check', color: '#a78bfa' },
      ],
    },
    commonMistake: {
      type: 'comparison',
      title: 'Mistake / fix',
      nodes: [
        { id: 'trap', label: shortVisualLabel(commonMistake?.mistake || 'Common trap'), color: '#ff8c42' },
        { id: 'fix', label: shortVisualLabel(commonMistake?.fix || 'Better move'), color: accent },
      ],
    },
    takeaways: {
      type: 'hierarchy',
      title: 'Carry forward',
      nodes: [
        { id: 'core', label: main, color: accent },
        ...keyTakeaways.slice(0, 3).map((item, index) => ({
          id: `takeaway-${index + 1}`,
          label: shortVisualLabel(item),
          color: ['#0ef5c2', '#00d4ff', '#a78bfa'][index] || accent,
        })),
      ],
    },
  }
}

function shortVisualLabel(value = '', base = 'Key idea') {
  const cleaned = cleanText(value || base)
  const words = cleaned.split(/\s+/).filter(Boolean)
  return words.length > 6 ? `${words.slice(0, 6).join(' ')}...` : cleaned
}

function normalizeVisuals(visuals = {}, baseVisuals = {}) {
  const allowedTypes = new Set(['flowchart', 'hierarchy', 'comparison', 'steps', 'cycle'])
  const sections = ['hook', 'explanation', 'whyItMatters', 'workedExample', 'commonMistake', 'takeaways']
  return sections.reduce((acc, section) => {
    const source = visuals?.[section] && typeof visuals[section] === 'object'
      ? visuals[section]
      : baseVisuals[section]
    if (!source) return acc
    const type = allowedTypes.has(source.type) ? source.type : baseVisuals[section]?.type || 'flowchart'
    const sourceNodes = Array.isArray(source.nodes) && source.nodes.length >= 2
      ? source.nodes
      : baseVisuals[section]?.nodes || []
    const sourceConnections = Array.isArray(source.connections) && source.connections.length > 0
      ? source.connections
      : baseVisuals[section]?.connections || []
    const nodes = normalizeVisualNodes(sourceNodes, undefined, section)
    acc[section] = {
      type,
      title: cleanText(source.title || baseVisuals[section]?.title || ''),
      nodes,
      connections: normalizeVisualConnections(sourceConnections),
    }
    return acc
  }, {})
}

export function normalizeLearningContract(contract = {}, context = {}) {
  const dayFocus = cleanText(contract?.dayFocus || context?.dayFocus || context?.concept || context?.taskTitle || 'Today\'s concept')
  const relatedConcepts = dedupeStrings(contract?.allowedConcepts || context?.allConcepts || [dayFocus])
  const learnerProfile = normalizeLearnerProfile(contract?.learnerProfile || context?.learnerProfile, context)
  const depthPolicy = contract?.depthPolicy && typeof contract.depthPolicy === 'object'
    ? { ...deriveDepthPolicy(learnerProfile), ...contract.depthPolicy }
    : deriveDepthPolicy(learnerProfile, context?.depthOverride)
  const taughtPoints = validateTaughtPoints(splitList(contract?.taughtPoints, [
    `Define ${dayFocus} clearly`,
    `Use ${dayFocus} in one realistic example`,
    `Recognize when ${dayFocus} applies`,
    `Avoid one common mistake with ${dayFocus}`,
  ]), dayFocus).slice(0, 6)

  const requiredVocabulary = splitList(contract?.requiredVocabulary, buildVocabulary(dayFocus, relatedConcepts)).slice(0, 6)
  const practiceTarget = toSentence(contract?.practiceTarget, context?.taskAction || `Apply ${dayFocus} in one focused task.`)
  const successCriteria = splitList(contract?.successCriteria, [
    `Explain ${dayFocus} without copying the source`,
    `Recognize one strong and one weak use of ${dayFocus}`,
    `Use ${dayFocus} in the next task with intent`,
  ]).slice(0, 5)
  const doNotIntroduceYet = splitList(contract?.doNotIntroduceYet, [
    'Advanced edge cases that were not explained today',
    'Unrelated tools, jargon, or framework details',
    'Optimizations before the core mental model is clear',
  ]).slice(0, 5)

  return {
    dayFocus,
    allowedConcepts: relatedConcepts.length > 0 ? relatedConcepts : [dayFocus],
    taughtPoints,
    requiredVocabulary,
    practiceTarget,
    successCriteria,
    doNotIntroduceYet,
    learnerProfile,
    depthPolicy,
    prerequisiteMode: contract?.prerequisiteMode || context?.prerequisiteMode || 'compressed',
    visualPreference: contract?.visualPreference || learnerProfile.visualPreference || 'visual',
  }
}

export function buildLearningContract({
  concept,
  taskTitle,
  goal,
  taskDescription,
  taskAction,
  taskOutcome,
  moduleTitle,
  allConcepts = [],
  learnerProfile = null,
  depthOverride = null,
  visualPreference = null,
} = {}) {
  const dayFocus = cleanText(taskTitle || concept || moduleTitle || 'Today\'s concept')
  const relatedConcepts = dedupeStrings([dayFocus, ...(Array.isArray(allConcepts) ? allConcepts : []), moduleTitle])
  const profile = normalizeLearnerProfile(learnerProfile, { goal })
  const depthPolicy = deriveDepthPolicy(profile, depthOverride)
  return normalizeLearningContract({
    dayFocus,
    allowedConcepts: relatedConcepts,
    taughtPoints: [
      `Define ${dayFocus} clearly`,
      taskDescription ? `${taskDescription}` : `Explain what ${dayFocus} does and when to use it`,
      taskAction ? `${taskAction}` : `Use ${dayFocus} in one concrete example`,
      taskOutcome ? `${taskOutcome}` : `Spot one mistake people make with ${dayFocus}`,
    ],
    requiredVocabulary: buildVocabulary(dayFocus, relatedConcepts.slice(1)),
    practiceTarget: taskAction || `Apply ${dayFocus} once in a realistic situation.`,
    successCriteria: [
      taskOutcome || `Explain ${dayFocus} clearly and use it once.`,
      `Stay inside the taught scope for ${dayFocus}`,
      `Leave the concept task ready for guided practice, not just more reading`,
    ],
    doNotIntroduceYet: [
      `Advanced topics outside ${dayFocus}`,
      'New abstractions that were not defined today',
      'Extra tools that are not needed for the next practice step',
    ],
    learnerProfile: profile,
    depthPolicy,
    prerequisiteMode: 'compressed',
    visualPreference: visualPreference || profile.visualPreference || 'visual',
  }, { concept: dayFocus, goal, learnerProfile: profile, depthOverride })
}

function normalizeWorkedExample(example, base) {
  if (typeof example === 'string') {
    return {
      ...base,
      setup: cleanText(example) || base.setup,
    }
  }
  const source = example && typeof example === 'object' ? example : {}
  return {
    title: cleanText(source.title) || base.title,
    setup: cleanText(source.setup) || base.setup,
    walkthrough: splitList(source.walkthrough, base.walkthrough).slice(0, 6),
    result: toSentence(source.result, base.result),
  }
}

function normalizeCommonMistake(mistake, base) {
  if (typeof mistake === 'string') {
    return {
      ...base,
      mistake: toSentence(mistake, base.mistake),
    }
  }
  const source = mistake && typeof mistake === 'object' ? mistake : {}
  return {
    mistake: toSentence(source.mistake, base.mistake),
    whyItHappens: toSentence(source.whyItHappens, base.whyItHappens),
    fix: toSentence(source.fix, base.fix),
  }
}

function normalizeCompletionCheck(check, base) {
  if (typeof check === 'string') {
    return {
      ...base,
      prompt: toSentence(check, base.prompt),
    }
  }
  const source = check && typeof check === 'object' ? check : {}
  return {
    prompt: toSentence(source.prompt, base.prompt),
    expectedSignals: splitList(source.expectedSignals, base.expectedSignals).slice(0, 5),
    nextStep: toSentence(source.nextStep, base.nextStep),
  }
}

function normalizeMentalModel(model, base, context) {
  if (typeof model === 'string') {
    return {
      ...base,
      model: toSentence(sanitizeLessonCopy(model, context, 2), base.model),
    }
  }
  const source = model && typeof model === 'object' ? model : {}
  return {
    model: toSentence(sanitizeLessonCopy(source.model, context, 2), base.model),
    howToUse: toSentence(sanitizeLessonCopy(source.howToUse, context, 2), base.howToUse),
    watchOut: toSentence(sanitizeLessonCopy(source.watchOut, context, 1), base.watchOut),
  }
}

function normalizeDeepDive(deepDive, base, context) {
  if (typeof deepDive === 'string') {
    return {
      ...base,
      answer: toSentence(sanitizeLessonCopy(deepDive, context, 4), base.answer),
    }
  }
  const source = deepDive && typeof deepDive === 'object' ? deepDive : {}
  return {
    question: toSentence(sanitizeLessonCopy(source.question, context, 1), base.question),
    answer: toSentence(sanitizeLessonCopy(source.answer, context, 4), base.answer),
    because: toSentence(sanitizeLessonCopy(source.because, context, 2), base.because),
  }
}

function normalizePracticeDrill(drill, base, context) {
  if (typeof drill === 'string') {
    return {
      ...base,
      prompt: toSentence(sanitizeLessonCopy(drill, context, 2), base.prompt),
    }
  }
  const source = drill && typeof drill === 'object' ? drill : {}
  return {
    prompt: toSentence(sanitizeLessonCopy(source.prompt, context, 2), base.prompt),
    steps: sanitizeLessonList(splitList(source.steps, base.steps), context, 5),
    modelAnswer: toSentence(sanitizeLessonCopy(source.modelAnswer, context, 3), base.modelAnswer),
    selfCheck: sanitizeLessonList(splitList(source.selfCheck, base.selfCheck), context, 5),
  }
}

function normalizeInteractions(interactions, context) {
  const concept = getLessonDisplayFocus(context)

  const defaults = [
    { afterSection: 'hook', type: 'ready_check' },
    {
      afterSection: 'explanation',
      type: 'true_false',
      statement: `${concept} should help you make one clearer decision in practice.`,
      correct: true,
      explanation: 'Correct - a useful concept should change what you notice or do next.',
    },
    { afterSection: 'workedExample', type: 'ready_check' },
    { afterSection: 'commonMistake', type: 'ready_check' },
  ]

  if (!Array.isArray(interactions) || interactions.length === 0) return defaults

  const normalized = interactions.slice(0, 4).map((item, i) => {
    if (!item || typeof item !== 'object') return defaults[i] || defaults[0]
    const type = item.type || 'ready_check'
    const base = { afterSection: item.afterSection || defaults[i]?.afterSection || 'hook', type }

    if (type === 'true_false') {
      return {
        ...base,
        statement: sanitizeLessonCopy(item.statement || item.question || '', context, 1),
        correct: item.correct === true || item.correct === 'true',
        explanation: sanitizeLessonCopy(item.explanation || '', context, 1),
      }
    }
    if (type === 'fill_blank') {
      return {
        ...base,
        sentence: sanitizeLessonCopy(item.sentence || item.question || '', context, 1),
        answer: cleanText(item.answer || ''),
        explanation: sanitizeLessonCopy(item.explanation || '', context, 1),
      }
    }
    if (type === 'predict' || type === 'spot_error') {
      const rawOptions = Array.isArray(item.options) ? item.options.map((o) => sanitizeLessonCopy(o, context, 1)).filter(Boolean) : []
      const fallbackOptions = type === 'spot_error'
        ? [
          `It treats ${concept} like a label instead of a decision tool.`,
          'It checks the example against the taught idea.',
          'It explains the reason before moving on.',
          'It stays inside today\'s scope.',
        ]
        : [
          `The result should show ${concept} being used in a specific choice.`,
          'The learner should ignore the example and memorize the title.',
          'The next step is unrelated to the worked example.',
          'The concept disappears once practice begins.',
        ]
      const options = rawOptions.length >= 2 ? rawOptions : fallbackOptions
      const rawCorrectIndex = typeof item.correctIndex === 'number' ? item.correctIndex : 0
      return {
        ...base,
        question: sanitizeLessonCopy(item.question || '', context, 1),
        code: String(item.code || '').trim(),
        options,
        correctIndex: Math.max(0, Math.min(options.length - 1, rawCorrectIndex)),
        explanation: sanitizeLessonCopy(item.explanation || '', context, 1),
      }
    }
    return base
  })

  while (normalized.length < 4) normalized.push(defaults[normalized.length] || defaults[0])
  return normalized
}

export function normalizeConceptLessonDoc(doc = {}, context = {}) {
  const displayFocus = getLessonDisplayFocus(context)
  const learnerProfile = normalizeLearnerProfile(
    context?.learnerProfile || context?.learningContract?.learnerProfile,
    context,
  )
  const depthPolicy = deriveDepthPolicy(learnerProfile, context?.depthOverride)
  const contract = normalizeLearningContract({
    allowedConcepts: doc?.allowedConcepts || context?.learningContract?.allowedConcepts || [displayFocus],
    taughtPoints: validateTaughtPoints(
      doc?.taughtPoints || context?.learningContract?.taughtPoints || [`Define ${displayFocus}`, `Use ${displayFocus} in one example`, `Avoid one common mistake with ${displayFocus}`],
      displayFocus,
    ),
    learnerProfile,
    depthPolicy,
    visualPreference: context?.visualPreference || learnerProfile.visualPreference,
  }, {
    concept: displayFocus,
    goal: context?.goal,
    learnerProfile,
    depthOverride: context?.depthOverride,
  })
  const explanationSentences = Math.max(5, Number(depthPolicy.explanationSentences) || 7)
  const baseDoc = {
    title: titleCase(displayFocus),
    learningObjectives: [
      `Define ${displayFocus}`,
      `Use ${displayFocus} in one realistic example`,
      `Avoid one common mistake with ${displayFocus}`,
    ],
    hook: `Let's look at ${displayFocus} in a situation where it actually matters.`,
    mentalModel: {
      model: `${displayFocus} is the specific rule, structure, or move you use when this kind of problem appears.`,
      howToUse: `Use it when the task clearly calls for ${displayFocus}, not when a simpler idea would do.`,
      watchOut: `Do not treat ${displayFocus} like a label. It should change a concrete choice or result.`,
    },
    plainEnglishExplanation: `[Lesson generation incomplete — regenerate to load the concrete explanation for ${displayFocus}.]`,
    deepDive: {
      question: `What is the non-obvious part of ${displayFocus}?`,
      answer: `[Lesson generation incomplete — regenerate to load the deeper explanation for ${displayFocus}.]`,
      because: `${displayFocus} matters when you understand why it works, not just what it is called.`,
    },
    whyItMatters: `${displayFocus} matters because real tasks break when this part is misunderstood.`,
    workedExample: {
      title: 'Worked example',
      setup: `Here is a scenario where ${displayFocus} shows up in practice.`,
      walkthrough: [
        `Identify where ${displayFocus} appears`,
        `Apply ${displayFocus} step by step`,
        'Check the result against the expected behavior',
        'Notice the mistake that would break the result',
      ],
      result: `You should end with a visible example of ${displayFocus} in action.`,
    },
    practiceDrill: {
      prompt: `Use ${displayFocus} in one short concrete task.`,
      steps: [
        `State what ${displayFocus} does`,
        'Apply it in a small example',
        'Check the result',
      ],
      modelAnswer: `A strong answer shows exactly how ${displayFocus} changes the result.`,
      selfCheck: [
        `Did you use ${displayFocus} directly?`,
        'Did you show the result clearly?',
        'Did you avoid the common mistake?',
      ],
    },
    commonMistake: {
      mistake: `Using ${displayFocus} in the wrong situation or with the wrong rule.`,
      whyItHappens: 'Beginners often recognize the name before they recognize the conditions for using it.',
      fix: `Check the exact rule for when ${displayFocus} applies, then test it on one small example.`,
    },
    keyTakeaways: [
      `${displayFocus} has a specific job in real tasks`,
      `A worked example should show exactly where ${displayFocus} applies`,
      `Common mistakes usually come from using ${displayFocus} under the wrong conditions`,
      `The next task should use ${displayFocus} directly`,
    ],
    retrievalPrompts: [
      `Define ${displayFocus} from memory`,
      `Give one example where ${displayFocus} matters`,
      `Spot one mistake involving ${displayFocus}`,
    ],
    practiceBridge: `In the next task, use ${displayFocus} directly in one concrete situation.`,
    completionCheck: {
      prompt: `What would prove you can use ${displayFocus} correctly?`,
      expectedSignals: [
        `You can define ${displayFocus}`,
        `You can use ${displayFocus} in a concrete example`,
        `You can name one mistake to avoid with ${displayFocus}`,
      ],
      nextStep: `Move into practice and use ${displayFocus} directly.`,
    },
    resource: null,
  }
  const learningObjectives = sanitizeLessonList(splitList(doc?.learningObjectives, baseDoc.learningObjectives), context, 5)
  const keyTakeaways = sanitizeLessonList(splitList(doc?.keyTakeaways, baseDoc.keyTakeaways), context, 5)
  const retrievalPrompts = sanitizeLessonList(splitList(doc?.retrievalPrompts, baseDoc.retrievalPrompts), context, 4)
  const commonMistake = normalizeCommonMistake({
    ...(typeof doc?.commonMistake === 'object' && doc?.commonMistake ? doc.commonMistake : {}),
    mistake: sanitizeLessonCopy(doc?.commonMistake?.mistake, context, 1),
    whyItHappens: sanitizeLessonCopy(doc?.commonMistake?.whyItHappens, context, 2),
    fix: sanitizeLessonCopy(doc?.commonMistake?.fix, context, 2),
  }, baseDoc.commonMistake)
  const taughtPoints = validateTaughtPoints(sanitizeLessonList(contract.taughtPoints, context, 5), displayFocus)
  const baseVisuals = buildDefaultVisuals({
    title: displayFocus,
    taughtPoints,
    keyTakeaways,
    commonMistake,
  })
  const mentalModel = normalizeMentalModel(doc?.mentalModel, baseDoc.mentalModel, context)
  const deepDive = normalizeDeepDive(doc?.deepDive, baseDoc.deepDive, context)
  const practiceDrill = normalizePracticeDrill(doc?.practiceDrill, baseDoc.practiceDrill, context)

  return {
    title: titleCase(getLessonDisplayFocus({ ...context, taskTitle: doc?.title || context?.taskTitle })),
    learningObjectives,
    hook: toSentence(sanitizeLessonCopy(doc?.hook, context, 3), baseDoc.hook),
    mentalModel,
    plainEnglishExplanation: sanitizeLessonCopy(doc?.plainEnglishExplanation, context, explanationSentences) || baseDoc.plainEnglishExplanation,
    deepDive,
    whyItMatters: toSentence(sanitizeLessonCopy(doc?.whyItMatters, context, 3), baseDoc.whyItMatters),
    workedExample: normalizeWorkedExample({
      ...(typeof doc?.workedExample === 'object' && doc?.workedExample ? doc.workedExample : {}),
      setup: sanitizeLessonCopy(doc?.workedExample?.setup, context, 2),
      result: sanitizeLessonCopy(doc?.workedExample?.result, context, 1),
      walkthrough: sanitizeLessonList(doc?.workedExample?.walkthrough, context, 6),
    }, baseDoc.workedExample),
    practiceDrill,
    commonMistake,
    keyTakeaways,
    retrievalPrompts,
    practiceBridge: toSentence(sanitizeLessonCopy(doc?.practiceBridge, context, 2), baseDoc.practiceBridge),
    allowedConcepts: sanitizeLessonList(contract.allowedConcepts, context, 5),
    taughtPoints,
    completionCheck: normalizeCompletionCheck({
      ...(typeof doc?.completionCheck === 'object' && doc?.completionCheck ? doc.completionCheck : {}),
      prompt: sanitizeLessonCopy(doc?.completionCheck?.prompt, context, 1),
      expectedSignals: sanitizeLessonList(doc?.completionCheck?.expectedSignals, context, 4),
      nextStep: sanitizeLessonCopy(doc?.completionCheck?.nextStep, context, 1),
    }, baseDoc.completionCheck),
    resource: doc?.resource || baseDoc.resource || null,
    visuals: normalizeVisuals(doc?.visuals, baseVisuals),
    learningContract: contract,
    depthPolicy,
    interactions: normalizeInteractions(doc?.interactions, context),
  }
}

export function formatLearningContractForPrompt(contract = {}) {
  const normalized = normalizeLearningContract(contract)
  return [
    `DAY FOCUS: ${normalized.dayFocus}`,
    `LEARNER LEVEL: ${normalized.learnerProfile.level}`,
    `DEPTH POLICY: ${normalized.depthPolicy.level}; ${normalized.depthPolicy.exampleDifficulty}; ${normalized.depthPolicy.repetitionAllowance}`,
    `PREREQUISITE MODE: ${normalized.prerequisiteMode}`,
    `VISUAL PREFERENCE: ${normalized.visualPreference}`,
    `ALLOWED CONCEPTS: ${normalized.allowedConcepts.join(', ')}`,
    `TAUGHT POINTS: ${normalized.taughtPoints.join(' | ')}`,
    `REQUIRED VOCABULARY: ${normalized.requiredVocabulary.join(', ')}`,
    `PRACTICE TARGET: ${normalized.practiceTarget}`,
    `SUCCESS CRITERIA: ${normalized.successCriteria.join(' | ')}`,
    `DO NOT INTRODUCE YET: ${normalized.doNotIntroduceYet.join(' | ')}`,
  ].join('\n')
}
