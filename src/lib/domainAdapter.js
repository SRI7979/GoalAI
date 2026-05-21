const DOMAIN_STORAGE_KEY = 'pathai.learningDomain'

export const DEFAULT_DOMAIN = 'CS_CODING'
export const DOMAIN_CONFIDENCE_THRESHOLD = 0.85

const DOMAIN_ALIASES = Object.freeze({
  POLITICAL_SCIENCE: 'GOVERNMENT_CIVICS',
  GOVERNMENT: 'GOVERNMENT_CIVICS',
  CIVICS: 'GOVERNMENT_CIVICS',
  MACHINE_LEARNING: 'ML_AI',
  AI: 'ML_AI',
  HEALTH_SCIENCE: 'MEDICINE_HEALTH',
  MEDICINE: 'MEDICINE_HEALTH',
  READING: 'READING_COMPREHENSION',
  LANGUAGE: 'FOREIGN_LANGUAGE',
  LANGUAGES: 'FOREIGN_LANGUAGE',
  ART: 'ART_DESIGN',
  DESIGN: 'ART_DESIGN',
  PUBLIC_SPEAKING: 'COMMUNICATION',
})

const DOMAIN_DEFINITIONS = [
  {
    id: 'CS_CODING',
    label: 'Computer Science',
    icon: 'code',
    workspaceType: 'coding',
    description: 'Programming, software, data structures, apps, debugging, and technical builds.',
    taskTypes: ['GeneratedLesson', 'CodeSandbox', 'DebugChallenge', 'MiniProject'],
    lessonTone: 'technical but clear, use code snippets inline, build up from first principles, avoid hand-waving',
    assessmentStyle: 'run the code, check against test cases, ask the learner to explain their approach in plain English',
    projectType: 'build a working feature or small app that uses all concepts from the unit',
    exampleStyle: 'real-world engineering scenarios, popular developer tools, code reviews, and debugging traces',
    proofRules: ['working output', 'visible tests', 'debug reasoning', 'plain-English explanation'],
    finalVerification: 'ship a small working program or algorithm challenge with tests',
    gamification: { quests: 'Missions', bosses: 'System Bugs', badges: ['Bug Slayer', 'Deploy Master', 'Refactor King'] },
  },
  {
    id: 'MATHEMATICS',
    label: 'Mathematics',
    icon: 'chart',
    workspaceType: 'math',
    description: 'Proofs, problem solving, formulas, graphing, transformations, and applications.',
    taskTypes: ['GeneratedLesson', 'StepByStepProblem', 'ProofWriting', 'ApplicationProblem'],
    lessonTone: 'precise, build intuition before formalism, use visual analogies, never skip steps',
    assessmentStyle: 'check each reasoning step independently, give partial credit, and explain exactly where reasoning broke down',
    projectType: 'solve a multi-part novel problem that requires combining all unit concepts',
    exampleStyle: 'real applications of math in physics, finance, data, and engineering',
    proofRules: ['correct setup', 'valid transformations', 'checked final answer', 'reasoning explanation'],
    finalVerification: 'complete a mixed problem set and defend the solution path',
    gamification: { quests: 'Problems', bosses: 'Unsolved Theorems', badges: ['Proof Writer', 'Calculus Core', 'Number Theorist'] },
  },
  {
    id: 'PHYSICS',
    label: 'Physics',
    icon: 'orbit',
    workspaceType: 'physics',
    description: 'Forces, motion, energy, units, diagrams, simulations, and real systems.',
    taskTypes: ['GeneratedLesson', 'SolveWithUnits', 'ConceptualExplainBack', 'DiagramAnalysis'],
    lessonTone: 'build physical intuition first, derive equations from reasoning not memorization, always include units',
    assessmentStyle: 'check dimensional analysis, penalize unit errors, and reward correct physical reasoning even with arithmetic mistakes',
    projectType: 'analyze a real-world physical system using all unit concepts',
    exampleStyle: 'everyday physical phenomena, experiments, and engineering applications',
    proofRules: ['diagram quality', 'unit consistency', 'simulation prediction', 'physical explanation'],
    finalVerification: 'model a scenario and justify the result with diagram, equations, and units',
    gamification: { quests: 'Experiments', bosses: 'Unsolved Phenomena', badges: ['Force Field', 'Quantum Leap', 'Laws of Motion'] },
  },
  {
    id: 'CHEMISTRY',
    label: 'Chemistry',
    icon: 'flask',
    workspaceType: 'chemistry',
    description: 'Atoms, reactions, equations, bonding, naming, stoichiometry, and mechanisms.',
    taskTypes: ['GeneratedLesson', 'BalanceEquations', 'ReactionPrediction', 'NomenclatureDrills'],
    lessonTone: 'visual and systematic, explain the why behind reactions, always connect to atomic structure',
    assessmentStyle: 'check equation balancing step by step and reward correct reasoning about why a reaction occurs',
    projectType: 'predict and explain a multi-step reaction pathway',
    exampleStyle: 'everyday chemistry in cooking, medicine, materials, batteries, and labs',
    proofRules: ['balanced atoms', 'reaction reasoning', 'correct nomenclature', 'lab-safety awareness'],
    finalVerification: 'complete a lab-style reaction analysis with balanced equations and product reasoning',
    gamification: { quests: 'Reactions', bosses: 'Complex Syntheses', badges: ['Molecule Builder', 'Reaction Master', 'Bond Breaker'] },
  },
  {
    id: 'BIOLOGY',
    label: 'Biology',
    icon: 'microscope',
    workspaceType: 'biology',
    description: 'Cells, genetics, anatomy, organisms, ecosystems, evolution, and mechanisms.',
    taskTypes: ['GeneratedLesson', 'LabelDiagram', 'ExplainMechanism', 'GeneticsProblemSet'],
    lessonTone: 'systems thinking, show how everything connects, use analogies for molecular processes, go from big picture to detail',
    assessmentStyle: 'use teach-back: the learner explains a process in their own words and the system checks for misconceptions',
    projectType: 'trace a biological process end-to-end across multiple systems covered in the unit',
    exampleStyle: 'human body processes, disease mechanisms, evolution, ecology, and lab observations',
    proofRules: ['diagram labels', 'mechanism sequence', 'cause-effect reasoning', 'classification accuracy'],
    finalVerification: 'explain a biological mechanism from input to outcome using a labeled diagram',
    gamification: { quests: 'Experiments', bosses: 'Complex Organisms', badges: ['Cell Biologist', 'DNA Decoder', 'Ecosystem Mapper'] },
  },
  {
    id: 'ENGINEERING',
    label: 'Engineering',
    icon: 'hammer',
    workspaceType: 'engineering',
    description: 'Design constraints, prototypes, testing, failure modes, materials, and tradeoffs.',
    taskTypes: ['GeneratedLesson', 'ConstraintPrototype', 'TestBenchSimulation', 'DesignReview'],
    lessonTone: 'practical, constraint-driven, focused on design tradeoffs and test evidence',
    assessmentStyle: 'grade whether the design meets constraints, identifies tradeoffs, and responds to test data',
    projectType: 'build a prototype plan and iterate from test results',
    exampleStyle: 'bridges, product prototypes, circuits, robotics, manufacturing, and systems design',
    proofRules: ['constraint fit', 'test result interpretation', 'tradeoff explanation', 'iteration quality'],
    finalVerification: 'complete a design review with constraints, prototype choices, tests, and revisions',
    gamification: { quests: 'Prototypes', bosses: 'Failure Tests', badges: ['Constraint Solver', 'Prototype Pilot', 'Design Reviewer'] },
  },
  {
    id: 'TECHNOLOGY',
    label: 'Technology',
    icon: 'cpu',
    workspaceType: 'technology',
    description: 'Digital tools, systems, workflows, troubleshooting, configuration, and technical literacy.',
    taskTypes: ['GeneratedLesson', 'WorkflowTroubleshoot', 'SystemConfig', 'ToolComparison'],
    lessonTone: 'practical, calm, workflow-oriented, and clear about what each tool is for',
    assessmentStyle: 'evaluate the chosen setup, troubleshooting path, and ability to explain the system behavior',
    projectType: 'configure or troubleshoot a realistic technology workflow',
    exampleStyle: 'devices, cloud tools, browsers, automation, collaboration software, and support scenarios',
    proofRules: ['configuration choice', 'diagnosis path', 'tool comparison', 'workflow explanation'],
    finalVerification: 'solve a realistic technology workflow without step-by-step handholding',
    gamification: { quests: 'Setups', bosses: 'Broken Workflows', badges: ['Toolsmith', 'System Scout', 'Workflow Fixer'] },
  },
  {
    id: 'CYBERSECURITY',
    label: 'Cybersecurity',
    icon: 'shield',
    workspaceType: 'security',
    description: 'Safe security habits, phishing detection, threat modeling, network diagrams, and defensive reasoning.',
    taskTypes: ['GeneratedLesson', 'PhishingTriage', 'ThreatModel', 'NetworkDefense'],
    lessonTone: 'defensive, scenario-based, safety-first, and concrete without giving exploit instructions',
    assessmentStyle: 'grade defensive identification, risk prioritization, and safe mitigation reasoning',
    projectType: 'write a risk report and defensive action plan for a safe sandbox scenario',
    exampleStyle: 'phishing inboxes, account security checks, network diagrams, logs, and threat models',
    proofRules: ['risk identification', 'safe mitigation', 'evidence from artifacts', 'no harmful operational steps'],
    finalVerification: 'defend a safe scenario and write a short risk report',
    gamification: { quests: 'Defenses', bosses: 'Threat Scenarios', badges: ['Phish Spotter', 'Threat Modeler', 'Defense Lead'] },
  },
  {
    id: 'ML_AI',
    label: 'Machine Learning / AI',
    icon: 'bot',
    workspaceType: 'data_ai',
    description: 'Datasets, predictions, model comparison, evaluation metrics, bias, and error analysis.',
    taskTypes: ['GeneratedLesson', 'DatasetPrediction', 'ModelComparison', 'BiasErrorAnalysis'],
    lessonTone: 'experimental, data-first, careful about uncertainty, and clear about model limits',
    assessmentStyle: 'grade data reasoning, metric interpretation, model choice, and bias/error analysis separately',
    projectType: 'evaluate a model on a small dataset and explain tradeoffs',
    exampleStyle: 'classification tasks, recommender systems, confusion matrices, feature inspection, and error slices',
    proofRules: ['dataset read', 'prediction reasoning', 'metric interpretation', 'bias/error reflection'],
    finalVerification: 'evaluate model behavior with metrics, examples, and limitations',
    gamification: { quests: 'Experiments', bosses: 'Model Drift', badges: ['Metric Reader', 'Bias Hunter', 'Model Tuner'] },
  },
  {
    id: 'DATA_SCIENCE',
    label: 'Data Science',
    icon: 'bar_chart',
    workspaceType: 'data_ai',
    description: 'Data cleaning, visualization, exploratory analysis, charts, and insight reports.',
    taskTypes: ['GeneratedLesson', 'DataCleaning', 'ChartBuilder', 'InsightReport'],
    lessonTone: 'investigative, evidence-based, visual, and explicit about uncertainty',
    assessmentStyle: 'grade cleaning choices, chart fit, trend interpretation, and evidence-backed insight',
    projectType: 'turn a messy dataset into a short data story',
    exampleStyle: 'tables, dashboards, charts, anomalies, missing values, and business or science questions',
    proofRules: ['cleaned data', 'chart selection', 'insight evidence', 'limitation stated'],
    finalVerification: 'produce a concise data report with chart and evidence',
    gamification: { quests: 'Datasets', bosses: 'Messy Data', badges: ['Data Cleaner', 'Chart Builder', 'Insight Finder'] },
  },
  {
    id: 'STATISTICS',
    label: 'Statistics',
    icon: 'line_chart',
    workspaceType: 'statistics',
    description: 'Sampling, probability, inference, distributions, simulations, and hypothesis tests.',
    taskTypes: ['GeneratedLesson', 'DistributionExplorer', 'HypothesisTest', 'SamplingSimulation'],
    lessonTone: 'intuition-first, simulation-friendly, precise about assumptions and uncertainty',
    assessmentStyle: 'check assumptions, test selection, interpretation, and confidence language',
    projectType: 'analyze a claim with the right statistical test and explain uncertainty',
    exampleStyle: 'polling, A/B tests, medical studies, quality control, and sports or finance data',
    proofRules: ['assumption check', 'distribution intuition', 'test choice', 'interpretation wording'],
    finalVerification: 'choose and defend the correct statistical test for a scenario',
    gamification: { quests: 'Samples', bosses: 'False Certainty', badges: ['Sampler', 'Inference Lead', 'Uncertainty Tamer'] },
  },
  {
    id: 'ECONOMICS',
    label: 'Economics',
    icon: 'bar_chart',
    workspaceType: 'economics',
    description: 'Markets, incentives, supply and demand, policy, tradeoffs, and decisions.',
    taskTypes: ['GeneratedLesson', 'GraphInterpretation', 'CaseAnalysis', 'PolicyDebate'],
    lessonTone: 'model-first, then apply to real world, use current-style scenarios as examples, explain tradeoffs clearly',
    assessmentStyle: 'check whether the correct economic model was applied and grade tradeoff reasoning',
    projectType: 'analyze a real economic event or policy using all unit models',
    exampleStyle: 'market shocks, historical crises, policy decisions, incentives, and household choices',
    proofRules: ['model choice', 'curve movement', 'tradeoff reasoning', 'policy consequence'],
    finalVerification: 'analyze an economic scenario with model, prediction, and tradeoffs',
    gamification: { quests: 'Market Analysis', bosses: 'Economic Crises', badges: ['Supply Chain', 'Market Mover', 'Policy Architect'] },
  },
  {
    id: 'FINANCE',
    label: 'Finance',
    icon: 'gem',
    workspaceType: 'finance',
    description: 'Budgeting, investing, risk, statements, valuation, compounding, and financial decisions.',
    taskTypes: ['GeneratedLesson', 'BudgetAllocation', 'PortfolioRisk', 'StatementAnalysis'],
    lessonTone: 'practical, numerate, risk-aware, and clear about tradeoffs and assumptions',
    assessmentStyle: 'grade allocation logic, risk reasoning, cash-flow interpretation, and explanation quality',
    projectType: 'build a financial plan or portfolio scenario with explicit assumptions',
    exampleStyle: 'budgets, emergency funds, portfolios, loans, compounding, statements, and small businesses',
    proofRules: ['numbers reconcile', 'risk identified', 'assumptions stated', 'decision justified'],
    finalVerification: 'build a plan and justify the financial tradeoffs',
    gamification: { quests: 'Plans', bosses: 'Risk Events', badges: ['Budget Builder', 'Risk Reader', 'Portfolio Planner'] },
  },
  {
    id: 'BUSINESS',
    label: 'Business',
    icon: 'briefcase',
    workspaceType: 'business',
    description: 'Strategy, operations, marketing, customers, metrics, cases, and tradeoff decisions.',
    taskTypes: ['GeneratedLesson', 'StrategyCase', 'MetricsDiagnosis', 'DecisionMemo'],
    lessonTone: 'case-based, practical, metric-aware, and focused on decision quality',
    assessmentStyle: 'grade diagnosis, metric interpretation, tradeoff awareness, and recommendation clarity',
    projectType: 'produce a business recommendation from a case dashboard',
    exampleStyle: 'startups, SaaS metrics, operations bottlenecks, customer segments, and pricing choices',
    proofRules: ['case diagnosis', 'metric evidence', 'tradeoff decision', 'clear recommendation'],
    finalVerification: 'present a business recommendation with evidence and risks',
    gamification: { quests: 'Cases', bosses: 'Market Pressure', badges: ['Operator', 'Strategy Lead', 'Metric Minder'] },
  },
  {
    id: 'WRITING',
    label: 'Writing',
    icon: 'draft',
    workspaceType: 'writing',
    description: 'Drafting, clarity, structure, evidence, style, voice, rhetoric, and revision.',
    taskTypes: ['GeneratedLesson', 'TimedPrompt', 'RewriteForClarity', 'RubricFeedback'],
    lessonTone: 'show don\'t tell, use before/after examples, focus on one craft element per lesson',
    assessmentStyle: 'grade clarity, structure, voice, evidence, and concision with specific revision feedback',
    projectType: 'write a complete piece in the target genre incorporating all unit craft elements',
    exampleStyle: 'published writing samples, annotated revisions, outlines, and line edits',
    proofRules: ['draft produced', 'revision rationale', 'rubric self-check', 'audience fit'],
    finalVerification: 'submit a polished piece with revision notes',
    gamification: { quests: 'Drafts', bosses: 'Blank Page', badges: ['First Draft', 'Sharp Editor', 'Voice Found'] },
  },
  {
    id: 'READING_COMPREHENSION',
    label: 'Reading Comprehension',
    icon: 'book_marked',
    workspaceType: 'reading',
    description: 'Annotation, inference, evidence, themes, claims, structure, and close reading.',
    taskTypes: ['GeneratedLesson', 'PassageAnnotation', 'EvidenceBoard', 'InferenceCheck'],
    lessonTone: 'text-centered, evidence-first, patient, and clear about how claims connect to passages',
    assessmentStyle: 'grade evidence selection, inference quality, theme reasoning, and citation accuracy',
    projectType: 'write an evidence-based reading response',
    exampleStyle: 'passages, highlighted evidence, marginal notes, claim-evidence boards, and inference checks',
    proofRules: ['annotation evidence', 'claim support', 'inference justified', 'citation included'],
    finalVerification: 'answer a comprehension question with cited evidence',
    gamification: { quests: 'Passages', bosses: 'Hidden Themes', badges: ['Close Reader', 'Evidence Finder', 'Inference Builder'] },
  },
  {
    id: 'HISTORY',
    label: 'History',
    icon: 'scroll',
    workspaceType: 'history',
    description: 'Timelines, maps, sources, causality, evidence, interpretation, and historical argument.',
    taskTypes: ['GeneratedLesson', 'TimelineOrdering', 'SourceAnalysis', 'CauseEffectEssay'],
    lessonTone: 'narrative-driven, connect events causally, include source context before facts',
    assessmentStyle: 'grade argument quality, evidence use, source context, and historical accuracy separately',
    projectType: 'write a structured argument on a contested historical question',
    exampleStyle: 'primary sources, maps, turning points, chronology, and counterfactuals',
    proofRules: ['timeline accuracy', 'source sourcing', 'causal chain', 'evidence-backed argument'],
    finalVerification: 'make a historical argument with timeline and source evidence',
    gamification: { quests: 'Chronicles', bosses: 'Historical Turning Points', badges: ['Archivist', 'Time Traveler', 'Primary Source'] },
  },
  {
    id: 'GOVERNMENT_CIVICS',
    label: 'Government / Civics',
    icon: 'briefcase',
    workspaceType: 'civics',
    description: 'Institutions, laws, rights, policy, civic systems, debate, and public decisions.',
    taskTypes: ['GeneratedLesson', 'PolicyBrief', 'SystemsComparison', 'MockDebate'],
    lessonTone: 'analytical and neutral, present multiple perspectives fairly, connect institutions to real civic choices',
    assessmentStyle: 'grade argument quality, institutional accuracy, evidence use, and counterargument awareness',
    projectType: 'write a policy brief or civic case analysis using unit frameworks',
    exampleStyle: 'constitutional cases, public policy, voting systems, institutions, and civic scenarios',
    proofRules: ['institution map', 'policy evidence', 'counterargument', 'civic reasoning'],
    finalVerification: 'complete a civic case analysis or policy brief',
    gamification: { quests: 'Civic Cases', bosses: 'Policy Crises', badges: ['Policy Wonk', 'Civic Analyst', 'Debate Chair'] },
  },
  {
    id: 'PSYCHOLOGY',
    label: 'Psychology',
    icon: 'brain',
    workspaceType: 'psychology',
    description: 'Behavior, cognition, cases, theories, experiments, bias, memory, and research critique.',
    taskTypes: ['GeneratedLesson', 'CaseStudyAnalysis', 'ConceptApplication', 'ResearchCritique'],
    lessonTone: 'empirical but accessible, lead with a case study or experiment, explain the study before the theory',
    assessmentStyle: 'check correct application of theory to a scenario and penalize oversimplification',
    projectType: 'analyze a psychological case or study using all unit concepts',
    exampleStyle: 'famous studies, cognitive biases, cases, behavior observations, and study design',
    proofRules: ['concept application', 'study critique', 'case evidence', 'limits stated'],
    finalVerification: 'interpret a study or case and name limitations',
    gamification: { quests: 'Case Studies', bosses: 'Complex Behavior', badges: ['Pattern Spotter', 'Behavior Analyst', 'Study Critic'] },
  },
  {
    id: 'MEDICINE_HEALTH',
    label: 'Medicine / Health Science',
    icon: 'heart',
    workspaceType: 'health',
    description: 'Anatomy, physiology, health science, case charts, safety reasoning, and biological systems.',
    taskTypes: ['GeneratedLesson', 'AnatomyLabeling', 'CaseChartReasoning', 'SafetyTriage'],
    lessonTone: 'educational, careful, safety-first, anatomy-and-process focused, and never diagnostic',
    assessmentStyle: 'grade anatomy/process understanding, safe reasoning, and recognition of when professional care is needed',
    projectType: 'explain a health science process or case chart safely and educationally',
    exampleStyle: 'body systems, vitals-style charts, anatomy diagrams, safe triage reasoning, and lab observations',
    proofRules: ['no diagnosis', 'safe next step', 'body-system reasoning', 'mechanism explanation'],
    finalVerification: 'explain a condition/process educationally without giving medical advice',
    gamification: { quests: 'Case Charts', bosses: 'Safety Checks', badges: ['Anatomy Mapper', 'Safety Thinker', 'Systems Clinician'] },
  },
  {
    id: 'ENVIRONMENTAL_SCIENCE',
    label: 'Environmental Science',
    icon: 'sprout',
    workspaceType: 'environment',
    description: 'Ecosystems, climate, resources, sustainability, human impact, systems, and tradeoffs.',
    taskTypes: ['GeneratedLesson', 'EcosystemSimulation', 'ImpactMap', 'SustainabilityPlan'],
    lessonTone: 'systems-oriented, evidence-based, connected to real environmental tradeoffs',
    assessmentStyle: 'grade system relationships, variable effects, evidence use, and sustainability tradeoff reasoning',
    projectType: 'build a sustainability plan or ecosystem impact analysis',
    exampleStyle: 'food webs, carbon cycles, climate data, resource use, biodiversity, and local policy choices',
    proofRules: ['system map', 'variable impact', 'evidence use', 'tradeoff plan'],
    finalVerification: 'produce a sustainability plan with evidence and expected impacts',
    gamification: { quests: 'Systems', bosses: 'Climate Tradeoffs', badges: ['Ecosystem Mapper', 'Impact Analyst', 'Sustainability Planner'] },
  },
  {
    id: 'FOREIGN_LANGUAGE',
    label: 'Languages',
    icon: 'message',
    workspaceType: 'language',
    description: 'Vocabulary, pronunciation, grammar, listening, sentence building, translation, and conversation.',
    taskTypes: ['GeneratedLesson', 'VocabDrills', 'FillInTheBlank', 'AIConversationRoleplay'],
    lessonTone: 'immersive, introduce target language early, use spaced repetition for vocabulary, always show pronunciation',
    assessmentStyle: 'grade naturalness and grammar separately, tolerate creative phrasing, and reward attempts',
    projectType: 'hold a full AI conversation in the target language on a topic from the unit',
    exampleStyle: 'everyday scenarios: ordering food, traveling, small talk, work, school, and directions',
    proofRules: ['comprehensible response', 'target vocabulary', 'grammar pattern', 'conversation recovery'],
    finalVerification: 'complete a realistic conversation or translation task',
    gamification: { quests: 'Conversations', bosses: 'Native Speaker', badges: ['First Words', 'Fluent Thinker', 'Immersion Mode'] },
  },
  {
    id: 'ART_DESIGN',
    label: 'Art / Design',
    icon: 'design',
    workspaceType: 'creative',
    description: 'Composition, critique, color, typography, visual systems, iteration, and design choices.',
    taskTypes: ['GeneratedLesson', 'CompositionCanvas', 'CritiqueBoard', 'StyleIteration'],
    lessonTone: 'visual, critique-oriented, concrete about design decisions, and supportive of iteration',
    assessmentStyle: 'grade composition, hierarchy, contrast, intent, and quality of critique',
    projectType: 'create and explain a design or art piece with intentional choices',
    exampleStyle: 'canvases, moodboards, type scales, color palettes, before/after iterations, and critiques',
    proofRules: ['visual choice', 'composition rationale', 'iteration', 'critique response'],
    finalVerification: 'create and explain a visual work or design revision',
    gamification: { quests: 'Studios', bosses: 'Blank Canvas', badges: ['Composition Lead', 'Critique Ready', 'Visual Thinker'] },
  },
  {
    id: 'MUSIC',
    label: 'Music',
    icon: 'music',
    workspaceType: 'music',
    description: 'Rhythm, notation, ear training, harmony, listening, performance, and composition.',
    taskTypes: ['GeneratedLesson', 'RhythmTrainer', 'NotationBuilder', 'EarTraining'],
    lessonTone: 'aural, pattern-based, practical, and grounded in listening and notation',
    assessmentStyle: 'grade rhythm accuracy, notation placement, listening discrimination, and explanation',
    projectType: 'perform, compose, or analyze a short musical passage',
    exampleStyle: 'staff notation, piano roll, rhythm grids, intervals, chord progressions, and listening prompts',
    proofRules: ['rhythm placement', 'notation accuracy', 'listening distinction', 'musical explanation'],
    finalVerification: 'perform, compose, or analyze a short piece',
    gamification: { quests: 'Practice Sets', bosses: 'Rhythm Locks', badges: ['Beat Keeper', 'Interval Ear', 'Composer'] },
  },
  {
    id: 'COMMUNICATION',
    label: 'Communication',
    icon: 'audio',
    workspaceType: 'communication',
    description: 'Public speaking, persuasion, interviews, storytelling, delivery, audience analysis, and Q&A.',
    taskTypes: ['GeneratedLesson', 'SpeechOutline', 'DeliveryCoach', 'AudienceQASimulation'],
    lessonTone: 'practical, audience-aware, encouraging, and focused on rehearsal and feedback',
    assessmentStyle: 'grade structure, audience fit, clarity, delivery choices, and response quality',
    projectType: 'deliver or script a short presentation with feedback checkpoints',
    exampleStyle: 'speech outlines, teleprompters, audience cards, interview prompts, and Q&A simulations',
    proofRules: ['clear structure', 'audience fit', 'delivery cue', 'Q&A response'],
    finalVerification: 'complete a presentation or conversation simulation',
    gamification: { quests: 'Rehearsals', bosses: 'Tough Questions', badges: ['Clear Speaker', 'Story Builder', 'Q&A Ready'] },
  },
  {
    id: 'PHILOSOPHY_LOGIC',
    label: 'Philosophy & Logic',
    icon: 'brain',
    workspaceType: 'logic',
    description: 'Arguments, assumptions, fallacies, ethics, debate, paradoxes, and logical structure.',
    taskTypes: ['GeneratedLesson', 'ArgumentMapping', 'FallacyIdentification', 'AdversarialDebate'],
    lessonTone: 'Socratic, question assumptions constantly, present the strongest version of every position',
    assessmentStyle: 'grade logical validity, soundness, and clarity of argument structure separately',
    projectType: 'write and defend a philosophical position, then steelman the opposing view',
    exampleStyle: 'classic thought experiments, real ethical dilemmas, argument maps, and fallacy cases',
    proofRules: ['argument structure', 'assumption named', 'fallacy check', 'steelman response'],
    finalVerification: 'map and defend an argument against objections',
    gamification: { quests: 'Arguments', bosses: 'Classic Paradoxes', badges: ['Fallacy Hunter', 'Socrates Mode', 'Dialectician'] },
  },
]

