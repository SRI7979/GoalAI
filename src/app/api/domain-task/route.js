import { getOpenAIModel } from '@/lib/openaiModels'
import {
  buildStarterForLanguage,
  detectCodeLanguageFromText,
  getLanguageMeta,
  normalizeCodeLanguage,
} from '@/lib/codeLanguages'
import {
  CODE_DOMAIN_TASK_TYPES,
  DEFAULT_DOMAIN,
  formatDomainForPrompt,
  getDomainAdapter,
  getDomainAssignmentType,
  getDomainRegistryEntry,
  getDomainTaskLabel,
  normalizeDomain,
  resolvePracticeDomainForGoal,
} from '@/lib/domainAdapter'

const CODE_TASK_TYPE_SET = new Set(CODE_DOMAIN_TASK_TYPES)

function cleanJson(raw = '') {
  const text = String(raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  const start = text.indexOf('{')
  return start >= 0 ? text.slice(start) : text
}

function asList(value) {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === 'string' && value.trim()) {
    return value.split(/\n+/).map((item) => item.replace(/^[-*]\s*/, '').trim()).filter(Boolean)
  }
  return []
}

function cleanTopic(topic, fallback = 'the current topic') {
  return String(topic || fallback).replace(/\s+/g, ' ').trim() || fallback
}

function baseDomainTask({ taskType, domain, topic, userLevel, goal }) {
  const topicName = cleanTopic(topic || goal, 'the current concept')
  const registry = getDomainRegistryEntry(domain)
  return {
    title: `${getDomainTaskLabel(taskType)}: ${topicName}`,
    taskType,
    domain,
    workspaceType: registry.workspaceType,
    schemaVersion: 2,
    userLevel: userLevel || 'beginner',
    prompt: `Practice ${topicName} in a ${registry.label} workspace. Complete the interaction, then submit proof that you can use the idea, not just recognize it.`,
    mission: `Use the ${registry.workspaceType.replace(/_/g, ' ')} workspace to prove one usable skill from ${topicName}.`,
    proofRules: registry.proofRules || [],
    expectedProof: registry.finalVerification,
    successCriteria: [
      'Use the domain-specific workspace instead of only writing a generic answer.',
      'Show the important intermediate reasoning or decisions.',
      'Finish with a short proof statement in your own words.',
    ],
    rubric: [
      { dimension: 'Accuracy', description: 'The core domain move is correct.' },
      { dimension: 'Reasoning', description: 'The answer explains why, not just what.' },
      { dimension: 'Transfer', description: 'The learner can apply the idea in a nearby new situation.' },
    ],
    hints: [
      `Start with the concrete artifacts in the ${registry.label} workspace.`,
      'Name the evidence or intermediate step you used.',
      'Use the final response box to summarize the proof.',
    ],
  }
}

function buildMathFallback(context) {
  const base = baseDomainTask(context)
  return {
    ...base,
    problem: `Set up and solve a step-by-step problem about ${cleanTopic(context.topic)}.`,
    givens: ['Known value A', 'Known relationship', 'Unknown target'],
    equationSlots: ['Define variables', 'Choose formula', 'Substitute values', 'Check answer'],
    steps: [
      { prompt: 'Name what is being asked and list the known information.', expectedSignals: ['knowns', 'unknown'] },
      { prompt: 'Choose the rule, formula, or theorem that connects the knowns to the target.', expectedSignals: ['relationship'] },
      { prompt: 'Carry out the transformation and explain why it follows.', expectedSignals: ['valid step'] },
      { prompt: 'Check the final answer against units, graph, or reasonableness.', expectedSignals: ['check'] },
    ],
    proofBoard: ['Setup', 'Transformation', 'Result', 'Reasonableness check'],
  }
}

function buildPhysicsFallback(context) {
  const base = baseDomainTask(context)
  return {
    ...base,
    scenario: `A physical system involving ${cleanTopic(context.topic)} changes when one variable is adjusted.`,
    givens: ['mass = 5 kg', 'angle = 30 deg', 'g = 9.8 m/s^2'],
    simulation: {
      controls: [
        { id: 'mass', label: 'Mass', min: 1, max: 10, value: 5, unit: 'kg' },
        { id: 'angle', label: 'Angle', min: 0, max: 60, value: 30, unit: 'deg' },
        { id: 'friction', label: 'Friction', min: 0, max: 1, value: 0.2, unit: 'mu' },
      ],
      vectors: ['weight', 'normal', 'applied force', 'friction'],
    },
    targets: ['free-body diagram', 'unit check', 'prediction', 'explanation'],
    steps: [
      { prompt: 'Draw or label the forces before calculating.' },
      { prompt: 'Choose the relationship that matches the diagram.' },
      { prompt: 'Check units and explain what the result means physically.' },
    ],
  }
}

