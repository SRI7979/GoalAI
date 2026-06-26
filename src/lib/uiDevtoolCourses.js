import {
  LEARNING_DOMAINS,
  getDomainAssignmentType,
  getDomainMetadata,
  getDomainTaskLabel,
  getDomainWorkspaceType,
} from './domainAdapter'

export const DEVTOOL_DOMAIN_PROMPTS = Object.freeze({
  CS_CODING: 'Teach me Python programming from zero',
  MATHEMATICS: 'Teach me algebra, functions, and problem solving',
  PHYSICS: 'Teach me kinematics and motion graphs',
  CHEMISTRY: 'Teach me chemical reactions and equation balancing',
  BIOLOGY: 'Teach me genetics and cell biology',
  ENGINEERING: 'Teach me engineering design constraints',
  TECHNOLOGY: 'Teach me technology troubleshooting workflows',
  CYBERSECURITY: 'Teach me defensive cybersecurity and phishing detection',
  ML_AI: 'Teach me machine learning model evaluation',
  DATA_SCIENCE: 'Teach me data cleaning and visualization',
  STATISTICS: 'Teach me hypothesis testing and uncertainty',
  ECONOMICS: 'Teach me supply, demand, and market shocks',
  FINANCE: 'Teach me budgeting, investing, and portfolio risk',
  BUSINESS: 'Teach me SaaS business metrics and strategy',
  WRITING: 'Teach me persuasive writing and revision',
  READING_COMPREHENSION: 'Teach me close reading and evidence use',
  HISTORY: 'Teach me the causes of the French Revolution',
  GOVERNMENT_CIVICS: 'Teach me civics and political systems',
  PSYCHOLOGY: 'Teach me cognitive psychology studies',
  MEDICINE_HEALTH: 'Teach me human body systems safely',
  ENVIRONMENTAL_SCIENCE: 'Teach me ecosystems and climate tradeoffs',
  FOREIGN_LANGUAGE: 'Teach me conversational Spanish for travel',
  ART_DESIGN: 'Teach me UI design and visual hierarchy',
  MUSIC: 'Teach me rhythm and music theory',
  COMMUNICATION: 'Teach me public speaking and audience response',
})

export const CS_PYTHON_DEVTOOL_PROMPT = 'I want to learn python'

export const DEVTOOL_LESSON_TYPES = Object.freeze([
  { id: 'course_map', label: 'Course Map', stage: 'plan', description: 'Premade curriculum sequence for the selected domain.' },
  { id: 'lesson', label: 'Lesson', stage: 'learn', description: 'Fullscreen concept slideshow with one exact topic, checks, and final proof.' },
  { id: 'guided_practice', label: 'Guided Practice', stage: 'practice', description: 'Scaffolded domain task with hints and partial support.' },
  { id: 'domain_task', label: 'Domain Task', stage: 'workspace', description: 'Hands-on subject workspace for the selected domain.' },
  { id: 'quiz', label: 'Quiz', stage: 'check', description: 'Fast concept check using domain-specific evidence.' },
  { id: 'test', label: 'Test', stage: 'verify', description: 'Higher confidence proof check across multiple skills.' },
  { id: 'flashcards', label: 'Flashcards', stage: 'recall', description: 'Retrieval and spaced repetition cards.' },
  { id: 'discussion', label: 'Discussion', stage: 'explain', description: 'Teach-back or debate-style explanation task.' },
  { id: 'reflection', label: 'Reflection', stage: 'reflect', description: 'Metacognitive wrap-up and misconception capture.' },
  { id: 'mini_project', label: 'Mini Project', stage: 'build', description: 'Small authentic artifact from the current concept.' },
  { id: 'milestone_project', label: 'Milestone Project', stage: 'capstone', description: 'Unit project that combines several concepts.' },
  { id: 'boss', label: 'Boss Challenge', stage: 'boss', description: 'Pressure checkpoint with transfer and proof.' },
  { id: 'final_exam', label: 'Final Exam', stage: 'final', description: 'End-of-course proof across the full premade path.' },
  { id: 'new_lesson_slideshow', label: 'New Lesson slideshow', stage: 'preview', description: 'Static P5-style lesson slideshow with live dynamic SVG diagrams embedded in context.' },
])

function promptForDomain(domain, promptOverride = null) {
  if (promptOverride) return promptOverride
  const meta = getDomainMetadata(domain)
  return DEVTOOL_DOMAIN_PROMPTS[domain] || `Teach me ${String(meta?.label || domain).toLowerCase()}`
}

