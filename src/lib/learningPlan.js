import { buildFlowSequence, calculateMasteryScore } from '@/lib/learningEngine'
import { getOpenAIModel } from '@/lib/openaiModels'
import {
  buildAdaptivePlan,
  buildAdaptiveProfile,
  buildAdaptivePromptContext,
  buildAdaptiveTaskMetadata,
} from '@/lib/adaptiveLearning'
import {
  buildCourseFinalExamPlanDay,
  filterRowsForCourseWindow,
  isCourseFinalExamTask,
} from '@/lib/courseCompletion'
import {
  buildCourseSequence,
  buildPathOutlineTracker,
  courseOutlineNeedsRecovery,
} from '@/lib/pathOutline.js'
import {
  getCourseOutlineStatus,
  getStoredCourseOutline,
  persistCourseOutline,
  stripStoredCourseOutlineConstraint,
  withCourseOutlineMeta,
} from '@/lib/courseOutlineStore'
import {
  CANONICAL_TASK_TYPES,
  getCanonicalTaskType,
  normalizeLearningTask,
  normalizeLearningTasks,
} from '@/lib/taskTaxonomy'
import {
  analyzeTaskQuality,
  isBrokenTaskRow,
  titleLooksGeneric,
  descriptionLooksGeneric,
} from '@/lib/taskQuality'
import {
  buildLearningContract,
  deriveDepthPolicy,
  normalizeLearnerProfile,
} from '@/lib/conceptLesson'
import {
  buildDomainConfig,
  formatDomainForPrompt,
  getDomainAssignmentType,
  getDomainTaskLabel,
  normalizeDomain,
  parseDomainFromConstraints,
} from '@/lib/domainAdapter'

// ─────────────────────────────────────────────
// Constants & helpers
// ─────────────────────────────────────────────

const TASK_SEQUENCE = ['concept', 'recall', 'quiz']
const CLEAN_TASK_TYPES = [...CANONICAL_TASK_TYPES]
const FALLBACK_MODULE_DAY_VARIANTS = [
  'First Worked Example',
  'One Common Mistake',
  'Guided Practice Move',
  'Real Situation Walkthrough',
  'Boundary Case',
  'Short Proof Check',
  'Confidence Review',
]

export const BANNED_CONCEPT_WORDS = [
  'fundamentals',
  'foundations',
  'basics',
  'core',
  'key concepts',
  'getting started',
  'introduction to',
  'building blocks',
  'overview',
  'advanced topics',
  'practical skills',
  'intermediate',
  'deep dive',
  'problem solving',
  'application',
  'mastery',
  'exploration',
]

const CONCRETE_CONCEPTS = {
  python: [
    'What Python Is Used For',
    'How Python Runs One Line at a Time',
    'How print() Displays Text',
    'What a Variable Stores',
    'How = Assigns a Value',
    'How Text Values Use Strings',
    'How Number Values Store Amounts',
    'How Comments Explain Code',
    'How input() Reads User Text',
    'How if Chooses One Path',
    'How elif Checks Another Path',
    'How else Handles the Remaining Case',
    'How for Loops Repeat a Fixed Count',
    'How while Loops Repeat Until a Condition Changes',
    'How a Function Reuses Steps',
    'How Parameters Pass Values into a Function',
    'How return Sends a Value Back',
    'How Lists Store Ordered Items',
    'How List Indexes Pick One Item',
    'How Dictionaries Store Key-Value Pairs',
    'How try/except Handles an Error',
    'How import Loads a Module',
  ],
  javascript: [
    'What JavaScript Does in a Web Page',
    'How console.log() Shows a Value',
    'How let Creates a Changeable Variable',
    'How const Protects a Saved Value',
    'How Strings Store Text',
    'How Numbers Store Amounts',
    'How if Chooses One Path',
    'How Arrays Keep Items in Order',
    'How Objects Store Named Values',
    'How Functions Reuse Steps',
    'How Parameters Pass Values into Functions',
    'How return Sends a Value Back',
    'How querySelector Finds an Element',
    'How Events Trigger Code',
    'How fetch Requests Data',
  ],
  web_development: [
    'What HTML Describes on a Page',
    'How an HTML Element Wraps Content',
    'How Headings Create Page Structure',
    'How Links Move to Another Page',
    'How CSS Selectors Choose Elements',
    'How Color Changes Text and Backgrounds',
    'How the Box Model Adds Space',
    'How Flexbox Aligns Items in One Direction',
    'How Grid Places Items in Rows and Columns',
    'How Media Queries Change Layout by Screen Size',
    'How Forms Collect User Input',
    'How JavaScript Changes Page Content',
  ],
  machine_learning: [
    'What Machine Learning Predicts',
    'How Examples Become Training Data',
    'How Features Describe Each Example',
    'How Labels Show the Answer',
    'How Train/Test Split Checks Generalization',
    'How Linear Regression Fits a Line',
    'How Classification Predicts a Category',
    'How Accuracy Counts Correct Predictions',
    'How a Confusion Matrix Shows Mistakes',
    'How Overfitting Memorizes Training Data',
    'How Decision Trees Split Data',
    'How Gradient Descent Reduces Error',
  ],
  data_science: [
    'What a Dataset Stores',
    'How Rows Represent Examples',
    'How Columns Represent Variables',
    'How a Chart Shows a Pattern',
    'How Averages Summarize Values',
    'How Outliers Stand Apart',
    'How Correlation Shows Movement Together',
    'How Filtering Narrows Data',
    'How Grouping Compares Categories',
    'How Train/Test Split Checks a Model',
  ],
  git: [
    'What a Git Repository Tracks',
    'How git status Shows File Changes',
    'How git add Stages a Change',
    'How a Commit Saves a Snapshot',
    'How git log Shows History',
    'How Branches Separate Work',
    'How Merge Combines Branches',
    'How Merge Conflicts Mark Overlap',
    'How Remote Repositories Share Work',
    'How Pull Requests Review Changes',
  ],
  ios: [
    'What SwiftUI Displays on Screen',
    'How Text Shows Words in SwiftUI',
    'How VStack Stacks Views Vertically',
    'How @State Stores Changing Screen Data',
    'How Button Runs an Action',
    'How if Shows Conditional UI',
    'How ForEach Repeats Views',
    'How TextField Collects Input',
    'How NavigationStack Moves Between Screens',
    'How UserDefaults Saves a Small Value',
  ],
  foreign_language: [
    'How a Greeting Starts a Conversation',
    'How Subject Pronouns Name the Speaker',
    'How to Say I Am',
    'How to Say I Want',
    'How to Ask a Simple Question',
    'How Articles Mark a Noun',
    'How Adjectives Describe a Noun',
    'How Numbers Name Amounts',
    'How to Order Food Politely',
    'How to Ask for Directions',
    'How Present Tense Shows Now',
    'How Past Tense Shows Before Now',
  ],
  arduino: [
    'What Arduino Controls',
    'How an Arduino Pin Sends a Signal',
    'How a Breadboard Row Connects Holes',
    'Why an LED Needs a Resistor',
    'How Digital Output Turns an LED On',
    'What setup() Runs Once',
    'How loop() Repeats Instructions',
    'How pinMode Sets a Pin Role',
    'How digitalWrite Sets HIGH or LOW',
    'How delay() Pauses the Program',
    'How a Button Changes an Input Pin',
    'How analogRead Measures a Sensor',
    'How PWM Fades an LED',
    'How Serial Monitor Shows Readings',
  ],
  physics: [
    'What a Force Does to Motion',
    'How Gravity Points Downward',
    'How Normal Force Pushes Up',
    'How Friction Opposes Sliding',
    'How Net Force Combines Arrows',
    'How Acceleration Shows Changing Velocity',
    'How Mass Changes Acceleration',
    'How Position Changes Over Time',
    'How Velocity-Time Graphs Show Motion',
    'How Energy Transfers Between Forms',
  ],
  math: [
    'What a Variable Represents in Math',
    'How a Number Line Shows Value',
    'How Coordinates Locate a Point',
    'How Slope Means Rise Over Run',
    'How an Equation Balances Two Sides',
    'How Distributive Property Opens Parentheses',
    'How Like Terms Combine',
    'How a Function Maps Input to Output',
    'How Graphs Show a Pattern',
    'How Area Counts Square Units',
  ],
  cybersecurity: [
    'What Phishing Tries to Make You Do',
    'How Urgency Creates Pressure in Phishing',
    'How Fake Domains Hide in Sender Addresses',
    'How Suspicious Links Reveal Risk',
    'How Password Reuse Increases Damage',
    'How Multi-Factor Authentication Blocks Login Theft',
    'How Logs Show Repeated Failed Logins',
    'How Least Privilege Limits Access',
    'How Encryption Protects Data in Transit',
    'How Backups Reduce Ransomware Damage',
  ],
  finance: [
    'What Income Means',
    'How Expenses Reduce Cash',
    'How a Budget Assigns Money',
    'What Diversification Means',
    'How Portfolio Allocation Shows Concentration',
    'How Compound Interest Grows Money',
    'How Risk and Return Trade Off',
    'How Cash Flow Shows Timing',
    'How Debt Interest Adds Cost',
    'How Net Worth Compares Assets and Debts',
  ],
  biology: [
    'What a Cell Does',
    'How a Cell Membrane Controls Entry',
    'How the Nucleus Stores Instructions',
    'How Mitochondria Release Energy',
    'How Blood Carries Oxygen',
    'How the Heart Pumps Blood',
    'How DNA Stores Genetic Information',
    'How Enzymes Speed Reactions',
    'How Photosynthesis Stores Energy',
    'How Immune Cells Recognize Threats',
  ],
  chemistry: [
    'What an Atom Is',
    'How Protons Set an Element',
    'How Electrons Form Bonds',
    'How Molecules Combine Atoms',
    'How a Water Molecule Uses Two Hydrogens',
    'How Chemical Equations Show Reactants and Products',
    'How Coefficients Balance Atoms',
    'How pH Shows Acidity',
    'How Ions Carry Charge',
    'How Concentration Measures Amount per Volume',
  ],
  design: [
    'How Contrast Makes Text Readable',
    'How Alignment Creates Order',
    'How Spacing Separates Groups',
    'How Visual Hierarchy Guides Attention',
    'How Color Signals State',
    'How Buttons Show Available Actions',
    'How Grids Keep Layouts Consistent',
    'How Typography Sets Reading Priority',
    'How Before and After Comparisons Reveal Design Issues',
  ],
  general: null,
}

function buildDomainPromptContext({ learnerProfile = null, knowledge = '' } = {}) {
  const resolvedDomain = normalizeDomain(
    learnerProfile?.domain
      || learnerProfile?.domainConfig?.domain
      || parseDomainFromConstraints([knowledge]),
    null,
  )
  if (!resolvedDomain) return { domain: null, domainConfig: null, prompt: '' }
  const domainConfig = learnerProfile?.domainConfig || buildDomainConfig(resolvedDomain)
  return {
    domain: resolvedDomain,
    domainConfig,
    prompt: `DOMAIN ADAPTER:\n${formatDomainForPrompt(resolvedDomain)}`,
  }
}

function normalizeComparableTopic(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
}

function dedupeTopics(values = []) {
  const seen = new Set()
  const ordered = []
  values.forEach((value) => {
    const normalized = normalizeComparableTopic(value)
    if (!normalized || seen.has(normalized)) return
    seen.add(normalized)
    ordered.push(String(value).trim())
  })
  return ordered
}

function cleanGoalSubject(goal = '') {
  const text = String(goal || '')
    .trim()
    .replace(/^i\s+want\s+to\s+learn\s+(?:how\s+to\s+)?/i, '')
    .replace(/^(learn|master|understand|study)\s+/i, '')
    .replace(/^how\s+to\s+/i, '')
    .replace(/\s+from\s+(?:complete\s+)?scratch$/i, '')
    .replace(/\s+/g, ' ')
  return text || 'this skill'
}