export const LEARNING_DOMAINS = Object.freeze(DOMAIN_DEFINITIONS.map((definition) => definition.id))

export const DOMAIN_METADATA = Object.freeze(Object.fromEntries(DOMAIN_DEFINITIONS.map((definition) => [
  definition.id,
  {
    label: definition.label,
    icon: definition.icon,
    description: definition.description,
    workspaceType: definition.workspaceType,
  },
])))

export const DOMAIN_ADAPTERS = Object.freeze(Object.fromEntries(DOMAIN_DEFINITIONS.map((definition) => [
  definition.id,
  {
    taskTypes: definition.taskTypes,
    lessonTone: definition.lessonTone,
    assessmentStyle: definition.assessmentStyle,
    projectType: definition.projectType,
    exampleStyle: definition.exampleStyle,
    workspaceType: definition.workspaceType,
    proofRules: definition.proofRules,
    finalVerification: definition.finalVerification,
  },
])))

export const DOMAIN_GAMIFICATION = Object.freeze(Object.fromEntries(DOMAIN_DEFINITIONS.map((definition) => [
  definition.id,
  definition.gamification,
])))

export const DOMAIN_REGISTRY = Object.freeze(Object.fromEntries(DOMAIN_DEFINITIONS.map((definition) => [
  definition.id,
  Object.freeze({ ...definition }),
])))