function buildChemistryFallback(context) {
  const base = baseDomainTask(context)
  return {
    ...base,
    scenario: `Use particle-level reasoning to work through ${cleanTopic(context.topic)}.`,
    sides: { reactants: ['C3H8', 'O2'], products: ['CO2', 'H2O'] },
    atomCounts: {
      C3H8: { C: 3, H: 8 },
      O2: { O: 2 },
      CO2: { C: 1, O: 2 },
      H2O: { H: 2, O: 1 },
    },
    correctCoefficients: { C3H8: 1, O2: 5, CO2: 3, H2O: 4 },
    reactionCards: ['Reactants', 'Atom inventory', 'Balanced products', 'Why atoms are conserved'],
    steps: [
      { prompt: 'Inventory atoms on each side.' },
      { prompt: 'Adjust coefficients without changing subscripts.' },
      { prompt: 'Explain the reaction or naming rule behind the result.' },
    ],
  }
}

function buildBiologyFallback(context) {
  const base = baseDomainTask(context)
  return {
    ...base,
    diagram: 'process-map',
    scenario: `Trace the biological mechanism behind ${cleanTopic(context.topic)}.`,
    cards: [
      { id: 'input', label: 'Input signal' },
      { id: 'cell', label: 'Cell response' },
      { id: 'system', label: 'System effect' },
      { id: 'feedback', label: 'Feedback loop' },
    ],
    targets: [
      { id: 'stage-1', label: 'Start', x: 18, y: 48 },
      { id: 'stage-2', label: 'Cell', x: 42, y: 28 },
      { id: 'stage-3', label: 'System', x: 66, y: 48 },
      { id: 'stage-4', label: 'Feedback', x: 82, y: 70 },
    ],
    correctMatches: { 'stage-1': 'input', 'stage-2': 'cell', 'stage-3': 'system', 'stage-4': 'feedback' },
    processSteps: ['Observe the system', 'Label the structures', 'Order the mechanism', 'Explain the outcome'],
  }
}

function buildLanguageFallback(context) {
  const base = baseDomainTask(context)
  return {
    ...base,
    targetLanguage: 'target language',
    persona: 'friendly local guide',
    scenario: `Practice ${cleanTopic(context.topic)} in a realistic conversation.`,
    chatTurns: [
      { id: 'turn-1', role: 'ai', speaker: 'Guide', text: 'Hi. Let us practice this in a natural situation.' },
    ],
    responseOptions: [
      { id: 'best', text: 'A clear, polite response using the target phrase.', best: true },
      { id: 'rough', text: 'A rough response with the right idea but awkward grammar.', best: false },
      { id: 'off', text: 'An off-topic response.', best: false },
    ],
    sentence: ['Subject', '___', 'object', 'context'],
    cards: [
      { id: 'verb', label: 'target verb', hint: 'use the lesson pattern' },
      { id: 'distractor', label: 'distractor form', hint: 'wrong agreement' },
    ],
    goals: ['Use target vocabulary', 'Respond naturally', 'Recover from one misunderstanding'],
  }
}

function buildSecurityFallback(context) {
  const base = baseDomainTask(context)
  return {
    ...base,
    safetyNotice: 'Defensive learning only. Do not produce exploit steps or instructions for harm.',
    scenario: `Defend a safe sandbox scenario about ${cleanTopic(context.topic)}.`,
    artifacts: [
      { id: 'email', label: 'Inbox message', detail: 'Urgent request asks for credentials through an unfamiliar link.' },
      { id: 'header', label: 'Sender signal', detail: 'Display name and domain do not match.' },
      { id: 'log', label: 'Login log', detail: 'New sign-in attempt from an unusual location.' },
    ],
    riskFactors: ['credential request', 'domain mismatch', 'urgency pressure', 'unusual login'],
    mitigations: ['verify through trusted channel', 'report message', 'change exposed password', 'enable MFA'],
    networkNodes: ['user', 'email gateway', 'identity provider', 'admin review'],
  }
}

function buildDataAiFallback(context) {
  const base = baseDomainTask(context)
  return {
    ...base,
    dataset: {
      columns: ['example', 'feature', 'actual', 'prediction', 'confidence'],
      rows: [
        ['A', 'high signal', 'yes', 'yes', '0.91'],
        ['B', 'mixed signal', 'no', 'yes', '0.62'],
        ['C', 'low signal', 'no', 'no', '0.78'],
        ['D', 'edge case', 'yes', 'no', '0.55'],
      ],
    },
    models: [
      { id: 'simple', label: 'Simple model', accuracy: 75, precision: 70, recall: 80 },
      { id: 'complex', label: 'Complex model', accuracy: 82, precision: 86, recall: 68 },
    ],
    confusionMatrix: { truePositive: 18, falsePositive: 5, falseNegative: 7, trueNegative: 20 },
    tasks: ['Inspect rows', 'Compare metrics', 'Find an error slice', 'Explain a safe limitation'],
  }
}