function cleanDayFocusTitle(value = '') {
  const text = String(value || '')
    .replace(/^introduction\s+to\s+/i, '')
    .replace(/^intro\s+to\s+/i, '')
    .replace(/\s*:\s*key\s+ideas?$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
  const words = text.split(/\s+/).filter(Boolean)
  return words.length > 8 ? words.slice(0, 8).join(' ') : text
}

export function isConceptTooVague(concept = '') {
  const lower = String(concept || '').toLowerCase()
  return BANNED_CONCEPT_WORDS.some((word) => lower.includes(word))
}

function detectConceptFamily(goal = '', learnerProfile = null) {
  const profileDomain = String(learnerProfile?.domain || learnerProfile?.domainConfig?.domain || '').toLowerCase()
  const text = `${goal || ''} ${profileDomain}`.toLowerCase()
  if (/arduino|electronics|circuit|breadboard|microcontroller|raspberry pi|electrical engineering/.test(text)) return 'arduino'
  if (/cybersecurity|cyber_security|security|phishing|hacking|soc|network defense|password|malware/.test(text)) return 'cybersecurity'
  if (/physics|force|gravity|motion|velocity|acceleration|energy/.test(text)) return 'physics'
  if (/mathematics|math|algebra|geometry|calculus|equation|slope|function|statistics/.test(text)) return 'math'
  if (/finance|business|invest|portfolio|budget|accounting|economics/.test(text)) return 'finance'
  if (/biology|anatomy|health|medicine|cell|heart|genetics/.test(text)) return 'biology'
  if (/chemistry|molecule|atom|reaction|periodic|stoichiometry/.test(text)) return 'chemistry'
  if (/art_design|design|ui|ux|art|typography|layout|color theory/.test(text)) return 'design'
  if (/data_science|data science|statistics|analytics|dataset|data analysis/.test(text)) return 'data_science'
  if (/ml_ai|machine learning|\bml\b|deep learning|neural/.test(text)) return 'machine_learning'
  if (/python/.test(text)) return 'python'
  if (/cs_coding|coding|programming|software/.test(text)) return 'python'
  if (/web development|web dev|frontend|html|css/.test(text)) return 'web_development'
  if (/\bjavascript\b|\bjs\b|typescript|react|node/.test(text)) return 'javascript'
  if (/\bgit\b|version control/.test(text)) return 'git'
  if (/\bios\b|swift|xcode|swiftui|iphone app/.test(text)) return 'ios'
  if (/spanish|french|german|japanese|korean|language/.test(text)) return 'foreign_language'
  return 'general'
}

function buildSpecificConceptVariants(baseConcepts = [], targetCount = 0) {
  const cleanedBase = dedupeTopics(
    (Array.isArray(baseConcepts) ? baseConcepts : [])
      .map((concept) => cleanDayFocusTitle(concept))
      .filter(Boolean),
  ).filter((concept) => !isConceptTooVague(concept))

  if (cleanedBase.length === 0) return []

  const collected = []
  const seen = new Set()
  const add = (label) => {
    const cleaned = cleanDayFocusTitle(label)
    const normalized = normalizeComparableTopic(cleaned)
    if (!cleaned || !normalized || isConceptTooVague(cleaned) || seen.has(normalized)) return
    seen.add(normalized)
    collected.push(cleaned)
  }

  cleanedBase.forEach(add)

  let round = 0
  const minimum = Math.max(targetCount || 0, cleanedBase.length)
  while (collected.length < minimum && round < 6) {
    cleanedBase.forEach((concept) => {
      const variant = [
        `${concept}: Tracing and Predicting Results`,
        `${concept}: Debugging Common Mistakes`,
        `${concept}: Real Scenario Practice`,
        `${concept}: Comparing Strong and Weak Uses`,
        `${concept}: Edge Cases and Decision Rules`,
        `${concept}: Confidence Review`,
      ][round] || `${concept}: Real Scenario Practice`
      add(variant)
    })
    round += 1
  }

  return collected
}

function buildGeneralConcreteConcepts(goal = '', targetCount = 10) {
  const subject = cleanGoalSubject(goal)
  return buildSpecificConceptVariants([
    `What ${subject} Is Used For`,
    `${subject}: Essential Vocabulary`,
    `${subject}: First Worked Example`,
    `${subject}: Common Patterns and Signals`,
    `${subject}: Common Mistakes and Fixes`,
    `${subject}: Real Scenario Walkthrough`,
    `${subject}: Comparing Two Approaches`,
    `${subject}: Interpreting Results`,
    `${subject}: Debugging and Error Checking`,
    `${subject}: Mini Case Study`,
    `${subject}: Independent Task`,
  ], targetCount)
}

function getFallbackModuleSeeds(goal = '', targetCount = 10, learnerProfile = null) {
  const family = detectConceptFamily(goal, learnerProfile)
  const familyConcepts = CONCRETE_CONCEPTS[family]
  if (Array.isArray(familyConcepts) && familyConcepts.length > 0) {
    return buildSpecificConceptVariants(familyConcepts, targetCount)
  }
  return buildGeneralConcreteConcepts(goal, targetCount)
}

function pickPrimaryDayFocus({ title = '', concepts = [] } = {}) {
  const cleanedTitle = cleanDayFocusTitle(title)
  const cleanedConcepts = dedupeTopics(
    (Array.isArray(concepts) ? concepts : [])
      .map((concept) => cleanDayFocusTitle(concept))
      .filter(Boolean),
  )
  const preferred = [cleanedTitle, ...cleanedConcepts].find((value) => value && !isConceptTooVague(value))
  return preferred || cleanedTitle || cleanedConcepts[0] || 'Specific concept'
}

function buildFallbackDayIdentity(seed = '', dayIndex = 0, allocatedDays = 1) {
  if (allocatedDays <= 1 || dayIndex === 0) {
    return {
      title: seed,
      concepts: [seed],
    }
  }

  const stageLabel = FALLBACK_MODULE_DAY_VARIANTS[(dayIndex - 1) % FALLBACK_MODULE_DAY_VARIANTS.length] || 'Real Scenario Practice'
  const title = `${seed}: ${stageLabel}`
  const concepts = dedupeTopics([
    title,
    seed,
  ])

  return {
    title,
    concepts,
  }
}

function buildSequenceItemCoveredTopics(item = {}) {
  return dedupeTopics([
    item?.title,
    ...(Array.isArray(item?.concepts) ? item.concepts : []),
  ])
}

const KNOWN_ASSERTION_RE = /\b(already\s+)?(know|understand|understood|familiar with|comfortable with|can use|can build|have used|used before|covered|completed|learned|studied|experience with|worked with)\b/i
const BRAND_NEW_RE = /\b(brand new|from scratch|zero experience|no experience|never used|new to|complete beginner|total beginner)\b/i
const TOPIC_STOP_WORDS = new Set([
  'what',
  'when',
  'where',
  'why',
  'how',
  'does',
  'used',
  'uses',
  'using',
  'into',
  'with',
  'from',
  'that',
  'this',
  'shows',
  'show',
  'means',
  'mean',
  'value',
  'values',
  'one',
  'two',
  'the',
  'and',
  'for',
  'are',
  'before',
  'after',
])

function topicKeywords(topic = '') {
  const normalized = normalizeComparableTopic(topic)
  const variants = new Set()
  normalized
    .split(/\s+/)
    .filter((word) => word && !TOPIC_STOP_WORDS.has(word) && word.length >= 3)
    .forEach((word) => {
      variants.add(word)
      if (word.endsWith('s') && word.length > 4) variants.add(word.slice(0, -1))
      if (!word.endsWith('s')) variants.add(`${word}s`)
    })
  return [...variants]
}

function collectExplicitKnowledgeChunks(value, chunks = []) {
  if (!value) return chunks
  if (typeof value === 'string') {
    chunks.push(value)
    return chunks
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => collectExplicitKnowledgeChunks(entry, chunks))
    return chunks
  }
  if (typeof value === 'object') {
    const knownKeys = [
      'knownConcepts',
      'coveredConcepts',
      'completedConcepts',
      'skillsKnown',
      'alreadyKnow',
      'priorKnowledge',
      'familiarWith',
      'canDo',
      'strengths',
    ]
    knownKeys.forEach((key) => {
      const knownValue = value[key]
      if (!knownValue) return
      const before = chunks.length
      collectExplicitKnowledgeChunks(knownValue, chunks)
      for (let index = before; index < chunks.length; index += 1) {
        chunks[index] = `I know ${chunks[index]}`
      }
    })
  }
  return chunks
}

function topicLooksExplicitlyKnown(topic = '', text = '') {
  const normalizedText = normalizeComparableTopic(text)
  if (!topic || !normalizedText || !KNOWN_ASSERTION_RE.test(text)) return false

  const normalizedTopic = normalizeComparableTopic(topic)
  if (normalizedTopic && normalizedText.includes(normalizedTopic)) return true

  const words = new Set(normalizedText.split(/\s+/).filter(Boolean))
  return topicKeywords(topic).some((keyword) => words.has(keyword))
}

function buildCurriculumKnowledgeState({
  goal = '',
  knowledge = '',
  learnerProfile = null,
  seeds = [],
} = {}) {
  const profile = normalizeLearnerProfile(learnerProfile, { knowledge, goal })
  const chunks = collectExplicitKnowledgeChunks(knowledge, [])
  collectExplicitKnowledgeChunks(learnerProfile, chunks)
  const knowledgeText = chunks.join('. ')
  const explicitlyBrandNew = BRAND_NEW_RE.test(knowledgeText)
  const explicitKnownConcepts = explicitlyBrandNew
    ? []
    : dedupeTopics(
      (Array.isArray(seeds) ? seeds : [])
        .filter((seed) => topicLooksExplicitlyKnown(seed, knowledgeText)),
    )
  const prereqMode = String(profile.prereqComfort || 'compressed').toLowerCase()
  const skippableKnownConcepts = prereqMode === 'test_out' ? explicitKnownConcepts : []

  return {
    profileLevel: profile.level,
    prerequisiteMode: prereqMode === 'full' ? 'full' : prereqMode === 'test_out' ? 'test_out' : 'compressed',
    explicitKnownConcepts,
    skippableKnownConcepts,
    report: {
      policy: 'teach_before_assess',
      source: explicitKnownConcepts.length > 0 ? 'onboarding_explicit_topics' : 'no_explicit_prior_topics',
      profileLevel: profile.level,
      prerequisiteMode: prereqMode === 'full' ? 'full' : prereqMode === 'test_out' ? 'test_out' : 'compressed',
      knownFromOnboarding: explicitKnownConcepts,
      summary: explicitKnownConcepts.length > 0
        ? `Known from onboarding: ${explicitKnownConcepts.join(', ')}.`
        : 'No specific prior topics were confirmed; teach from the first prerequisite.',
    },
  }
}

function buildDayCurriculumMetadata({
  knowledgeState,
  taughtBefore = [],
  currentConcept = '',
  futureConcepts = [],
} = {}) {
  const explicitKnown = Array.isArray(knowledgeState?.explicitKnownConcepts) ? knowledgeState.explicitKnownConcepts : []
  const knownBefore = dedupeTopics([...explicitKnown, ...taughtBefore])
  const newConceptsToday = currentConcept ? [currentConcept] : []
  const allowedAssessmentConcepts = dedupeTopics([...knownBefore, ...newConceptsToday])
  const notYetTaught = dedupeTopics(futureConcepts).slice(0, 12)

  return {
    explicitKnownConcepts: explicitKnown,
    knownBefore,
    taughtBefore: dedupeTopics(taughtBefore),
    newConceptsToday,
    allowedAssessmentConcepts,
    notYetTaught,
    prerequisitePolicy: 'teach_before_assess',
    coverageReport: {
      ...(knowledgeState?.report || {}),
      taughtBefore: dedupeTopics(taughtBefore),
      newToday: newConceptsToday,
      assessOnly: allowedAssessmentConcepts,
      notYetTaught,
      rule: 'Do not quiz, challenge, or require a concept unless it is in knownBefore, taughtBefore, or newToday after the lesson teaches it.',
    },
  }
}

function annotateModulesWithCurriculum({
  modules = [],
  goal = '',
  knowledge = '',
  learnerProfile = null,
} = {}) {
  const flatDays = []
  modules.forEach((module, moduleIndex) => {
    const moduleDays = Array.isArray(module?.days) ? module.days : []
    moduleDays.forEach((day, dayIndex) => {
      flatDays.push({
        moduleIndex,
        dayIndex,
        primary: pickPrimaryDayFocus(day),
      })
    })
  })

  const knowledgeState = buildCurriculumKnowledgeState({
    goal,
    knowledge,
    learnerProfile,
    seeds: flatDays.map((day) => day.primary),
  })

  let flatIndex = 0
  let taughtBefore = []
  return modules.map((module) => ({
    ...module,
    curriculumReport: knowledgeState.report,
    days: (Array.isArray(module?.days) ? module.days : []).map((day) => {
      const primary = pickPrimaryDayFocus(day)
      const futureConcepts = flatDays.slice(flatIndex + 1).map((entry) => entry.primary)
      const metadata = buildDayCurriculumMetadata({
        knowledgeState,
        taughtBefore,
        currentConcept: primary,
        futureConcepts,
      })
      flatIndex += 1
      taughtBefore = dedupeTopics([...taughtBefore, primary])
      return {
        ...day,
        title: primary,
        concepts: [primary],
        ...metadata,
      }
    }),
  }))
}

function rowIsFullyCompleted(row = {}) {
  if (row?.completion_status === 'completed') return true
  const tasks = normalizeLearningTasks(row?.tasks || [])
  return tasks.length > 0 && tasks.every((task) => task.completed)
}

function buildCompletedCoverageFromRows(existingRows = []) {
  const topics = []
  const rows = Array.isArray(existingRows) ? existingRows : []
  rows
    .slice()
    .sort((a, b) => Number(a?.day_number || 0) - Number(b?.day_number || 0))
    .forEach((row) => {
      if (rowIsFullyCompleted(row)) {
        topics.push(...(Array.isArray(row?.covered_topics) ? row.covered_topics : []))
      }
      normalizeLearningTasks(row?.tasks || [])
        .filter((task) => task.completed || rowIsFullyCompleted(row))
        .forEach((task) => {
          topics.push(
            task?._concept,
            task?.lessonSeed?.focusConcept,
            task?.learningContract?.dayFocus,
            task?._learningContract?.dayFocus,
          )
        })
    })

  return {
    completedTopics: dedupeTopics(topics),
  }
}

export function needsSequenceDayRepair(row = {}, item = null) {
  if (!row || !item || item.type !== 'unit' || row?.completion_status === 'completed') return false

  const expectedPrimary = normalizeComparableTopic(item.title)
  const legacyPrimary = normalizeComparableTopic(item?.concepts?.[0] || '')
  if (!expectedPrimary || !legacyPrimary || expectedPrimary === legacyPrimary) return false

  const rowPrimary = normalizeComparableTopic(
    Array.isArray(row?.covered_topics) && row.covered_topics.length > 0
      ? row.covered_topics[0]
      : '',
  )
  const taskPrimaryConcepts = normalizeLearningTasks(row?.tasks || [])
    .map((task) => normalizeComparableTopic(task?._concept || task?.lessonSeed?.focusConcept || ''))
    .filter(Boolean)

  const usesExpectedPrimary = rowPrimary === expectedPrimary || taskPrimaryConcepts.includes(expectedPrimary)
  const usesLegacyPrimary = rowPrimary === legacyPrimary || taskPrimaryConcepts.includes(legacyPrimary)

  return usesLegacyPrimary && !usesExpectedPrimary
}

export const resourcesByCategory = {
  programming: [
    { title: 'MDN Learning Area', url: 'https://developer.mozilla.org/en-US/docs/Learn', type: 'documentation' },
    { title: 'freeCodeCamp Curriculum', url: 'https://www.freecodecamp.org/learn', type: 'interactive' },
    { title: 'The Odin Project', url: 'https://www.theodinproject.com/paths', type: 'course' },
    { title: 'JavaScript.info', url: 'https://javascript.info/', type: 'article' },
  ],
  machineLearning: [
    { title: 'Kaggle Learn', url: 'https://www.kaggle.com/learn', type: 'interactive' },
    { title: 'Scikit-learn Tutorials', url: 'https://scikit-learn.org/stable/tutorial/', type: 'documentation' },
    { title: 'Fast.ai Practical Deep Learning', url: 'https://course.fast.ai/', type: 'course' },
    { title: 'Google ML Crash Course', url: 'https://developers.google.com/machine-learning/crash-course', type: 'course' },
  ],
  general: [
    { title: 'Coursera Guided Learning', url: 'https://www.coursera.org/', type: 'course' },
    { title: 'edX Courses', url: 'https://www.edx.org/', type: 'course' },
    { title: 'Khan Academy', url: 'https://www.khanacademy.org/', type: 'interactive' },
    { title: 'YouTube Learning', url: 'https://www.youtube.com/', type: 'video' },
  ],
}

