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

function toSentence(value, fallback = '') {
  const cleaned = cleanText(value || fallback)
  if (!cleaned) return ''
  return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`
}

function splitList(value, fallback = []) {
  if (Array.isArray(value)) return dedupeStrings(value)
  const cleaned = cleanText(value)
  if (!cleaned) return dedupeStrings(fallback)
  return dedupeStrings(
    cleaned
      .split(/\n|•|,|;/)
      .map((part) => cleanText(part))
      .filter(Boolean),
  )
}

function isProgrammingTopic(concept = '', goal = '') {
  const text = `${concept} ${goal}`.toLowerCase()
  return /python|javascript|typescript|java\b|c\+\+|c#|rust\b|golang|ruby|swift|kotlin|sql|html|css|react|angular|vue|node|django|flask|express|api|rest|graphql|function|variable|loop|array|object|class|method|algorithm|data structure|programming|coding|code|syntax|terminal|bash|shell|git|database|query|recursion|ios|android|xcode|swiftui/.test(text)
}

function isDesignTopic(concept = '', goal = '') {
  const text = `${concept} ${goal}`.toLowerCase()
  return /design|ui|ux|typography|color|layout|wireframe|prototype|figma|visual|brand|interaction/.test(text)
}

function isLanguageTopic(concept = '', goal = '') {
  const text = `${concept} ${goal}`.toLowerCase()
  return /spanish|french|german|japanese|korean|language|grammar|vocabulary|pronunciation|conversation/.test(text)
}

function buildVocabulary(dayFocus, relatedConcepts = []) {
  return dedupeStrings([dayFocus, ...relatedConcepts]).slice(0, 6)
}

export function normalizeLearningContract(contract = {}, context = {}) {
  const dayFocus = cleanText(contract?.dayFocus || context?.dayFocus || context?.concept || context?.taskTitle || 'Today\'s concept')
  const relatedConcepts = dedupeStrings(contract?.allowedConcepts || context?.allConcepts || [dayFocus])
  const taughtPoints = splitList(contract?.taughtPoints, [
    `${dayFocus} in plain language`,
    `When ${dayFocus} matters inside ${cleanText(context?.goal || 'the larger goal')}`,
    `One concrete example of ${dayFocus}`,
    `One common mistake to avoid when using ${dayFocus}`,
  ]).slice(0, 6)

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
} = {}) {
  const dayFocus = cleanText(taskTitle || concept || moduleTitle || 'Today\'s concept')
  const relatedConcepts = dedupeStrings([dayFocus, ...(Array.isArray(allConcepts) ? allConcepts : []), moduleTitle])
  return normalizeLearningContract({
    dayFocus,
    allowedConcepts: relatedConcepts,
    taughtPoints: [
      `${dayFocus} in plain language`,
      taskDescription ? `${taskDescription}` : `How ${dayFocus} supports progress toward ${goal || 'the larger goal'}`,
      taskAction ? `${taskAction}` : `A concrete example of ${dayFocus} in action`,
      taskOutcome ? `${taskOutcome}` : `A clear sign that ${dayFocus} is starting to stick`,
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
  }, { concept: dayFocus, goal })
}

function buildDomainLens(dayFocus, goal) {
  if (isProgrammingTopic(dayFocus, goal)) {
    return {
      analogy: `${dayFocus} is like learning one dependable building block before you try to assemble a full app or system.`,
      workedContext: `Imagine you are making progress on ${goal}. Instead of trying to learn every tool at once, you isolate ${dayFocus} and practice the one decision it controls.`,
      mistake: 'Jumping straight to tooling, syntax, or framework tricks before the underlying mental model is stable.',
      fix: `Name the job ${dayFocus} is doing first, then connect it to the concrete code or workflow you are about to touch.`,
    }
  }

  if (isDesignTopic(dayFocus, goal)) {
    return {
      analogy: `${dayFocus} is like learning how to see the reason behind a strong interface, not just copying the surface style.`,
      workedContext: `Imagine reviewing a real screen for ${goal}. ${dayFocus} helps you explain why a choice feels clear, confusing, useful, or distracting.`,
      mistake: 'Treating the concept as visual taste instead of a decision that changes what the user can understand or do.',
      fix: 'Tie every explanation back to user clarity, decision-making, and the job the screen needs to help the person complete.',
    }
  }

  if (isLanguageTopic(dayFocus, goal)) {
    return {
      analogy: `${dayFocus} is like a phrase pattern or grammar handle that lets you say more with less guessing.`,
      workedContext: `Imagine trying to express one useful idea related to ${goal}. ${dayFocus} gives you the structure that makes the sentence work.`,
      mistake: 'Memorizing words without understanding when or why the pattern changes in real conversation.',
      fix: 'Pair the idea with one situation, one sentence, and one contrast so the pattern becomes usable instead of fragile.',
    }
  }

  return {
    analogy: `${dayFocus} is the part of the skill that turns vague interest into a decision you can actually make.`,
    workedContext: `Imagine trying to make real progress on ${goal}. ${dayFocus} matters because it tells you what to notice, what to ignore, and what good use looks like.`,
    mistake: 'Collecting the phrase without turning it into a usable decision rule.',
    fix: `Define ${dayFocus}, connect it to one example, and then say what would count as a bad use of it.`,
  }
}

function buildFallbackExplanation({ dayFocus, goal, contract, taskDescription, resourceTitle }) {
  const lens = buildDomainLens(dayFocus, goal)
  const opening = `${titleCase(dayFocus)} is the day-level idea that anchors this part of ${goal}. In plain English, it is the concept you rely on to make better choices, not just remember a definition.`
  const middle = `${lens.analogy} A strong understanding means you can explain what the idea is, when it matters, and how to recognize it in action without leaning on buzzwords.`
  const closing = taskDescription
    ? `${toSentence(taskDescription)} ${resourceTitle ? `Use ${resourceTitle} as supporting evidence, but the real goal is to internalize the pattern so you can use it without copying the source.` : 'The point of this lesson is to give you a stable mental model before you enter practice.'}`
    : `${resourceTitle ? `Use ${resourceTitle} as a reference, but do not confuse the resource with the concept itself.` : 'The rest of today should build on this concept instead of introducing a new one.'} The boundaries for today are: ${contract.doNotIntroduceYet.join('; ')}.`
  return [opening, middle, closing].join('\n\n')
}

function buildWorkedExample({ dayFocus, goal, contract }) {
  const lens = buildDomainLens(dayFocus, goal)
  return {
    title: `Using ${titleCase(dayFocus)} in a real moment`,
    setup: lens.workedContext,
    walkthrough: [
      `First, name the job of ${dayFocus}: what does it help you notice, decide, or produce?`,
      `Next, compare one strong use of ${dayFocus} with one weak or misleading use so the difference becomes visible.`,
      `Then map the concept back to today's practice target: ${contract.practiceTarget}`,
    ],
    result: `If the example worked, you should now be able to explain ${dayFocus} clearly and carry it into the next task without introducing extra material.`,
  }
}