function buildStatisticsFallback(context) {
  const base = baseDomainTask(context)
  return {
    ...base,
    distribution: { mean: 50, spread: 12, sampleSize: 30 },
    hypothesis: 'The new condition changes the average outcome.',
    choices: ['one-sample t-test', 'chi-square test', 'correlation only'],
    simulationControls: ['sample size', 'effect size', 'spread'],
    interpretationFrames: ['assumptions', 'test choice', 'uncertainty statement'],
  }
}

function buildEngineeringFallback(context) {
  const base = baseDomainTask(context)
  return {
    ...base,
    brief: `Design a prototype decision for ${cleanTopic(context.topic)}.`,
    constraints: ['cost under budget', 'durable enough for repeated use', 'easy to maintain', 'safe under expected load'],
    prototypeOptions: [
      { id: 'light', label: 'Lightweight design', tradeoff: 'fast and cheap, lower durability' },
      { id: 'balanced', label: 'Balanced design', tradeoff: 'moderate cost, passes most tests' },
      { id: 'heavy', label: 'Heavy-duty design', tradeoff: 'strong, expensive, slower to build' },
    ],
    testBench: [
      { id: 'load', label: 'Load test', target: 'passes expected stress' },
      { id: 'cost', label: 'Cost test', target: 'stays under budget' },
      { id: 'maintain', label: 'Maintenance test', target: 'easy repair path' },
    ],
  }
}

function buildDecisionFallback(context) {
  const base = baseDomainTask(context)
  return {
    ...base,
    dashboard: [
      { label: 'Key metric', value: 'moving upward', signal: 'positive' },
      { label: 'Constraint', value: 'limited resources', signal: 'warning' },
      { label: 'Risk', value: 'second-order effect', signal: 'risk' },
    ],
    decisionOptions: [
      { id: 'option-a', label: 'Conservative choice', tradeoff: 'lower upside, lower risk' },
      { id: 'option-b', label: 'Balanced choice', tradeoff: 'uses evidence and protects downside' },
      { id: 'option-c', label: 'Aggressive choice', tradeoff: 'higher upside, higher risk' },
    ],
    evidenceCards: ['metric evidence', 'stakeholder impact', 'tradeoff', 'recommendation'],
  }
}

function buildEvidenceFallback(context) {
  const base = baseDomainTask(context)
  return {
    ...base,
    passage: `This short source about ${cleanTopic(context.topic)} includes a claim, a piece of evidence, and a limitation. Read it closely, mark what supports the main point, and explain the inference you can safely make.`,
    evidenceCards: [
      { id: 'claim', label: 'Main claim' },
      { id: 'evidence', label: 'Best evidence' },
      { id: 'context', label: 'Context' },
      { id: 'limit', label: 'Limitation' },
    ],
    boardColumns: ['Claim', 'Evidence', 'Context', 'Limitation'],
    promptFrames: ['What does the source say?', 'What evidence supports it?', 'What should we not overclaim?'],
  }
}

function buildHealthFallback(context) {
  const base = baseDomainTask(context)
  return {
    ...base,
    safetyNotice: 'Educational health science only. This does not diagnose or prescribe treatment.',
    caseChart: [
      { label: 'Body system', value: 'connected process' },
      { label: 'Observation', value: 'neutral learning signal' },
      { label: 'Safe next step', value: 'seek qualified help when symptoms are real or urgent' },
    ],
    anatomyTargets: ['structure', 'function', 'process', 'safety boundary'],
    steps: [
      { prompt: 'Name the body system or structure.' },
      { prompt: 'Explain the normal process.' },
      { prompt: 'State a safe educational boundary.' },
    ],
  }
}

function buildEnvironmentFallback(context) {
  const base = baseDomainTask(context)
  return {
    ...base,
    ecosystem: ['producer', 'consumer', 'resource', 'human impact', 'feedback loop'],
    simulation: {
      controls: [
        { id: 'resource', label: 'Resource use', min: 0, max: 100, value: 55, unit: '%' },
        { id: 'habitat', label: 'Habitat quality', min: 0, max: 100, value: 70, unit: '%' },
        { id: 'emissions', label: 'Emissions', min: 0, max: 100, value: 45, unit: '%' },
      ],
    },
    impactCards: ['short-term benefit', 'long-term risk', 'affected species', 'mitigation'],
  }
}

function buildCreativeFallback(context) {
  const base = baseDomainTask(context)
  return {
    ...base,
    canvasBrief: `Create or critique a composition for ${cleanTopic(context.topic)}.`,
    styleControls: ['contrast', 'hierarchy', 'alignment', 'color', 'rhythm'],
    critiqueRubric: ['intent', 'composition', 'clarity', 'craft', 'iteration'],
    moodboard: ['reference', 'palette', 'type/mark', 'layout direction'],
  }
}