export function categorizeGoal(goal = '') {
  if (/python|javascript|js|react|web|coding|programming|html|css|typescript|java|c\+\+|rust|swift|ruby|node/i.test(goal)) {
    return 'programming'
  }
  if (/machine learning|\bml\b|deep learning|data science|neural|ai/i.test(goal)) {
    return 'machineLearning'
  }
  return 'general'
}

function buildStructuredFallbackOutline({
  goal,
  knowledge = '',
  days,
  minutesPerDay,
  skillLevel,
  status = 'deterministic',
  source = 'deterministic',
  learnerProfile = null,
}) {
  const safeDays = Math.max(1, Number(days) || 30)
  const domainContext = buildDomainPromptContext({ learnerProfile })
  const rawSeeds = getFallbackModuleSeeds(goal, safeDays, learnerProfile)
  const knowledgeState = buildCurriculumKnowledgeState({
    goal,
    knowledge,
    learnerProfile,
    seeds: rawSeeds,
  })
  const skippable = new Set(knowledgeState.skippableKnownConcepts.map((concept) => normalizeComparableTopic(concept)))
  const seeds = rawSeeds.filter((seed) => !skippable.has(normalizeComparableTopic(seed)))
  const safeSeeds = seeds.length > 0 ? seeds : rawSeeds
  const targetModuleCount = Math.max(1, Math.min(safeSeeds.length, safeDays))
  const selectedSeeds = safeSeeds.slice(0, targetModuleCount)
  const finalSeeds = selectedSeeds.length >= 4 ? selectedSeeds : safeSeeds.slice(0, targetModuleCount)
  const moduleDayCounts = Array.from({ length: finalSeeds.length }, () => 1)

  let remainingDays = Math.max(0, safeDays - finalSeeds.length)
  let cursor = 0
  while (remainingDays > 0) {
    moduleDayCounts[cursor % moduleDayCounts.length] += 1
    remainingDays -= 1
    cursor += 1
  }

  let dayNumber = 1
  const rawModules = finalSeeds.map((seed, moduleIndex) => {
    const allocatedDays = moduleDayCounts[moduleIndex]
    const daysForModule = Array.from({ length: allocatedDays }, (_, dayIndex) => {
      const dayIdentity = buildFallbackDayIdentity(seed, dayIndex, allocatedDays)

      return {
        day: dayNumber++,
        title: dayIdentity.title,
        concepts: dayIdentity.concepts,
        estimatedMinutes: minutesPerDay || 30,
        difficulty: Math.max(1, Math.min(5, 1 + Math.floor((moduleIndex / Math.max(1, finalSeeds.length - 1)) * 4))),
      }
    })

    return {
      title: seed,
      description: `Build working skill in ${seed.toLowerCase()} as part of ${goal}.`,
      days: daysForModule,
    }
  })
  const modules = annotateModulesWithCurriculum({
    modules: rawModules,
    goal,
    knowledge,
    learnerProfile,
  })

  const concepts = []
  let conceptId = 1
  modules.forEach((module) => {
    module.days.forEach((day) => {
      const primaryFocus = pickPrimaryDayFocus(day)
      concepts.push({
        id: conceptId++,
        name: primaryFocus,
        description: `${module.title}: ${day.title}. Concepts: ${day.concepts.join(', ')}`,
        estimatedDays: 1,
        dependencies: conceptId > 2 ? [conceptId - 2] : [],
        difficulty: day.difficulty,
        _moduleTitle: module.title,
        _dayTitle: day.title,
        _allConcepts: dedupeTopics([primaryFocus, ...day.concepts]),
        _explicitKnownConcepts: day.explicitKnownConcepts || [],
        _knownBefore: day.knownBefore || [],
        _taughtBefore: day.taughtBefore || [],
        _newConceptsToday: day.newConceptsToday || [primaryFocus],
        _allowedAssessmentConcepts: day.allowedAssessmentConcepts || [primaryFocus],
        _notYetTaught: day.notYetTaught || [],
        _coverageReport: day.coverageReport || null,
        _prerequisitePolicy: day.prerequisitePolicy || 'teach_before_assess',
      })
    })
  })

  return withCourseOutlineMeta({
    version: 'v1',
    goal,
    skillLevel,
    totalDays: safeDays,
    estimatedHours: Math.round(safeDays * (minutesPerDay || 30) / 60),
    completionProbability: 75,
    recommendedDays: safeDays,
    domain: domainContext.domain,
    domain_config: domainContext.domainConfig,
    modules,
    concepts,
    previous_version: null,
  }, {
    status,
    source,
    generatedAt: new Date().toISOString(),
  })
}

export function buildDeterministicCourseOutline({ goal, knowledge, days, minutesPerDay, status = 'deterministic', learnerProfile = null }) {
  const profile = normalizeLearnerProfile(learnerProfile, { knowledge, goal })
  return buildStructuredFallbackOutline({
    goal,
    knowledge,
    days,
    minutesPerDay,
    skillLevel: inferSkillLevel(knowledge),
    status,
    source: 'deterministic',
    learnerProfile: { ...profile, domain: learnerProfile?.domain, domainConfig: learnerProfile?.domainConfig },
  })
}

function buildDeterministicExploreConcepts(goal = '', count = 5, afterConcepts = []) {
  const seeds = getFallbackModuleSeeds(goal, Math.max((afterConcepts?.length || 0) + count + 4, count))
  const covered = new Set((afterConcepts || []).map((concept) => String(concept?.name || '').trim().toLowerCase()))
  const candidates = seeds.filter((seed) => !covered.has(seed.toLowerCase()))
  const picked = (candidates.length > 0 ? candidates : seeds).slice(0, Math.max(1, count))

  return picked.map((name, index) => ({
    id: (afterConcepts?.length || 0) + index + 1,
    name,
    description: `Build working understanding of ${name.toLowerCase()} for ${goal}.`,
    estimatedDays: 1,
    dependencies: [],
    difficulty: Math.max(1, Math.min(5, index + 1)),
  }))
}

function getResources(goal, conceptName) {
  const category = categorizeGoal(goal)
  const pool = resourcesByCategory[category] || resourcesByCategory.general
  const label = cleanDayFocusTitle(conceptName || cleanGoalSubject(goal))
  return pool.map((resource) => ({
    ...resource,
    title: `${resource.title} · ${label}`,
  }))
}

export function buildFallbackConcepts(goal, days) {
  const names = getFallbackModuleSeeds(goal, Math.max(7, Number(days) || 7))
  const total = names.length
  return names.map((name, index) => ({
    id: index + 1,
    name,
    description: `Build mastery in ${name.toLowerCase()} for ${goal}.`,
    estimatedDays: Math.max(1, Math.round(days / total + (index < 2 ? 1 : 0))),
    dependencies: index > 0 ? [index] : [],
    difficulty: Math.min(5, Math.floor(index / 2) + 1),
  }))
}

// ─────────────────────────────────────────────
// Skill level inference
// ─────────────────────────────────────────────

function inferSkillLevel(knowledge) {
  if (!knowledge || knowledge.trim().length === 0) return 'beginner'
  const words = knowledge.trim().split(/\s+/).length
  if (words >= 30 || /advanced|expert|proficient|years|senior|deep/i.test(knowledge)) return 'advanced'
  if (words >= 10 || /intermediate|some|familiar|basic|know|understand/i.test(knowledge)) return 'intermediate'
  return 'beginner'
}

// ─────────────────────────────────────────────
// Completion probability
// ─────────────────────────────────────────────

function calculateCompletionProbability({ totalDays, minutesPerDay, skillLevel, targetDays }) {
  if (!targetDays || targetDays <= 0) return { probability: 85, recommendedDays: totalDays }

  // Base probability from time ratio
  const ratio = targetDays / totalDays
  let probability = Math.round(Math.min(98, ratio * 80))

  // Skill level adjustment
  if (skillLevel === 'advanced') probability = Math.min(98, probability + 10)
  else if (skillLevel === 'intermediate') probability = Math.min(98, probability + 5)
  else probability = Math.max(5, probability - 5)

  // Daily time adjustment — more time = more buffer
  if (minutesPerDay >= 60) probability = Math.min(98, probability + 8)
  else if (minutesPerDay >= 30) probability = Math.min(98, probability + 3)
  else probability = Math.max(5, probability - 5)

  const recommendedDays = probability >= 70 ? targetDays : Math.ceil(totalDays * 1.15)

  return { probability: Math.max(5, Math.min(98, probability)), recommendedDays }
}

// ─────────────────────────────────────────────
// Full course outline generation (module-structured)
// ─────────────────────────────────────────────