function buildCommonMistake({ dayFocus, goal }) {
  const lens = buildDomainLens(dayFocus, goal)
  return {
    mistake: lens.mistake,
    whyItHappens: `Learners often rush because they want visible progress on ${goal}. That makes it tempting to skip the reasoning layer and jump straight to output.`,
    fix: lens.fix,
  }
}

export function buildStructuredConceptLessonDoc({
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
  fallbackReason = 'structured',
} = {}) {
  const dayFocus = cleanText(taskTitle || concept || 'Today\'s concept')
  const contract = normalizeLearningContract(learningContract, {
    concept: dayFocus,
    goal,
    taskTitle,
  })
  const priorKnowledge = cleanText(knowledge)
  const hook = priorKnowledge
    ? `You already have a starting point: ${priorKnowledge}. Today we tighten that into a usable mental model for ${dayFocus}, so the rest of the day can build on something solid instead of vague familiarity.`
    : `${dayFocus} is one of the first ideas that makes progress on ${goal} feel concrete. Instead of trying to absorb everything, this lesson focuses on the exact mental model you need before practice begins.`

  return {
    title: titleCase(dayFocus),
    hook,
    plainEnglishExplanation: buildFallbackExplanation({
      dayFocus,
      goal,
      contract,
      taskDescription,
      resourceTitle,
    }),
    whyItMatters: `This matters because the rest of the day assumes you can already reason with ${dayFocus}. Guided practice should deepen it, quizzes should verify it, and challenges should stretch it, but none of those later tasks should have to introduce the core idea from scratch.`,
    workedExample: buildWorkedExample({ dayFocus, goal, contract }),
    commonMistake: buildCommonMistake({ dayFocus, goal }),
    keyTakeaways: dedupeStrings([
      `${dayFocus} should feel like a decision rule, not a trivia fact`,
      contract.taughtPoints[0],
      contract.taughtPoints[1],
      contract.practiceTarget,
    ]).slice(0, 5),
    practiceBridge: taskAction
      ? `Next, use this idea actively: ${toSentence(taskAction)} Stay inside today's taught scope: ${contract.allowedConcepts.join(', ')}.`
      : `Next, move into guided practice and apply ${dayFocus} once on purpose. The goal is not novelty yet; it is deliberate use.`,
    allowedConcepts: contract.allowedConcepts,
    taughtPoints: contract.taughtPoints,
    completionCheck: {
      prompt: taskOutcome
        ? `Before you continue, explain how you would know you achieved this outcome: ${toSentence(taskOutcome)}`
        : `Before you continue, explain ${dayFocus} in your own words and name one concrete situation where you would use it.`,
      expectedSignals: contract.successCriteria,
      nextStep: `If you can explain ${dayFocus}, name one common mistake, and describe how you will use it in the next task, you are ready to continue.`,
    },
    resource: resourceUrl
      ? {
          url: resourceUrl,
          title: cleanText(resourceTitle) || 'Primary resource',
        }
      : null,
    fallbackReason: cleanText(fallbackReason),
  }
}