function buildMusicFallback(context) {
  const base = baseDomainTask(context)
  return {
    ...base,
    rhythmPattern: ['1', '&', '2', '&', '3', '&', '4', '&'],
    notation: ['C', 'E', 'G', 'rest'],
    listeningChoices: ['same rhythm', 'syncopated', 'interval up', 'interval down'],
    practiceModes: ['clap rhythm', 'place notes', 'identify interval', 'explain pattern'],
  }
}

function buildCommunicationFallback(context) {
  const base = baseDomainTask(context)
  return {
    ...base,
    audience: 'curious but busy audience',
    outlineSlots: ['opening hook', 'main point', 'evidence/example', 'close'],
    deliveryRubric: ['clarity', 'pace', 'audience fit', 'confidence', 'response quality'],
    audienceQuestions: ['Why should I care?', 'What is the evidence?', 'What would you do next?'],
  }
}

function buildSpecializedFallback(context) {
  const workspace = getDomainRegistryEntry(context.domain).workspaceType
  if (workspace === 'math') return buildMathFallback(context)
  if (workspace === 'physics') return buildPhysicsFallback(context)
  if (workspace === 'chemistry') return buildChemistryFallback(context)
  if (workspace === 'biology') return buildBiologyFallback(context)
  if (workspace === 'language') return buildLanguageFallback(context)
  if (workspace === 'security') return buildSecurityFallback(context)
  if (workspace === 'data_ai') return buildDataAiFallback(context)
  if (workspace === 'statistics') return buildStatisticsFallback(context)
  if (workspace === 'engineering' || workspace === 'technology') return buildEngineeringFallback(context)
  if (['economics', 'finance', 'business'].includes(workspace)) return buildDecisionFallback(context)
  if (['reading', 'history', 'civics', 'psychology', 'logic'].includes(workspace)) return buildEvidenceFallback(context)
  if (workspace === 'health') return buildHealthFallback(context)
  if (workspace === 'environment') return buildEnvironmentFallback(context)
  if (workspace === 'creative' || workspace === 'writing') return buildCreativeFallback(context)
  if (workspace === 'music') return buildMusicFallback(context)
  if (workspace === 'communication') return buildCommunicationFallback(context)
  return baseDomainTask(context)
}

function buildJsTaskStarter() {
  return [
    'function solve(input) {',
    '  const lines = String(input).trim().split(/\\n+/).filter(Boolean)',
    '  // Each line looks like "task title|status".',
    '  // TODO: return only the task titles whose status is "open", separated by ", ".',
    '  return ""',
    '}',
    '',
    'console.log(solve("Build login screen|open\\nFix spacing|done\\nTest buttons|open"))',
    '',
  ].join('\n')
}

function buildPythonTaskStarter() {
  return [
    'def solve(input_text):',
    '    lines = str(input_text).strip().splitlines()',
    '    # Each line looks like "task title|status".',
    '    # TODO: return only the task titles whose status is "open", separated by ", ".',
    '    return ""',
    '',
    'print(solve("Build login screen|open\\nFix spacing|done\\nTest buttons|open"))',
    '',
  ].join('\n')
}

function buildSqlTaskStarter(topicName) {
  return [
    `-- ${topicName} practice`,
    '-- Goal: return popular movies with enough ticket sales, highest sales first.',
    '',
    'CREATE TABLE movies (',
    '  id INTEGER PRIMARY KEY,',
    '  title TEXT NOT NULL,',
    '  genre TEXT NOT NULL,',
    '  tickets_sold INTEGER NOT NULL',
    ');',
    '',
    "INSERT INTO movies (title, genre, tickets_sold) VALUES",
    "  ('Moonlight Arcade', 'sci-fi', 180),",
    "  ('The Quiet Door', 'drama', 75),",
    "  ('Fast Orbit', 'action', 240),",
    "  ('Tiny Planet', 'animation', 105);",
    '',
    '-- TODO: select title and tickets_sold for movies with 100+ tickets sold.',
    '-- Order the result from most tickets to fewest.',
    '',
  ].join('\n')
}

function buildHtmlTaskStarter(topicName) {
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    `  <title>${topicName}</title>`,
    '  <style>',
    '    body { font-family: system-ui, sans-serif; margin: 0; padding: 32px; background: #f7fafc; color: #111827; }',
    '    main { max-width: 720px; margin: 0 auto; }',
    '  </style>',
    '</head>',
    '<body>',
    '  <main>',
    '    <!-- TODO: build a small interactive-looking study card here. -->',
    '  </main>',
    '</body>',
    '</html>',
    '',
  ].join('\n')
}