export async function generateCourseOutline({ goal, knowledge, days, minutesPerDay, learnerProfile = null, openaiApiKey }) {
  const skillLevel = inferSkillLevel(knowledge)
  const profile = normalizeLearnerProfile(learnerProfile, { knowledge, goal })
  const domainContext = buildDomainPromptContext({ learnerProfile, knowledge })
  const depthPolicy = deriveDepthPolicy(profile)
  const requestedDays = Math.max(1, Number(days) || 30)
  const minimumModuleCount = requestedDays >= 24 ? 6 : requestedDays >= 14 ? 5 : requestedDays >= 8 ? 4 : 3
  const startedAt = Date.now()
  let reason = 'missing_api_key'

  if (!openaiApiKey) {
    console.info('[PathAI] course_outline_generation', {
      phase: 'outline_enrichment',
      source: 'deterministic',
      reason,
      retries: 0,
      duration_ms: Date.now() - startedAt,
    })
      return buildStructuredFallbackOutline({
        goal,
        knowledge,
        days: requestedDays,
        minutesPerDay,
        skillLevel,
        status: 'deterministic',
        source: 'deterministic',
        learnerProfile: profile,
      })
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiApiKey}`,
        },
        signal: AbortSignal.timeout(9000),
        body: JSON.stringify({
          model: getOpenAIModel('courseOutline'),
          max_tokens: 2600,
          temperature: 0.28,
          messages: [
            {
              role: 'system',
              content: 'You are an expert curriculum designer. Produce a full structured course outline that feels specific, logically sequenced, and immediately usable for day-by-day learning.',
            },
            {
              role: 'user',
              content: [
                `Design a complete learning path for "${goal}".`,
                domainContext.prompt,
                `Time per day: ${minutesPerDay || 30} minutes`,
                `Total days available: ${days}`,
                `Current skill level: ${skillLevel}`,
                `Learner profile JSON: ${JSON.stringify(profile)}`,
                `Depth policy: ${depthPolicy.level}; prerequisite mode: ${profile.prereqComfort === 'full' ? 'full fundamentals' : 'compressed prerequisite bridge'}`,
                knowledge ? `Prior knowledge: ${knowledge}` : 'Starting from scratch.',
                attempt > 0 ? 'Your previous response was too shallow or malformed. Return stricter valid JSON with enough modules and enough days.' : '',
                '',
                'REQUIREMENTS:',
                '1. Break the skill into concrete modules and multiple specific days.',
                'CRITICAL: Every day\'s concept MUST be a specific, teachable topic — never a category label.',
                'CURRICULUM SEQUENCING RULE: Assume the learner does not know a prerequisite unless the prior knowledge explicitly names it or an earlier day teaches it.',
                'Do not skip to intermediate concepts just because the learner has a goal. Start with what the thing is, the essential vocabulary, and the first safe action, then build upward.',
                'Do not ask about, assess, or require a topic before a previous day has taught it. Each day should teach exactly one new topic.',
                'BAD examples (too vague — NEVER generate these): Foundations, Core Fundamentals, Intermediate Application, Advanced Problem Solving, Getting Started, Building Blocks, Key Concepts, Practical Skills.',
                'GOOD examples (specific and teachable): How print() Displays Text, What a Variable Stores, How Slope Means Rise Over Run, How Gravity Points Downward, Why an LED Needs a Resistor, How Urgency Creates Pressure in Phishing.',
                'Each concept should be narrow enough that a teacher could explain it in 10 minutes and a student could practice it in 15 minutes. If a concept feels too broad, split it into multiple days.',
                '2. Each day must include title, concepts array, estimatedMinutes, and difficulty.',
                `3. Total day count must equal at least ${days}.`,
                `4. Each day must fit within ${minutesPerDay || 30} minutes.`,
                '5. Use progressive difficulty from 1 to 5.',
                '6. Avoid generic buckets like Core Skills, General Practice, Foundations, Basics, or Overview.',
                '7. Use prerequisite compression only for explicitly confirmed prior knowledge; otherwise teach the prerequisite before using it.',
                '8. For visual learners, day titles should map to concrete mental models and examples.',
                '',
                'Return ONLY valid JSON:',
                '{"modules":[{"title":"Module Name","description":"What this module covers","days":[{"day":1,"title":"Specific Day Title","concepts":["concept1","concept2"],"estimatedMinutes":30,"difficulty":1}]}]}',
              ].filter(Boolean).join('\n'),
            },
          ],
        }),
      })

      if (!openaiRes.ok) {
        reason = 'provider_http_error'
        continue
      }

      const openaiData = await openaiRes.json()
      const text = openaiData.choices?.[0]?.message?.content || ''
      let jsonStr = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      const firstBrace = jsonStr.indexOf('{')
      if (firstBrace >= 0) jsonStr = jsonStr.slice(firstBrace)

      let parsed
      try {
        parsed = JSON.parse(jsonStr)
      } catch {
        reason = 'malformed_json'
        continue
      }

      if (!Array.isArray(parsed?.modules) || parsed.modules.length === 0) {
        reason = 'empty'
        continue
      }

      let dayCounter = 1
      const normalizedModules = parsed.modules.map((mod) => ({
        title: mod.title || 'Untitled Module',
        description: mod.description || '',
        days: (Array.isArray(mod.days) ? mod.days : []).map((d) => ({
          day: dayCounter++,
          title: cleanDayFocusTitle(d.title || `Day ${dayCounter - 1}`),
          concepts: dedupeTopics(
            Array.isArray(d.concepts) && d.concepts.length > 0
              ? d.concepts.map((concept) => cleanDayFocusTitle(concept))
              : [cleanDayFocusTitle(d.title || 'Specific concept')],
          ),
          estimatedMinutes: Math.min(minutesPerDay || 30, Number(d.estimatedMinutes) || minutesPerDay || 30),
          difficulty: Math.max(1, Math.min(5, Number(d.difficulty) || 1)),
        })),
      }))
      const curriculumModules = annotateModulesWithCurriculum({
        modules: normalizedModules,
        goal,
        knowledge,
        learnerProfile: profile,
      })

      const totalOutlineDays = curriculumModules.reduce((sum, module) => sum + module.days.length, 0)
      const containsVagueConcepts = curriculumModules.some((module) =>
        module.days.some((day) => {
          const primaryFocus = pickPrimaryDayFocus(day)
          return isConceptTooVague(primaryFocus)
        }))
      if (curriculumModules.length < minimumModuleCount || totalOutlineDays < requestedDays || containsVagueConcepts) {
        reason = 'validation_failed'
        continue
      }

      const totalHours = Math.round(totalOutlineDays * (minutesPerDay || 30) / 60)
      const { probability, recommendedDays } = calculateCompletionProbability({
        totalDays: totalOutlineDays,
        minutesPerDay: minutesPerDay || 30,
        skillLevel,
        targetDays: days,
      })

      const concepts = []
      let conceptId = 1
      curriculumModules.forEach((mod) => {
        mod.days.forEach((d) => {
          const primaryFocus = pickPrimaryDayFocus(d)
          concepts.push({
            id: conceptId++,
            name: primaryFocus,
            description: `${mod.title}: ${d.title}. Concepts: ${d.concepts.join(', ')}`,
            estimatedDays: 1,
            dependencies: conceptId > 2 ? [conceptId - 2] : [],
            difficulty: d.difficulty,
            _moduleTitle: mod.title,
            _dayTitle: d.title,
            _allConcepts: dedupeTopics([primaryFocus, ...d.concepts]),
            _explicitKnownConcepts: d.explicitKnownConcepts || [],
            _knownBefore: d.knownBefore || [],
            _taughtBefore: d.taughtBefore || [],
            _newConceptsToday: d.newConceptsToday || [primaryFocus],
            _allowedAssessmentConcepts: d.allowedAssessmentConcepts || [primaryFocus],
            _notYetTaught: d.notYetTaught || [],
            _coverageReport: d.coverageReport || null,
            _prerequisitePolicy: d.prerequisitePolicy || 'teach_before_assess',
          })
        })
      })

      const outline = withCourseOutlineMeta({
        version: 'v1',
        goal,
        skillLevel,
        totalDays: totalOutlineDays,
        estimatedHours: totalHours,
        completionProbability: probability,
        recommendedDays,
        domain: domainContext.domain,
        domain_config: domainContext.domainConfig,
        modules: curriculumModules,
        concepts,
        previous_version: null,
      }, {
        status: 'ready',
        source: attempt === 0 ? 'ai' : 'ai_retry',
        generatedAt: new Date().toISOString(),
      })

      console.info('[PathAI] course_outline_generation', {
        phase: 'outline_enrichment',
        source: attempt === 0 ? 'ai' : 'ai_retry',
        reason: 'success',
        retries: attempt,
        duration_ms: Date.now() - startedAt,
      })

      return outline
    } catch (error) {
      reason = error?.name === 'TimeoutError' ? 'timeout' : 'provider_http_error'
    }
  }

  console.info('[PathAI] course_outline_generation', {
    phase: 'outline_enrichment',
    source: 'deterministic',
    reason,
    retries: 1,
    duration_ms: Date.now() - startedAt,
  })

  return buildStructuredFallbackOutline({
    goal,
    knowledge,
    days: requestedDays,
    minutesPerDay,
    skillLevel,
    status: 'deterministic',
    source: 'deterministic',
    learnerProfile: { ...profile, domain: learnerProfile?.domain, domainConfig: learnerProfile?.domainConfig },
  })
}

function parseDateOnly(value) {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function getAverageMinutes(weekdayMins, weekendMins) {
  const weekday = Number(weekdayMins) || 30
  const weekend = Number(weekendMins) || weekday
  return Math.max(15, Math.round((weekday * 5 + weekend * 2) / 7))
}

function normalizeKnowledge(constraints) {
  const visibleConstraints = stripStoredCourseOutlineConstraint(constraints)
  return Array.isArray(visibleConstraints) ? visibleConstraints.join(', ') : (visibleConstraints || '')
}

function getGoalRequestedDays(goalRow, existingRows = []) {
  const explicitGoalDays = Number(goalRow?.total_days)
  if (Number.isFinite(explicitGoalDays) && explicitGoalDays >= 5) return explicitGoalDays

  const deadlineDate = parseDateOnly(goalRow?.deadline)
  if (deadlineDate) {
    const today = parseDateOnly(new Date().toISOString().split('T')[0])
    const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (Number.isFinite(diffDays) && diffDays >= 5) return diffDays
  }

  const existingLearningRows = (Array.isArray(existingRows) ? existingRows : []).filter((row) => {
    const tasks = Array.isArray(row?.tasks) ? row.tasks : []
    return !tasks.some(isCourseFinalExamTask)
  })

  return Math.max(30, existingLearningRows.length || 0, explicitGoalDays || 0)
}

function resolveDayDate(existingRows = [], targetDayNumber, preservedDate = null) {
  if (preservedDate) return preservedDate

  const sortedRows = [...(Array.isArray(existingRows) ? existingRows : [])]
    .sort((a, b) => Number(a?.day_number || 0) - Number(b?.day_number || 0))
  const priorRow = [...sortedRows]
    .reverse()
    .find((row) => Number(row?.day_number || 0) < Number(targetDayNumber))
  const nextRow = sortedRows.find((row) => Number(row?.day_number || 0) > Number(targetDayNumber))

  const priorDate = parseDateOnly(priorRow?.task_date)
  if (priorDate) {
    priorDate.setDate(priorDate.getDate() + Math.max(1, Number(targetDayNumber) - Number(priorRow?.day_number || 0)))
    return priorDate.toISOString().split('T')[0]
  }

  const nextDate = parseDateOnly(nextRow?.task_date)
  if (nextDate) {
    nextDate.setDate(nextDate.getDate() - Math.max(1, Number(nextRow?.day_number || 0) - Number(targetDayNumber)))
    return nextDate.toISOString().split('T')[0]
  }

  const today = new Date()
  today.setDate(today.getDate() + Math.max(0, Number(targetDayNumber) - 1))
  return today.toISOString().split('T')[0]
}

function buildConceptFromSequenceItem(item, {
  existingRows = [],
} = {}) {
  const coveredTopics = buildSequenceItemCoveredTopics(item)
  const primaryFocus = pickPrimaryDayFocus({
    title: item.title,
    concepts: coveredTopics,
  })
  const completedCoverage = buildCompletedCoverageFromRows(existingRows)
  const explicitKnownConcepts = Array.isArray(item.explicitKnownConcepts) ? item.explicitKnownConcepts : []
  const taughtBefore = completedCoverage.completedTopics.length > 0
    ? completedCoverage.completedTopics
    : []
  const knownBefore = dedupeTopics([
    ...explicitKnownConcepts,
    ...taughtBefore,
  ])
  const newConceptsToday = Array.isArray(item.newConceptsToday) && item.newConceptsToday.length > 0
    ? item.newConceptsToday
    : [primaryFocus]
  const allowedAssessmentConcepts = dedupeTopics([
    ...knownBefore,
    ...taughtBefore,
    ...newConceptsToday,
  ])
  const notYetTaught = Array.isArray(item.notYetTaught) ? item.notYetTaught : []
  const coverageReport = {
    ...(item.coverageReport || {}),
    knownBefore,
    taughtBefore,
    newToday: newConceptsToday,
    assessOnly: allowedAssessmentConcepts,
    notYetTaught,
    rule: 'Do not ask about concepts outside assessOnly. Teach newToday first, then check only newToday plus confirmed earlier topics.',
  }
  return {
    id: item.sequenceIndex || item.dayNumber,
    name: primaryFocus,
    description: `${item.moduleTitle}: ${item.title}. Concepts: ${dedupeTopics([primaryFocus, ...coveredTopics]).join(', ')}`,
    estimatedDays: 1,
    dependencies: [],
    difficulty: Number(item.difficulty) || 2,
    _moduleTitle: item.moduleTitle,
    _dayTitle: item.title,
    _allConcepts: coveredTopics.length > 0 ? dedupeTopics([primaryFocus, ...coveredTopics]) : [primaryFocus],
    _explicitKnownConcepts: explicitKnownConcepts,
    _knownBefore: knownBefore,
    _taughtBefore: taughtBefore,
    _newConceptsToday: newConceptsToday,
    _allowedAssessmentConcepts: allowedAssessmentConcepts,
    _notYetTaught: notYetTaught,
    _coverageReport: coverageReport,
    _prerequisitePolicy: item.prerequisitePolicy || 'teach_before_assess',
  }
}

function buildProjectDayPlan({ goalText, item, existingRows = [] }) {
  const durationMin = item.kind === 'full_project' ? 60 : 40
  const reward = item.kind === 'full_project'
    ? { xpReward: 120, gemReward: 35 }
    : { xpReward: 80, gemReward: 20 }

  return {
    day: item.dayNumber,
    date: resolveDayDate(existingRows, item.dayNumber, item.rawRow?.task_date || null),
    conceptName: item.title,
    coveredTopics: Array.isArray(item.concepts) && item.concepts.length > 0 ? item.concepts : [item.moduleTitle || item.title],
    tasks: [{
      id: `d${item.dayNumber}project`,
      type: 'project',
      title: item.title,
      description: item.kind === 'full_project'
        ? `Dedicated build day for ${item.moduleTitle}. Ship a substantial project that proves you can apply the module in the real world.`
        : `Dedicated mini-project day for ${item.moduleTitle}. Apply the module in one focused build without any filler tasks.`,
      durationMin,
      isProjectTrigger: true,
      _projectScale: item.kind,
      _moduleProjectKind: item.kind,
      _moduleTitle: item.moduleTitle,
      _moduleTier: item.moduleTier,
      _concepts: Array.isArray(item.concepts) ? item.concepts : [],
      xpReward: reward.xpReward,
      gemReward: reward.gemReward,
      completed: false,
    }],
    totalMinutes: durationMin,
    mode: 'goal',
  }
}

export async function buildGoalPlanDayFromSequenceItem({
  goalRow,
  item,
  knowledge = '',
  openaiApiKey = null,
  adaptiveProfile = null,
  learnerProfile = null,
  existingRows = [],
  generationPhase = 'next_day',
}) {
  if (item.type === 'project') {
    return buildProjectDayPlan({ goalText: goalRow.goal_text, item, existingRows })
  }

  const unitConcept = buildConceptFromSequenceItem(item, { existingRows })
  const [day] = await buildDailyTasks(
    goalRow.goal_text,
    [unitConcept],
    Number(goalRow.weekday_mins) || 30,
    Number(goalRow.weekend_mins) || Number(goalRow.weekday_mins) || 30,
    item.dayNumber,
    1,
    { knowledge, openaiApiKey, mode: 'goal', adaptiveProfile, learnerProfile, generationPhase },
  )

  return {
    ...day,
    day: item.dayNumber,
    date: resolveDayDate(existingRows, item.dayNumber, item.rawRow?.task_date || day?.date || null),
    conceptName: item.title,
    coveredTopics: buildSequenceItemCoveredTopics(item),
    totalMinutes: Number(day?.totalMinutes) || item.estimatedMinutes || 30,
  }
}

async function upsertDailyPlanDay({
  supabase,
  goalId,
  userId,
  planDay,
  existingRow = null,
}) {
  const normalizedTasks = normalizeLearningTasks(planDay.tasks)
  const completedCount = normalizedTasks.filter((task) => task.completed).length
  const completionStatus = normalizedTasks.length > 0 && completedCount === normalizedTasks.length
    ? 'completed'
    : completedCount > 0
      ? 'in_progress'
      : 'pending'

  const payload = {
    goal_id: goalId,
    user_id: userId,
    day_number: planDay.day,
    task_date: planDay.date,
    tasks: normalizedTasks,
    covered_topics: Array.isArray(planDay.coveredTopics) && planDay.coveredTopics.length > 0
      ? planDay.coveredTopics
      : [planDay.conceptName],
    completion_status: completionStatus,
    tasks_completed: completedCount,
    mode: planDay.mode || 'goal',
  }

  if (existingRow?.id) {
    const { data, error } = await supabase
      .from('daily_tasks')
      .update(payload)
      .eq('id', existingRow.id)
      .select('*')
      .single()
    if (error) throw new Error(`Failed to save sequence day: ${error.message}`)
    return data
  }

  const { data, error } = await supabase
    .from('daily_tasks')
    .insert(payload)
    .select('*')
    .single()
  if (error) throw new Error(`Failed to save sequence day: ${error.message}`)
  return data
}

export async function recoverCourseOutlineIfNeeded({
  supabase,
  goalId,
  userId,
  goalRow = null,
  progressRow = null,
  existingRows = [],
}) {
  let resolvedGoal = goalRow
  let resolvedProgress = progressRow

  if (!resolvedGoal) {
    const { data, error } = await supabase
      .from('goals')
      .select('goal_text,weekday_mins,weekend_mins,constraints,total_days,deadline,mode')
      .eq('id', goalId)
      .single()
    if (error) throw new Error(`Failed to load goal for outline recovery: ${error.message}`)
    resolvedGoal = data
  }

  if (!resolvedProgress && goalId && userId) {
    const { data, error } = await supabase
      .from('user_progress')
      .select('total_days')
      .eq('goal_id', goalId)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw new Error(`Failed to load progress for outline recovery: ${error.message}`)
    resolvedProgress = data
  }

  const requestedDays = getGoalRequestedDays(resolvedGoal, existingRows)
  const storedCourseOutline = getStoredCourseOutline(resolvedGoal)
  const outlineStatus = getCourseOutlineStatus(storedCourseOutline)
  const needsRecovery = outlineStatus === 'pending' || courseOutlineNeedsRecovery(storedCourseOutline, requestedDays)
  let courseOutline = storedCourseOutline || null

  if (needsRecovery) {
    courseOutline = await generateCourseOutline({
      goal: resolvedGoal.goal_text,
      knowledge: normalizeKnowledge(resolvedGoal.constraints),
      days: requestedDays,
      minutesPerDay: getAverageMinutes(resolvedGoal.weekday_mins, resolvedGoal.weekend_mins),
      openaiApiKey: process.env.OPENAI_API_KEY,
    })

    await persistCourseOutline({
      supabase,
      goalId,
      constraints: resolvedGoal?.constraints,
      courseOutline,
    })
  }

  const sequence = buildCourseSequence({ courseOutline, goalText: resolvedGoal.goal_text })
  const sequenceDayCount = sequence.plannedDayCount

  if (goalId && userId && resolvedProgress && Number(resolvedProgress.total_days) !== sequenceDayCount) {
    await supabase
      .from('user_progress')
      .update({ total_days: sequenceDayCount })
      .eq('goal_id', goalId)
      .eq('user_id', userId)
  }

  return {
    courseOutline,
    sequenceDayCount,
    recovered: needsRecovery,
  }
}

// ─────────────────────────────────────────────
// Legacy concept map generation (used by generateNextTasksIfNeeded)
// ─────────────────────────────────────────────

export async function generateConceptMap({ goal, knowledge, days, openaiApiKey }) {
  const domainContext = buildDomainPromptContext({ knowledge })
  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: getOpenAIModel('conceptMap'),
        max_tokens: 1800,
        messages: [{
          role: 'user',
          content: `Generate a concept map for "${goal}" over ${days} days.\n${domainContext.prompt}\n${knowledge ? `Learner prior knowledge: ${knowledge}` : 'Learner starts as a beginner.'}\nReturn ONLY JSON: {"concepts":[{"id":1,"name":"...","description":"...","estimatedDays":2,"dependencies":[],"difficulty":1}]}\nRules: 8-12 concepts, ordered beginner to advanced, realistic estimatedDays weighting by difficulty. IMPORTANT: skip concepts the learner already knows based on their prior knowledge. CRITICAL: every concept name must be a specific, narrow, teachable topic — never vague labels like Foundations, Basics, Overview, Core Concepts, or General Practice.`,
        }],
      }),
    })

    if (!openaiRes.ok) throw new Error(`OpenAI request failed with ${openaiRes.status}`)

    const openaiData = await openaiRes.json()
    const text = openaiData.choices?.[0]?.message?.content || ''
    let jsonStr = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const firstBrace = jsonStr.indexOf('{')
    if (firstBrace >= 0) jsonStr = jsonStr.slice(firstBrace)

    const parsed = JSON.parse(jsonStr)
    if (!Array.isArray(parsed?.concepts) || parsed.concepts.length === 0) {
      throw new Error('Invalid concept response payload')
    }
    return parsed.concepts
  } catch {
    return buildFallbackConcepts(goal, days)
  }
}

// ─────────────────────────────────────────────
// Explore mode: infinite concept generation
// Generates next N concepts after a given concept index
// ─────────────────────────────────────────────

export async function generateExploreConcepts({ goal, knowledge, afterConcepts = [], openaiApiKey }) {
  const domainContext = buildDomainPromptContext({ knowledge })
  try {
    const alreadyCovered = afterConcepts.map((c) => c.name).join(', ')
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: getOpenAIModel('exploreConcepts'),
        max_tokens: 1200,
        messages: [{
          role: 'user',
          content: [
            `Generate the next 5 learning concepts for "${goal}".`,
            domainContext.prompt,
            knowledge ? `Learner prior knowledge: ${knowledge}` : 'Learner is a beginner.',
            alreadyCovered ? `Already covered concepts: ${alreadyCovered}. Do NOT repeat these.` : '',
            'Return ONLY JSON: {"concepts":[{"id":1,"name":"...","description":"...","estimatedDays":1,"dependencies":[],"difficulty":1}]}',
            'Rules: concepts must logically follow what was already covered, ordered by increasing difficulty.',
            'CRITICAL: concept names must be specific, narrow, and teachable. Never return vague labels like Foundations, Basics, Overview, Core Concepts, or General Practice.',
          ].filter(Boolean).join('\n'),
        }],
      }),
    })

    if (!openaiRes.ok) throw new Error(`OpenAI request failed with ${openaiRes.status}`)

    const openaiData = await openaiRes.json()
    const text = openaiData.choices?.[0]?.message?.content || ''
    let jsonStr = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const firstBrace = jsonStr.indexOf('{')
    if (firstBrace >= 0) jsonStr = jsonStr.slice(firstBrace)

    const parsed = JSON.parse(jsonStr)
    if (!Array.isArray(parsed?.concepts) || parsed.concepts.length === 0) {
      throw new Error('Invalid explore concept response')
    }

    // Re-index IDs to continue from where we left off
    const offset = afterConcepts.length
    return parsed.concepts.map((c, i) => ({ ...c, id: offset + i + 1 }))
  } catch {
    // Fallback: generate generic next concepts
    const offset = afterConcepts.length
    const concepts = getFallbackModuleSeeds(goal, offset + 8).slice(offset, offset + 5)
    return concepts.map((name, index) => ({
      id: offset + index + 1,
      name,
      description: `Build working understanding of ${name.toLowerCase()} for ${goal}.`,
      estimatedDays: 1,
      dependencies: [],
      difficulty: Math.max(1, Math.min(5, 3 + index)),
    }))
  }
}

// ─────────────────────────────────────────────
// Timeline expansion
// ─────────────────────────────────────────────

function expandConceptTimeline(concepts, targetDays) {
  if (!concepts || concepts.length === 0) return []

  const weighted = []
  concepts.forEach((concept, index) => {
    const repeats = Math.max(1, Number(concept.estimatedDays) || 1)
    for (let i = 0; i < repeats; i++) {
      weighted.push({ ...concept, _conceptOrder: index })
    }
  })
  weighted.sort((a, b) => a._conceptOrder - b._conceptOrder)

  const timeline = []
  for (let d = 0; d < targetDays; d++) {
    // FIX: was Math.floor((d / targetDays) * weighted.length) which could overshoot
    const idx = Math.min(weighted.length - 1, Math.floor((d / Math.max(targetDays, 1)) * weighted.length))
    timeline.push(weighted[idx])
  }

  return timeline
}

// ─────────────────────────────────────────────
// Task normalization helpers
// ─────────────────────────────────────────────

function normalizeTaskType(type, index) {
  if (!type) return TASK_SEQUENCE[index % TASK_SEQUENCE.length]
  const normalized = getCanonicalTaskType(type)
  if (CLEAN_TASK_TYPES.includes(normalized)) return normalized
  return TASK_SEQUENCE[index % TASK_SEQUENCE.length]
}

function normalizeTitle(title, fallback) {
  const value = String(title || '').trim()
  return value || fallback
}

function uniqueTitle(title, usedTitles, dayNumber, index) {
  const base = String(title || '').trim() || `Day ${dayNumber} Task ${index + 1}`
  let candidate = base
  let suffix = 2
  while (usedTitles.has(candidate.toLowerCase())) {
    candidate = `${base} (${suffix})`
    suffix++
  }
  usedTitles.add(candidate.toLowerCase())
  return candidate
}

// ─────────────────────────────────────────────
// Task generation
// ─────────────────────────────────────────────

function normalizeGenerationReason(error) {
  const code = String(error?.code || error?.message || '').toLowerCase()
  if (!code) return 'unknown'
  if (error?.name === 'TimeoutError' || code.includes('timeout')) return 'timeout'
  if (code.includes('missing_api_key')) return 'missing_api_key'
  if (code.includes('openai_request_failed') || code.includes('provider_http_error')) return 'provider_http_error'
  if (code.includes('invalid_json')) return 'malformed_json'
  if (code.includes('empty')) return 'empty'
  if (code.includes('validation')) return 'validation_failed'
  return 'unknown'
}

function inferPresentationFromResource(resource = null, fallback = 'lesson') {
  const type = String(resource?.type || '').trim().toLowerCase()
  if (type === 'video') return 'video'
  if (type === 'article' || type === 'documentation') return 'reading'
  return fallback
}

function chooseTaskResource(resources = [], type = 'concept', index = 0) {
  const pool = Array.isArray(resources) && resources.length > 0
    ? resources
    : [{ title: 'Primary learning resource', url: '', type: 'article' }]

  if (type === 'concept') {
    return pool.find((resource) => ['documentation', 'article', 'video', 'course', 'interactive'].includes(resource.type)) || pool[0]
  }
  if (type === 'guided_practice') {
    return pool.find((resource) => ['interactive', 'course', 'documentation'].includes(resource.type)) || pool[index % pool.length]
  }
  if (type === 'recall' || type === 'quiz') {
    return pool.find((resource) => ['documentation', 'article', 'interactive'].includes(resource.type)) || pool[index % pool.length]
  }
  return pool[index % pool.length]
}

function getFocusConceptName({ type, concept, adaptivePlan = null }) {
  const related = dedupeTopics([
    concept?._dayTitle || '',
    concept?.name || '',
    ...(Array.isArray(concept?._allConcepts) ? concept._allConcepts : []),
  ])
  const reviewName = adaptivePlan?.reviewFocus?.[0]?.conceptName || ''
  const primaryFocus = cleanDayFocusTitle(concept?._dayTitle || concept?.name || related[0] || 'the topic')

  if (type === 'recall' || type === 'quiz') return reviewName || primaryFocus
  if (type === 'boss') return cleanDayFocusTitle(concept?._moduleTitle || primaryFocus)
  return primaryFocus
}

function allocateTaskMinutes({ type, baseDuration, difficulty }) {
  const multiplier = {
    concept: 1,
    guided_practice: 1.15,
    challenge: 1.25,
    explain: 0.95,
    quiz: 0.95,
    recall: 0.7,
    reflect: 0.55,
    boss: 1.5,
  }[type] || 1

  const baseline = Math.round(baseDuration * multiplier)
  const difficultyLift = type === 'boss' || type === 'challenge'
    ? Math.max(0, difficulty - 3)
    : 0

  return Math.max(5, baseline + (difficultyLift * 2))
}

function buildTaskLessonSeed({ type, concept, focusName, resource, goal, mode, learningContract = null }) {
  return {
    type,
    goal,
    focusConcept: focusName,
    concept: concept?.name || focusName,
    moduleTitle: concept?._moduleTitle || '',
    dayTitle: concept?._dayTitle || concept?.name || '',
    allConcepts: Array.isArray(concept?._allConcepts) ? concept._allConcepts : [concept?.name || focusName],
    knownBefore: Array.isArray(concept?._knownBefore) ? concept._knownBefore : [],
    taughtBefore: Array.isArray(concept?._taughtBefore) ? concept._taughtBefore : [],
    newConceptsToday: Array.isArray(concept?._newConceptsToday) ? concept._newConceptsToday : [focusName],
    allowedAssessmentConcepts: Array.isArray(concept?._allowedAssessmentConcepts) ? concept._allowedAssessmentConcepts : [focusName],
    notYetTaught: Array.isArray(concept?._notYetTaught) ? concept._notYetTaught : [],
    coverageReport: concept?._coverageReport || null,
    resourceTitle: resource?.title || '',
    resourceUrl: resource?.url || '',
    mode,
    learningContract,
  }
}

function buildDeterministicTaskTemplate({
  type,
  concept,
  focusName,
  goal,
  dayNumber,
  resource,
  baseDuration,
  difficulty,
  adaptivePlan = null,
  index = 0,
  mode = 'goal',
  learningContract = null,
}) {
  const moduleTitle = cleanDayFocusTitle(concept?._moduleTitle || concept?.name || focusName)
  const dayTitle = cleanDayFocusTitle(concept?._dayTitle || focusName)
  const cleanFocus = cleanDayFocusTitle(learningContract?.dayFocus || focusName)
  const reviewName = adaptivePlan?.reviewFocus?.[0]?.conceptName || ''
  const resourceTitle = resource?.title || 'your main resource'
  const resourceUrl = resource?.url || ''
  const resourceType = resource?.type || 'article'
  const depthLevel = learningContract?.depthPolicy?.level || 'standard'
  const scaffoldLine = depthLevel === 'foundational'
    ? 'Keep it simple, visual, and concrete.'
    : depthLevel === 'advanced'
      ? 'Compress review and focus on transfer.'
      : 'Stay concise and practical.'
  const lessonSeed = buildTaskLessonSeed({ type, concept, focusName: cleanFocus, resource, goal, mode, learningContract })
  const domainTaskType = getDomainAssignmentType(learningContract?.domain, type, goal)
  const domainTaskLabel = getDomainTaskLabel(domainTaskType)
  const assignmentPrefix = domainTaskType && domainTaskType !== 'GeneratedLesson'
    ? `${domainTaskLabel}: `
    : ''
  const canDoStatement = String(learningContract?.canDoStatement || `use ${cleanFocus} correctly in one short, concrete scenario`).trim()
  const proofPrompt = String(learningContract?.proofPrompt || `Show today's proof by using ${cleanFocus} in one short concrete answer.`).trim()

  const common = {
    durationMin: allocateTaskMinutes({ type, baseDuration, difficulty }),
    resourceUrl,
    resourceTitle,
    resourceType,
    _concept: cleanFocus,
    _moduleTitle: moduleTitle,
    _allConcepts: Array.isArray(concept?._allConcepts) && concept._allConcepts.length > 0 ? concept._allConcepts : [cleanFocus],
    _knownBefore: Array.isArray(concept?._knownBefore) ? concept._knownBefore : [],
    _taughtBefore: Array.isArray(concept?._taughtBefore) ? concept._taughtBefore : [],
    _newConceptsToday: Array.isArray(concept?._newConceptsToday) ? concept._newConceptsToday : [cleanFocus],
    _allowedAssessmentConcepts: Array.isArray(concept?._allowedAssessmentConcepts) ? concept._allowedAssessmentConcepts : [cleanFocus],
    _notYetTaught: Array.isArray(concept?._notYetTaught) ? concept._notYetTaught : [],
    _coverageReport: concept?._coverageReport || null,
    _difficulty: difficulty,
    domain: learningContract?.domain || null,
    domainConfig: learningContract?.domainConfig || null,
    domainTaskType,
    domainTaskLabel,
    learningContract,
    _learningContract: learningContract,
    lessonSeed,
    ...buildAdaptiveTaskMetadata({ taskType: type, plan: adaptivePlan }),
    completed: false,
  }

  switch (type) {
    case 'concept':
      return {
        ...common,
        type,
        presentation: 'lesson',
        title: `Understand ${cleanFocus}`,
        action: `Learn the mental model for ${cleanFocus}, then identify one example and one trap before practice starts.`,
        outcome: `Finish able to ${canDoStatement.replace(/\.$/, '')}.`,
        description: `${scaffoldLine} This concept teaches the idea the rest of today's tasks use; use ${resourceTitle} only as a reference, not a script to copy.`,
        _flowStage: 'understand',
      }
    case 'guided_practice':
      return {
        ...common,
        type,
        presentation: adaptivePlan?.state === 'struggling' ? 'practice' : 'exercise',
        title: `${assignmentPrefix}Practice ${cleanFocus}`,
        action: adaptivePlan?.state === 'struggling'
          ? `Work through a scaffolded example on ${cleanFocus}, checking why each step follows from the concept lesson.`
          : `Apply ${cleanFocus} in one structured exercise with partial support, checking your choices after you commit.`,
        outcome: proofPrompt,
        description: adaptivePlan?.shouldReviewToday && reviewName
          ? `Reconnect ${reviewName} to ${cleanFocus} through a hands-on task. Use references only when stuck.`
          : `Turn the concept lesson into a concrete move. Apply what was taught without introducing a new topic.`,
        _flowStage: 'apply',
      }
    case 'challenge':
      return {
        ...common,
        type,
        title: `${assignmentPrefix}Challenge: ${cleanFocus}`,
        action: `Solve a fresh problem using ${cleanFocus} without step-by-step guidance, and commit before checking.`,
        outcome: `Produce a finished solution that shows independent judgment inside today's scope.`,
        description: adaptivePlan?.state === 'breezing'
          ? `Push the same idea into a harder case. Test judgment without adding new concepts.`
          : `Use the same idea in a manageable challenge that forces a real decision.`,
        _flowStage: 'struggle',
      }
    case 'explain':
      return {
        ...common,
        type,
        presentation: adaptivePlan?.state === 'struggling' ? 'ai_interaction' : 'discussion',
        title: `${assignmentPrefix}Explain ${cleanFocus}`,
        action: `Teach ${cleanFocus} back in your own words and answer one why-question using the worked example.`,
        outcome: `Finish with a short explanation that proves you understand the reasoning, not just the term.`,
        description: `Lock in the concept by explaining it clearly. The best answer should sound like coaching someone one step behind you.`,
        _flowStage: 'explain',
      }
    case 'recall':
      return {
        ...common,
        type,
        presentation: adaptivePlan?.shouldReviewToday ? 'review' : 'flashcard',
        title: `${assignmentPrefix}Recall ${cleanDayFocusTitle(reviewName || cleanFocus)}`,
        action: `Use rapid retrieval to pull the key terms, patterns, and signals from memory before rereading anything.`,
        outcome: `Finish with a quick memory check that reveals what still feels shaky so the rest of the day can target it.`,
        description: adaptivePlan?.shouldReviewToday && reviewName
          ? `Bring ${reviewName} back into working memory, then connect it to today's focus.`
          : `Strengthen memory for today's concept with short retrieval loops before the scored check.`,
        _flowStage: 'recall',
      }
    case 'quiz':
      return {
        ...common,
        type,
        title: `${assignmentPrefix}Check ${cleanDayFocusTitle(reviewName || cleanFocus)}`,
        action: `Answer scored questions without notes, then review why each answer was right or wrong.`,
        outcome: `Leave with a clear signal on whether you can ${canDoStatement.replace(/\.$/, '')}.`,
        description: adaptivePlan?.shouldReviewToday && reviewName
          ? `Verify that ${reviewName} is back on solid ground while also checking the new learning from today.`
          : `Use a short scored check to confirm you can recognize and apply the taught idea under light pressure.`,
        _flowStage: 'prove',
      }
    case 'reflect':
      return {
        ...common,
        type,
        title: `Reflect on ${cleanFocus}`,
        action: `Write what clicked, where you hesitated, how confident you feel, and what proof best shows ${cleanFocus} today.`,
        outcome: `End the day able to name what you learned, what you can now do, and the proof you produced.`,
        description: `Use reflection to turn the day into usable signal. This task should make tomorrow’s learning easier by naming what still needs attention.`,
        _flowStage: 'reflect',
      }
    case 'boss':
      return {
        ...common,
        type,
        title: `${moduleTitle}: mastery checkpoint`,
        action: `Combine today's concept with completed earlier concepts only; leave future topics out of the checkpoint.`,
        outcome: `Finish with a single integrated output that proves you can connect taught ideas without relying on unstated prerequisites.`,
        description: `This checkpoint is the proof layer for ${moduleTitle}. It may use completed earlier lessons, but it must not require concepts that have not been taught yet.`,
        xpReward: 200,
        _flowStage: 'prove',
      }
    default:
      return {
        ...common,
        type: 'concept',
        presentation: 'lesson',
        title: `Understand ${cleanFocus}`,
        action: `Study the core ideas behind ${cleanFocus}.`,
        outcome: `Finish with one concrete takeaway for ${goal}.`,
        description: `Build understanding with a focused lesson and one usable output.`,
        _flowStage: 'understand',
      }
  }
}

