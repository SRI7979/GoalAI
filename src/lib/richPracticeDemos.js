import { DOMAIN_ADAPTERS, DOMAIN_METADATA, LEARNING_DOMAINS, getDomainTaskLabel } from './domainAdapter'

export const DOMAIN_GOALS = Object.freeze({
  CS_CODING: 'Learn JavaScript data structures for interviews',
  MATHEMATICS: 'Master calculus problem solving',
  FOREIGN_LANGUAGE: 'Learn conversational Spanish for travel',
  PHYSICS: 'Understand Newtonian mechanics',
  HISTORY: 'Learn the causes of the French Revolution',
  ECONOMICS: 'Understand supply, demand, and market shocks',
  CHEMISTRY: 'Learn chemical reactions and equations',
  ENGINEERING: 'Learn engineering design tradeoffs',
  TECHNOLOGY: 'Get better at troubleshooting technology workflows',
  CYBERSECURITY: 'Learn defensive cybersecurity fundamentals',
  ML_AI: 'Understand machine learning model evaluation',
  DATA_SCIENCE: 'Learn data cleaning and visualization',
  STATISTICS: 'Understand hypothesis testing and uncertainty',
  FINANCE: 'Learn budgeting, investing, and risk',
  BUSINESS: 'Learn business strategy and metrics',
  PHILOSOPHY_LOGIC: 'Get better at logic and ethical arguments',
  WRITING: 'Improve clear persuasive writing',
  READING_COMPREHENSION: 'Improve close reading and evidence use',
  PSYCHOLOGY: 'Understand cognitive psychology studies',
  GOVERNMENT_CIVICS: 'Learn comparative political systems and civics',
  BIOLOGY: 'Understand genetics and cell biology',
  MEDICINE_HEALTH: 'Understand health science systems safely',
  ENVIRONMENTAL_SCIENCE: 'Understand ecosystems and climate tradeoffs',
  ART_DESIGN: 'Learn visual design and critique',
  MUSIC: 'Learn rhythm, notation, and ear training',
  COMMUNICATION: 'Improve public speaking and audience response',
})

export const DOMAIN_TOPICS = Object.freeze({
  CS_CODING: 'Filtering task records',
  MATHEMATICS: 'Related rates',
  FOREIGN_LANGUAGE: 'Ordering food in Spanish',
  PHYSICS: 'Forces on an incline',
  HISTORY: 'Revolutionary causes',
  ECONOMICS: 'Demand shock analysis',
  CHEMISTRY: 'Balancing combustion reactions',
  ENGINEERING: 'Prototype constraint review',
  TECHNOLOGY: 'Troubleshooting a broken workflow',
  CYBERSECURITY: 'Phishing and account defense',
  ML_AI: 'Confusion matrix evaluation',
  DATA_SCIENCE: 'Cleaning a small dataset',
  STATISTICS: 'Choosing a hypothesis test',
  FINANCE: 'Portfolio risk tradeoffs',
  BUSINESS: 'Diagnosing SaaS metrics',
  PHILOSOPHY_LOGIC: 'Testing an argument',
  WRITING: 'Sharper thesis paragraphs',
  READING_COMPREHENSION: 'Annotating evidence',
  PSYCHOLOGY: 'Memory experiment critique',
  GOVERNMENT_CIVICS: 'Federal versus unitary systems',
  BIOLOGY: 'Gene expression',
  MEDICINE_HEALTH: 'Body system safety reasoning',
  ENVIRONMENTAL_SCIENCE: 'Ecosystem impact analysis',
  ART_DESIGN: 'Composition and hierarchy',
  MUSIC: 'Rhythm grid practice',
  COMMUNICATION: 'Presentation outline rehearsal',
})

export const DOMAIN_ACCENTS = Object.freeze({
  CS_CODING: '#0ef5c2',
  MATHEMATICS: '#60a5fa',
  FOREIGN_LANGUAGE: '#f97316',
  PHYSICS: '#a78bfa',
  HISTORY: '#facc15',
  ECONOMICS: '#34d399',
  CHEMISTRY: '#fb7185',
  ENGINEERING: '#f59e0b',
  TECHNOLOGY: '#38bdf8',
  CYBERSECURITY: '#22d3ee',
  ML_AI: '#22d3ee',
  DATA_SCIENCE: '#38bdf8',
  STATISTICS: '#60a5fa',
  FINANCE: '#facc15',
  BUSINESS: '#a78bfa',
  PHILOSOPHY_LOGIC: '#c084fc',
  WRITING: '#fbbf24',
  READING_COMPREHENSION: '#fbbf24',
  PSYCHOLOGY: '#38bdf8',
  GOVERNMENT_CIVICS: '#818cf8',
  BIOLOGY: '#4ade80',
  MEDICINE_HEALTH: '#fb7185',
  ENVIRONMENTAL_SCIENCE: '#4ade80',
  ART_DESIGN: '#f472b6',
  MUSIC: '#c084fc',
  COMMUNICATION: '#7dd3fc',
})

export const DOMAIN_ORDER = Object.freeze([...LEARNING_DOMAINS])