function buildCodingFallback({ taskType, domain, topic, goal, userLevel, lessonContent, taskTitle }) {
  const topicName = cleanTopic(topic || taskTitle || goal, 'coding fundamentals')
  const language = normalizeCodeLanguage(detectCodeLanguageFromText([goal, topic, lessonContent, taskTitle].filter(Boolean).join(' '), 'javascript'))
  const languageMeta = getLanguageMeta(language)
  const title = taskType === 'DebugChallenge'
    ? `Debug a ${languageMeta.label} task filter`
    : taskType === 'MiniProject'
      ? `Build a ${languageMeta.label} mini task tracker`
      : `Build a ${languageMeta.label} task filter`

  if (language === 'sql') {
    return {
      title: `Query a movie theater dataset`,
      taskType,
      domain,
      userLevel: userLevel || 'beginner',
      language,
      prompt: `Write a SQL query for a tiny movie theater dataset. This is a coding practice task for ${topicName}, so focus on reading the schema, filtering rows, and ordering the result correctly.`,
      instructions: [
        'Use the provided movies table and seed rows.',
        'Return only the title and tickets_sold columns.',
        'Keep movies with tickets_sold greater than or equal to 100.',
        'Sort from highest tickets_sold to lowest.',
      ],
      requirements: [
        'Do not change the table or INSERT statements.',
        'Your final statement should be one SELECT query.',
        'The expected first movie is Fast Orbit.',
      ],
      examples: [
        { input: 'movies table with four rows', output: 'Fast Orbit, Moonlight Arcade, Tiny Planet' },
      ],
      starterCode: buildSqlTaskStarter(topicName),
      testCases: [
        { input: 'seeded movies table', expected: 'Fast Orbit|240, Moonlight Arcade|180, Tiny Planet|105', explanation: 'Only movies with at least 100 tickets sold, sorted descending.' },
      ],
      hints: ['Filter before sorting.', 'Use WHERE for the threshold and ORDER BY for the ranking.'],
    }
  }

  if (language === 'html') {
    return {
      title: `Build a study card webpage`,
      taskType,
      domain,
      userLevel: userLevel || 'beginner',
      language,
      prompt: `Create a small HTML/CSS study card for ${topicName}. This should practice web coding, not just visual design: structure the content, style it, and make the learner action obvious.`,
      instructions: [
        'Add a clear heading for the concept.',
        'Add a short explanation paragraph.',
        'Add three checklist items a learner can use to practice.',
        'Style the card so the hierarchy is easy to scan.',
      ],
      requirements: [
        'Use semantic HTML elements.',
        'Keep all CSS inside the style tag for now.',
        'Do not import external libraries.',
      ],
      examples: [
        { input: 'Concept: state management', output: 'A titled card with explanation and three practice checks.' },
      ],
      starterCode: buildHtmlTaskStarter(topicName),
      testCases: [
        { input: 'Rendered document', expected: 'Heading, explanation, and 3 checklist items', explanation: 'The page should communicate the learning concept clearly.' },
      ],
      hints: ['Start with the content before styling.', 'Use a list for the checks so the structure is readable.'],
    }
  }

  const starterCode = language === 'python'
    ? buildPythonTaskStarter()
    : ['javascript', 'typescript'].includes(language)
      ? buildJsTaskStarter()
      : buildStarterForLanguage(language, title, 'Implement a solve(input) style practice task from the instructions.')

  return {
    title,
    taskType,
    domain,
    userLevel: userLevel || 'beginner',
    language,
    functionSignature: language === 'python' ? 'solve(input_text)' : 'solve(input)',
    prompt: `Build a task-filtering utility in ${languageMeta.label}. Given newline-separated rows in the form "task title|status", return the titles whose status is "open", separated by comma and space. This gives you a concrete coding move connected to ${topicName}: parse input, transform data, and return the exact output.`,
    instructions: [
      'Read the input as text.',
      'Split it into lines.',
      'For each line, split the task title from its status using the pipe character.',
      'Keep only rows whose status is exactly "open".',
      'Return the kept task titles joined by ", ".',
    ],
    requirements: [
      'Name the main function solve.',
      'Do not print inside solve; return the final string.',
      'Handle empty input by returning an empty string.',
      'Preserve the original task title text.',
    ],
    constraints: [
      'Input has 0 to 50 lines.',
      'Every non-empty line uses the format title|status.',
      'Status is one of open, done, blocked.',
    ],
    examples: [
      {
        input: 'Build login screen|open\\nFix spacing|done\\nTest buttons|open',
        output: 'Build login screen, Test buttons',
      },
    ],
    starterCode,
    testCases: [
      { input: 'Build login screen|open\nFix spacing|done\nTest buttons|open', expected: 'Build login screen, Test buttons', explanation: 'Only the open tasks should remain.' },
      { input: 'Write tests|blocked\nShip release|done', expected: '', explanation: 'There are no open tasks.' },
      { input: 'Refactor parser|open', expected: 'Refactor parser', explanation: 'A single open task returns its title.' },
    ],
    hints: [
      'Split lines first, then split each line on "|".',
      'Trim the status before comparing it to "open".',
      'Collect matching titles in an array/list, then join them at the end.',
    ],
  }
}