function normalizeWorkedExample(example, fallback) {
  if (typeof example === 'string') {
    return {
      ...fallback,
      setup: cleanText(example) || fallback.setup,
    }
  }
  const source = example && typeof example === 'object' ? example : {}
  return {
    title: cleanText(source.title) || fallback.title,
    setup: cleanText(source.setup) || fallback.setup,
    walkthrough: splitList(source.walkthrough, fallback.walkthrough).slice(0, 5),
    result: toSentence(source.result, fallback.result),
  }
}

function normalizeCommonMistake(mistake, fallback) {
  if (typeof mistake === 'string') {
    return {
      ...fallback,
      mistake: toSentence(mistake, fallback.mistake),
    }
  }
  const source = mistake && typeof mistake === 'object' ? mistake : {}
  return {
    mistake: toSentence(source.mistake, fallback.mistake),
    whyItHappens: toSentence(source.whyItHappens, fallback.whyItHappens),
    fix: toSentence(source.fix, fallback.fix),
  }
}

function normalizeCompletionCheck(check, fallback) {
  if (typeof check === 'string') {
    return {
      ...fallback,
      prompt: toSentence(check, fallback.prompt),
    }
  }
  const source = check && typeof check === 'object' ? check : {}
  return {
    prompt: toSentence(source.prompt, fallback.prompt),
    expectedSignals: splitList(source.expectedSignals, fallback.expectedSignals).slice(0, 5),
    nextStep: toSentence(source.nextStep, fallback.nextStep),
  }
}