export const CODE_DOMAIN_TASK_TYPES = Object.freeze(['CodeSandbox', 'DebugChallenge', 'MiniProject'])

export const DOMAIN_TASK_LABELS = Object.freeze({
  GeneratedLesson: 'Generated Lesson',
  CodeSandbox: 'Code Sandbox',
  DebugChallenge: 'Debug Challenge',
  MiniProject: 'Mini Project',
  StepByStepProblem: 'Step-by-Step Problem',
  ProofWriting: 'Proof Writing',
  ApplicationProblem: 'Application Problem',
  VocabDrills: 'Vocab Drills',
  FillInTheBlank: 'Fill in the Blank',
  AIConversationRoleplay: 'AI Conversation',
  SolveWithUnits: 'Solve with Units',
  ConceptualExplainBack: 'Explain Back',
  DiagramAnalysis: 'Diagram Analysis',
  TimelineOrdering: 'Timeline Ordering',
  SourceAnalysis: 'Source Analysis',
  CauseEffectEssay: 'Cause/Effect Essay',
  SocraticDebate: 'Socratic Debate',
  GraphInterpretation: 'Graph Interpretation',
  CaseAnalysis: 'Case Analysis',
  PolicyDebate: 'Policy Debate',
  BalanceEquations: 'Balance Equations',
  ReactionPrediction: 'Reaction Prediction',
  NomenclatureDrills: 'Nomenclature Drills',
  ArgumentMapping: 'Argument Mapping',
  FallacyIdentification: 'Fallacy Identification',
  AdversarialDebate: 'Adversarial Debate',
  TimedPrompt: 'Timed Prompt',
  RewriteForClarity: 'Rewrite for Clarity',
  RubricFeedback: 'Rubric Feedback',
  CaseStudyAnalysis: 'Case Study Analysis',
  ConceptApplication: 'Concept Application',
  ResearchCritique: 'Research Critique',
  PolicyBrief: 'Policy Brief',
  SystemsComparison: 'Systems Comparison',
  MockDebate: 'Mock Debate',
  LabelDiagram: 'Label Diagram',
  ExplainMechanism: 'Explain Mechanism',
  GeneticsProblemSet: 'Genetics Problem Set',
  ConstraintPrototype: 'Constraint Prototype',
  TestBenchSimulation: 'Test Bench Simulation',
  DesignReview: 'Design Review',
  WorkflowTroubleshoot: 'Workflow Troubleshoot',
  SystemConfig: 'System Configuration',
  ToolComparison: 'Tool Comparison',
  PhishingTriage: 'Phishing Triage',
  ThreatModel: 'Threat Model',
  NetworkDefense: 'Network Defense',
  DatasetPrediction: 'Dataset Prediction',
  ModelComparison: 'Model Comparison',
  BiasErrorAnalysis: 'Bias/Error Analysis',
  DataCleaning: 'Data Cleaning',
  ChartBuilder: 'Chart Builder',
  InsightReport: 'Insight Report',
  DistributionExplorer: 'Distribution Explorer',
  HypothesisTest: 'Hypothesis Test',
  SamplingSimulation: 'Sampling Simulation',
  BudgetAllocation: 'Budget Allocation',
  PortfolioRisk: 'Portfolio Risk',
  StatementAnalysis: 'Statement Analysis',
  StrategyCase: 'Strategy Case',
  MetricsDiagnosis: 'Metrics Diagnosis',
  DecisionMemo: 'Decision Memo',
  PassageAnnotation: 'Passage Annotation',
  EvidenceBoard: 'Evidence Board',
  InferenceCheck: 'Inference Check',
  AnatomyLabeling: 'Anatomy Labeling',
  CaseChartReasoning: 'Case Chart Reasoning',
  SafetyTriage: 'Safety Triage',
  EcosystemSimulation: 'Ecosystem Simulation',
  ImpactMap: 'Impact Map',
  SustainabilityPlan: 'Sustainability Plan',
  CompositionCanvas: 'Composition Canvas',
  CritiqueBoard: 'Critique Board',
  StyleIteration: 'Style Iteration',
  RhythmTrainer: 'Rhythm Trainer',
  NotationBuilder: 'Notation Builder',
  EarTraining: 'Ear Training',
  SpeechOutline: 'Speech Outline',
  DeliveryCoach: 'Delivery Coach',
  AudienceQASimulation: 'Audience Q&A Simulation',
})