function fallbackGenerate({ taskType, domain, topic, userLevel, goal, lessonContent, taskTitle }) {
  const resolvedDomain = normalizeDomain(domain || DEFAULT_DOMAIN)
  const adapter = getDomainAdapter(resolvedDomain)
  const title = `${getDomainTaskLabel(taskType)}: ${topic || 'Core skill'}`
  const specialized = buildSpecializedFallback({ taskType, domain: resolvedDomain, topic, userLevel, goal })
  const common = {
    ...specialized,
    title,
    taskType,
    domain: resolvedDomain,
    prompt: specialized.prompt || `Work through ${topic || 'this concept'} using the ${resolvedDomain} approach.`,
    guidance: adapter.assessmentStyle,
    userLevel: userLevel || 'beginner',
  }

  if (CODE_TASK_TYPE_SET.has(taskType)) {
    return buildCodingFallback({ taskType, domain: resolvedDomain, topic, goal, userLevel, lessonContent, taskTitle })
  }
  if (taskType === 'StepByStepProblem') {
    return {
      ...common,
      problem: `Solve a multi-step problem about ${topic || 'the current topic'}.`,
      steps: [
        { prompt: 'Name what is being asked and list the known information.' },
        { prompt: 'Choose the first rule, model, or relationship you will use.' },
        { prompt: 'Carry out the calculation or reasoning step and explain why it follows.' },
      ],
    }
  }
  if (taskType === 'AIConversationRoleplay') {
    return {
      ...common,
      persona: 'patient local guide',
      scenario: `Practice ${topic || 'the unit topic'} in a realistic conversation.`,
      opening: 'I will start simple. Respond naturally, and I will correct grammar and naturalness.',
      goals: ['Use the target vocabulary', 'Respond in full phrases', 'Recover from one misunderstanding'],
    }
  }
  if (taskType === 'SocraticDebate' || taskType === 'AdversarialDebate') {
    return {
      ...common,
      thesis: `${topic || 'This idea'} is more complicated than it first appears.`,
      opening: 'Take a position. I will push back with the strongest counterargument.',
      rounds: taskType === 'SocraticDebate' ? 5 : 3,
    }
  }
  if (taskType === 'RubricFeedback') {
    return {
      ...common,
      writingPrompt: `Write a short response applying ${topic || 'the current craft skill'}.`,
      rubric: ['clarity', 'structure', 'voice', 'evidence', 'concision'],
    }
  }
  if (taskType === 'DiagramAnalysis') {
    return {
      ...common,
      scenario: `Analyze the relationships in a diagram for ${topic || 'this physical system'}.`,
      diagramPrompt: 'Identify the main objects, variables, forces, flows, or relationships.',
      targets: ['object/system', 'inputs', 'relationships', 'outcome'],
    }
  }
  return common
}

function chooseTaskTypeForDomain({ taskType, domain, goal }) {
  const resolvedDomain = normalizeDomain(domain || DEFAULT_DOMAIN)
  if (CODE_TASK_TYPE_SET.has(taskType) && resolvedDomain !== 'CS_CODING') {
    return getDomainAssignmentType(resolvedDomain, 'guided_practice', goal)
      || getDomainAdapter(resolvedDomain).taskTypes.find((type) => type !== 'GeneratedLesson')
      || 'RubricFeedback'
  }
  return taskType
}

function promptLooksGeneric(prompt = '') {
  const text = String(prompt || '').trim()
  return !text
    || text.length < 80
    || /implement the function below|pass all test cases|write your solution here|complete the task|work through this concept/i.test(text)
}