function buildDeterministicDayBundle({
  goal,
  concept,
  dayNumber,
  flowSequence,
  baseDuration,
  resources,
  difficulty,
  adaptivePlan = null,
  mode = 'goal',
  usedTitles,
  learnerProfile = null,
}) {
  const titleRegistry = usedTitles || new Set()
  const primaryFocusName = getFocusConceptName({
    type: 'concept',
    concept,
    adaptivePlan,
  })
  const normalizedFlowTypes = (Array.isArray(flowSequence) ? flowSequence : []).map((item, index) => normalizeTaskType(item?.type, index))
  const dayType = normalizedFlowTypes.includes('boss')
    ? 'integration_day'
    : adaptivePlan?.shouldReviewToday || normalizedFlowTypes.includes('recall')
      ? 'review_day'
      : 'concept_day'
  const profile = normalizeLearnerProfile(learnerProfile, { goal })
  const domainContext = buildDomainPromptContext({ learnerProfile })
  const depthPolicy = deriveDepthPolicy(profile)
  const dayLearningContract = buildLearningContract({
    concept: primaryFocusName,
    taskTitle: concept?._dayTitle || primaryFocusName,
    goal,
    taskDescription: `Teach the mental model for ${primaryFocusName} with a visual explanation and one usable example.`,
    taskAction: `Apply ${primaryFocusName} once in the next guided task without introducing new ideas.`,
    taskOutcome: `Explain ${primaryFocusName} clearly and use it in a small concrete situation.`,
    moduleTitle: concept?._moduleTitle || primaryFocusName,
    allConcepts: Array.isArray(concept?._allConcepts) ? concept._allConcepts : [primaryFocusName],
    learnerProfile: profile,
    depthOverride: null,
    visualPreference: profile.visualPreference,
    dayType,
    knownBefore: Array.isArray(concept?._knownBefore) ? concept._knownBefore : [],
    taughtBefore: Array.isArray(concept?._taughtBefore) ? concept._taughtBefore : [],
    newConceptsToday: Array.isArray(concept?._newConceptsToday) ? concept._newConceptsToday : [primaryFocusName],
    allowedAssessmentConcepts: Array.isArray(concept?._allowedAssessmentConcepts) ? concept._allowedAssessmentConcepts : [primaryFocusName],
    forbiddenUntilTaught: Array.isArray(concept?._notYetTaught) ? concept._notYetTaught : [],
    coverageReport: concept?._coverageReport || null,
    canDoStatement: dayType === 'integration_day'
      ? `combine ${primaryFocusName} with earlier ideas in one focused output`
      : dayType === 'review_day'
        ? `recall ${primaryFocusName} from memory and use it correctly in one short scenario`
        : `use ${primaryFocusName} correctly in one short, concrete scenario`,
  })
  dayLearningContract.domain = domainContext.domain
  dayLearningContract.domainConfig = domainContext.domainConfig
  dayLearningContract.depthPolicy = depthPolicy
  dayLearningContract.prerequisiteMode = profile.prereqComfort === 'full' ? 'full' : 'compressed'

  return flowSequence
    .filter((flowItem) => !['project', 'final_exam'].includes(flowItem?.type))
    .map((flowItem, index) => {
      const type = normalizeTaskType(flowItem?.type, index)
      const focusName = getFocusConceptName({
        type,
        concept,
        adaptivePlan,
      })
      const resource = chooseTaskResource(resources, type, index)
      const template = buildDeterministicTaskTemplate({
        type,
        concept,
        focusName,
        goal,
        dayNumber,
        resource,
        baseDuration,
        difficulty,
        adaptivePlan,
        index,
        mode,
        learningContract: dayLearningContract,
      })

      return normalizeLearningTask({
        ...template,
        id: `d${dayNumber}${type.replace(/[^a-z]/g, '').slice(0, 4)}${index + 1}`,
        title: uniqueTitle(template.title, titleRegistry, dayNumber, index),
      }, index)
    })
}