function normalizeInteractions(interactions, context) {
  const concept = cleanText(context?.concept || context?.taskTitle || 'this concept')
  const goal = cleanText(context?.goal || '')

  const defaults = [
    {
      afterSection: 'hook',
      type: 'true_false',
      statement: `${concept} is the focus for this lesson, not the entire goal all at once.`,
      correct: true,
      explanation: `Right — the lesson narrows the goal into one usable idea so practice has a clear target.`,
    },
    {
      afterSection: 'explanation',
      type: 'fill_blank',
      sentence: `The main idea today is ___ .`,
      answer: concept,
      explanation: `${concept} is the day-level focus that later tasks should stay inside.`,
    },
    {
      afterSection: 'workedExample',
      type: 'predict',
      question: `What should you do before using ${concept} in practice?`,
      options: [
        `Name the job ${concept} is doing`,
        'Jump to advanced edge cases',
        'Ignore the example and memorize terms',
        'Change topics entirely',
      ],
      correctIndex: 0,
      explanation: `The safest next move is to name the role of ${concept}, then apply it deliberately.`,
    },
    {
      afterSection: 'commonMistake',
      type: 'spot_error',
      question: `Which habit is the mistake to avoid with ${concept}?`,
      options: [
        'Using the concept in one concrete example',
        'Explaining the idea in plain language',
        'Collecting jargon without a usable decision rule',
        'Checking your answer against the lesson scope',
      ],
      correctIndex: 2,
      explanation: `Jargon feels like progress, but it does not prove that ${concept} is usable.`,
    },
    {
      afterSection: 'takeaways',
      type: 'reflect',
      question: `In your own words, how will you use ${concept} in the next task?`,
    },
  ]

  if (!Array.isArray(interactions) || interactions.length === 0) return defaults

  const normalized = interactions.slice(0, 5).map((item, i) => {
    if (!item || typeof item !== 'object') return defaults[i] || defaults[0]
    const type = item.type || 'ready_check'
    const base = { afterSection: item.afterSection || defaults[i]?.afterSection || 'hook', type }

    if (type === 'true_false') {
      return {
        ...base,
        statement: cleanText(item.statement || item.question || ''),
        correct: item.correct === true || item.correct === 'true',
        explanation: cleanText(item.explanation || ''),
      }
    }
    if (type === 'fill_blank') {
      return {
        ...base,
        sentence: cleanText(item.sentence || item.question || ''),
        answer: cleanText(item.answer || ''),
        explanation: cleanText(item.explanation || ''),
      }
    }
    if (type === 'predict' || type === 'spot_error') {
      return {
        ...base,
        question: cleanText(item.question || ''),
        code: String(item.code || '').trim(),
        options: Array.isArray(item.options) ? item.options.map((o) => cleanText(o)).filter(Boolean) : [],
        correctIndex: typeof item.correctIndex === 'number' ? item.correctIndex : 0,
        explanation: cleanText(item.explanation || ''),
      }
    }
    return base
  })

  while (normalized.length < 5) normalized.push(defaults[normalized.length] || defaults[0])
  return normalized
}

export function normalizeConceptLessonDoc(doc = {}, context = {}) {
  const fallback = buildStructuredConceptLessonDoc(context)
  const contract = normalizeLearningContract({
    allowedConcepts: doc?.allowedConcepts || fallback.allowedConcepts,
    taughtPoints: doc?.taughtPoints || fallback.taughtPoints,
  }, {
    concept: context?.taskTitle || context?.concept,
    goal: context?.goal,
  })

  return {
    title: cleanText(doc?.title) || fallback.title,
    hook: toSentence(doc?.hook, fallback.hook),
    plainEnglishExplanation: cleanText(doc?.plainEnglishExplanation) || fallback.plainEnglishExplanation,
    whyItMatters: toSentence(doc?.whyItMatters, fallback.whyItMatters),
    workedExample: normalizeWorkedExample(doc?.workedExample, fallback.workedExample),
    commonMistake: normalizeCommonMistake(doc?.commonMistake, fallback.commonMistake),
    keyTakeaways: splitList(doc?.keyTakeaways, fallback.keyTakeaways).slice(0, 6),
    practiceBridge: toSentence(doc?.practiceBridge, fallback.practiceBridge),
    allowedConcepts: contract.allowedConcepts,
    taughtPoints: contract.taughtPoints,
    completionCheck: normalizeCompletionCheck(doc?.completionCheck, fallback.completionCheck),
    resource: doc?.resource || fallback.resource || null,
    fallbackReason: cleanText(doc?.fallbackReason || fallback.fallbackReason),
    interactions: normalizeInteractions(doc?.interactions, context),
  }
}

export function extractJsonObject(raw = '') {
  const text = String(raw || '').replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) return ''
  return text.slice(firstBrace, lastBrace + 1)
}

export function repairJsonString(raw = '') {
  return extractJsonObject(raw)
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, '\'')
    .replace(/,\s*([}\]])/g, '$1')
}

export function formatLearningContractForPrompt(contract = {}) {
  const normalized = normalizeLearningContract(contract)
  return [
    `DAY FOCUS: ${normalized.dayFocus}`,
    `ALLOWED CONCEPTS: ${normalized.allowedConcepts.join(', ')}`,
    `TAUGHT POINTS: ${normalized.taughtPoints.join(' | ')}`,
    `REQUIRED VOCABULARY: ${normalized.requiredVocabulary.join(', ')}`,
    `PRACTICE TARGET: ${normalized.practiceTarget}`,
    `SUCCESS CRITERIA: ${normalized.successCriteria.join(' | ')}`,
    `DO NOT INTRODUCE YET: ${normalized.doNotIntroduceYet.join(' | ')}`,
  ].join('\n')
}