function repairGeneratedTask(data, context) {
  const fallback = fallbackGenerate(context)
  if (!data || typeof data !== 'object' || Array.isArray(data)) return fallback

  const taskType = context.taskType
  const merged = {
    ...fallback,
    ...data,
    taskType,
    domain: context.domain,
  }

  if (CODE_TASK_TYPE_SET.has(taskType)) {
    const language = normalizeCodeLanguage(merged.language || fallback.language || detectCodeLanguageFromText(context.goal || context.topic || ''))
    merged.language = language
    if (promptLooksGeneric(merged.prompt)) merged.prompt = fallback.prompt
    if (!merged.title || String(merged.title).length < 4) merged.title = fallback.title
    merged.instructions = asList(merged.instructions).length ? asList(merged.instructions) : fallback.instructions
    merged.requirements = asList(merged.requirements).length ? asList(merged.requirements) : fallback.requirements
    merged.constraints = asList(merged.constraints).length ? asList(merged.constraints) : fallback.constraints
    merged.hints = asList(merged.hints || merged.bugHints).length ? asList(merged.hints || merged.bugHints) : fallback.hints
    merged.examples = Array.isArray(merged.examples) && merged.examples.length > 0 ? merged.examples : fallback.examples
    merged.testCases = Array.isArray(merged.testCases) && merged.testCases.length > 0 ? merged.testCases : fallback.testCases
    merged.starterCode = String(merged.starterCode || '').trim().length > 20 ? merged.starterCode : fallback.starterCode
    merged.functionSignature = merged.functionSignature || fallback.functionSignature
    return merged
  }

  if (promptLooksGeneric(merged.problem || merged.writingPrompt || merged.scenario || merged.prompt)) {
    merged.problem = fallback.problem || merged.problem
    merged.writingPrompt = fallback.writingPrompt || merged.writingPrompt
    merged.scenario = fallback.scenario || merged.scenario
    merged.prompt = fallback.prompt || merged.prompt
  }
  merged.steps = asList(merged.steps).length ? merged.steps : fallback.steps
  merged.goals = asList(merged.goals).length ? asList(merged.goals) : fallback.goals
  merged.targets = asList(merged.targets).length ? asList(merged.targets) : fallback.targets
  merged.rubric = asList(merged.rubric).length ? asList(merged.rubric) : fallback.rubric
  return merged
}

function fallbackEvaluate({ taskType }) {
  return {
    score: 70,
    passed: true,
    feedback: `Good start. The ${getDomainTaskLabel(taskType)} needs a little more specificity, but the core direction is usable.`,
    strengths: ['You attempted the core move.'],
    gaps: ['Add more concrete evidence, steps, or output proof.'],
    nextPrompt: 'Revise once with more detail, then compare it to the lesson.',
  }
}

async function callOpenAI(prompt) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: getOpenAIModel('practiceAi'),
      temperature: 0.35,
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) throw new Error(`domain_task_provider_${res.status}`)
  const data = await res.json()
  return JSON.parse(cleanJson(data?.choices?.[0]?.message?.content || ''))
}