function isPythonPrompt(prompt) {
  return /\bpython\b/i.test(String(prompt || ''))
}

function commonTask(domain, taskType, title, promptOverride = null) {
  const meta = getDomainMetadata(domain)
  const prompt = promptForDomain(domain, promptOverride)
  return {
    title,
    taskType,
    domain,
    workspaceType: getDomainWorkspaceType(domain),
    schemaVersion: 2,
    userLevel: 'beginner',
    prompt: `Static UI lab task for: ${prompt}.`,
    mission: `Use the ${meta.label} workspace to prove one usable skill.`,
    proofRules: ['show the domain move', 'explain the decision', 'finish with transfer proof'],
    expectedProof: `A ${meta.label} proof that can be reviewed without live APIs.`,
    successCriteria: [
      'The learner performs the subject-specific action.',
      'The work exposes intermediate reasoning.',
      'The final proof can transfer to a nearby new scenario.',
    ],
    hints: [
      'Use the visible workspace artifact first.',
      'Name the evidence or rule you used.',
      'Finish by explaining why the answer works.',
    ],
  }
}

function buildWorkspaceTask(domain, requestedType = null, promptOverride = null) {
  const meta = getDomainMetadata(domain)
  const workspaceType = getDomainWorkspaceType(domain)
  const prompt = promptForDomain(domain, promptOverride)
  const taskType = requestedType
    || getDomainAssignmentType(domain, 'guided_practice', prompt)
    || 'ConceptApplication'
  const base = commonTask(domain, taskType, `${getDomainTaskLabel(taskType)} Lab`, prompt)

  if (workspaceType === 'coding') {
    if (isPythonPrompt(prompt)) {
      return {
        ...base,
        title: 'Python Variables and Output Lab',
        language: 'python',
        functionSignature: '',
        prompt: 'Create a tiny Python program that stores information in variables, then prints a useful sentence with those values.',
        instructions: [
          'Create a variable named name and store a short text value in it.',
          'Create a variable named minutes and store a number in it.',
          'Use print() to show one sentence that includes both values.',
        ],
        requirements: [
          'Use = to assign each variable.',
          'Put text values inside quotes.',
          'Call print() with a sentence or f-string that includes the variables.',
        ],
        starterCode: [
          'name = "Ari"',
          'minutes = 20',
          '',
          '# Print: Ari will practice Python for 20 minutes.',
          'print()',
        ].join('\n'),
        expectedOutput: 'Ari will practice Python for 20 minutes.',
        testCases: [
          { input: 'name = "Ari", minutes = 20', expected: 'Ari will practice Python for 20 minutes.', explanation: 'The program should combine stored values into readable output.' },
        ],
      }
    }

    return {
      ...base,
      title: 'Python List Filter Lab',
      language: 'python',
      functionSignature: 'solve(items)',
      prompt: 'Write solve(items) so it returns only the active study tasks. This is static and runs in preview mode.',
      instructions: ['Read each dictionary in the list.', 'Keep rows where status is active.', 'Return the title values in order.'],
      requirements: ['Name the function solve.', 'Return a list of strings.', 'Do not mutate the input.'],
      starterCode: [
        'def solve(items):',
        '    # TODO: return titles whose status is "active"',
        '    return []',
      ].join('\n'),
      testCases: [
        { input: "[{'title':'Variables','status':'active'},{'title':'Loops','status':'done'}]", expected: "['Variables']", explanation: 'Only active tasks remain.' },
      ],
    }
  }

  if (workspaceType === 'math') {
    return {
      ...base,
      problem: 'Solve a linear function problem and prove each step.',
      givens: ['f(x)=2x+3', 'f(x)=11', 'target: x'],
      equationSlots: ['Define target', 'Subtract 3', 'Divide by 2', 'Check in original'],
      steps: [
        { prompt: 'Name the unknown and rewrite the equation.' },
        { prompt: 'Undo addition before multiplication.' },
        { prompt: 'Substitute back to verify the answer.' },
      ],
      proofBoard: ['Setup', 'Transformation', 'Result', 'Check'],
    }
  }

  if (workspaceType === 'physics' || workspaceType === 'environment') {
    return {
      ...base,
      scenario: workspaceType === 'environment' ? 'Adjust resource use and predict ecosystem pressure.' : 'Adjust motion variables and predict acceleration.',
      givens: ['initial velocity = 0 m/s', 'acceleration = 3 m/s^2', 'time = 4 s'],
      simulation: {
        controls: [
          { id: 'mass', label: workspaceType === 'environment' ? 'Resource use' : 'Mass', min: 1, max: 10, value: 5, unit: workspaceType === 'environment' ? 'index' : 'kg' },
          { id: 'angle', label: workspaceType === 'environment' ? 'Habitat pressure' : 'Angle', min: 0, max: 60, value: 30, unit: workspaceType === 'environment' ? '%' : 'deg' },
          { id: 'friction', label: workspaceType === 'environment' ? 'Recovery capacity' : 'Friction', min: 0, max: 1, value: 0.2, unit: 'factor', step: 0.1 },
        ],
      },
      targets: ['diagram', 'variable change', 'prediction', 'explanation'],
      impactCards: ['short-term effect', 'long-term tradeoff', 'mitigation'],
    }
  }

  if (workspaceType === 'chemistry') {
    return {
      ...base,
      scenario: 'Balance propane combustion and explain atom conservation.',
      sides: { reactants: ['C3H8', 'O2'], products: ['CO2', 'H2O'] },
      atomCounts: { C3H8: { C: 3, H: 8 }, O2: { O: 2 }, CO2: { C: 1, O: 2 }, H2O: { H: 2, O: 1 } },
      correctCoefficients: { C3H8: 1, O2: 5, CO2: 3, H2O: 4 },
      reactionCards: ['Inventory atoms', 'Adjust coefficients', 'Check both sides', 'Explain conservation'],
    }
  }

  if (workspaceType === 'biology' || workspaceType === 'health') {
    return {
      ...base,
      safetyNotice: workspaceType === 'health' ? 'Educational only. No diagnosis or treatment advice.' : '',
      diagram: workspaceType === 'health' ? 'body-system' : 'gene-expression',
      cards: [
        { id: 'input', label: workspaceType === 'health' ? 'Body system' : 'DNA' },
        { id: 'process', label: workspaceType === 'health' ? 'Normal function' : 'Transcription' },
        { id: 'signal', label: workspaceType === 'health' ? 'Observation' : 'mRNA' },
        { id: 'output', label: workspaceType === 'health' ? 'Safe boundary' : 'Protein' },
      ],
      targets: [
        { id: 'stage-1', label: 'Start', x: 18, y: 44 },
        { id: 'stage-2', label: 'Process', x: 42, y: 28 },
        { id: 'stage-3', label: 'Signal', x: 64, y: 48 },
        { id: 'stage-4', label: 'Output', x: 82, y: 34 },
      ],
      processSteps: ['Observe', 'Label', 'Sequence', 'Explain'],
      anatomyTargets: ['structure', 'function', 'process', 'safety'],
    }
  }

  if (workspaceType === 'language') {
    return {
      ...base,
      persona: 'Cafe worker in Madrid',
      targetLanguage: 'Spanish',
      scenario: 'Order coffee and respond naturally.',
      chatTurns: [{ id: 'hello', role: 'ai', speaker: 'Camarero', text: 'Hola. Que te gustaria pedir?' }],
      responseOptions: [
        { id: 'best', text: 'Quisiera un cafe con leche, por favor.', best: true },
        { id: 'ok', text: 'Cafe yo quiero.', best: false },
        { id: 'off', text: 'Where is the train station?', best: false },
      ],
      goals: ['use a polite request', 'keep word order natural', 'respond in context'],
    }
  }

  if (workspaceType === 'security') {
    return {
      ...base,
      safetyNotice: 'Defensive sandbox only.',
      scenario: 'Triage a suspicious login email.',
      artifacts: [
        { id: 'email', label: 'Inbox message', detail: 'Urgent password reset through an unfamiliar link.' },
        { id: 'sender', label: 'Sender domain', detail: 'Display name says IT, domain is not the company domain.' },
        { id: 'log', label: 'Login log', detail: 'New sign-in attempt from a new location.' },
      ],
      riskFactors: ['urgency pressure', 'domain mismatch', 'credential request', 'unusual login'],
      mitigations: ['report message', 'verify through trusted channel', 'reset exposed password', 'enable MFA'],
      networkNodes: ['user', 'mail gateway', 'identity provider', 'security review'],
    }
  }

  if (workspaceType === 'data_ai') {
    return {
      ...base,
      dataset: {
        columns: ['example', 'feature', 'actual', 'prediction', 'confidence'],
        rows: [['A', 'clear signal', 'yes', 'yes', '0.91'], ['B', 'edge case', 'no', 'yes', '0.58'], ['C', 'low signal', 'no', 'no', '0.77']],
      },
      models: [
        { id: 'simple', label: 'Simple model', accuracy: 75, precision: 72, recall: 80 },
        { id: 'complex', label: 'Complex model', accuracy: 84, precision: 88, recall: 70 },
      ],
      confusionMatrix: { truePositive: 18, falsePositive: 4, falseNegative: 7, trueNegative: 21 },
      tasks: ['inspect rows', 'compare metrics', 'find error pattern', 'name limitation'],
    }
  }

  if (workspaceType === 'statistics') {
    return {
      ...base,
      distribution: { mean: 52, spread: 11, sampleSize: 36 },
      hypothesis: 'The new study method changes average quiz score.',
      choices: ['one-sample t-test', 'chi-square test', 'correlation only'],
      interpretationFrames: ['assumptions', 'test choice', 'uncertainty statement'],
    }
  }

  if (workspaceType === 'engineering' || workspaceType === 'technology') {
    return {
      ...base,
      brief: workspaceType === 'technology' ? 'Diagnose a broken file sync workflow.' : 'Choose a prototype that fits cost, safety, and durability.',
      constraints: ['budget limit', 'reliable under repeated use', 'clear maintenance path', 'safe failure mode'],
      prototypeOptions: [
        { id: 'lean', label: 'Lean option', tradeoff: 'fast and cheap, less durable' },
        { id: 'balanced', label: 'Balanced option', tradeoff: 'moderate cost, passes most tests' },
        { id: 'robust', label: 'Robust option', tradeoff: 'stronger, slower, more expensive' },
      ],
      testBench: [
        { id: 'cost', label: 'Cost test', target: 'under budget' },
        { id: 'load', label: 'Stress test', target: 'survives expected load' },
        { id: 'repair', label: 'Repair test', target: 'easy to fix' },
      ],
    }
  }

  if (['economics', 'finance', 'business'].includes(workspaceType)) {
    return {
      ...base,
      dashboard: [
        { label: workspaceType === 'finance' ? 'Risk' : 'Key metric', value: workspaceType === 'economics' ? 'demand rising' : 'warning signal', signal: 'warning' },
        { label: 'Constraint', value: 'limited resources', signal: 'neutral' },
        { label: 'Upside', value: 'clear opportunity', signal: 'positive' },
      ],
      decisionOptions: [
        { id: 'safe', label: 'Conservative choice', tradeoff: 'lower risk, lower upside' },
        { id: 'balanced', label: 'Balanced choice', tradeoff: 'uses evidence and protects downside' },
        { id: 'bold', label: 'Aggressive choice', tradeoff: 'higher upside, higher risk' },
      ],
      evidenceCards: ['metric evidence', 'stakeholder effect', 'tradeoff', 'recommendation'],
    }
  }

  if (workspaceType === 'creative' || workspaceType === 'writing') {
    return {
      ...base,
      canvasBrief: workspaceType === 'writing' ? 'Revise a persuasive paragraph for clarity and structure.' : 'Create a composition with clear hierarchy.',
      styleControls: workspaceType === 'writing' ? ['clarity', 'structure', 'voice', 'evidence'] : ['contrast', 'hierarchy', 'alignment', 'color'],
      critiqueRubric: ['intent', 'clarity', 'craft', 'iteration'],
      moodboard: ['reference', 'palette', 'layout', 'revision'],
    }
  }

  if (workspaceType === 'music') {
    return {
      ...base,
      rhythmPattern: ['1', '&', '2', '&', '3', '&', '4', '&'],
      notation: ['C', 'E', 'G', 'rest'],
      listeningChoices: ['same rhythm', 'syncopated', 'interval up', 'interval down'],
      practiceModes: ['clap rhythm', 'place notes', 'identify interval', 'explain pattern'],
    }
  }

  if (workspaceType === 'communication') {
    return {
      ...base,
      audience: 'curious but busy audience',
      outlineSlots: ['opening hook', 'main point', 'evidence/example', 'close'],
      deliveryRubric: ['clarity', 'pace', 'audience fit', 'confidence'],
      audienceQuestions: ['Why should I care?', 'What evidence supports it?', 'What happens next?'],
    }
  }

  return {
    ...base,
    passage: `A short source about ${prompt}. The learner must identify the claim, evidence, context, and limitation before writing a proof.`,
    evidenceCards: [
      { id: 'claim', label: 'main claim' },
      { id: 'evidence', label: 'best evidence' },
      { id: 'context', label: 'context' },
      { id: 'limit', label: 'limitation' },
    ],
    boardColumns: ['Claim', 'Evidence', 'Context', 'Limitation'],
    promptFrames: ['what the source says', 'what evidence supports it', 'what not to overclaim'],
  }
}