function validateGeneratedDayBundle(tasks, flowSequence) {
  const normalizedTasks = normalizeLearningTasks(tasks)
  const expectedTypes = flowSequence
    .filter((flowItem) => !['project', 'final_exam'].includes(flowItem?.type))
    .map((flowItem, index) => normalizeTaskType(flowItem?.type, index))
  const quality = analyzeTaskQuality(normalizedTasks)
  const reasons = [...quality.reasons]

  if (normalizedTasks.length !== expectedTypes.length) reasons.push('wrong_task_count')
  expectedTypes.forEach((expectedType, index) => {
    if (normalizedTasks[index]?.type !== expectedType) reasons.push(`wrong_task_type_${index + 1}`)
  })

  if (normalizedTasks.filter((task) => task.type === 'concept' && task.presentation === 'reading').length > 1) {
    reasons.push('too_many_concept_reading_tasks')
  }

  normalizedTasks.forEach((task) => {
    if (titleLooksGeneric(task.title)) reasons.push('generic_title')
    if (descriptionLooksGeneric(task.description)) reasons.push('generic_description')
    if (!String(task.action || '').trim()) reasons.push('missing_action')
    if (!String(task.outcome || '').trim()) reasons.push('missing_outcome')
  })

  return {
    valid: reasons.length === 0,
    reasons: Array.from(new Set(reasons)),
    tasks: normalizedTasks,
  }
}

function mergeAiTasksWithBundle({ aiTasks, deterministicTasks, dayNumber }) {
  const titleRegistry = new Set()

  return deterministicTasks.map((baseTask, index) => {
    const aiTask = aiTasks[index] || {}
    const title = uniqueTitle(
      normalizeTitle(aiTask?.title, baseTask.title),
      titleRegistry,
      dayNumber,
      index,
    )
    const action = String(aiTask?.action || '').trim() || String(baseTask.action || '').trim()
    const outcome = String(aiTask?.outcome || '').trim() || String(baseTask.outcome || '').trim()
    const description = String(aiTask?.description || '').trim()
      || (action && outcome ? `Action: ${action} Outcome: ${outcome}` : baseTask.description)

    return normalizeLearningTask({
      ...baseTask,
      presentation: baseTask.type === 'concept'
        ? 'lesson'
        : (String(aiTask?.presentation || '').trim() || baseTask.presentation),
      title,
      action,
      outcome,
      description,
      durationMin: Math.max(5, Number(aiTask?.durationMin) || Number(baseTask.durationMin) || Number(baseTask.estimatedTimeMin) || 12),
      resourceUrl: String(aiTask?.resourceUrl || '').trim() || baseTask.resourceUrl,
      resourceTitle: String(aiTask?.resourceTitle || '').trim() || baseTask.resourceTitle,
      resourceType: String(aiTask?.resourceType || '').trim() || baseTask.resourceType,
      lessonSeed: {
        ...(baseTask.lessonSeed || {}),
        source: 'ai',
      },
    }, index)
  })
}