export async function POST(request) {
  let body = {}
  try {
    body = await request.json()
    const {
      taskType,
      phase = 'generate',
      domain,
      topic,
      goal,
      taskTitle,
      lessonContent,
      userLevel,
      userResponse,
      transcript,
      stepIndex,
    } = body || {}
    if (!taskType) {
      return Response.json({ error: 'Missing domain task type' }, { status: 400 })
    }

    const resolvedDomain = normalizeDomain(resolvePracticeDomainForGoal(domain || DEFAULT_DOMAIN, goal || topic || taskTitle || ''))
    const effectiveTaskType = chooseTaskTypeForDomain({ taskType, domain: resolvedDomain, goal })
    const adapter = getDomainAdapter(resolvedDomain)

    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        phase === 'evaluate'
          ? fallbackEvaluate({ taskType: effectiveTaskType })
          : fallbackGenerate({ taskType: effectiveTaskType, domain: resolvedDomain, topic, goal, userLevel, lessonContent, taskTitle }),
      )
    }

    const baseContext = [
      `REQUESTED TASK TYPE: ${taskType} (${getDomainTaskLabel(taskType)})`,
      `EFFECTIVE TASK TYPE: ${effectiveTaskType} (${getDomainTaskLabel(effectiveTaskType)})`,
      `GOAL: ${goal || 'Unknown learning goal'}`,
      `TOPIC: ${topic || 'Current lesson topic'}`,
      `USER LEVEL: ${userLevel || 'beginner'}`,
      `LESSON CONTENT: ${lessonContent || 'Use the topic and domain adapter.'}`,
      formatDomainForPrompt(resolvedDomain),
    ].join('\n')

    if (phase === 'evaluate') {
      const prompt = `${baseContext}

Evaluate the learner response using this assessment style:
${adapter.assessmentStyle}

STEP INDEX: ${Number.isFinite(Number(stepIndex)) ? stepIndex : 'N/A'}
TRANSCRIPT JSON: ${JSON.stringify(transcript || [])}
LEARNER RESPONSE:
${userResponse || ''}

Return ONLY valid JSON:
{
  "score": 0,
  "passed": true,
  "feedback": "specific feedback",
  "strengths": ["specific strength"],
  "gaps": ["specific gap"],
  "nextPrompt": "what the learner should do next",
  "rubricScores": {"dimension": 1}
}`
      return Response.json(await callOpenAI(prompt))
    }

    const prompt = `${baseContext}

Generate a fresh ${getDomainTaskLabel(effectiveTaskType)} challenge. It must fit the domain, topic, user level, lesson tone, and example style.

Important routing rule:
- Only generate coding/editor/test-case tasks when EFFECTIVE TASK TYPE is CodeSandbox, DebugChallenge, or MiniProject AND the domain is CS_CODING.
- For every other domain, generate a subject-shaped workspace task. Do not turn the domain into a generic quiz with renamed labels.
- Math should use steps, equations, graphs, proofs, or calculator-style interactions.
- Physics should use diagrams, vectors, simulations, units, graph interpretation, or variable controls.
- Chemistry should use molecules, reactions, balancing, lab observations, periodic-table style data, or nomenclature.
- Biology and health should use diagrams, body/process systems, lab observations, classifications, or safe case-chart reasoning.
- Languages should use conversation, sentence building, translation, pronunciation, listening, or vocab in context.
- Cybersecurity should use defensive safe sandboxes: phishing triage, risk reports, threat models, logs, or network diagrams. Never provide exploit instructions.
- ML/AI, data science, and statistics should use datasets, tables, charts, model metrics, confusion matrices, distributions, simulations, or inference tasks.
- Business, economics, finance, government, history, reading, psychology, and philosophy should use evidence boards, decision dashboards, timelines, source/case analysis, policy briefs, or argument maps.
- Engineering, technology, art/design, music, and communication should use prototype/test benches, workflow panels, canvas/rubric boards, notation/rhythm tools, or presentation rehearsal surfaces.
- Never return the generic phrase "Implement the function below to pass all test cases." The learner must see a concrete task with enough instructions to start.

${CODE_TASK_TYPE_SET.has(effectiveTaskType) ? `Coding task requirements:
- Choose the coding language from the learner goal/topic when possible.
- The prompt must describe a specific problem, input/output behavior, and what the learner is building.
- Include instructions[], requirements[], examples[], constraints[], functionSignature, starterCode, testCases[], and hints[].
- starterCode must include useful shell code with TODO comments, not a blank file.
- testCases must match the exact problem statement.` : `Non-coding task requirements:
- Do not include starterCode, programming tests, or code sandbox language fields.
- Make the learner action match the domain adapter. A Spanish goal should practice conversation/vocab; physics should use units/diagrams/reasoning; writing should draft or revise; math should solve step by step.`}

Return ONLY valid JSON. Include the fields needed by this task type:
- CodeSandbox: title, prompt, language, starterCode, testCases[{input, expected, explanation}]
- DebugChallenge: title, prompt, language, starterCode, testCases[{input, expected, explanation}], bugHints[]
- MiniProject: title, prompt, language, starterCode, testCases[{input, expected, explanation}], successCriteria
- StepByStepProblem: title, problem, steps[{prompt, expectedSignals}]
- ApplicationProblem/SolveWithUnits/BalanceEquations/ReactionPrediction/GeneticsProblemSet: title, problem, steps[{prompt, expectedSignals}]
- AIConversationRoleplay: title, persona, scenario, targetLanguage, opening, goals[]
- SocraticDebate/AdversarialDebate/PolicyDebate/MockDebate: title, thesis or positionPrompt, opening, rounds, evidenceHints[]
- RubricFeedback/TimedPrompt/RewriteForClarity/CauseEffectEssay/PolicyBrief/ResearchCritique: title, writingPrompt, rubric[]
- DiagramAnalysis/LabelDiagram/GraphInterpretation/TimelineOrdering/ArgumentMapping: title, scenario, diagramPrompt, targets[]
- Defensive security tasks: title, scenario, artifacts[{label, detail}], riskFactors[], mitigations[], networkNodes[]
- Data/AI/statistics tasks: title, dataset{columns,rows}, models[], metrics or confusionMatrix, tasks[]
- Engineering/technology tasks: title, brief, constraints[], prototypeOptions[], testBench[]
- Finance/business/economics tasks: title, dashboard[], decisionOptions[], evidenceCards[]
- Reading/history/civics/psychology/logic tasks: title, passage or caseBrief, evidenceCards[], boardColumns[], promptFrames[]
- Art/design/music/communication tasks: title, canvasBrief or rhythmPattern or outlineSlots, rubric/checklist arrays`

    return Response.json(repairGeneratedTask(await callOpenAI(prompt), {
      taskType: effectiveTaskType,
      domain: resolvedDomain,
      topic,
      goal,
      userLevel,
      lessonContent,
      taskTitle,
    }))
  } catch (error) {
    const status = body?.taskType ? 200 : 500
    const fallbackDomain = normalizeDomain(resolvePracticeDomainForGoal(body?.domain || DEFAULT_DOMAIN, body?.goal || body?.topic || body?.taskTitle || ''))
    const fallbackTaskType = body?.taskType
      ? chooseTaskTypeForDomain({ taskType: body.taskType, domain: fallbackDomain, goal: body?.goal })
      : body?.taskType
    return Response.json(
      body?.phase === 'evaluate'
        ? fallbackEvaluate({ taskType: fallbackTaskType || body?.taskType })
        : fallbackGenerate({ ...(body || {}), taskType: fallbackTaskType || body?.taskType, domain: fallbackDomain }),
      { status },
    )
  }
}