function task(taskType, interactionType, title, prompt, instructions, extra = {}) {
  return {
    taskType,
    title,
    prompt,
    instructions,
    interactionType,
    feedback: {
      success: 'Clean. This is the kind of move PathAI would reward with XP.',
      partial: 'Good start. Tighten the missing pieces, then check it again.',
      retry: 'Not there yet. Use the activity clues and try another pass.',
      ...extra.feedback,
    },
    ...extra,
  }
}

const RICH_TASKS_BY_DOMAIN = Object.freeze({
  CS_CODING: [
    task('CodeSandbox', 'codeSandbox', 'Filter Open Tasks', 'Write a function that keeps only open task rows and returns their titles.', 'Read the problem, edit the starter code, then run the tests.', {
      language: 'JavaScript',
      fileName: 'solution.js',
      starterCode: [
        'function solve(input) {',
        '  const rows = String(input).trim().split(/\\n+/).filter(Boolean)',
        '  // TODO: keep only rows with status open',
        '  return ""',
        '}',
      ].join('\n'),
      requiredSnippets: ['filter', 'open', 'join'],
      testCases: [
        { id: 'code-test-1', input: 'Build UI|open\nWrite tests|done\nShip fix|open', expected: 'Build UI, Ship fix' },
        { id: 'code-test-2', input: 'Write docs|blocked\\nClose sprint|done', expected: '' },
        { id: 'code-test-3', input: 'Refactor parser|open', expected: 'Refactor parser' },
      ],
      tests: [
        { id: 'code-test-1', input: 'Build UI|open\nWrite tests|done\nShip fix|open', expected: 'Build UI, Ship fix' },
        { id: 'code-test-2', input: 'Write docs|blocked\\nClose sprint|done', expected: '' },
        { id: 'code-test-3', input: 'Refactor parser|open', expected: 'Refactor parser' },
      ],
    }),
    task('DebugChallenge', 'debugCode', 'Repair the Completion Counter', 'The function counts every task instead of only completed tasks.', 'Inspect the failing tests, find the bug, and patch the broken line.', {
      language: 'JavaScript',
      fileName: 'counter.js',
      starterCode: [
        'function countDone(tasks) {',
        '  return tasks.length',
        '}',
        '',
        'module.exports = countDone',
      ].join('\n'),
      bugHint: 'The tests expect a filter by status before counting.',
      requiredSnippets: ['filter', 'done'],
      testCases: [
        { id: 'debug-test-1', input: '[done, open, done]', expected: '2', failing: true },
        { id: 'debug-test-2', input: '[open, blocked]', expected: '0', failing: true },
      ],
      tests: [
        { id: 'debug-test-1', input: '[done, open, done]', expected: '2', failing: true },
        { id: 'debug-test-2', input: '[open, blocked]', expected: '0', failing: true },
      ],
    }),
    task('MiniProject', 'miniProject', 'Build a Study Checklist Card', 'Create a tiny UI card that turns an abstract topic into three concrete study actions.', 'Use the builder checklist to assemble the page preview.', {
      language: 'HTML',
      fileName: 'index.html',
      previewTitle: 'Array Practice Sprint',
      starterCode: [
        '<main class="study-card">',
        '  <h1>Array Practice Sprint</h1>',
        '  <!-- Add a short summary and three checklist items -->',
        '</main>',
      ].join('\n'),
      requirements: [
        { id: 'project-heading', label: 'Clear heading', keyword: '<h1' },
        { id: 'project-summary', label: 'Short explanation', keyword: '<p' },
        { id: 'project-list', label: 'Three checklist items', keyword: '<li' },
      ],
    }),
  ],
  MATHEMATICS: [
    task('StepByStepProblem', 'stepCards', 'Related Rates Step Check', 'A ladder slides down a wall. Arrange the reasoning before solving.', 'Put the steps in the order a careful solver would use.', {
      cards: [
        { id: 'math-variables', label: 'Define x and y as changing distances.' },
        { id: 'math-equation', label: 'Connect them with x^{2} + y^{2} = L^{2}.' },
        { id: 'math-differentiate', label: 'Differentiate both sides with respect to time.' },
        { id: 'math-substitute', label: 'Substitute known values and solve for \\frac{dy}{dt}.' },
      ],
      correctOrder: ['math-variables', 'math-equation', 'math-differentiate', 'math-substitute'],
    }),
    task('ProofWriting', 'proofBuilder', 'Even Plus Even Proof Skeleton', 'Build a proof by placing the right statement into each slot.', 'Select a statement card, then click the proof slot where it belongs.', {
      zones: [
        { id: 'proof-assume', label: 'Assume', statement: 'Suppose a and b are even integers.' },
        { id: 'proof-define', label: 'Use definition', statement: 'Write each even integer in the form 2k.' },
        { id: 'proof-combine', label: 'Combine', statement: 'Add the expressions and factor out 2.' },
        { id: 'proof-conclude', label: 'Conclude', statement: 'Show the sum is still even.' },
      ],
      cards: [
        { id: 'proof-card-1', label: 'Let a = 2m and b = 2n for integers m,n.' },
        { id: 'proof-card-2', label: 'Then a + b = 2m + 2n = 2(m+n).' },
        { id: 'proof-card-3', label: 'Since m+n is an integer, a+b is even.' },
        { id: 'proof-card-4', label: 'Suppose a and b are even integers.' },
      ],
      correctMatches: {
        'proof-assume': 'proof-card-4',
        'proof-define': 'proof-card-1',
        'proof-combine': 'proof-card-2',
        'proof-conclude': 'proof-card-3',
      },
    }),
    task('ApplicationProblem', 'formulaWorkspace', 'Revenue Derivative Lab', 'Use a derivative to estimate a small revenue change.', 'Place the right formula tiles and enter the final estimate.', {
      givens: ['R(p)=p(120-2p)', 'Current p=30', '\\Delta p=+1'],
      formulaTiles: [
        { id: 'formula-derive', label: "R'(p)=120 − 4p" },
        { id: 'formula-eval', label: "R'(30)=0" },
        { id: 'formula-linear', label: "\\Delta R \\approx R'(30)\\cdot \\Delta p" },
        { id: 'formula-noise', label: "R'(p)=120 + 4p" },
      ],
      zones: [
        { id: 'formula-step-1', label: 'Derivative' },
        { id: 'formula-step-2', label: 'Evaluate' },
        { id: 'formula-step-3', label: 'Linear estimate' },
      ],
      correctMatches: {
        'formula-step-1': 'formula-derive',
        'formula-step-2': 'formula-eval',
        'formula-step-3': 'formula-linear',
      },
      answer: '0',
    }),
  ],
  FOREIGN_LANGUAGE: [
    task('VocabDrills', 'matchPairs', 'Cafe Phrase Match', 'Match each Spanish phrase to its meaning and pronunciation cue.', 'Select a phrase, then place it on the matching meaning card.', {
      cards: [
        { id: 'lang-quiero', label: 'Quisiera un café', hint: 'kee-SYEH-rah oon kah-FEH' },
        { id: 'lang-cuenta', label: 'La cuenta, por favor', hint: 'lah KWEN-tah' },
        { id: 'lang-nueces', label: '¿Tiene nueces?', hint: 'tee-EH-neh NWEH-sehs' },
      ],
      zones: [
        { id: 'lang-order', label: 'I would like a coffee' },
        { id: 'lang-bill', label: 'The check, please' },
        { id: 'lang-nuts', label: 'Does it have nuts?' },
      ],
      correctMatches: {
        'lang-order': 'lang-quiero',
        'lang-bill': 'lang-cuenta',
        'lang-nuts': 'lang-nueces',
      },
    }),
    task('FillInTheBlank', 'sentenceBuilder', 'Build the Restaurant Sentence', 'Complete the sentence with the right conjugation and word order.', 'Drag or click words into the sentence slots.', {
      sentence: ['Yo', '___', 'una mesa', 'para dos,', 'por favor.'],
      cards: [
        { id: 'lang-need', label: 'necesito' },
        { id: 'lang-need-bad', label: 'necesitas' },
        { id: 'lang-table', label: 'una mesa' },
        { id: 'lang-two', label: 'para dos' },
      ],
      zones: [
        { id: 'sentence-verb', label: 'Verb' },
      ],
      correctMatches: {
        'sentence-verb': 'lang-need',
      },
    }),
    task('AIConversationRoleplay', 'conversation', 'Madrid Cafe Roleplay', 'Respond naturally to a cafe worker in Spanish.', 'Choose a reply for each turn. The best answer balances grammar and naturalness.', {
      persona: 'Cafe worker in Madrid',
      chatTurns: [
        { id: 'chat-1', speaker: 'Camarero', text: 'Hola, bienvenido. ¿Qué te gustaría pedir?' },
      ],
      responseOptions: [
        { id: 'chat-best', text: 'Hola, quisiera un café con leche, por favor.', best: true },
        { id: 'chat-ok', text: 'Café yo quiero ahora.', best: false },
        { id: 'chat-no', text: 'Where is the train station?', best: false },
      ],
      followUp: 'Muy bien. ¿Quieres algo para comer?',
    }),
  ],
  PHYSICS: [
    task('SolveWithUnits', 'unitSolver', 'Incline Force Builder', 'Find the component of gravity down a 30 degree ramp for a 5 kg block.', 'Choose the formula, attach units, and enter the rounded answer.', {
      givens: ['m = 5 kg', 'g = 9.8 m/s^{2}', '\\theta = 30\\deg'],
      formulaTiles: [
        { id: 'physics-mg-sin', label: 'mg \\sin \\theta' },
        { id: 'physics-mg-cos', label: 'mg \\cos \\theta' },
        { id: 'physics-newton', label: 'N' },
        { id: 'physics-ms2', label: 'm/s^{2}' },
      ],
      zones: [
        { id: 'unit-formula', label: 'Force component' },
        { id: 'unit-unit', label: 'Unit' },
      ],
      correctMatches: {
        'unit-formula': 'physics-mg-sin',
        'unit-unit': 'physics-newton',
      },
      answer: '24.5',
    }),
    task('ConceptualExplainBack', 'causeChain', 'Zero Net Force Explanation Chain', 'Explain how motion can continue when net force is zero.', 'Arrange the cards into a causal explanation.', {
      cards: [
        { id: 'phys-force', label: 'Net force controls acceleration.' },
        { id: 'phys-zero', label: 'Zero net force means zero acceleration.' },
        { id: 'phys-velocity', label: 'Velocity can stay constant.' },
        { id: 'phys-example', label: 'A puck gliding at steady speed fits the idea.' },
      ],
      correctOrder: ['phys-force', 'phys-zero', 'phys-velocity', 'phys-example'],
    }),
    task('DiagramAnalysis', 'diagramBoard', 'Free Body Diagram Board', 'A box is pulled across a rough floor by an angled rope.', 'Place each force label on the free-body diagram target.', {
      diagram: 'box-forces',
      cards: [
        { id: 'force-weight', label: 'Weight' },
        { id: 'force-normal', label: 'Normal' },
        { id: 'force-tension', label: 'Tension' },
        { id: 'force-friction', label: 'Friction' },
      ],
      targets: [
        { id: 'target-down', label: 'Down arrow', x: 48, y: 78 },
        { id: 'target-up', label: 'Up arrow', x: 48, y: 15 },
        { id: 'target-rope', label: 'Angled arrow', x: 72, y: 30 },
        { id: 'target-left', label: 'Left arrow', x: 18, y: 55 },
      ],
      correctMatches: {
        'target-down': 'force-weight',
        'target-up': 'force-normal',
        'target-rope': 'force-tension',
        'target-left': 'force-friction',
      },
    }),
  ],
  HISTORY: [
    task('TimelineOrdering', 'timeline', 'French Revolution Timeline', 'Place the events in chronological order and notice the causal chain.', 'Drag with the arrow controls until the timeline reads correctly.', {
      cards: [
        { id: 'hist-estates', label: 'Estates-General meets', date: 'May 1789' },
        { id: 'hist-oath', label: 'Tennis Court Oath', date: 'Jun 1789' },
        { id: 'hist-bastille', label: 'Storming of the Bastille', date: 'Jul 1789' },
        { id: 'hist-rights', label: 'Declaration of Rights', date: 'Aug 1789' },
      ],
      ticks: [
        { label: 'May 1789', date: 'May 1789' },
        { label: 'Jun 1789', date: 'Jun 1789' },
        { label: 'Jul 1789', date: 'Jul 1789' },
        { label: 'Aug 1789', date: 'Aug 1789' },
      ],
      correctOrder: ['hist-estates', 'hist-oath', 'hist-bastille', 'hist-rights'],
    }),
    task('CauseEffectEssay', 'thesisBuilder', 'Revolution Cause Builder', 'Build a thesis from causes and evidence instead of writing a blank essay.', 'Place each card into the thesis, evidence, or context lanes.', {
      zones: [
        { id: 'hist-thesis', label: 'Thesis claim' },
        { id: 'hist-evidence', label: 'Evidence' },
        { id: 'hist-context', label: 'Context' },
      ],
      cards: [
        { id: 'hist-card-thesis', label: 'Economic crisis made reform urgent.' },
        { id: 'hist-card-evidence', label: 'Bread prices rose while taxes stayed unequal.' },
        { id: 'hist-card-context', label: 'Estate privileges shaped who carried the burden.' },
      ],
      correctMatches: {
        'hist-thesis': 'hist-card-thesis',
        'hist-evidence': 'hist-card-evidence',
        'hist-context': 'hist-card-context',
      },
    }),
    task('SocraticDebate', 'debateBoard', 'Challenge the Enlightenment Thesis', 'Thesis: Enlightenment ideas were the primary cause of the Revolution.', 'Select evidence that challenges the thesis, then write one counterclaim.', {
      thesis: 'Ideas mattered most.',
      cards: [
        { id: 'hist-tax', label: 'Regressive tax burden' },
        { id: 'hist-food', label: 'Bread price crisis' },
        { id: 'hist-estates-card', label: 'Estate privilege resentment' },
        { id: 'hist-salon', label: 'Salon culture only' },
      ],
      requiredCards: ['hist-tax', 'hist-food'],
      requiredKeywords: ['economic', 'food', 'tax'],
    }),
  ],
  ECONOMICS: [
    task('GraphInterpretation', 'graphShift', 'Demand Shock Simulator', 'A trend makes the product more popular. Move the right curve and predict the new equilibrium.', 'Choose the shifted curve, direction, and outcome.', {
      graph: { xLabel: 'Quantity', yLabel: 'Price' },
      curves: ['Demand', 'Supply'],
      directions: ['Left', 'Right'],
      outcomes: ['Price rises, quantity rises', 'Price falls, quantity rises', 'Price rises, quantity falls'],
      expectedShift: { curve: 'Demand', direction: 'Right', outcome: 'Price rises, quantity rises' },
    }),
    task('CaseAnalysis', 'caseDashboard', 'Coffee Shortage Case', 'Bean costs rise while demand remains strong. Diagnose the market move.', 'Pick the model, prediction, and tradeoff that fit the case.', {
      snapshot: ['Input cost ↑', 'Demand steady', 'Shelf stock tight'],
      questions: [
        { id: 'econ-model', label: 'Model', options: ['Supply shifts left', 'Demand shifts right', 'Price ceiling'], correctOption: 'Supply shifts left' },
        { id: 'econ-price', label: 'Price', options: ['Likely rises', 'Likely falls', 'No change'], correctOption: 'Likely rises' },
        { id: 'econ-tradeoff', label: 'Tradeoff', options: ['Higher prices protect supply but hurt buyers', 'Lower prices clear shortage', 'Demand disappears'], correctOption: 'Higher prices protect supply but hurt buyers' },
      ],
    }),
    task('PolicyDebate', 'policyBoard', 'Rent Control Tradeoff Board', 'Build a balanced argument about rent control.', 'Choose one stakeholder, one benefit, and one risk.', {
      zones: [
        { id: 'policy-stakeholder', label: 'Stakeholder' },
        { id: 'policy-benefit', label: 'Benefit' },
        { id: 'policy-risk', label: 'Risk' },
      ],
      cards: [
        { id: 'policy-renters', label: 'Current renters' },
        { id: 'policy-stability', label: 'More housing stability' },
        { id: 'policy-shortage', label: 'Possible shortage over time' },
      ],
      correctMatches: {
        'policy-stakeholder': 'policy-renters',
        'policy-benefit': 'policy-stability',
        'policy-risk': 'policy-shortage',
      },
    }),
  ],
  CHEMISTRY: [
    task('BalanceEquations', 'equationBalancer', 'Balance Propane Combustion', 'Balance C₃H₈ + O₂ → CO₂ + H₂O.', 'Use coefficient controls until atom counts match.', {
      equation: ['C_{3}H_{8}', 'O_{2}', 'CO_{2}', 'H_{2}O'],
      sides: { reactants: ['C_{3}H_{8}', 'O_{2}'], products: ['CO_{2}', 'H_{2}O'] },
      correctCoefficients: { 'C_{3}H_{8}': 1, 'O_{2}': 5, 'CO_{2}': 3, 'H_{2}O': 4 },
      atomCounts: {
        'C_{3}H_{8}': { C: 3, H: 8 },
        'O_{2}': { O: 2 },
        'CO_{2}': { C: 1, O: 2 },
        'H_{2}O': { H: 2, O: 1 },
      },
    }),
    task('ReactionPrediction', 'reactionPathway', 'Acid Base Reaction Pathway', 'Predict the products of HCl + NaOH.', 'Place reactants, swap ions, then identify products.', {
      zones: [
        { id: 'chem-reactants', label: 'Reactants' },
        { id: 'chem-swap', label: 'Ion swap idea' },
        { id: 'chem-products', label: 'Products' },
      ],
      cards: [
        { id: 'chem-hcl-naoh', label: 'HCl + NaOH' },
        { id: 'chem-ions', label: 'H^{+} pairs with OH^{-}, Na^{+} pairs with Cl^{-}' },
        { id: 'chem-products-card', label: 'H_{2}O + NaCl' },
      ],
      correctMatches: {
        'chem-reactants': 'chem-hcl-naoh',
        'chem-swap': 'chem-ions',
        'chem-products': 'chem-products-card',
      },
    }),
    task('NomenclatureDrills', 'nomenclature', 'Ionic Name Builder', 'Name Na2SO4 from its ions.', 'Choose the cation, anion, and compound name.', {
      questions: [
        { id: 'chem-formula', label: 'Formula', options: ['Na_{2}SO_{4}', 'NaCl', 'CaCO_{3}'], correctOption: 'Na_{2}SO_{4}' },
        { id: 'chem-cation', label: 'Cation', options: ['Sodium', 'Sulfide', 'Oxygen'], correctOption: 'Sodium' },
        { id: 'chem-anion', label: 'Anion', options: ['Sulfate', 'Sulfite', 'Sulfide'], correctOption: 'Sulfate' },
        { id: 'chem-name', label: 'Name', options: ['Sodium sulfate', 'Disodium sulfur oxide', 'Sodium sulfide'], correctOption: 'Sodium sulfate' },
      ],
    }),
  ],
  PHILOSOPHY_LOGIC: [
    task('ArgumentMapping', 'argumentMap', 'Privacy Argument Map', 'Map the claim, premise, assumption, and objection in a privacy argument.', 'Place nodes into the argument map roles.', {
      zones: [
        { id: 'logic-claim', label: 'Main claim' },
        { id: 'logic-premise', label: 'Premise' },
        { id: 'logic-assumption', label: 'Assumption' },
        { id: 'logic-objection', label: 'Objection' },
      ],
      cards: [
        { id: 'logic-card-claim', label: 'Apps should minimize data collection.' },
        { id: 'logic-card-premise', label: 'Extra data increases misuse risk.' },
        { id: 'logic-card-assumption', label: 'Privacy risk can outweigh convenience.' },
        { id: 'logic-card-objection', label: 'Some data improves safety and personalization.' },
      ],
      correctMatches: {
        'logic-claim': 'logic-card-claim',
        'logic-premise': 'logic-card-premise',
        'logic-assumption': 'logic-card-assumption',
        'logic-objection': 'logic-card-objection',
      },
    }),
    task('FallacyIdentification', 'fallacyMatch', 'Spot the Fallacy', 'A celebrity likes this policy, so it must be a good policy.', 'Pick the fallacy and the strongest repair.', {
      argument: 'A celebrity likes this policy, so it must be a good policy.',
      questions: [
        { id: 'fallacy-name', label: 'Fallacy', options: ['Appeal to authority', 'Straw man', 'False dilemma'], correctOption: 'Appeal to authority' },
        { id: 'fallacy-repair', label: 'Repair', options: ['Add policy evidence independent of the celebrity', 'Attack the celebrity instead', 'Ignore all expert opinion'], correctOption: 'Add policy evidence independent of the celebrity' },
      ],
    }),
    task('AdversarialDebate', 'steelmanDuel', 'Freedom vs Safety Steelman Duel', 'Respond to the strongest opposing version of your argument.', 'Choose a counterargument card, then write a one-sentence reply.', {
      thesis: 'Individual freedom should usually outrank collective safety.',
      cards: [
        { id: 'steelman-harm', label: 'Freedom can be limited to prevent direct harm.' },
        { id: 'steelman-trust', label: 'Emergency powers can be abused without checks.' },
        { id: 'steelman-public', label: 'Public safety problems often require coordination.' },
      ],
      requiredCards: ['steelman-harm', 'steelman-public'],
      requiredKeywords: ['harm', 'coordination'],
    }),
  ],
  WRITING: [
    task('TimedPrompt', 'timedPrompt', 'Five Minute Thesis Sprint', 'Write a persuasive paragraph arguing that focus is a learnable skill.', 'Start the sprint, draft a paragraph, and check off the craft moves.', {
      timerSeconds: 300,
      checklist: [
        { id: 'write-claim', label: 'Clear claim', keyword: 'focus' },
        { id: 'write-example', label: 'Concrete example', keyword: 'practice' },
        { id: 'write-concision', label: 'No filler sentence', keyword: 'habit' },
      ],
      requiredKeywords: ['focus', 'practice'],
    }),
    task('RewriteForClarity', 'rewriteLab', 'Clarity Rewrite Lab', 'Rewrite a vague sentence with stronger nouns and cleaner structure.', 'Select useful edits, then rewrite the sentence.', {
      original: 'The thing that makes the process work is the stuff users do before they know what they want.',
      sentences: ['The thing that makes the process work is the stuff users do before they know what they want.'],
      suggestedRewrite: 'Users clarify the process by naming concrete actions before they know the final outcome.',
      cards: [
        { id: 'rewrite-nouns', label: 'Replace vague nouns' },
        { id: 'rewrite-actor', label: 'Name the actor' },
        { id: 'rewrite-verb', label: 'Use a stronger verb' },
      ],
      requiredCards: ['rewrite-nouns', 'rewrite-actor'],
      requiredKeywords: ['users', 'process'],
    }),
    task('RubricFeedback', 'rubricBoard', 'Rubric Review Board', 'Score and annotate a thesis paragraph about habits beating motivation.', 'Mark rubric scores and select line notes that would help the writer revise.', {
      draft: 'Habits are better than motivation because they make action automatic. When a routine is visible and easy, people can begin even on low-energy days.',
      draftSentences: [
        'Habits are better than motivation because they make action automatic.',
        'When a routine is visible and easy, people can begin even on low-energy days.',
      ],
      rubric: [
        { id: 'rubric-clarity', label: 'Clarity', descriptors: { 0: 'unclear', 1: 'needs shaping', 2: 'mostly clear', 3: 'clear', 4: 'very crisp' } },
        { id: 'rubric-structure', label: 'Structure', descriptors: { 0: 'wandering', 1: 'loose', 2: 'adequate', 3: 'strong arc', 4: 'tight arc' } },
        { id: 'rubric-voice', label: 'Voice', descriptors: { 0: 'flat', 1: 'generic', 2: 'some voice', 3: 'clear voice', 4: 'distinct voice' } },
        { id: 'rubric-evidence', label: 'Evidence', descriptors: { 0: 'none', 1: 'thin', 2: 'some support', 3: 'solid support', 4: 'sharp support' } },
        { id: 'rubric-concision', label: 'Concision', descriptors: { 0: 'wordy', 1: 'loose', 2: 'acceptable', 3: 'tight', 4: 'very tight' } },
      ],
      annotations: [
        { id: 'rubric-auto', label: 'Automatic action is the strongest phrase.' },
        { id: 'rubric-evidence-note', label: 'Add a concrete example or study.' },
        { id: 'rubric-tighten', label: 'Tighten the second sentence.' },
      ],
      requiredCards: ['rubric-evidence-note'],
    }),
  ],
  PSYCHOLOGY: [
    task('CaseStudyAnalysis', 'caseFile', 'Spacing Effect Case File', 'Students remember more after spaced practice than cramming.', 'Attach observations to the theory, evidence, and limitation folders.', {
      caseTitle: 'Spacing Effect Folder',
      caseBrief: 'Students who revisited material across several short sessions outperformed a cramming group on delayed recall.',
      zones: [
        { id: 'psych-theory', label: 'Theory' },
        { id: 'psych-evidence', label: 'Evidence' },
        { id: 'psych-limitation', label: 'Limitation' },
      ],
      cards: [
        { id: 'psych-card-theory', label: 'Spacing effect' },
        { id: 'psych-card-evidence', label: 'Delayed recall improved after distributed sessions' },
        { id: 'psych-card-limit', label: 'Only one classroom was sampled' },
      ],
      correctMatches: {
        'psych-theory': 'psych-card-theory',
        'psych-evidence': 'psych-card-evidence',
        'psych-limitation': 'psych-card-limit',
      },
    }),
    task('ConceptApplication', 'conceptApply', 'Cognitive Load Fix', 'A learner watches a dense video with animations, jargon, and no pauses.', 'Choose the concept and an intervention that fits the scenario.', {
      scenario: 'A learner watches a dense video with animations, jargon, and no pauses.',
      definitions: {
        'Cognitive load': 'Working memory overload blocks learning.',
        'Classical conditioning': 'A neutral cue gains a learned response.',
        'Attachment style': 'Relationship expectations shape behavior.',
      },
      questions: [
        { id: 'psych-concept', label: 'Concept', options: ['Cognitive load', 'Classical conditioning', 'Attachment style'], correctOption: 'Cognitive load' },
        { id: 'psych-intervention', label: 'Intervention', options: ['Chunk the video and add pauses', 'Increase animation speed', 'Remove all examples'], correctOption: 'Chunk the video and add pauses' },
      ],
    }),
    task('ResearchCritique', 'researchCritique', 'Tiny Sample Study Critique', 'A study uses 12 students from one college class to claim a universal learning effect.', 'Tag threats to validity, then write the best redesign move.', {
      cards: [
        { id: 'research-sample', label: 'Small sample' },
        { id: 'research-bias', label: 'Convenience sample' },
        { id: 'research-generalize', label: 'Overgeneralized conclusion' },
        { id: 'research-perfect', label: 'Perfect external validity' },
      ],
      requiredCards: ['research-sample', 'research-bias', 'research-generalize'],
      requiredKeywords: ['larger', 'sample'],
    }),
  ],
  GOVERNMENT_CIVICS: [
    task('PolicyBrief', 'briefBuilder', 'Voter Turnout Policy Brief', 'Build a short brief recommending one way to increase voter turnout.', 'Place cards into the brief sections.', {
      zones: [
        { id: 'brief-problem', label: 'Problem' },
        { id: 'brief-evidence', label: 'Evidence' },
        { id: 'brief-option', label: 'Policy option' },
        { id: 'brief-rec', label: 'Recommendation' },
      ],
      cards: [
        { id: 'brief-card-problem', label: 'Young voters participate at lower rates.' },
        { id: 'brief-card-evidence', label: 'Registration friction lowers turnout.' },
        { id: 'brief-card-option', label: 'Automatic voter registration' },
        { id: 'brief-card-rec', label: 'Adopt AVR with transparent opt-out rules.' },
      ],
      correctMatches: {
        'brief-problem': 'brief-card-problem',
        'brief-evidence': 'brief-card-evidence',
        'brief-option': 'brief-card-option',
        'brief-rec': 'brief-card-rec',
      },
    }),
    task('SystemsComparison', 'comparisonMatrix', 'Federal vs Unitary Matrix', 'Compare how different systems respond to disasters.', 'Fill the matrix with the strongest advantage or risk.', {
      columns: ['Federal', 'Unitary'],
      rows: ['Response speed', 'Coordination cost', 'Local flexibility', 'Accountability'],
      cells: [
        { id: 'matrix-fed-speed', row: 'Response speed', column: 'Federal', correct: 'Coordination delays' },
        { id: 'matrix-unit-speed', row: 'Response speed', column: 'Unitary', correct: 'Fast national action' },
        { id: 'matrix-fed-cost', row: 'Coordination cost', column: 'Federal', correct: 'Coordination delays' },
        { id: 'matrix-unit-cost', row: 'Coordination cost', column: 'Unitary', correct: 'Fast national action' },
        { id: 'matrix-fed-flex', row: 'Local flexibility', column: 'Federal', correct: 'Local adaptation' },
        { id: 'matrix-unit-flex', row: 'Local flexibility', column: 'Unitary', correct: 'Less local flexibility' },
        { id: 'matrix-fed-account', row: 'Accountability', column: 'Federal', correct: 'Local adaptation' },
        { id: 'matrix-unit-account', row: 'Accountability', column: 'Unitary', correct: 'Fast national action' },
      ],
      cards: [
        { id: 'matrix-local', label: 'Local adaptation' },
        { id: 'matrix-delay', label: 'Coordination delays' },
        { id: 'matrix-fast', label: 'Fast national action' },
        { id: 'matrix-flex', label: 'Less local flexibility' },
      ],
    }),
    task('MockDebate', 'mockDebate', 'Parliamentary Crisis Debate', 'Debate whether parliamentary systems respond better to political crises.', 'Pick a claim, evidence, and rebuttal from the podium cards.', {
      zones: [
        { id: 'debate-claim', label: 'Claim' },
        { id: 'debate-evidence', label: 'Evidence' },
        { id: 'debate-rebuttal', label: 'Rebuttal' },
      ],
      cards: [
        { id: 'debate-card-claim', label: 'Parliamentary systems can replace leaders quickly.' },
        { id: 'debate-card-evidence', label: 'No separate executive election is needed.' },
        { id: 'debate-card-rebuttal', label: 'But coalition instability can slow decisions.' },
      ],
      correctMatches: {
        'debate-claim': 'debate-card-claim',
        'debate-evidence': 'debate-card-evidence',
        'debate-rebuttal': 'debate-card-rebuttal',
      },
    }),
  ],
  BIOLOGY: [
    task('LabelDiagram', 'labelDiagram', 'Gene Expression Label Board', 'Trace DNA to RNA to protein.', 'Place labels on the correct diagram targets.', {
      diagram: 'gene-expression',
      cards: [
        { id: 'bio-dna', label: 'DNA' },
        { id: 'bio-transcription', label: 'Transcription' },
        { id: 'bio-mrna', label: 'mRNA' },
        { id: 'bio-translation', label: 'Translation' },
        { id: 'bio-protein', label: 'Protein' },
      ],
      targets: [
        { id: 'bio-target-dna', label: 'Double helix', x: 16, y: 34 },
        { id: 'bio-target-transcription', label: 'Copy step', x: 34, y: 50 },
        { id: 'bio-target-mrna', label: 'RNA strand', x: 51, y: 38 },
        { id: 'bio-target-translation', label: 'Ribosome step', x: 68, y: 50 },
        { id: 'bio-target-protein', label: 'Amino chain', x: 86, y: 35 },
      ],
      correctMatches: {
        'bio-target-dna': 'bio-dna',
        'bio-target-transcription': 'bio-transcription',
        'bio-target-mrna': 'bio-mrna',
        'bio-target-translation': 'bio-translation',
        'bio-target-protein': 'bio-protein',
      },
    }),
    task('ExplainMechanism', 'mechanismFlow', 'Insulin Mechanism Flow', 'Trace how insulin helps cells take up glucose after a meal.', 'Arrange the biological mechanism from big picture to cell response.', {
      cards: [
        { id: 'bio-meal', label: 'Blood glucose rises after a meal.' },
        { id: 'bio-pancreas', label: 'Pancreas releases insulin.' },
        { id: 'bio-receptor', label: 'Insulin binds cell receptors.' },
        { id: 'bio-uptake', label: 'Cells increase glucose uptake.' },
      ],
      icons: {
        'bio-meal': '🩸',
        'bio-pancreas': '🧪',
        'bio-receptor': '🔑',
        'bio-uptake': '🔓',
      },
      correctOrder: ['bio-meal', 'bio-pancreas', 'bio-receptor', 'bio-uptake'],
    }),
    task('GeneticsProblemSet', 'punnettSquare', 'Heterozygous Cross Punnett Square', 'Two heterozygous parents have a child. Predict genotype and phenotype ratios.', 'Fill each square and choose the final ratio.', {
      parentA: ['A', 'a'],
      parentB: ['A', 'a'],
      cells: [
        { id: 'punnett-1', row: 'A', column: 'A', correct: 'AA' },
        { id: 'punnett-2', row: 'A', column: 'a', correct: 'Aa' },
        { id: 'punnett-3', row: 'a', column: 'A', correct: 'Aa' },
        { id: 'punnett-4', row: 'a', column: 'a', correct: 'aa' },
      ],
      genotypeRatio: '1 AA : 2 Aa : 1 aa',
      phenotypeRatio: '3 dominant : 1 recessive',
    }),
  ],
})

export function getRichPracticeDemos() {
  return DOMAIN_ORDER.flatMap((domain) => {
    const adapterTaskTypes = DOMAIN_ADAPTERS[domain]?.taskTypes || []
    const richTasks = RICH_TASKS_BY_DOMAIN[domain] || []
    return richTasks
      .filter((richTask) => adapterTaskTypes.includes(richTask.taskType))
      .map((richTask) => ({
        id: `${domain}:${richTask.taskType}`,
        domain,
        taskType: richTask.taskType,
        label: getDomainTaskLabel(richTask.taskType),
        goal: DOMAIN_GOALS[domain],
        topic: DOMAIN_TOPICS[domain],
        accent: DOMAIN_ACCENTS[domain],
        domainLabel: DOMAIN_METADATA[domain]?.label || domain,
        task: {
          domain,
          ...richTask,
        },
      }))
  })
}

export const RICH_PRACTICE_DEMOS = Object.freeze(getRichPracticeDemos())