async function generateDayTaskBundle({
  goal,
  knowledge,
  concept,
  dayNumber,
  baseDuration,
  resources,
  openaiApiKey,
  adaptivePlan = null,
  mode = 'goal',
  flowSequence = [],
  totalMinutes = 30,
  usedTitles,
  phase = 'next_day',
  learnerProfile = null,
}) {
  const difficulty = adaptivePlan?.difficulty || concept?.difficulty || 2
  const profile = normalizeLearnerProfile(learnerProfile, { knowledge, goal })
  const domainContext = buildDomainPromptContext({ learnerProfile, knowledge })
  const profileWithDomain = domainContext.domain
    ? { ...profile, domain: domainContext.domain, domainConfig: domainContext.domainConfig }
    : profile
  const depthPolicy = deriveDepthPolicy(profile)
  const startedAt = Date.now()
  const deterministicTasks = buildDeterministicDayBundle({
    goal,
    concept,
    dayNumber,
    flowSequence,
    baseDuration,
    resources,
    difficulty,
    adaptivePlan,
    mode,
    usedTitles,
    learnerProfile: profileWithDomain,
  })

  if (!openaiApiKey) {
    console.info('[PathAI] daily_task_bundle', {
      phase,
      dayNumber,
      source: 'deterministic',
      reason: 'missing_api_key',
      retries: 0,
      taskCount: deterministicTasks.length,
      duration_ms: Date.now() - startedAt,
    })
    return deterministicTasks
  }

  const modeInstruction = mode === 'explore'
    ? 'This is Explore Mode (no deadline pressure). Make tasks feel curiosity-driven and discovery-led.'
    : 'This is Goal Mode (deadline-driven). Make tasks efficient, concrete, and progress-oriented.'

  const expectedTypes = flowSequence
    .filter((flowItem) => !['project', 'final_exam'].includes(flowItem?.type))
    .map((flowItem, index) => normalizeTaskType(flowItem?.type, index))

  let failureReasons = []

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiApiKey}`,
        },
        signal: AbortSignal.timeout(9000),
        body: JSON.stringify({
          model: getOpenAIModel('dailyTasks'),
          temperature: 0.45,
          max_tokens: 2200,
          messages: [{
            role: 'user',
            content: [
              `Generate one complete learning day with exactly ${expectedTypes.length} tasks in this order: ${expectedTypes.join(', ')}.`,
              `Goal: ${goal}`,
              domainContext.prompt,
              `Prior knowledge: ${knowledge || 'Beginner'}`,
              `Day number: ${dayNumber}`,
              `Module: ${concept._moduleTitle || concept.name}`,
              `Day topic: ${concept._dayTitle || concept.name}`,
              `Core concept: ${concept.name}`,
              concept._allConcepts?.length > 1 ? `Related concepts: ${concept._allConcepts.join(', ')}` : '',
              concept._coverageReport ? `Curriculum coverage report JSON: ${JSON.stringify(concept._coverageReport)}` : '',
              concept._allowedAssessmentConcepts?.length ? `Assessment boundary: ${concept._allowedAssessmentConcepts.join(', ')}` : `Assessment boundary: ${concept.name}`,
              concept._notYetTaught?.length ? `Do not require yet: ${concept._notYetTaught.join(', ')}` : '',
              `Learner profile JSON: ${JSON.stringify(profile)}`,
              `Depth policy: ${depthPolicy.level}; ${depthPolicy.exampleDifficulty}; ${depthPolicy.repetitionAllowance}`,
              `Prerequisite mode: ${profile.prereqComfort === 'full' ? 'full fundamentals' : 'compressed prerequisite bridge'}`,
              `Difficulty: ${difficulty}/5`,
              `Time budget: ${totalMinutes} minutes total`,
              modeInstruction,
              buildAdaptivePromptContext(adaptivePlan),
              `Resource candidates JSON: ${JSON.stringify(resources)}`,
              attempt > 0 && failureReasons.length > 0
                ? `Your previous attempt failed validation for these reasons: ${failureReasons.join(', ')}. Fix every issue and keep the task sequence exact.`
                : '',
              'Every task must include: type, optional presentation, title, action, outcome, description, durationMin, resourceUrl, resourceTitle, resourceType.',
              'Task contracts:',
              '- concept: explanation-focused, why it matters, one takeaway, no quiz or practice inside it',
              '- guided_practice: scaffolded doing with partial support',
              '- challenge: independent application with less scaffolding',
              '- explain: learner teaches the concept back',
              '- recall: fast retrieval and spaced memory reinforcement',
              '- quiz: scored correctness check',
              '- reflect: metacognitive review of what clicked and what remains weak',
              '- boss: integrated mastery checkpoint',
              'Learning sequence rule: concept teaches the day idea; every later task only practices, stretches, explains, recalls, or checks that same taught scope.',
              'Rules:',
              '- Assume unknown unless covered in completed earlier rows or explicitly known from onboarding',
              '- Do not ask the learner to answer, build, debug, or explain a concept before a lesson has taught it',
              '- Later tasks can assess only the concept task scope plus the Assessment boundary listed above',
              '- No generic titles or descriptions',
              '- No placeholders like "Concept Task 1", "Getting Started", "Core Concept", or "Learn X - Day Y"',
              '- Titles must be distinct and describe different sub-angles of the same learning day',
              '- Descriptions must contain a concrete learner action and output',
              '- Do not repeat the same presentation more than twice',
              '- Do not introduce concepts outside the shared learning contract; later tasks must build on the concept task, not start a separate mini-lesson',
              '- Remove internal metadata from learner-facing copy: no diagnostic score, recommended level, pace, path style, or local fallback wording',
              '- Return ONLY strict JSON: {"tasks":[...]}',
            ].filter(Boolean).join('\n'),
          }],
        }),
      })

      if (!openaiRes.ok) {
        const error = new Error(`provider_http_error_${openaiRes.status}`)
        error.code = 'provider_http_error'
        throw error
      }

      const openaiData = await openaiRes.json()
      const text = openaiData.choices?.[0]?.message?.content || ''
      let jsonStr = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      const firstBrace = jsonStr.indexOf('{')
      if (firstBrace >= 0) jsonStr = jsonStr.slice(firstBrace)

      let parsed = null
      try {
        parsed = JSON.parse(jsonStr)
      } catch (error) {
        error.code = 'invalid_json'
        throw error
      }

      const aiTasks = Array.isArray(parsed?.tasks) ? parsed.tasks : []
      if (aiTasks.length !== expectedTypes.length) {
        failureReasons = ['wrong_task_count']
        continue
      }

      const typesValid = aiTasks.every((task, index) => (
        getCanonicalTaskType(task?.type, task) === expectedTypes[index]
      ))
      if (!typesValid) {
        failureReasons = ['wrong_task_types']
        continue
      }

      const mergedTasks = mergeAiTasksWithBundle({
        aiTasks,
        deterministicTasks,
        dayNumber,
      })
      const validation = validateGeneratedDayBundle(mergedTasks, flowSequence)
      if (!validation.valid) {
        failureReasons = validation.reasons
        continue
      }

      console.info('[PathAI] daily_task_bundle', {
        phase,
        dayNumber,
        source: attempt === 0 ? 'ai' : 'ai_retry',
        reason: 'success',
        retries: attempt,
        taskCount: validation.tasks.length,
        duration_ms: Date.now() - startedAt,
      })
      return validation.tasks
    } catch (error) {
      failureReasons = [normalizeGenerationReason(error)]
    }
  }

  console.info('[PathAI] daily_task_bundle', {
    phase,
    dayNumber,
    source: 'deterministic',
    reason: failureReasons[0] || 'validation_failed',
    retries: 1,
    taskCount: deterministicTasks.length,
    duration_ms: Date.now() - startedAt,
  })
  return deterministicTasks
}

// ─────────────────────────────────────────────
// Build daily tasks (Goal Mode)
// ─────────────────────────────────────────────

export async function buildDailyTasks(goal, concepts, weekdayMins, weekendMins, startDay, numDays, options = {}) {
  const { knowledge = '', openaiApiKey = null, mode = 'goal', adaptiveProfile = null, learnerProfile = null, generationPhase = 'next_day' } = options
  const profile = normalizeLearnerProfile(learnerProfile, { knowledge, goal, pathStyle: mode })
  const days = []
  const timeline = expandConceptTimeline(concepts, numDays)

  // Ensure timeline is never empty
  const safeConcepts = concepts && concepts.length > 0 ? concepts : buildFallbackConcepts(goal, numDays)

  const startDate = new Date()
  startDate.setDate(startDate.getDate() + (startDay - 1))

  for (let offset = 0; offset < numDays; offset++) {
    const dayNumber = startDay + offset
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + offset)

    const isWeekend = date.getDay() === 0 || date.getDay() === 6
    const totalMinutes = isWeekend ? weekendMins : weekdayMins

    // FIX: fallback to safeConcepts if timeline entry is undefined
    const concept = timeline[offset] || safeConcepts[safeConcepts.length - 1]
    const resources = getResources(goal, concept.name)
    const adaptivePlan = buildAdaptivePlan({
      profile: adaptiveProfile,
      conceptName: concept.name,
      difficulty: concept.difficulty || 2,
      totalMinutes,
      mode,
    })

    const adjustedTotalMinutes = adaptivePlan.totalMinutes || totalMinutes
    const isBossDay = dayNumber % 7 === 0 && dayNumber > 0
    const difficulty = adaptivePlan.difficulty
    const condensed = adaptivePlan.condensed || adjustedTotalMinutes < 20
    const mastery = adaptiveProfile?.conceptSummaries?.find((entry) => entry.conceptName === concept.name)?.masteryScore ?? null
    const flowSequence = buildFlowSequence(dayNumber, difficulty, {
      isBossDay,
      condensed,
      mastery,
      isReviewDay: adaptivePlan.shouldReviewToday,
    })
    const taskCount = Math.max(2, flowSequence.length)
    const durationMin = Math.max(8, Math.floor(adjustedTotalMinutes / taskCount))
    const usedTitles = new Set()

    const tasks = await generateDayTaskBundle({
      goal,
      knowledge,
      concept,
      dayNumber,
      baseDuration: durationMin,
      resources,
      openaiApiKey,
      adaptivePlan,
      mode,
      flowSequence,
      totalMinutes: adjustedTotalMinutes,
      usedTitles,
      phase: generationPhase,
      learnerProfile: profile,
    })

    days.push({
      day: dayNumber,
      date: date.toISOString().split('T')[0],
      // FIX: use concept.id not index
      conceptId: concept.id,
      conceptName: concept.name,
      tasks,
      isWeekend,
      totalMinutes: adjustedTotalMinutes,
      mode,
    })
  }

  return days
}

// ─────────────────────────────────────────────
// Build Explore Mode day (single concept, on-demand)
// Called when user completes a day and wants to continue
// ─────────────────────────────────────────────

export async function buildExploreDayTask(goal, concept, minsPerDay, dayNumber, options = {}) {
  const { knowledge = '', openaiApiKey = null, adaptiveProfile = null, learnerProfile = null, generationPhase = 'next_day' } = options
  const profile = normalizeLearnerProfile(learnerProfile, { knowledge, goal, pathStyle: 'explore' })
  const resources = getResources(goal, concept.name)
  const adaptivePlan = buildAdaptivePlan({
    profile: adaptiveProfile,
    conceptName: concept.name,
    difficulty: concept.difficulty || 2,
    totalMinutes: minsPerDay,
    mode: 'explore',
  })
  const adjustedMinutes = adaptivePlan.totalMinutes || minsPerDay
  const flowSequence = buildFlowSequence(dayNumber, adaptivePlan.difficulty, {
    condensed: adaptivePlan.condensed || adjustedMinutes < 20,
    mastery: adaptiveProfile?.conceptSummaries?.find((entry) => entry.conceptName === concept.name)?.masteryScore ?? null,
    isReviewDay: adaptivePlan.shouldReviewToday,
    isBossDay: dayNumber % 7 === 0 && dayNumber > 0,
  })
  const taskCount = Math.max(2, flowSequence.length)
  const durationMin = Math.max(8, Math.floor(adjustedMinutes / taskCount))
  const usedTitles = new Set()
  const tasks = await generateDayTaskBundle({
    goal,
    knowledge,
    concept,
    dayNumber,
    baseDuration: durationMin,
    resources,
    openaiApiKey,
    adaptivePlan,
    mode: 'explore',
    flowSequence,
    totalMinutes: adjustedMinutes,
    usedTitles,
    phase: generationPhase,
    learnerProfile: profile,
  })

  const today = new Date()
  today.setDate(today.getDate() + (dayNumber - 1))

  return {
    day: dayNumber,
    date: today.toISOString().split('T')[0],
    conceptId: concept.id,
    conceptName: concept.name,
    tasks,
    isWeekend: today.getDay() === 0 || today.getDay() === 6,
    totalMinutes: adjustedMinutes,
    mode: 'explore',
  }
}

// ─────────────────────────────────────────────
// Persistence
// ─────────────────────────────────────────────

export async function saveDailyTasks({ supabase, goalId, userId, dailyPlan }) {
  const rows = dailyPlan.map((day) => {
    const normalizedTasks = normalizeLearningTasks(Array.isArray(day.tasks) ? day.tasks : [])
    return {
    goal_id: goalId,
    user_id: userId,
    day_number: day.day,
    task_date: day.date,
    tasks: normalizedTasks,
    covered_topics: Array.isArray(day.coveredTopics) && day.coveredTopics.length > 0
      ? day.coveredTopics
      : [day.conceptName],
    completion_status: normalizedTasks.length > 0 && normalizedTasks.every((task) => task.completed)
      ? 'completed'
      : normalizedTasks.some((task) => task.completed)
        ? 'in_progress'
        : 'pending',
    tasks_completed: normalizedTasks.filter((task) => task.completed).length,
    mode: day.mode || 'goal',
    }
  })

  const { data, error } = await supabase.from('daily_tasks').insert(rows).select('*')
  if (error) throw new Error(`Failed to save tasks: ${error.message}`)
  return data || []
}

export async function initializeUserProgress({ supabase, userId, goalId, totalDays, mode = 'goal' }) {
  const payload = {
    user_id: userId,
    goal_id: goalId,
    total_days: totalDays,
    current_streak: 0,
    longest_streak: 0,
    covered_topics: [],
    last_activity_date: new Date().toISOString().split('T')[0],
    mode,
  }

  const { error: insertError } = await supabase.from('user_progress').insert(payload)
  if (!insertError) return

  const isDuplicate = insertError.code === '23505' || /duplicate key|already exists/i.test(insertError.message || '')
  if (!isDuplicate) throw new Error(`Failed to initialize progress: ${insertError.message}`)

  const { error: updateError } = await supabase
    .from('user_progress')
    .update(payload)
    .eq('user_id', userId)
    .eq('goal_id', goalId)

  if (updateError) throw new Error(`Failed to initialize progress: ${updateError.message}`)
}

export async function updateGoalStatus({ supabase, goalId, mode = 'goal' }) {
  const { error } = await supabase
    .from('goals')
    .update({ status: 'active', level: 1, mode })
    .eq('id', goalId)

  if (error) throw new Error(`Failed to update goal: ${error.message}`)
}

// ─────────────────────────────────────────────
// Mastery tracking
// ─────────────────────────────────────────────

export async function updateConceptMastery({ supabase, userId, goalId, conceptId, signals = null }) {
  // FIX: conceptId must be the actual concept ID, not day_number
  // Callers must pass row.conceptId (stored in daily_tasks), not row.day_number
  const today = new Date().toISOString().split('T')[0]

  const { data: existing } = await supabase
    .from('concept_mastery')
    .select('mastery_score,review_interval')
    .eq('user_id', userId)
    .eq('goal_id', goalId)
    .eq('concept_id', String(conceptId))
    .maybeSingle()

  let masteryScore = Math.min(100, (existing?.mastery_score || 0) + 10)
  let reviewInterval = Math.min(30, Math.max(1, Math.round((existing?.review_interval || 1) * 1.5)))

  if (signals) {
    const performanceScore = calculateMasteryScore({
      quizScore: signals.quizScore ?? signals.accuracy ?? 0,
      challengeScore: signals.challengeScore ?? signals.accuracy ?? 0,
      hintsUsed: signals.hintsUsed ?? 0,
      maxHints: signals.maxHints ?? 3,
      explainQuality: signals.aiInteractionDepth ?? 0,
      timeEfficiency: (() => {
        const ratio = Number(signals.completionSpeedRatio) || 1
        if (ratio < 0.45) return 50
        if (ratio < 0.8) return 85
        if (ratio > 2.5) return 55
        if (ratio > 1.6) return 70
        return 100
      })(),
      reflectDepth: signals.reflectionQuality ?? 0,
      retryCount: Math.max(0, (Number(signals.attempts) || 1) - 1),
    })

    masteryScore = Math.round(((existing?.mastery_score || 45) * 0.55) + (performanceScore * 0.45))
    if (signals.misconceptionDetected) masteryScore -= 8
    if (signals.fragileKnowledge) masteryScore = Math.min(masteryScore, 78)
    masteryScore = Math.max(0, Math.min(100, masteryScore))

    if (signals.misconceptionDetected) {
      reviewInterval = 1
    } else if (signals.fragileKnowledge) {
      reviewInterval = 2
    } else if (masteryScore >= 90 && signals.solvedWithoutHelp) {
      reviewInterval = Math.min(30, Math.max(7, Math.round((existing?.review_interval || 4) * 1.9)))
    } else if (masteryScore >= 80) {
      reviewInterval = Math.min(21, Math.max(4, Math.round((existing?.review_interval || 3) * 1.4)))
    } else if (masteryScore >= 65) {
      reviewInterval = 3
    } else if (masteryScore >= 50) {
      reviewInterval = 2
    } else {
      reviewInterval = 1
    }
  }

  const { error } = await supabase
    .from('concept_mastery')
    .upsert({
      user_id: userId,
      goal_id: goalId,
      concept_id: String(conceptId),
      mastery_score: masteryScore,
      last_review: today,
      review_interval: reviewInterval,
    }, { onConflict: 'user_id,goal_id,concept_id' })

  if (error) throw new Error(`Failed to update concept mastery: ${error.message}`)
}

export function preserveCompletedTasksOnRepair(existingTasks = [], repairedTasks = []) {
  const sourceCompleted = normalizeLearningTasks(existingTasks).filter((task) => task.completed)
  if (sourceCompleted.length === 0) return normalizeLearningTasks(repairedTasks)

  const consumed = new Set()
  const merged = normalizeLearningTasks(repairedTasks).map((task) => {
    let matchedIndex = sourceCompleted.findIndex((candidate, index) => (
      !consumed.has(index)
      && candidate.type === task.type
      && String(candidate.presentation || '') === String(task.presentation || '')
    ))

    if (matchedIndex < 0) {
      matchedIndex = sourceCompleted.findIndex((candidate, index) => (
        !consumed.has(index)
        && candidate.type === task.type
      ))
    }

    if (matchedIndex < 0) return task

    consumed.add(matchedIndex)
    const matchedTask = sourceCompleted[matchedIndex]
    return {
      ...task,
      completed: true,
      _adaptive: matchedTask?._adaptive || task._adaptive,
      completed_at: matchedTask?.completed_at || task?.completed_at,
    }
  })

  return normalizeLearningTasks(merged)
}

export async function repairBrokenIncompleteDays({
  supabase,
  goalId,
  userId,
  goalRow = null,
  progressRow = null,
  existingRows = [],
  rowIds = null,
}) {
  let resolvedGoal = goalRow
  let resolvedProgress = progressRow
  let resolvedRows = Array.isArray(existingRows) ? existingRows : []

  if (!resolvedGoal) {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .eq('user_id', userId)
      .single()
    if (error) throw new Error(`Failed to load goal for repair: ${error.message}`)
    resolvedGoal = data
  }

  if (!resolvedProgress) {
    const { data, error } = await supabase
      .from('user_progress')
      .select('total_days')
      .eq('goal_id', goalId)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw new Error(`Failed to load progress for repair: ${error.message}`)
    resolvedProgress = data
  }

  if (resolvedRows.length === 0) {
    const { data, error } = await supabase
      .from('daily_tasks')
      .select('*')
      .eq('goal_id', goalId)
      .eq('user_id', userId)
      .order('day_number', { ascending: true })
    if (error) throw new Error(`Failed to load task rows for repair: ${error.message}`)
    resolvedRows = data || []
  }

  const { courseOutline, sequenceDayCount } = await recoverCourseOutlineIfNeeded({
    supabase,
    goalId,
    userId,
    goalRow: resolvedGoal,
    progressRow: resolvedProgress,
    existingRows: resolvedRows,
  })

  const scopedRows = filterRowsForCourseWindow(resolvedRows, sequenceDayCount)
  const sequence = buildCourseSequence({ courseOutline, goalText: resolvedGoal.goal_text })
  const sequenceByDay = new Map(sequence.flatItems.map((item) => [Number(item.dayNumber), item]))
  const rowIdSet = rowIds && rowIds.length > 0
    ? new Set(rowIds.map((value) => String(value)))
    : null
  const candidates = scopedRows.filter((row) => (
    row?.completion_status !== 'completed'
    && (!rowIdSet || rowIdSet.has(String(row.id)))
    && (
      isBrokenTaskRow(row)
      || needsSequenceDayRepair(row, sequenceByDay.get(Number(row.day_number)))
    )
  ))

  if (candidates.length === 0) {
    return { repairedCount: 0, rows: [] }
  }

  const { data: masteryRows, error: masteryError } = await supabase
    .from('concept_mastery')
    .select('concept_id,mastery_score,last_review,review_interval')
    .eq('goal_id', goalId)
    .eq('user_id', userId)
  if (masteryError) throw new Error(`Failed to load mastery rows for repair: ${masteryError.message}`)

  const adaptiveProfile = buildAdaptiveProfile(resolvedRows, masteryRows || [])
  const knowledge = normalizeKnowledge(resolvedGoal.constraints)
  const repairedRows = []

  for (const row of candidates) {
    const item = sequenceByDay.get(Number(row.day_number))
    if (!item || item.type === 'project') continue

    const planDay = await buildGoalPlanDayFromSequenceItem({
      goalRow: { ...resolvedGoal, course_outline: courseOutline },
      item,
      knowledge,
      openaiApiKey: process.env.OPENAI_API_KEY,
      adaptiveProfile,
      existingRows: resolvedRows,
      generationPhase: 'repair',
    })

    const repairedTasks = preserveCompletedTasksOnRepair(row.tasks, planDay.tasks)
    const savedRow = await upsertDailyPlanDay({
      supabase,
      goalId,
      userId,
      planDay: { ...planDay, tasks: repairedTasks },
      existingRow: row,
    })

    repairedRows.push(savedRow)
    console.info('[PathAI] day_repair', {
      goalId,
      userId,
      rowId: row.id,
      dayNumber: row.day_number,
      reasons: analyzeTaskQuality(row.tasks).reasons,
      repairedTaskCount: repairedTasks.length,
    })
  }

  return {
    repairedCount: repairedRows.length,
    rows: repairedRows,
  }
}

// ─────────────────────────────────────────────
// Goal Mode: generate next week of tasks
// ─────────────────────────────────────────────

export async function generateNextTasksIfNeeded({ supabase, goalId, userId }) {
  const [{ data: goalRow, error: goalError }, { data: progressRow, error: progressError }] = await Promise.all([
    supabase
      .from('goals')
      .select('goal_text,weekday_mins,weekend_mins,constraints,total_days,deadline,mode')
      .eq('id', goalId)
      .single(),
    supabase
      .from('user_progress')
      .select('total_days')
      .eq('goal_id', goalId)
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  if (goalError) throw new Error(`Failed to load goal for next tasks: ${goalError.message}`)
  if (progressError) throw new Error(`Failed to inspect course progress: ${progressError.message}`)

  const { data: existingRows, error: existingError } = await supabase
    .from('daily_tasks')
    .select('id,day_number,task_date,completion_status,covered_topics,tasks')
    .eq('goal_id', goalId)
    .eq('user_id', userId)
    .order('day_number', { ascending: true })

  if (existingError) throw new Error(`Failed to inspect existing tasks: ${existingError.message}`)

  let sourceRows = existingRows || []
  const repairResult = await repairBrokenIncompleteDays({
    supabase,
    goalId,
    userId,
    goalRow,
    progressRow,
    existingRows: sourceRows,
  })
  if (repairResult.repairedCount > 0) {
    const rowMap = new Map()
    sourceRows.forEach((row) => rowMap.set(Number(row.day_number), row))
    repairResult.rows.forEach((row) => rowMap.set(Number(row.day_number), row))
    sourceRows = Array.from(rowMap.values()).sort((left, right) => Number(left.day_number) - Number(right.day_number))
  }

  const { courseOutline, sequenceDayCount } = await recoverCourseOutlineIfNeeded({
    supabase,
    goalId,
    userId,
    goalRow,
    progressRow,
    existingRows: sourceRows,
  })

  const scopedRows = filterRowsForCourseWindow(sourceRows, sequenceDayCount)
  const tracker = buildPathOutlineTracker({
    courseOutline,
    rows: scopedRows,
    goalText: goalRow.goal_text,
  })

  if (tracker.courseCompleted) {
    return { generated: false, reason: 'course_finished' }
  }

  const knowledge = normalizeKnowledge(goalRow.constraints)
  const [{ data: historyRows }, { data: masteryRows }] = await Promise.all([
    supabase
      .from('daily_tasks')
      .select('day_number,task_date,completion_status,covered_topics,tasks')
      .eq('goal_id', goalId)
      .eq('user_id', userId)
      .order('day_number', { ascending: false })
      .limit(18),
    supabase
      .from('concept_mastery')
      .select('concept_id,mastery_score,last_review,review_interval')
      .eq('goal_id', goalId)
      .eq('user_id', userId),
  ])
  const adaptiveProfile = buildAdaptiveProfile(historyRows || [], masteryRows || [])

  if (tracker.currentItemKind === 'final_exam') {
    const finalExamRow = tracker.currentGeneratedRow
    if (finalExamRow?.completion_status === 'completed') {
      return { generated: false, reason: 'course_finished' }
    }
    if (finalExamRow) {
      return { generated: false, reason: 'final_exam_ready', rows: [finalExamRow], startDay: tracker.finalExamDayNumber }
    }

    const reusableExamRow = (existingRows || []).find((row) => Number(row?.day_number) === tracker.finalExamDayNumber) || null
    const examPlanDay = buildCourseFinalExamPlanDay({
      goalText: goalRow.goal_text,
      courseOutline,
      rows: scopedRows,
      totalDays: sequenceDayCount,
      existingTask: Array.isArray(reusableExamRow?.tasks)
        ? reusableExamRow.tasks.find(isCourseFinalExamTask) || reusableExamRow.tasks[0] || null
        : null,
    })
    const savedRow = await upsertDailyPlanDay({
      supabase,
      goalId,
      userId,
      planDay: {
        ...examPlanDay,
        coveredTopics: [examPlanDay.conceptName],
      },
      existingRow: reusableExamRow,
    })

    return {
      generated: true,
      daysGenerated: 1,
      startDay: examPlanDay.day,
      rows: savedRow ? [savedRow] : [],
      reason: 'final_exam_created',
    }
  }

  if (tracker.currentGeneratedRow) {
    return {
      generated: false,
      reason: 'next_item_ready',
      rows: [tracker.currentGeneratedRow],
      startDay: tracker.currentDayNumber,
    }
  }

  const nextItem = tracker.sequenceItems.find((item) => item.id === tracker.currentItemId) || null
  if (!nextItem) {
    return { generated: false, reason: 'course_boundary_reached' }
  }

  const existingSlotRow = sourceRows.find((row) => Number(row?.day_number) === Number(nextItem.day_number ?? nextItem.dayNumber)) || null
  const planDay = await buildGoalPlanDayFromSequenceItem({
    goalRow: { ...goalRow, course_outline: courseOutline },
    item: nextItem,
    knowledge,
    openaiApiKey: process.env.OPENAI_API_KEY,
    adaptiveProfile,
    existingRows: sourceRows,
    generationPhase: 'next_day',
  })

  const savedRow = await upsertDailyPlanDay({
    supabase,
    goalId,
    userId,
    planDay,
    existingRow: existingSlotRow,
  })

  return {
    generated: true,
    daysGenerated: 1,
    startDay: nextItem.dayNumber,
    rows: savedRow ? [savedRow] : [],
    reason: nextItem.type === 'project' ? 'project_day_created' : 'unit_day_created',
  }
}

// ─────────────────────────────────────────────
// Explore Mode: generate next day on-demand
// Called after user completes today's explore session
// ─────────────────────────────────────────────

export async function generateNextExploreDay({ supabase, goalId, userId }) {
  const { data: goalRow, error: goalError } = await supabase
    .from('goals')
    .select('goal_text,weekday_mins,weekend_mins,constraints')
    .eq('id', goalId)
    .single()

  if (goalError) throw new Error(`Failed to load goal: ${goalError.message}`)

  // Find what concepts we've already covered
  const { data: existingRows } = await supabase
    .from('daily_tasks')
    .select('day_number, task_date, completion_status, covered_topics, tasks')
    .eq('goal_id', goalId)
    .eq('user_id', userId)
    .order('day_number', { ascending: false })

  const maxDay = existingRows?.[0]?.day_number || 0
  const coveredConceptNames = (existingRows || [])
    .flatMap((row) => row.covered_topics || [])
    .filter(Boolean)

  // Build lightweight concept objects from covered names for context
  const coveredAsConcepts = coveredConceptNames.map((name, i) => ({ id: i + 1, name }))

  const knowledge = Array.isArray(goalRow.constraints)
    ? goalRow.constraints.join(', ')
    : (goalRow.constraints || '')
  const { data: masteryRows } = await supabase
    .from('concept_mastery')
    .select('concept_id,mastery_score,last_review,review_interval')
    .eq('goal_id', goalId)
    .eq('user_id', userId)
  const adaptiveProfile = buildAdaptiveProfile(existingRows || [], masteryRows || [])

  // Generate fresh concepts that continue from where we left off
  const nextConcepts = await generateExploreConcepts({
    goal: goalRow.goal_text,
    knowledge,
    afterConcepts: coveredAsConcepts,
    openaiApiKey: process.env.OPENAI_API_KEY,
  })

  // Pick the first new concept for tomorrow
  const nextConcept = nextConcepts[0]
  const today = new Date()
  const isWeekend = today.getDay() === 0 || today.getDay() === 6
  const minsPerDay = isWeekend ? goalRow.weekend_mins : goalRow.weekday_mins

  const nextDay = await buildExploreDayTask(
    goalRow.goal_text,
    nextConcept,
    minsPerDay,
    maxDay + 1,
    { knowledge, openaiApiKey: process.env.OPENAI_API_KEY, adaptiveProfile, generationPhase: 'next_day' },
  )

  const insertedRows = await saveDailyTasks({ supabase, goalId, userId, dailyPlan: [nextDay] })
  return { generated: true, day: nextDay, rows: insertedRows }
}