const DOMAIN_ASSIGNMENT_BY_TYPE = Object.freeze({
  CS_CODING: { guided_practice: 'CodeSandbox', challenge: 'DebugChallenge', explain: 'CodeSandbox', quiz: 'CodeSandbox', recall: 'CodeSandbox', project: 'MiniProject', boss: 'MiniProject', final_exam: 'MiniProject' },
  MATHEMATICS: { guided_practice: 'StepByStepProblem', challenge: 'ApplicationProblem', explain: 'ProofWriting', quiz: 'StepByStepProblem', recall: 'StepByStepProblem', project: 'ApplicationProblem', boss: 'ProofWriting', final_exam: 'ApplicationProblem' },
  PHYSICS: { guided_practice: 'SolveWithUnits', challenge: 'DiagramAnalysis', explain: 'ConceptualExplainBack', quiz: 'SolveWithUnits', recall: 'DiagramAnalysis', project: 'DiagramAnalysis', boss: 'SolveWithUnits', final_exam: 'DiagramAnalysis' },
  CHEMISTRY: { guided_practice: 'BalanceEquations', challenge: 'ReactionPrediction', explain: 'ReactionPrediction', quiz: 'NomenclatureDrills', recall: 'NomenclatureDrills', project: 'ReactionPrediction', boss: 'BalanceEquations', final_exam: 'ReactionPrediction' },
  BIOLOGY: { guided_practice: 'LabelDiagram', challenge: 'GeneticsProblemSet', explain: 'ExplainMechanism', quiz: 'GeneticsProblemSet', recall: 'LabelDiagram', project: 'ExplainMechanism', boss: 'GeneticsProblemSet', final_exam: 'ExplainMechanism' },
  ENGINEERING: { guided_practice: 'ConstraintPrototype', challenge: 'TestBenchSimulation', explain: 'DesignReview', quiz: 'ConstraintPrototype', recall: 'DesignReview', project: 'DesignReview', boss: 'TestBenchSimulation', final_exam: 'DesignReview' },
  TECHNOLOGY: { guided_practice: 'SystemConfig', challenge: 'WorkflowTroubleshoot', explain: 'ToolComparison', quiz: 'WorkflowTroubleshoot', recall: 'ToolComparison', project: 'SystemConfig', boss: 'WorkflowTroubleshoot', final_exam: 'ToolComparison' },
  CYBERSECURITY: { guided_practice: 'PhishingTriage', challenge: 'ThreatModel', explain: 'NetworkDefense', quiz: 'PhishingTriage', recall: 'ThreatModel', project: 'NetworkDefense', boss: 'ThreatModel', final_exam: 'NetworkDefense' },
  ML_AI: { guided_practice: 'DatasetPrediction', challenge: 'ModelComparison', explain: 'BiasErrorAnalysis', quiz: 'ModelComparison', recall: 'DatasetPrediction', project: 'BiasErrorAnalysis', boss: 'ModelComparison', final_exam: 'BiasErrorAnalysis' },
  DATA_SCIENCE: { guided_practice: 'DataCleaning', challenge: 'ChartBuilder', explain: 'InsightReport', quiz: 'ChartBuilder', recall: 'DataCleaning', project: 'InsightReport', boss: 'ChartBuilder', final_exam: 'InsightReport' },
  STATISTICS: { guided_practice: 'DistributionExplorer', challenge: 'HypothesisTest', explain: 'SamplingSimulation', quiz: 'HypothesisTest', recall: 'DistributionExplorer', project: 'HypothesisTest', boss: 'SamplingSimulation', final_exam: 'HypothesisTest' },
  ECONOMICS: { guided_practice: 'GraphInterpretation', challenge: 'CaseAnalysis', explain: 'PolicyDebate', quiz: 'GraphInterpretation', recall: 'CaseAnalysis', project: 'PolicyDebate', boss: 'CaseAnalysis', final_exam: 'PolicyDebate' },
  FINANCE: { guided_practice: 'BudgetAllocation', challenge: 'PortfolioRisk', explain: 'StatementAnalysis', quiz: 'BudgetAllocation', recall: 'StatementAnalysis', project: 'PortfolioRisk', boss: 'PortfolioRisk', final_exam: 'StatementAnalysis' },
  BUSINESS: { guided_practice: 'StrategyCase', challenge: 'MetricsDiagnosis', explain: 'DecisionMemo', quiz: 'MetricsDiagnosis', recall: 'StrategyCase', project: 'DecisionMemo', boss: 'StrategyCase', final_exam: 'DecisionMemo' },
  WRITING: { guided_practice: 'RewriteForClarity', challenge: 'TimedPrompt', explain: 'RubricFeedback', quiz: 'RubricFeedback', recall: 'RewriteForClarity', project: 'TimedPrompt', boss: 'RubricFeedback', final_exam: 'RubricFeedback' },
  READING_COMPREHENSION: { guided_practice: 'PassageAnnotation', challenge: 'EvidenceBoard', explain: 'InferenceCheck', quiz: 'InferenceCheck', recall: 'PassageAnnotation', project: 'EvidenceBoard', boss: 'EvidenceBoard', final_exam: 'InferenceCheck' },
  HISTORY: { guided_practice: 'TimelineOrdering', challenge: 'SourceAnalysis', explain: 'CauseEffectEssay', quiz: 'TimelineOrdering', recall: 'TimelineOrdering', project: 'CauseEffectEssay', boss: 'SourceAnalysis', final_exam: 'CauseEffectEssay' },
  GOVERNMENT_CIVICS: { guided_practice: 'PolicyBrief', challenge: 'SystemsComparison', explain: 'MockDebate', quiz: 'PolicyBrief', recall: 'SystemsComparison', project: 'PolicyBrief', boss: 'MockDebate', final_exam: 'PolicyBrief' },
  PSYCHOLOGY: { guided_practice: 'CaseStudyAnalysis', challenge: 'ResearchCritique', explain: 'ConceptApplication', quiz: 'CaseStudyAnalysis', recall: 'ConceptApplication', project: 'ResearchCritique', boss: 'CaseStudyAnalysis', final_exam: 'ResearchCritique' },
  MEDICINE_HEALTH: { guided_practice: 'AnatomyLabeling', challenge: 'CaseChartReasoning', explain: 'SafetyTriage', quiz: 'AnatomyLabeling', recall: 'SafetyTriage', project: 'CaseChartReasoning', boss: 'SafetyTriage', final_exam: 'CaseChartReasoning' },
  ENVIRONMENTAL_SCIENCE: { guided_practice: 'EcosystemSimulation', challenge: 'ImpactMap', explain: 'SustainabilityPlan', quiz: 'ImpactMap', recall: 'EcosystemSimulation', project: 'SustainabilityPlan', boss: 'ImpactMap', final_exam: 'SustainabilityPlan' },
  FOREIGN_LANGUAGE: { guided_practice: 'AIConversationRoleplay', challenge: 'FillInTheBlank', explain: 'AIConversationRoleplay', quiz: 'FillInTheBlank', recall: 'VocabDrills', project: 'AIConversationRoleplay', boss: 'AIConversationRoleplay', final_exam: 'AIConversationRoleplay' },
  ART_DESIGN: { guided_practice: 'CompositionCanvas', challenge: 'StyleIteration', explain: 'CritiqueBoard', quiz: 'CritiqueBoard', recall: 'CompositionCanvas', project: 'StyleIteration', boss: 'CritiqueBoard', final_exam: 'StyleIteration' },
  MUSIC: { guided_practice: 'RhythmTrainer', challenge: 'NotationBuilder', explain: 'EarTraining', quiz: 'EarTraining', recall: 'RhythmTrainer', project: 'NotationBuilder', boss: 'EarTraining', final_exam: 'NotationBuilder' },
  COMMUNICATION: { guided_practice: 'SpeechOutline', challenge: 'DeliveryCoach', explain: 'AudienceQASimulation', quiz: 'AudienceQASimulation', recall: 'SpeechOutline', project: 'DeliveryCoach', boss: 'AudienceQASimulation', final_exam: 'DeliveryCoach' },
  PHILOSOPHY_LOGIC: { guided_practice: 'ArgumentMapping', challenge: 'FallacyIdentification', explain: 'AdversarialDebate', quiz: 'FallacyIdentification', recall: 'ArgumentMapping', project: 'AdversarialDebate', boss: 'AdversarialDebate', final_exam: 'ArgumentMapping' },
})