function conceptFromPrompt(prompt, domain = null) {
  if (domain === 'CS_CODING' && isPythonPrompt(prompt)) return 'What is a variable?'
  return prompt
    .replace(/^Teach me\s+/i, '')
    .replace(/^I want to learn\s+/i, '')
    .trim()
}

export function buildDevtoolCourse(domain, options = {}) {
  const promptOverride = typeof options === 'string' ? options : options?.promptOverride
  const safeDomain = LEARNING_DOMAINS.includes(domain) ? domain : LEARNING_DOMAINS[0]
  const meta = getDomainMetadata(safeDomain)
  const prompt = promptForDomain(safeDomain, promptOverride)
  const concept = conceptFromPrompt(prompt, safeDomain)
  const guidedType = getDomainAssignmentType(safeDomain, 'guided_practice', prompt)
  const quizType = getDomainAssignmentType(safeDomain, 'quiz', prompt)
  const challengeType = getDomainAssignmentType(safeDomain, 'challenge', prompt)
  const explainType = getDomainAssignmentType(safeDomain, 'explain', prompt)
  const projectType = getDomainAssignmentType(safeDomain, 'project', prompt)

  return {
    domain: safeDomain,
    domainLabel: meta.label,
    prompt,
    apiPrompt: [
      `Create a full PathAI curriculum for this goal: "${prompt}".`,
      `Domain: ${safeDomain} (${meta.label}).`,
      'Generate concept slideshow lessons that teach exactly one specific topic, then domain-specific workspaces, quizzes/tests, reflections, mini projects, milestone projects, boss challenges, and a final exam.',
      'Each task must require proof of knowledge and must use the subject workspace instead of a generic quiz shell.',
    ].join('\n'),
    concept,
    tasks: [
      { id: 'lesson', type: 'lesson', title: isPythonPrompt(prompt) && safeDomain === 'CS_CODING' ? 'Concept Slideshow: What is a variable?' : `${meta.label} Concept Slideshow: ${concept}`, duration: '10 min', proof: 'pass mini checks and the final proof check' },
      { id: 'guided_practice', type: guidedType || 'guided_practice', title: `${getDomainTaskLabel(guidedType)} Practice`, duration: '12 min', proof: 'complete the scaffolded workspace' },
      { id: 'quiz', type: quizType || 'quiz', title: `${meta.label} Quiz Check`, duration: '6 min', proof: 'answer with evidence from the lesson' },
      { id: 'test', type: challengeType || 'test', title: `${meta.label} Transfer Test`, duration: '15 min', proof: 'solve a nearby new scenario' },
      { id: 'flashcards', type: 'recall', title: `${meta.label} Recall Set`, duration: '5 min', proof: 'retrieve key terms without hints' },
      { id: 'discussion', type: explainType || 'explain', title: `${meta.label} Teach-Back`, duration: '8 min', proof: 'explain the why behind the answer' },
      { id: 'reflection', type: 'reflection', title: `${meta.label} Reflection`, duration: '4 min', proof: 'name one clear win and one fragile point' },
      { id: 'mini_project', type: projectType || 'project', title: `${meta.label} Mini Project`, duration: '35 min', proof: 'create a small authentic artifact' },
      { id: 'milestone_project', type: 'milestone_project', title: `${meta.label} Milestone Project`, duration: '60 min', proof: 'combine three skills into one artifact' },
      { id: 'boss', type: 'boss', title: `${meta.label} Boss Challenge`, duration: '25 min', proof: 'perform under less scaffolding' },
      { id: 'final_exam', type: 'final_exam', title: `${meta.label} Final Verification`, duration: '45 min', proof: 'prove readiness across the full course' },
      { id: 'new_lesson_slideshow', type: 'new_lesson_slideshow', title: 'New Lesson slideshow: Python variables', duration: '10 min', proof: 'preview the new lesson shell with embedded diagrams' },
    ],
    workspaceTask: buildWorkspaceTask(safeDomain, guidedType, prompt),
    quizTask: buildWorkspaceTask(safeDomain, quizType || guidedType, prompt),
    challengeTask: buildWorkspaceTask(safeDomain, challengeType || guidedType, prompt),
  }
}