const STRONG_CODING_GOAL_PATTERN = /\b(code|coding|programming|programmer|developer|software|python|javascript|typescript|react|node|next\.?js|sql|java|c\+\+|c#|rust|swift|kotlin|django|flask|api|backend|back-end|frontend|front-end|algorithm|data structure|leetcode|debug|compiler|terminal|devops|open source)\b/i
const BROAD_CODING_GOAL_PATTERN = /\b(html|css|web app|mobile app|app development|website development|full stack|full-stack|scripting|automation)\b/i
const NON_CODE_DESIGN_GOAL_PATTERN = /\b(ui\/?ux|user interface|user experience|product design|web design|wireframe|prototype|figma|visual design|interaction design|usability|design system|ux research|information architecture)\b/i

function normalizeDomainKey(domain) {
  const normalized = String(domain || '').trim().toUpperCase()
  return DOMAIN_ALIASES[normalized] || normalized
}

export function isCodingGoalText(goalText = '') {
  const text = String(goalText || '').trim()
  if (!text) return false
  if (NON_CODE_DESIGN_GOAL_PATTERN.test(text)) return false
  if (/\b(machine learning|deep learning|artificial intelligence|data science|statistics|analytics|cybersecurity|security|finance|business)\b/i.test(text)) {
    return STRONG_CODING_GOAL_PATTERN.test(text) && /\b(engineering|code|python|sql|programming|build|app)\b/i.test(text)
  }
  return STRONG_CODING_GOAL_PATTERN.test(text) || BROAD_CODING_GOAL_PATTERN.test(text)
}

export function normalizeDomain(domain, fallback = DEFAULT_DOMAIN) {
  const normalized = normalizeDomainKey(domain)
  return LEARNING_DOMAINS.includes(normalized) ? normalized : fallback
}

export function isValidDomain(domain) {
  return LEARNING_DOMAINS.includes(normalizeDomainKey(domain))
}

export function getDomainRegistryEntry(domain) {
  const resolved = normalizeDomain(domain)
  return DOMAIN_REGISTRY[resolved] || DOMAIN_REGISTRY[DEFAULT_DOMAIN]
}

export function getDomainMetadata(domain) {
  return DOMAIN_METADATA[normalizeDomain(domain)] || DOMAIN_METADATA[DEFAULT_DOMAIN]
}

export function getDomainAdapter(domain) {
  return DOMAIN_ADAPTERS[normalizeDomain(domain)] || DOMAIN_ADAPTERS[DEFAULT_DOMAIN]
}

export function getDomainGamification(domain) {
  return DOMAIN_GAMIFICATION[normalizeDomain(domain)] || DOMAIN_GAMIFICATION[DEFAULT_DOMAIN]
}

export function getDomainWorkspaceType(domain) {
  return getDomainAdapter(domain).workspaceType || 'evidence'
}

export function buildDomainConfig(domain) {
  const resolvedDomain = normalizeDomain(domain)
  return {
    domain: resolvedDomain,
    ...getDomainAdapter(resolvedDomain),
    gamification: getDomainGamification(resolvedDomain),
  }
}

export function getDomainTaskLabel(taskType) {
  return DOMAIN_TASK_LABELS[taskType] || String(taskType || '').replace(/([a-z])([A-Z])/g, '$1 $2') || 'Domain Task'
}

export function resolvePracticeDomainForGoal(domain, goalText = '') {
  const resolvedDomain = normalizeDomain(domain, null)
  if (resolvedDomain === 'CS_CODING' && goalText && !isCodingGoalText(goalText)) {
    const heuristic = detectDomainHeuristic(goalText)
    return heuristic?.domain && heuristic.domain !== 'CS_CODING' ? heuristic.domain : 'WRITING'
  }
  return resolvedDomain || DEFAULT_DOMAIN
}

export function getDomainAssignmentType(domain, canonicalType = 'guided_practice', goalText = '') {
  const resolvedDomain = normalizeDomain(resolvePracticeDomainForGoal(domain, goalText), null)
  if (!resolvedDomain) return null
  if (canonicalType === 'concept') return 'GeneratedLesson'
  return DOMAIN_ASSIGNMENT_BY_TYPE[resolvedDomain]?.[canonicalType] || null
}

export function formatDomainForPrompt(domain) {
  const resolvedDomain = normalizeDomain(domain)
  const meta = getDomainMetadata(resolvedDomain)
  const config = getDomainAdapter(resolvedDomain)
  return [
    `Domain: ${resolvedDomain} (${meta.label})`,
    `Workspace type: ${config.workspaceType}`,
    `Lesson tone: ${config.lessonTone}`,
    `Use examples like: ${config.exampleStyle}`,
    `Assessment style: ${config.assessmentStyle}`,
    `Unit project type: ${config.projectType}`,
    `Proof rules: ${(config.proofRules || []).join(', ')}`,
    `Final verification: ${config.finalVerification}`,
    `Domain task types: ${config.taskTypes.join(', ')}`,
  ].join('\n')
}

export function buildDomainKnowledgeLine(domain) {
  const resolvedDomain = normalizeDomain(domain)
  return `Confirmed learning domain: ${resolvedDomain}. Domain config JSON: ${JSON.stringify(buildDomainConfig(resolvedDomain))}`
}

export function getStoredLearningDomain() {
  if (typeof window === 'undefined') return null
  try {
    return normalizeDomain(window.localStorage.getItem(DOMAIN_STORAGE_KEY), null)
  } catch {
    return null
  }
}

export function setStoredLearningDomain(domain) {
  if (typeof window === 'undefined') return
  const normalized = normalizeDomain(domain, null)
  try {
    if (normalized) window.localStorage.setItem(DOMAIN_STORAGE_KEY, normalized)
    else window.localStorage.removeItem(DOMAIN_STORAGE_KEY)
  } catch {}
}

export function parseDomainFromConstraints(constraints) {
  const values = Array.isArray(constraints) ? constraints : [constraints]
  const joined = values.filter(Boolean).join('\n')
  const direct = joined.match(/Confirmed learning domain:\s*([A-Z_]+)/i)
  if (direct?.[1]) return normalizeDomain(direct[1], null)
  const jsonMatch = joined.match(/"domain"\s*:\s*"([A-Z_]+)"/i)
  if (jsonMatch?.[1]) return normalizeDomain(jsonMatch[1], null)
  return null
}

export function detectDomainHeuristic(goal = '') {
  const text = String(goal || '').toLowerCase()
  const rules = [
    ['CYBERSECURITY', /\b(cybersecurity|cyber security|phishing|threat model|network security|password|malware|soc|incident response|security analyst|safe hacking|ethical hacking)\b/],
    ['ML_AI', /\b(machine learning|deep learning|artificial intelligence|ai\b|ml\b|neural network|model evaluation|classification|regression model|prompt engineering|llm|computer vision|nlp)\b/],
    ['DATA_SCIENCE', /\b(data science|data analysis|analytics|dashboard|data cleaning|data visualization|pandas|tableau|power bi|sql analytics|exploratory data)\b/],
    ['STATISTICS', /\b(statistics|probability|hypothesis test|confidence interval|sampling|distribution|p-value|regression analysis|bayesian)\b/],
    ['FOREIGN_LANGUAGE', /\b(spanish|french|german|japanese|korean|mandarin|chinese|italian|portuguese|arabic|hindi|russian|language|speak|fluency|vocab|grammar|pronunciation|translation)\b/],
    ['ART_DESIGN', /\b(ui\/?ux|user interface|user experience|product design|web design|wireframe|prototype|figma|visual design|interaction design|usability|design system|ux research|information architecture|art|drawing|illustration|composition|typography|color theory)\b/],
    ['CS_CODING', /\b(code|coding|programming|python|javascript|typescript|react|sql|java|c\+\+|rust|swift|kotlin|html|css|web app|software|algorithm|data structure|compiler|debug|backend|frontend|full stack)\b/],
    ['MATHEMATICS', /\b(math|mathematics|algebra|calculus|geometry|linear algebra|trigonometry|proof|equation|graphing)\b/],
    ['PHYSICS', /\b(physics|mechanics|electricity|magnetism|thermodynamics|quantum|relativity|force|motion|energy|kinematics)\b/],
    ['CHEMISTRY', /\b(chemistry|chemical|organic chemistry|reaction|molecule|atom|bond|stoichiometry|periodic table|acid|base)\b/],
    ['BIOLOGY', /\b(biology|cell|genetics|dna|evolution|anatomy|ecology|organism|physiology|bio|microbiology|botany|zoology)\b/],
    ['ENGINEERING', /\b(engineering|mechanical engineering|electrical engineering|civil engineering|prototype|materials|circuit|robotics|cad|design constraint)\b/],
    ['TECHNOLOGY', /\b(technology|computer literacy|troubleshoot|workflow|software tools|operating system|cloud tools|automation tools|technical support)\b/],
    ['FINANCE', /\b(finance|investing|investment|budget|stock|portfolio|accounting|financial statement|cash flow|valuation|retirement|loan|mortgage)\b/],
    ['BUSINESS', /\b(business|startup|entrepreneurship|marketing|sales|strategy|operations|management|product management|saas metrics|customer discovery)\b/],
    ['ECONOMICS', /\b(economics|microeconomics|macroeconomics|market|inflation|supply|demand|policy|trade|gdp|recession)\b/],
    ['READING_COMPREHENSION', /\b(reading comprehension|close reading|literature|annotation|main idea|theme|inference|text evidence|sat reading|act reading)\b/],
    ['WRITING', /\b(writing|essay|novel|story|copywriting|screenplay|poetry|draft|editing|grammar for writing|persuasive writing)\b/],
    ['HISTORY', /\b(history|historical|ancient|medieval|war|revolution|empire|civilization|primary source|timeline)\b/],
    ['GOVERNMENT_CIVICS', /\b(civics|government|political science|politics|policy|geopolitics|international relations|campaign|democracy|constitution|law|rights|court)\b/],
    ['PSYCHOLOGY', /\b(psychology|cognitive|behavior|therapy|clinical|neuroscience|personality|memory|emotion|social psychology)\b/],
    ['MEDICINE_HEALTH', /\b(medicine|medical|health science|nursing|anatomy|pathophysiology|public health|symptoms|vitals|diagnosis|body systems)\b/],
    ['ENVIRONMENTAL_SCIENCE', /\b(environmental science|environment|climate|sustainability|ecosystem|biodiversity|pollution|carbon|renewable|conservation)\b/],
    ['MUSIC', /\b(music|piano|guitar|rhythm|melody|harmony|ear training|music theory|notation|composition|songwriting)\b/],
    ['COMMUNICATION', /\b(public speaking|communication|presentation|speech|interview|debate skills|storytelling|persuasion|audience|delivery)\b/],
    ['PHILOSOPHY_LOGIC', /\b(philosophy|logic|ethics|argument|fallacy|socratic|epistemology|metaphysics|critical thinking)\b/],
  ]

  for (const [domain, pattern] of rules) {
    if (pattern.test(text)) return { domain, confidence: 0.72, source: 'heuristic' }
  }

  return { domain: DEFAULT_DOMAIN, confidence: 0.45, source: 'heuristic' }
}

export function resolveGoalDomain(goal = {}, fallbackGoalText = '') {
  return normalizeDomain(
    goal?.domain
      || goal?.domain_config?.domain
      || parseDomainFromConstraints(goal?.constraints)
      || getStoredLearningDomain()
      || detectDomainHeuristic(goal?.goal_text || fallbackGoalText).domain,
    DEFAULT_DOMAIN,
  )
}
