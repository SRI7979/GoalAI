import { getSupabaseServerClient } from '@/lib/supabaseServer'
import { getOpenAIModel } from '@/lib/openaiModels'
import { detectSkillType, getVerificationType } from '@/lib/skillTypes'
import { buildProjectProofSummary, getProjectVerificationPlan } from '@/lib/projectProof'
import { ensureProjectProgress, normalizeProjectSteps } from '@/lib/projectVerification'

function extractAccessToken(request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!authHeader) return null
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim() || null
}

// Generate a unique variant seed per user to prevent solution copying
function generateVariantSeed(userId, goalId, dayNumber) {
  const raw = `${userId}-${goalId || 'manual'}-${dayNumber || Date.now()}`
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    const chr = raw.charCodeAt(i)
    hash = ((hash << 5) - hash) + chr
    hash |= 0
  }
  return Math.abs(hash)
}

// ─── SKILL-SPECIFIC VARIANT DOMAINS ───────────────────────────────────
const SKILL_VARIANTS = {
  coding: [
    { domain: 'books', items: 'books', fields: 'title, author, genre, rating' },
    { domain: 'movies', items: 'movies', fields: 'title, director, genre, rating' },
    { domain: 'recipes', items: 'recipes', fields: 'name, cuisine, prep_time, difficulty' },
    { domain: 'music', items: 'songs', fields: 'title, artist, genre, duration' },
    { domain: 'fitness', items: 'workouts', fields: 'name, type, duration, calories' },
    { domain: 'travel', items: 'destinations', fields: 'city, country, rating, cost' },
    { domain: 'tasks', items: 'tasks', fields: 'title, priority, status, due_date' },
    { domain: 'plants', items: 'plants', fields: 'name, species, water_schedule, sunlight' },
    { domain: 'pets', items: 'pets', fields: 'name, species, age, weight' },
    { domain: 'weather', items: 'forecasts', fields: 'city, temperature, condition, humidity' },
  ],
  language: [
    { scenario: 'travel', context: 'navigating a trip to a foreign city', situations: 'airport, hotel check-in, restaurant ordering, asking for directions, museum visit, taxi ride' },
    { scenario: 'food', context: 'exploring local cuisine and cooking', situations: 'ordering at a restaurant, buying groceries, cooking with a friend, food market haggling, dietary restrictions' },
    { scenario: 'social', context: 'meeting new people and socializing', situations: 'introducing yourself, party conversation, making weekend plans, talking about hobbies, phone call with a friend' },
    { scenario: 'work', context: 'professional workplace interactions', situations: 'job interview, meeting colleagues, writing a professional email, presenting an idea, scheduling a meeting' },
    { scenario: 'emergency', context: 'handling unexpected situations', situations: 'doctor visit, describing symptoms, lost item report, asking for help on the street, pharmacy visit' },
    { scenario: 'shopping', context: 'retail and marketplace interactions', situations: 'trying on clothes, negotiating prices, returning an item, asking about sizes and colors, comparing products' },
  ],
  math: [
    { scenario: 'finance', context: 'personal finance optimization', problems: 'compound interest, loan comparison, investment growth, budget allocation, break-even analysis' },
    { scenario: 'sports', context: 'sports analytics and predictions', problems: 'player statistics, scoring averages, win probability, fantasy league optimization, ranking systems' },
    { scenario: 'ecology', context: 'environmental data analysis', problems: 'population growth modeling, resource consumption rates, carbon footprint calculations, sustainability metrics' },
    { scenario: 'architecture', context: 'building and space design', problems: 'area and volume calculations, material cost optimization, structural load estimation, floor plan ratios' },
    { scenario: 'logistics', context: 'supply chain and delivery', problems: 'route optimization, inventory forecasting, scheduling constraints, demand prediction, cost minimization' },
    { scenario: 'health', context: 'health and nutrition analytics', problems: 'calorie tracking formulas, medication dosing, BMI calculations, exercise target metrics, statistical health data' },
  ],
  music: [
    { scenario: 'popular', context: 'learning a popular song', elements: 'chord progressions, strumming/fingerpicking patterns, song structure, dynamics and feel' },
    { scenario: 'blues', context: 'blues and improvisation', elements: 'blues scale, 12-bar blues form, bending and vibrato, call-and-response phrasing' },
    { scenario: 'classical', context: 'classical technique development', elements: 'finger exercises, major/minor scales, arpeggios, sight-reading fundamentals' },
    { scenario: 'rhythm', context: 'rhythm and groove mastery', elements: 'time signatures, syncopation, metronome work, polyrhythmic patterns' },
    { scenario: 'theory', context: 'music theory in practice', elements: 'intervals, chord construction, key signatures, harmonization and transposition' },
    { scenario: 'composition', context: 'creating original music', elements: 'melody writing, chord selection, song structure (AABA/verse-chorus), basic arrangement' },
  ],
  design: [
    { scenario: 'app', context: 'mobile app interface design', deliverable: 'wireframes and high-fidelity mockups for 3-4 key screens' },
    { scenario: 'branding', context: 'brand identity creation', deliverable: 'logo concept, color palette, typography system, and brand guidelines document' },
    { scenario: 'website', context: 'website landing page design', deliverable: 'responsive landing page mockup with hero section, features, testimonials, and CTA' },
    { scenario: 'poster', context: 'event poster design', deliverable: 'print-ready poster with visual hierarchy, compelling typography, and cohesive imagery' },
    { scenario: 'dashboard', context: 'data dashboard design', deliverable: 'analytics dashboard mockup with charts, KPIs, filters, and navigation' },
    { scenario: 'email', context: 'email newsletter template', deliverable: 'responsive email template with header, content blocks, images, and footer' },
  ],
  business: [
    { scenario: 'startup', context: 'launching a new product/service', analysis: 'market research, value proposition canvas, revenue model, go-to-market strategy' },
    { scenario: 'marketing', context: 'digital marketing campaign', analysis: 'target audience definition, channel strategy, content plan, KPI framework, budget allocation' },
    { scenario: 'finance', context: 'financial planning and analysis', analysis: 'cash flow projection, break-even analysis, pricing strategy, ROI calculations' },
    { scenario: 'strategy', context: 'competitive strategy development', analysis: 'SWOT analysis, competitive positioning, strategic recommendations, risk assessment' },
    { scenario: 'operations', context: 'process improvement initiative', analysis: 'workflow mapping, bottleneck identification, KPI tracking, automation opportunities' },
    { scenario: 'product', context: 'product development roadmap', analysis: 'user research synthesis, feature prioritization, MVP definition, success metrics' },
  ],
  hardware: [
    { scenario: 'weather_station', context: 'weather monitoring system', components: 'temperature sensor (DHT22), humidity sensor, OLED display, data logging to SD card' },
    { scenario: 'smart_home', context: 'smart home automation', components: 'relay module, PIR motion sensor, LED indicators, WiFi module (ESP8266)' },
    { scenario: 'robot', context: 'simple obstacle-avoiding robot', components: 'DC motors, ultrasonic sensor (HC-SR04), motor driver (L298N), servo' },
    { scenario: 'alarm', context: 'security alarm system', components: 'PIR sensor, piezo buzzer, LED warning lights, keypad for code entry' },
    { scenario: 'display', context: 'interactive display project', components: 'LCD/OLED display, push buttons, potentiometer, RGB LED strip' },
    { scenario: 'garden', context: 'automated garden monitor', components: 'soil moisture sensor, water pump relay, light sensor, temperature sensor' },
  ],
  writing: [
    { scenario: 'short_story', context: 'short fiction writing', elements: 'character development, plot structure (3-act), vivid dialogue, setting description, thematic depth' },
    { scenario: 'article', context: 'persuasive article writing', elements: 'compelling thesis, evidence-based arguments, counterargument handling, strong structure, call to action' },
    { scenario: 'review', context: 'critical review writing', elements: 'analytical framework, specific evidence, balanced evaluation, comparative analysis, clear recommendation' },
    { scenario: 'dialogue', context: 'dialogue and script writing', elements: 'character voice differentiation, subtext, stage directions, pacing and tension, conflict escalation' },
    { scenario: 'personal', context: 'personal essay and memoir', elements: 'authentic voice, vivid sensory detail, narrative arc, emotional honesty, reflective insight' },
    { scenario: 'pitch', context: 'business pitch writing', elements: 'attention-grabbing hook, problem statement, solution framing, supporting evidence, persuasive close' },
  ],
  science: [
    { scenario: 'experiment', context: 'designing a home experiment', elements: 'hypothesis formation, variable identification, controlled procedure, data collection, analysis' },
    { scenario: 'analysis', context: 'scientific data analysis', elements: 'data interpretation, graph creation, statistical reasoning, pattern recognition, conclusions' },
    { scenario: 'research', context: 'research paper analysis', elements: 'abstract summary, methodology critique, results interpretation, limitations, future directions' },
    { scenario: 'model', context: 'scientific modeling', elements: 'assumptions definition, mathematical relationships, prediction generation, validation approach, limitations' },
    { scenario: 'case_study', context: 'scientific case study', elements: 'background research, observation recording, hypothesis testing, evidence evaluation, conclusions' },
    { scenario: 'environment', context: 'environmental impact assessment', elements: 'data collection methods, impact quantification, sustainability analysis, evidence-based recommendations' },
  ],
}

function buildPerformanceProfile(previousProjects = [], skillType) {
  const relevantProjects = previousProjects.filter((project) => (project.skill_type || skillType) === skillType)
  const sample = relevantProjects.length > 0 ? relevantProjects : previousProjects
  const completedCount = sample.length
  const reviewed = sample.filter((project) => project.ai_review?.overall_score)
  const avgScore = reviewed.length > 0
    ? Math.round(reviewed.reduce((sum, project) => sum + (project.ai_review?.overall_score || 0), 0) / reviewed.length)
    : null
  const authenticityProjects = sample.filter((project) => Number.isFinite(Number(project.authenticity_score)))
  const avgAuthenticity = authenticityProjects.length > 0
    ? Math.round(authenticityProjects.reduce((sum, project) => sum + (project.authenticity_score || 0), 0) / authenticityProjects.length)
    : null

  let supportLevel = 'moderate'
  let stretchDirection = 'slightly harder than their recent work'
  if ((avgScore !== null && avgScore < 72) || (avgAuthenticity !== null && avgAuthenticity < 65)) {
    supportLevel = 'high'
    stretchDirection = 'challenging but scaffolded, with visible quick wins'
  } else if ((avgScore !== null && avgScore >= 86) && (avgAuthenticity === null || avgAuthenticity >= 78)) {
    supportLevel = 'low'
    stretchDirection = 'more independent and a bit more ambitious than usual'
  }

  return {
    completedCount,
    avgScore,
    avgAuthenticity,
    supportLevel,
    stretchDirection,
  }
}

function describeVariantContext(variant = {}) {
  return variant.context || variant.domain || variant.scenario || variant.analysis || variant.elements || 'real-world application'
}

function inferRequiredOutput(step = {}, skillType = 'general') {
  if (step.required_output) return step.required_output
  if (step.requires_code) return 'Submit code that demonstrates the step works.'
  if (step.requires_practice) return 'Complete the practice checklist and reflect on what improved.'
  if (step.requires_response) {
    if (skillType === 'language') return 'Submit your response in the target language with context-appropriate wording.'
    if (skillType === 'math' || skillType === 'science') return 'Submit a step-by-step solution with reasoning, not just a final answer.'
    if (skillType === 'design') return 'Describe the design choices you made and how they satisfy the brief.'
    if (skillType === 'hardware') return 'Report observed outputs, readings, or expected behavior checks.'
    return 'Submit the written output required for this step.'
  }
  return 'Produce the evidence needed to prove this step is complete.'
}

function inferVerificationFocus(step = {}, skillType = 'general') {
  if (step.verification_focus) return step.verification_focus
  if (step.requires_code) return 'Artifact + process verification through code checks and explain-your-choices prompts.'
  if (step.requires_practice) return 'Process + defense verification through checklist completion and reflection.'
  if (skillType === 'language') return 'Artifact + defense verification through language quality and scenario appropriateness.'
  if (skillType === 'math' || skillType === 'science') return 'Artifact + defense verification through method quality and reasoning.'
  if (skillType === 'design') return 'Artifact + defense verification through rationale, hierarchy, and usability thinking.'
  if (skillType === 'hardware') return 'Artifact + process verification through expected behavior and troubleshooting logic.'
  return 'Artifact + defense verification against the project brief.'
}

function extractJsonPayload(rawText = '') {
  const text = String(rawText || '').trim()
  if (!text) throw new Error('Project generator returned an empty response')
  const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  const firstBrace = clean.indexOf('{')
  const lastBrace = clean.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('Project generator did not return valid JSON')
  }
  return JSON.parse(clean.slice(firstBrace, lastBrace + 1))
}

function buildFallbackProjectPayload(skillType, {
  goal,
  concepts,
  difficulty,
  variant,
  isBuildMode,
  performanceProfile,
}) {
  const conceptList = String(concepts || 'core fundamentals')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  const coreConcepts = conceptList.slice(0, 6)
  const level = difficulty || 'beginner'
  const supportLabel = performanceProfile?.supportLevel || 'moderate'
  const contextualConcepts = coreConcepts.length > 0 ? coreConcepts : ['foundations', 'applied thinking', 'execution']

  if (skillType === 'coding') {
    const domain = variant?.domain || 'projects'
    const items = variant?.items || 'items'
    const fields = variant?.fields || 'title, category, score'
    return {
      title: `Build a ${domain.charAt(0).toUpperCase() + domain.slice(1)} Tracker`,
      description: `Create a small JavaScript app that manages ${items}, lets you add and inspect entries, and proves you can turn concepts into something tangible. The project is scoped to feel real without becoming filler.`,
      skill_type: 'coding',
      real_world_context: `A lightweight tool for organizing ${items} with fields like ${fields}.`,
      difficulty: level,
      concepts_tested: contextualConcepts,
      estimated_minutes: 60,
      final_deliverable: `A runnable JavaScript tracker for ${items} with clear add, view, and summary behavior.`,
      verification_summary: 'Verified through execution, output checks, AI review, and a short defense of the implementation.',
      share_summary: `Built a runnable ${domain} tracker that proves practical JavaScript problem-solving.`,
      steps: [
        {
          id: 's1',
          title: 'Define the data shape',
          description: isBuildMode ? 'Create the structure you will use to represent each item.' : `Create the initial data model for each ${domain} entry. Decide what fields matter, how the data should be stored, and how a user should read it back clearly.`,
          hint: `Start with a small array of sample ${items} so you can test before adding user input.`,
          concepts: contextualConcepts.slice(0, 2),
          requires_code: true,
          checkpoint: false,
          required_output: `A starter data structure for ${items}.`,
          verification_focus: 'Clean, runnable setup with the right data structure.',
        },
        {
          id: 's2',
          title: 'Render the current state',
          description: isBuildMode ? 'Make the current entries visible in a readable output.' : `Write code that prints or renders the current ${items} in a readable way. The learner should be able to tell at a glance that the data is flowing correctly through the program.`,
          hint: 'Readable output matters more than fancy formatting.',
          concepts: contextualConcepts.slice(0, 3),
          requires_code: true,
          checkpoint: true,
          required_output: `Visible output showing the current ${items}.`,
          verification_focus: 'Output must clearly reflect the current stored state.',
        },
        {
          id: 's3',
          title: 'Add new entries',
          description: isBuildMode ? 'Implement the add flow for a new item.' : `Add a function or interaction that creates a new ${domain} entry and stores it correctly. The behavior should feel like a real feature, not a hard-coded demo.`,
          hint: 'Keep the input shape consistent with the sample data from step 1.',
          concepts: contextualConcepts.slice(0, 3),
          requires_code: true,
          checkpoint: false,
          required_output: `Code that adds new ${items} without breaking the existing state.`,
          verification_focus: 'New entries should be added correctly and remain visible.',
        },
        {
          id: 's4',
          title: 'Create one useful summary',
          description: isBuildMode ? 'Add one simple summary that makes the tool more useful.' : `Add one practical summary or filter, like counting entries, showing top-rated items, or grouping by a category. This is where the project starts feeling like a useful tool.`,
          hint: 'Pick the summary that best matches the data you chose.',
          concepts: contextualConcepts.slice(0, 4),
          requires_code: true,
          checkpoint: true,
          required_output: 'A working summary or filter that changes based on the data.',
          verification_focus: 'The program should derive a meaningful result from the stored data.',
        },
        {
          id: 's5',
          title: 'Explain the implementation',
          description: isBuildMode ? 'Be ready to justify the key choices you made.' : 'Write a brief explanation of how the tracker works, why you chose this structure, and where the user-facing value comes from.',
          hint: 'Focus on how data moves through the app.',
          concepts: contextualConcepts.slice(0, 4),
          requires_response: true,
          response_prompt: 'Explain how your tracker stores data, adds new entries, and produces the summary output.',
          checkpoint: true,
          required_output: 'A concise explanation of the implementation.',
          verification_focus: 'The explanation should prove the learner understands the system they built.',
        },
      ],
      starter_code: `const ${items} = [\n  {\n    id: 1,\n    ${fields.split(',').map((field, index) => `${field.trim()}: ${index === 0 ? "'Sample'" : index === 1 ? "'Demo'" : index === 2 ? "'Beginner'" : '0'}`).join(',\n    ')}\n  }\n]\n\nfunction addItem(item) {\n  // Add a new item to the collection\n}\n\nfunction summarizeItems(list) {\n  // Return one useful summary about the current data\n}\n\nconsole.log(${items})\n`,
      starter_language: 'javascript',
      deliverables: [
        `A runnable tool that manages ${items}`,
        'One useful summary or filter',
        'A short explanation of how the solution works',
      ],
      success_criteria: 'The code runs, new entries can be added, the summary works, and the explanation proves understanding.',
    }
  }

  if (skillType === 'language') {
    const scenario = variant?.scenario || 'travel'
    return {
      title: `Handle a ${scenario} conversation`,
      description: `Practice realistic communication in ${goal} through a short scenario sequence that builds confidence, not just recall. The deliverable is a set of useful responses you could actually say.`,
      skill_type: 'language',
      real_world_context: variant?.context || `A realistic ${scenario} scenario.`,
      difficulty: level,
      concepts_tested: contextualConcepts,
      estimated_minutes: 50,
      final_deliverable: 'A complete mini-conversation sequence with natural responses.',
      verification_summary: 'Verified through scenario responses, language quality checks, and a defense of word choice.',
      share_summary: `Completed an applied language scenario with usable responses and verified understanding.`,
      steps: [
        {
          id: 's1',
          title: 'Read the scenario',
          description: isBuildMode ? 'Review the setting and decide what you need to communicate.' : 'Read the scenario and identify the specific outcome you need from the interaction. Focus on clarity, tone, and what a natural response would need to accomplish.',
          hint: 'Start with the practical goal before worrying about perfect phrasing.',
          concepts: contextualConcepts.slice(0, 2),
          requires_response: true,
          response_prompt: 'In one or two sentences, describe what you need to communicate in this situation.',
          checkpoint: false,
          required_output: 'A short explanation of the communication goal.',
          verification_focus: 'The learner should understand the scenario before responding.',
        },
        {
          id: 's2',
          title: 'Write the first response',
          description: isBuildMode ? 'Respond naturally to the first prompt.' : 'Write a natural first response in the target language. It should sound like something a real person would say in this scenario, not a textbook translation.',
          hint: 'Use simple structure if needed, but make it usable.',
          concepts: contextualConcepts.slice(0, 3),
          requires_response: true,
          response_prompt: 'Write your first response in the target language.',
          checkpoint: true,
          required_output: 'A realistic first response.',
          verification_focus: 'Grammar, appropriateness, and whether the response fits the scenario.',
        },
        {
          id: 's3',
          title: 'Expand the exchange',
          description: isBuildMode ? 'Add the follow-up response that keeps the conversation moving.' : 'Add a follow-up response that shows you can sustain the exchange instead of stopping after one line. This is where fluency starts to feel practical.',
          hint: 'Think about what the other person would likely ask next.',
          concepts: contextualConcepts.slice(0, 4),
          requires_response: true,
          response_prompt: 'Write the next response that continues the conversation naturally.',
          checkpoint: true,
          required_output: 'A follow-up line that advances the conversation.',
          verification_focus: 'The learner should sustain the interaction naturally.',
        },
        {
          id: 's4',
          title: 'Defend your language choices',
          description: isBuildMode ? 'Explain why your phrasing fits the moment.' : 'Explain why you chose these words and structures, and why they fit the scenario. This proves you understand more than memorized phrases.',
          hint: 'Mention tone, clarity, and useful vocabulary.',
          concepts: contextualConcepts.slice(0, 4),
          requires_response: true,
          response_prompt: 'Explain why your responses fit the scenario and what key language choices you made.',
          checkpoint: true,
          required_output: 'A short rationale for the language choices.',
          verification_focus: 'The explanation should prove intentional language use.',
        },
      ],
      reference_material: 'Key phrases, useful vocabulary, and a few sentence patterns for the scenario.',
      starter_language: goal,
      deliverables: ['A complete short scenario response set', 'A rationale for the language choices'],
      success_criteria: 'Responses feel natural, fit the scenario, and the learner can explain the choices.',
    }
  }

  if (skillType === 'math') {
    const scenario = variant?.scenario || 'finance'
    return {
      title: `Solve a ${scenario} analysis`,
      description: `Apply math to a realistic scenario and show the full reasoning, not just the final answer. The project is designed to prove method quality and understanding.`,
      skill_type: 'math',
      real_world_context: variant?.context || `A realistic ${scenario} problem.`,
      difficulty: level,
      concepts_tested: contextualConcepts,
      estimated_minutes: 55,
      final_deliverable: 'A worked analysis with step-by-step reasoning.',
      verification_summary: 'Verified through step-by-step solutions and defense of the method.',
      share_summary: `Completed a real-world math scenario with full reasoning and validated method.`,
      steps: [
        {
          id: 's1',
          title: 'Identify the givens',
          description: isBuildMode ? 'List the known values and what you need to solve.' : 'Break down the scenario into the values you know, the variables you need, and the question you are actually answering. Good math starts with framing the problem correctly.',
          hint: 'Write the target unknown clearly before computing.',
          concepts: contextualConcepts.slice(0, 2),
          requires_response: true,
          response_prompt: 'List the givens, the unknown, and the equation or method you plan to use.',
          checkpoint: false,
          required_output: 'A structured setup of the problem.',
          verification_focus: 'The learner should correctly frame the problem before solving it.',
        },
        {
          id: 's2',
          title: 'Show the main calculation',
          description: isBuildMode ? 'Work the main calculation step by step.' : 'Solve the central part of the problem and show every important step. Do not skip the reasoning that connects one line to the next.',
          hint: 'Favor clarity over speed.',
          concepts: contextualConcepts.slice(0, 3),
          requires_response: true,
          response_prompt: 'Write the full step-by-step calculation.',
          checkpoint: true,
          required_output: 'A correct worked solution.',
          verification_focus: 'Method and correctness both matter.',
        },
        {
          id: 's3',
          title: 'Interpret the result',
          description: isBuildMode ? 'Translate the result into a decision or recommendation.' : 'Explain what the result means in the real-world scenario and why it matters. This separates raw calculation from useful thinking.',
          hint: 'Tie the number back to the original context.',
          concepts: contextualConcepts.slice(0, 4),
          requires_response: true,
          response_prompt: 'Explain what your result means and what decision it supports.',
          checkpoint: true,
          required_output: 'A short interpretation of the answer.',
          verification_focus: 'The learner should connect the math to the scenario outcome.',
        },
      ],
      reference_material: 'Relevant formulas, variables, and scenario data.',
      starter_language: 'math',
      deliverables: ['A step-by-step solution', 'A short interpretation of the result'],
      success_criteria: 'The method is sound, the result is correct, and the reasoning is visible.',
    }
  }

  return {
    title: `Applied ${goal} milestone`,
    description: `Complete a focused applied project that turns ${goal} into visible evidence. The work is structured to create real proof instead of filler progress.`,
    skill_type: skillType,
    real_world_context: describeVariantContext(variant),
    difficulty: level,
    concepts_tested: contextualConcepts,
    estimated_minutes: 55,
    final_deliverable: `A shareable proof artifact that demonstrates applied ${goal}.`,
    verification_summary: 'Verified through submitted work, validation, and explanation.',
    share_summary: `Completed an applied ${goal} milestone with verifiable output.`,
    steps: [
      {
        id: 's1',
        title: 'Define the outcome',
        description: isBuildMode ? 'Clarify what you are building or proving.' : `Set the target for this ${goal} milestone and define what a finished result should look like in a practical setting.`,
        hint: 'A strong project starts with a visible outcome.',
        concepts: contextualConcepts.slice(0, 2),
        requires_response: true,
        response_prompt: 'Describe the concrete outcome you are aiming to produce.',
        checkpoint: false,
        required_output: 'A concise goal statement.',
        verification_focus: 'The learner should define a practical target before building.',
      },
      {
        id: 's2',
        title: 'Produce the core artifact',
        description: isBuildMode ? 'Create the main piece of work.' : 'Create the main artifact or submission for this milestone. Make it concrete enough that someone else can inspect what you made and why it matters.',
        hint: 'Aim for clarity and usefulness, not volume.',
        concepts: contextualConcepts.slice(0, 3),
        requires_response: true,
        response_prompt: 'Submit the main artifact or explain what you produced in detail.',
        checkpoint: true,
        required_output: 'The main proof artifact.',
        verification_focus: 'The core work should be specific and inspectable.',
      },
      {
        id: 's3',
        title: 'Explain the thinking',
        description: isBuildMode ? 'Defend the choices you made.' : 'Explain how you approached the work, what tradeoffs you made, and how the final result proves the intended skill.',
        hint: 'Focus on why your choices were appropriate.',
        concepts: contextualConcepts.slice(0, 4),
        requires_response: true,
        response_prompt: 'Explain your approach, key decisions, and why the artifact proves the skill.',
        checkpoint: true,
        required_output: 'A short defense of the work.',
        verification_focus: 'The learner should be able to explain the choices behind the artifact.',
      },
    ],
    reference_material: 'Brief context, constraints, and reminders for the milestone.',
    starter_language: skillType,
    deliverables: ['A tangible artifact', 'A rationale for the approach'],
    success_criteria: 'The artifact is concrete, aligned with the goal, and supported by a clear explanation.',
  }
}

function normalizeProjectPayload(parsed = {}, skillType, variant, mode, performanceProfile) {
  const estimatedMinutes = Math.max(45, Math.min(120, Number(parsed.estimated_minutes) || 60))
  const rawSteps = Array.isArray(parsed.steps) ? parsed.steps : []
  const stepCount = Math.max(rawSteps.length || 0, 1)
  const preliminarySteps = rawSteps.slice(0, 10).map((step, index) => ({
    id: step.id || `s${index + 1}`,
    title: step.title || `Step ${index + 1}`,
    description: step.description || 'Complete this part of the project.',
    hint: step.hint || '',
    concepts: Array.isArray(step.concepts) ? step.concepts : [],
    checkpoint: Boolean(step.checkpoint),
    requires_code: Boolean(step.requires_code),
    requires_response: Boolean(step.requires_response),
    requires_practice: Boolean(step.requires_practice),
    response_prompt: step.response_prompt || null,
    practice_checklist: Array.isArray(step.practice_checklist) ? step.practice_checklist : undefined,
    min_words: Number.isFinite(Number(step.min_words)) ? Number(step.min_words) : undefined,
    required_output: inferRequiredOutput(step, skillType),
    verification_focus: inferVerificationFocus(step, skillType),
    estimated_minutes: Math.max(5, Math.min(20, Number(step.estimated_minutes) || Math.round(estimatedMinutes / stepCount))),
  }))
  const steps = normalizeProjectSteps(preliminarySteps, {
    skill_type: skillType,
    concepts_tested: parsed.concepts_tested || [],
  })

  const verificationPlan = getProjectVerificationPlan(skillType, mode)
  const realWorldContext = parsed.real_world_context || describeVariantContext(variant)
  const finalDeliverable = parsed.final_deliverable || parsed.deliverables?.[0] || 'A polished, shareable final output that proves the skill.'
  const shareSummary = parsed.share_summary || `${parsed.title || 'This project'} applies ${Array.isArray(parsed.concepts_tested) && parsed.concepts_tested.length > 0 ? parsed.concepts_tested.slice(0, 3).join(', ') : 'core concepts'} in a real-world scenario.`

  return {
    ...parsed,
    estimated_minutes: estimatedMinutes,
    steps,
    real_world_context: realWorldContext,
    final_deliverable: finalDeliverable,
    verification_summary: parsed.verification_summary || verificationPlan.summary,
    share_summary: shareSummary,
    performance_profile: performanceProfile,
  }
}

// ─── PROMPT BUILDER ──────────────────────────────────────────────────
function buildPrompt(skillType, { goal, concepts, difficulty, variant, isBuildMode, performanceProfile }) {
  const modeDesc = isBuildMode
    ? 'BUILD MODE — provide minimal step descriptions (1-2 sentences max), just goals and deliverables. The learner wants to figure it out themselves.'
    : 'GUIDED MODE — provide detailed step descriptions (3-5 sentences) with specific instructions.'
  const learnerProfileBlock = `RECENT PERFORMANCE PROFILE:
- Completed related projects: ${performanceProfile?.completedCount || 0}
- Average AI review score: ${performanceProfile?.avgScore ?? 'N/A'}
- Average authenticity score: ${performanceProfile?.avgAuthenticity ?? 'N/A'}
- Support level: ${performanceProfile?.supportLevel || 'moderate'}
- Stretch target: ${performanceProfile?.stretchDirection || 'slightly harder than recent work'}
`

  // ── CODING (existing behavior, preserved) ──
  if (skillType === 'coding') {
    return `Generate a hands-on portfolio project for a learner.

LEARNING GOAL: ${goal}
CONCEPTS COVERED SO FAR: ${concepts || 'Fundamentals'}
DIFFICULTY: ${difficulty || 'beginner'}
ESTIMATED TIME: 45-90 minutes
PROJECT DOMAIN: Use "${variant.domain}" as the theme — the project should involve ${variant.items} with fields like ${variant.fields}
MODE: ${modeDesc}
${learnerProfileBlock}

Return ONLY valid JSON:
{
  "title": "Specific project name themed around ${variant.domain} (e.g., 'Build a ${variant.domain.charAt(0).toUpperCase() + variant.domain.slice(1)} Tracker' not 'Project 1')",
  "description": "2-3 sentence description of what the learner will build and why it matters",
  "skill_type": "coding",
  "real_world_context": "Specific real-world reason this project matters",
  "difficulty": "${difficulty || 'beginner'}",
  "concepts_tested": ["concept1", "concept2"],
  "estimated_minutes": 60,
  "final_deliverable": "Clear, tangible output the learner can share",
  "verification_summary": "How this project will be verified",
  "share_summary": "One sentence describing why this proves the learner's skill",
  "steps": [
    {
      "id": "s1",
      "title": "Step title",
      "description": "${isBuildMode ? 'Brief goal for this step (1-2 sentences)' : 'Detailed description of what to do in this step (3-5 sentences, very specific and actionable)'}",
      "hint": "A helpful hint if the learner gets stuck",
      "concepts": ["which concepts this step practices"],
      "requires_code": true,
      "checkpoint": ${isBuildMode ? 'true' : 'false'},
      "required_output": "What must be produced for this step",
      "verification_focus": "What the verifier should look for"
    }
  ],
  "starter_code": "// Complete JavaScript starter code template\\n// Include comments showing where to add code\\n// Must be REAL, runnable starting point",
  "starter_language": "javascript",
  "deliverables": ["What the finished project should include/demonstrate"],
  "success_criteria": "How to know the project is complete and correct"
}

RULES:
- Generate 6-10 specific, actionable steps
- Steps should build on each other progressively
- Starter code must be complete and runnable as-is in JavaScript
- The project should produce something tangible the learner can show
- Difficulty should match concepts covered — don't require unknown concepts
- Each step should take 5-15 minutes
- Make the project title creative and specific — not generic
- Make the project feel impressive enough to share publicly
- Mark "requires_code": true for steps where the learner should submit code
- Mark "checkpoint": true for 2-3 key steps where understanding should be verified
- The ${variant.domain} theme must be used for data/examples (NOT a generic project)${isBuildMode ? '\n- BUILD MODE: Keep step descriptions minimal. Only provide goals, not how-to instructions.' : ''}`
  }

  // ── LANGUAGE ──
  if (skillType === 'language') {
    const targetLang = goal.match(/spanish|french|german|japanese|chinese|korean|italian|portuguese|arabic|hindi|russian|mandarin|dutch|swedish|thai|vietnamese|turkish|polish/i)?.[0] || 'the target language'
    return `Generate an immersive language practice project. The learner will practice ${targetLang} through realistic conversation scenarios.

LEARNING GOAL: ${goal}
CONCEPTS COVERED SO FAR: ${concepts || 'Basic greetings and vocabulary'}
DIFFICULTY: ${difficulty || 'beginner'}
ESTIMATED TIME: 45-90 minutes
SCENARIO THEME: ${variant.scenario} — ${variant.context}
SITUATIONS TO COVER: ${variant.situations}
MODE: ${modeDesc}
${learnerProfileBlock}

Return ONLY valid JSON:
{
  "title": "Creative scenario title (e.g., 'Your First Day in Madrid' not 'Spanish Practice')",
  "description": "2-3 sentences about the immersive scenario and what the learner will practice",
  "skill_type": "language",
  "real_world_context": "Specific real-world communication context",
  "difficulty": "${difficulty || 'beginner'}",
  "concepts_tested": ["greeting", "ordering", "numbers", "polite requests"],
  "estimated_minutes": 50,
  "final_deliverable": "Clear, tangible output the learner can share",
  "verification_summary": "How this project will be verified",
  "share_summary": "One sentence describing why this proves the learner's skill",
  "steps": [
    {
      "id": "s1",
      "title": "Scenario title",
      "description": "${isBuildMode ? 'Brief scenario goal (1-2 sentences)' : 'Detailed scenario with context, what the other person says, and what the learner should practice (3-5 sentences)'}",
      "hint": "Key phrase or grammar tip to help",
      "concepts": ["which language concepts this practices"],
      "requires_response": true,
      "response_prompt": "The other person says: '[dialogue in ${targetLang}]' — Respond in ${targetLang} to [specific goal].",
      "checkpoint": false,
      "required_output": "What the learner must produce for this scenario",
      "verification_focus": "What the verifier should look for"
    }
  ],
  "reference_material": "KEY VOCABULARY:\\n- word = translation\\n- word = translation\\n\\nKEY GRAMMAR:\\n- Rule: explanation with example\\n\\nUSEFUL PHRASES:\\n- phrase = translation",
  "starter_language": "${targetLang.toLowerCase()}",
  "deliverables": ["Complete all conversation scenarios", "Use at least 15 unique vocabulary words", "Demonstrate correct grammar usage"],
  "success_criteria": "Successfully navigate all scenarios with grammatically appropriate responses"
}

RULES:
- Generate 6-10 conversation scenarios that build in complexity
- Each step IS a realistic interaction scenario — give context and the other person's line
- "response_prompt" MUST include what the other person says in ${targetLang} and what the learner should respond
- Include diverse vocabulary (greetings, questions, descriptions, reactions, numbers)
- Reference material must have 20+ vocabulary words, 3+ grammar rules, 5+ useful phrases
- Match difficulty to concepts covered
- Mark "checkpoint": true for 2-3 key scenarios
- Make the title creative and immersive — set a specific scene${isBuildMode ? '\n- BUILD MODE: Give only the scenario and goal, not grammar hints in the description.' : ''}`
  }

  // ── MATH ──
  if (skillType === 'math') {
    return `Generate a real-world math problem-solving project. The learner will apply math concepts to a practical scenario.

LEARNING GOAL: ${goal}
CONCEPTS COVERED SO FAR: ${concepts || 'Basic arithmetic and algebra'}
DIFFICULTY: ${difficulty || 'beginner'}
ESTIMATED TIME: 45-90 minutes
SCENARIO: ${variant.scenario} — ${variant.context}
PROBLEM TYPES: ${variant.problems}
MODE: ${modeDesc}
${learnerProfileBlock}

Return ONLY valid JSON:
{
  "title": "Creative project name (e.g., 'Optimize the Pizza Shop Budget' not 'Math Practice')",
  "description": "2-3 sentences about the real-world scenario and what math the learner will apply",
  "skill_type": "math",
  "real_world_context": "Specific real-world problem context",
  "difficulty": "${difficulty || 'beginner'}",
  "concepts_tested": ["algebra", "graphing", "optimization"],
  "estimated_minutes": 55,
  "final_deliverable": "Clear, tangible output the learner can share",
  "verification_summary": "How this project will be verified",
  "share_summary": "One sentence describing why this proves the learner's skill",
  "steps": [
    {
      "id": "s1",
      "title": "Problem/task title",
      "description": "${isBuildMode ? 'Brief problem statement (1-2 sentences)' : 'Detailed problem with given data, what to solve for, and approach hints (3-5 sentences)'}",
      "hint": "A mathematical hint (which formula or method to use)",
      "concepts": ["which math concepts this step uses"],
      "requires_response": true,
      "response_prompt": "Show your step-by-step solution: [specific problem with numbers and data]",
      "checkpoint": true,
      "required_output": "What the learner must produce for this problem",
      "verification_focus": "What the verifier should look for"
    }
  ],
  "reference_material": "FORMULAS:\\n- Formula = explanation\\n\\nGIVEN DATA:\\n- Data point: value\\n\\nMETHOD GUIDE:\\n- Step-by-step approach outline",
  "starter_language": "math",
  "deliverables": ["Complete mathematical model/solution", "Show all work with reasoning", "Verify answer correctness"],
  "success_criteria": "Correct solutions with clear step-by-step reasoning for each problem"
}

RULES:
- Generate 6-10 problems that build toward a complete analysis
- Each step is a MATH PROBLEM with specific numbers and data
- "response_prompt" must ask for step-by-step solutions (not just final answers)
- Include specific numbers, units, and real-world data in every problem
- Reference material must have all relevant formulas and given data
- Problems should connect to each other (progressive analysis)
- Mark "checkpoint": true for 2-3 key problems
- Scenario: use ${variant.scenario} theme throughout${isBuildMode ? '\n- BUILD MODE: Give only the problem, not the approach.' : ''}`
  }

  // ── MUSIC ──
  if (skillType === 'music') {
    const instrument = goal.match(/guitar|piano|drums|bass|ukulele|violin|saxophone|flute|cello|keyboard|singing|vocal/i)?.[0] || 'instrument'
    return `Generate a structured practice session project for a ${instrument} learner.

LEARNING GOAL: ${goal}
CONCEPTS COVERED SO FAR: ${concepts || 'Basic technique and reading'}
DIFFICULTY: ${difficulty || 'beginner'}
ESTIMATED TIME: 45-90 minutes
PRACTICE THEME: ${variant.scenario} — ${variant.context}
ELEMENTS TO PRACTICE: ${variant.elements}
MODE: ${modeDesc}
${learnerProfileBlock}

Return ONLY valid JSON:
{
  "title": "Creative session title (e.g., 'Master the Blues Scale Jam' not 'Practice Session')",
  "description": "2-3 sentences about what the learner will practice and the skill they'll develop",
  "skill_type": "music",
  "real_world_context": "Specific real-world performance context",
  "difficulty": "${difficulty || 'beginner'}",
  "concepts_tested": ["chord shapes", "rhythm", "timing"],
  "estimated_minutes": 50,
  "final_deliverable": "Clear, tangible output the learner can share",
  "verification_summary": "How this project will be verified",
  "share_summary": "One sentence describing why this proves the learner's skill",
  "steps": [
    {
      "id": "s1",
      "title": "Practice exercise title",
      "description": "${isBuildMode ? 'Brief practice goal (1-2 sentences)' : 'Detailed exercise with specific technique, tempo, and what to focus on (3-5 sentences)'}",
      "hint": "Technique tip or common mistake to avoid",
      "concepts": ["which music concepts this practices"],
      "requires_practice": true,
      "practice_checklist": ["Specific self-check item 1", "Item 2", "Item 3"],
      "checkpoint": false,
      "required_output": "What the learner must produce for this exercise",
      "verification_focus": "What the verifier should look for"
    }
  ],
  "reference_material": "NOTATION/TABS:\\n- Specific notation for the exercises\\n\\nTECHNIQUE GUIDE:\\n- How to execute each technique\\n\\nTEMPO: Start at X BPM, target Y BPM\\n\\nTIPS:\\n- Practice tips",
  "starter_language": "${instrument.toLowerCase()}",
  "deliverables": ["Complete all practice exercises", "Hit target tempo", "Clean execution of technique"],
  "success_criteria": "Smooth, clean execution at target tempo with proper technique"
}

RULES:
- Generate 6-10 practice exercises that build progressively
- Each step has a "practice_checklist" with 3-5 specific, self-verifiable criteria
- Checklist items must be observable/audible (not vague like "sounds good")
- Include tempo targets, repetition counts, or duration goals
- Reference material must have notation/tabs/chords and technique guides
- Steps progress from warm-up to full performance
- Mark "checkpoint": true for 2-3 milestone exercises
- Use ${variant.scenario} theme${isBuildMode ? '\n- BUILD MODE: Give only the exercise goal, not technique details.' : ''}`
  }

  // ── DESIGN ──
  if (skillType === 'design') {
    return `Generate a design project following a real design process.

LEARNING GOAL: ${goal}
CONCEPTS COVERED SO FAR: ${concepts || 'Basic design principles'}
DIFFICULTY: ${difficulty || 'beginner'}
ESTIMATED TIME: 45-90 minutes
DESIGN PROJECT: ${variant.scenario} — ${variant.context}
FINAL DELIVERABLE: ${variant.deliverable}
MODE: ${modeDesc}
${learnerProfileBlock}

Return ONLY valid JSON:
{
  "title": "Creative brief title (e.g., 'Redesign the Local Café Menu' not 'Design Project')",
  "description": "2-3 sentences about the design challenge and client/user context",
  "skill_type": "design",
  "real_world_context": "Specific real-world design brief",
  "difficulty": "${difficulty || 'beginner'}",
  "concepts_tested": ["layout", "typography", "color theory", "hierarchy"],
  "estimated_minutes": 60,
  "final_deliverable": "Clear, tangible output the learner can share",
  "verification_summary": "How this project will be verified",
  "share_summary": "One sentence describing why this proves the learner's skill",
  "steps": [
    {
      "id": "s1",
      "title": "Design phase title",
      "description": "${isBuildMode ? 'Brief design goal (1-2 sentences)' : 'Detailed design task with constraints, requirements, and what to think about (3-5 sentences)'}",
      "hint": "Design principle or tip to apply",
      "concepts": ["which design concepts this step uses"],
      "requires_response": true,
      "response_prompt": "Describe your design decisions: What layout/colors/typography did you choose and why?",
      "checkpoint": false,
      "required_output": "What the learner must produce for this design step",
      "verification_focus": "What the verifier should look for"
    }
  ],
  "reference_material": "DESIGN BRIEF:\\n- Client/project context\\n- Target audience\\n\\nCONSTRAINTS:\\n- Size/format requirements\\n- Brand colors or style\\n\\nPRINCIPLES TO APPLY:\\n- Relevant design principles",
  "starter_language": "design",
  "deliverables": ["${variant.deliverable}"],
  "success_criteria": "Complete design that follows the brief, demonstrates design principles, and communicates effectively"
}

RULES:
- Generate 6-10 steps following the design process (research → sketch → refine → polish)
- Each step asks the learner to describe their design decisions and reasoning
- Include specific constraints (sizes, colors, fonts, target audience)
- Reference material must have the full design brief and constraints
- Steps should produce increasingly refined design work
- Mark "checkpoint": true for 2-3 design review points
- Use ${variant.scenario} context${isBuildMode ? '\n- BUILD MODE: Give only the design goal, not how-to instructions.' : ''}`
  }

  // ── BUSINESS ──
  if (skillType === 'business') {
    return `Generate a business analysis project based on a realistic scenario.

LEARNING GOAL: ${goal}
CONCEPTS COVERED SO FAR: ${concepts || 'Business fundamentals'}
DIFFICULTY: ${difficulty || 'beginner'}
ESTIMATED TIME: 45-90 minutes
BUSINESS SCENARIO: ${variant.scenario} — ${variant.context}
ANALYSIS AREAS: ${variant.analysis}
MODE: ${modeDesc}
${learnerProfileBlock}

Return ONLY valid JSON:
{
  "title": "Specific scenario title (e.g., 'Launch Strategy for EcoBean Coffee' not 'Business Plan')",
  "description": "2-3 sentences about the business scenario and what the learner will analyze/create",
  "skill_type": "business",
  "real_world_context": "Specific real-world business context",
  "difficulty": "${difficulty || 'beginner'}",
  "concepts_tested": ["market analysis", "strategy", "financial planning"],
  "estimated_minutes": 60,
  "final_deliverable": "Clear, tangible output the learner can share",
  "verification_summary": "How this project will be verified",
  "share_summary": "One sentence describing why this proves the learner's skill",
  "steps": [
    {
      "id": "s1",
      "title": "Analysis/planning task title",
      "description": "${isBuildMode ? 'Brief task goal (1-2 sentences)' : 'Detailed analysis task with specific data, frameworks, and deliverable (3-5 sentences)'}",
      "hint": "Framework or approach suggestion",
      "concepts": ["which business concepts this uses"],
      "requires_response": true,
      "response_prompt": "Write your analysis: [specific question with context and data to reference]",
      "min_words": 100,
      "checkpoint": false,
      "required_output": "What the learner must produce for this analysis",
      "verification_focus": "What the verifier should look for"
    }
  ],
  "reference_material": "SCENARIO:\\n- Business situation details\\n\\nMARKET DATA:\\n- Relevant market data and numbers\\n\\nFRAMEWORK:\\n- Analytical framework to apply",
  "starter_language": "business",
  "deliverables": ["Complete business analysis document", "Data-backed recommendations", "Action plan"],
  "success_criteria": "Thorough, data-supported analysis with actionable recommendations"
}

RULES:
- Generate 6-10 analysis tasks building a complete business document
- Each step should produce written analysis with evidence and reasoning
- Include specific market data, numbers, and scenarios in the problems
- "min_words": 100 for most steps (substantive analysis expected)
- Reference material must have scenario details, market data, and frameworks
- Steps should build toward a comprehensive deliverable
- Mark "checkpoint": true for 2-3 key analysis sections
- Use ${variant.scenario} scenario throughout${isBuildMode ? '\n- BUILD MODE: Give only the analysis goal, not the framework details.' : ''}`
  }

  // ── HARDWARE ──
  if (skillType === 'hardware') {
    return `Generate a hands-on hardware/electronics project.

LEARNING GOAL: ${goal}
CONCEPTS COVERED SO FAR: ${concepts || 'Basic electronics'}
DIFFICULTY: ${difficulty || 'beginner'}
ESTIMATED TIME: 45-90 minutes
PROJECT: ${variant.scenario} — ${variant.context}
COMPONENTS: ${variant.components}
MODE: ${modeDesc}
${learnerProfileBlock}

Return ONLY valid JSON:
{
  "title": "Specific build title (e.g., 'Build a Smart Plant Watering System' not 'Arduino Project')",
  "description": "2-3 sentences about what the learner will build and how it works",
  "skill_type": "hardware",
  "real_world_context": "Specific real-world hardware scenario",
  "difficulty": "${difficulty || 'beginner'}",
  "concepts_tested": ["digital I/O", "sensors", "serial communication"],
  "estimated_minutes": 60,
  "final_deliverable": "Clear, tangible output the learner can share",
  "verification_summary": "How this project will be verified",
  "share_summary": "One sentence describing why this proves the learner's skill",
  "steps": [
    {
      "id": "s1",
      "title": "Build/test phase title",
      "description": "${isBuildMode ? 'Brief build goal (1-2 sentences)' : 'Detailed build instructions with pin connections, expected behavior, and what to test (3-5 sentences)'}",
      "hint": "Wiring tip or common troubleshooting step",
      "concepts": ["which hardware concepts this uses"],
      "requires_response": true,
      "response_prompt": "Report your results: What output/readings did you observe? Does it match expected behavior?",
      "checkpoint": false,
      "required_output": "What the learner must produce for this build/test step",
      "verification_focus": "What the verifier should look for"
    }
  ],
  "reference_material": "COMPONENTS:\\n- Component: specification\\n\\nWIRING:\\n- Pin connections (text-based diagram)\\n\\nCODE:\\n- Starter code for the microcontroller\\n\\nEXPECTED OUTPUT:\\n- What each step should produce",
  "starter_language": "arduino",
  "deliverables": ["Working circuit", "Correct output readings", "Clean wiring"],
  "success_criteria": "Fully functional system matching expected behavior with correct outputs"
}

RULES:
- Generate 6-10 build+test steps alternating between wiring and verification
- Each step should have expected outputs the learner can verify
- Include specific pin numbers, component values, and expected readings
- Reference material must have full wiring diagram and starter code
- Steps progress from basic wiring to full system integration
- Mark "checkpoint": true for 2-3 key test points
- Use ${variant.scenario} project${isBuildMode ? '\n- BUILD MODE: Give only the build goal, not wiring details.' : ''}`
  }

  // ── WRITING ──
  if (skillType === 'writing') {
    return `Generate a structured writing project that produces a polished piece.

LEARNING GOAL: ${goal}
CONCEPTS COVERED SO FAR: ${concepts || 'Basic writing fundamentals'}
DIFFICULTY: ${difficulty || 'beginner'}
ESTIMATED TIME: 45-90 minutes
WRITING TYPE: ${variant.scenario} — ${variant.context}
CRAFT ELEMENTS: ${variant.elements}
MODE: ${modeDesc}
${learnerProfileBlock}

Return ONLY valid JSON:
{
  "title": "Creative project title (e.g., 'The Midnight Café — A Short Story in Five Acts' not 'Writing Assignment')",
  "description": "2-3 sentences about the writing challenge and what the learner will create",
  "skill_type": "writing",
  "real_world_context": "Specific real-world writing context",
  "difficulty": "${difficulty || 'beginner'}",
  "concepts_tested": ["narrative structure", "dialogue", "descriptive language"],
  "estimated_minutes": 55,
  "final_deliverable": "Clear, tangible output the learner can share",
  "verification_summary": "How this project will be verified",
  "share_summary": "One sentence describing why this proves the learner's skill",
  "steps": [
    {
      "id": "s1",
      "title": "Writing phase title",
      "description": "${isBuildMode ? 'Brief writing goal (1-2 sentences)' : 'Detailed writing task with constraints, focus areas, and craft elements to practice (3-5 sentences)'}",
      "hint": "Writing technique tip or example",
      "concepts": ["which writing concepts this practices"],
      "requires_response": true,
      "response_prompt": "[Specific writing prompt with constraints — genre, word count target, focus element]",
      "min_words": 150,
      "checkpoint": false,
      "required_output": "What the learner must produce for this writing step",
      "verification_focus": "What the verifier should look for"
    }
  ],
  "reference_material": "WRITING PROMPT:\\n- Full prompt details and scenario\\n\\nSTYLE GUIDE:\\n- Tone, voice, and style requirements\\n\\nCRAFT FOCUS:\\n- Specific techniques to practice\\n\\nEXAMPLES:\\n- Brief example excerpts showing the technique",
  "starter_language": "english",
  "deliverables": ["Complete written piece", "Demonstrates craft elements", "Polished final draft"],
  "success_criteria": "Engaging, well-structured piece that demonstrates target writing techniques"
}

RULES:
- Generate 6-10 steps following the writing process (brainstorm → outline → draft → revise → polish)
- Each step should produce actual written content (not just planning notes)
- Include word count targets and specific craft focus for each step
- "min_words": 100-200 for writing steps
- Reference material must have the full prompt and style guidance
- Steps build sections of the final piece progressively
- Mark "checkpoint": true for 2-3 key writing milestones
- Use ${variant.scenario} genre/form${isBuildMode ? '\n- BUILD MODE: Give only the writing goal, not technique instructions.' : ''}`
  }

  // ── SCIENCE ──
  if (skillType === 'science') {
    return `Generate a scientific investigation project applying the scientific method.

LEARNING GOAL: ${goal}
CONCEPTS COVERED SO FAR: ${concepts || 'Basic scientific principles'}
DIFFICULTY: ${difficulty || 'beginner'}
ESTIMATED TIME: 45-90 minutes
INVESTIGATION: ${variant.scenario} — ${variant.context}
ELEMENTS: ${variant.elements}
MODE: ${modeDesc}
${learnerProfileBlock}

Return ONLY valid JSON:
{
  "title": "Engaging investigation title (e.g., 'Why Do Ice Cubes Melt Faster in Salt Water?' not 'Science Lab')",
  "description": "2-3 sentences about the scientific question and investigation approach",
  "skill_type": "science",
  "real_world_context": "Specific real-world investigation context",
  "difficulty": "${difficulty || 'beginner'}",
  "concepts_tested": ["hypothesis testing", "data analysis", "scientific reasoning"],
  "estimated_minutes": 55,
  "final_deliverable": "Clear, tangible output the learner can share",
  "verification_summary": "How this project will be verified",
  "share_summary": "One sentence describing why this proves the learner's skill",
  "steps": [
    {
      "id": "s1",
      "title": "Investigation phase title",
      "description": "${isBuildMode ? 'Brief scientific task (1-2 sentences)' : 'Detailed scientific task with specific observations, data, or analysis to perform (3-5 sentences)'}",
      "hint": "Scientific reasoning tip or approach suggestion",
      "concepts": ["which science concepts this step uses"],
      "requires_response": true,
      "response_prompt": "[Specific scientific question — ask for hypothesis, observations, calculations, or analysis with reasoning]",
      "checkpoint": true,
      "required_output": "What the learner must produce for this investigation step",
      "verification_focus": "What the verifier should look for"
    }
  ],
  "reference_material": "BACKGROUND:\\n- Relevant scientific concepts and laws\\n\\nDATA:\\n- Given observations or experimental data\\n\\nMETHOD:\\n- Investigation approach and tools",
  "starter_language": "science",
  "deliverables": ["Complete investigation with hypothesis", "Data analysis and graphs", "Evidence-based conclusions"],
  "success_criteria": "Rigorous scientific reasoning with clear hypothesis, evidence, and conclusions"
}

RULES:
- Generate 6-10 steps following scientific method (question → hypothesis → method → data → analysis → conclusion)
- Each step requires scientific reasoning, not just recall
- Include specific data, measurements, and observations in problems
- Reference material must have relevant scientific background and data
- Steps should connect logically toward evidence-based conclusions
- Mark "checkpoint": true for 2-3 key reasoning checkpoints
- Use ${variant.scenario} investigation type${isBuildMode ? '\n- BUILD MODE: Give only the scientific question, not the method.' : ''}`
  }

  // ── DEFAULT (general skills) ──
  return `Generate a hands-on project for a learner.

LEARNING GOAL: ${goal}
CONCEPTS COVERED SO FAR: ${concepts || 'Fundamentals'}
DIFFICULTY: ${difficulty || 'beginner'}
ESTIMATED TIME: 45-90 minutes
MODE: ${modeDesc}
${learnerProfileBlock}

Return ONLY valid JSON:
{
  "title": "Creative, specific project name",
  "description": "2-3 sentence description",
  "skill_type": "general",
  "real_world_context": "Specific real-world reason this matters",
  "difficulty": "${difficulty || 'beginner'}",
  "concepts_tested": ["concept1", "concept2"],
  "estimated_minutes": 60,
  "final_deliverable": "Clear, tangible output the learner can share",
  "verification_summary": "How this project will be verified",
  "share_summary": "One sentence describing why this proves the learner's skill",
  "steps": [
    {
      "id": "s1",
      "title": "Step title",
      "description": "Detailed description",
      "hint": "Helpful hint",
      "concepts": ["concepts"],
      "requires_response": true,
      "response_prompt": "What the learner should produce for this step",
      "checkpoint": false,
      "required_output": "What the learner must produce for this step",
      "verification_focus": "What the verifier should look for"
    }
  ],
  "reference_material": "Key reference material and background info",
  "starter_language": "general",
  "deliverables": ["Final output"],
  "success_criteria": "How to know the project is complete"
}

RULES:
- Generate 6-10 specific, actionable steps
- Steps should build on each other progressively
- Each step should take 5-15 minutes
- Make the title creative and specific
- Make the project feel impressive enough to share publicly
- Mark "checkpoint": true for 2-3 key steps${isBuildMode ? '\n- BUILD MODE: Keep descriptions minimal.' : ''}`
}

// ─── MAIN HANDLER ────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json()
    const { goalId, goal, conceptsCovered, difficulty, dayNumber, mode } = body
    if (!goal) return Response.json({ error: 'Missing goal' }, { status: 400 })

    const accessToken = extractAccessToken(request) || body?.accessToken || null
    const supabase = getSupabaseServerClient({ accessToken })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

    // Check if a project already exists for this user/goal/day
    if (goalId && dayNumber) {
      const { data: existing } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .eq('goal_id', goalId)
        .eq('day_number', dayNumber)
        .limit(1)
        .single()

      if (existing) return Response.json(existing)
    }

    // Detect skill type from goal
    const skillType = detectSkillType(goal)
    const verificationType = getVerificationType(skillType)
    const { data: previousProjects } = await supabase
      .from('projects')
      .select('skill_type, authenticity_score, ai_review, mode, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(12)

    // Generate variant seed for anti-copy
    const variantSeed = generateVariantSeed(user.id, goalId, dayNumber)
    const variants = SKILL_VARIANTS[skillType] || SKILL_VARIANTS.coding
    const variant = variants[variantSeed % variants.length]

    const isBuildMode = mode === 'build'
    const performanceProfile = buildPerformanceProfile(previousProjects || [], skillType)

    const prompt = buildPrompt(skillType, {
      goal,
      concepts: (conceptsCovered || []).join(', ') || 'Fundamentals',
      difficulty: difficulty || 'beginner',
      variant,
      isBuildMode,
      performanceProfile,
    })

    const fallbackProject = buildFallbackProjectPayload(skillType, {
      goal,
      concepts: (conceptsCovered || []).join(', ') || 'Fundamentals',
      difficulty: difficulty || 'beginner',
      variant,
      isBuildMode,
      performanceProfile,
    })

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: getOpenAIModel('projectGenerate'),
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
        max_tokens: 2500,
      }),
    })

    let parsed
    try {
      const rawResponseText = await res.text()
      const data = rawResponseText ? JSON.parse(rawResponseText) : {}
      if (!res.ok) throw new Error(data?.error?.message || `OpenAI request failed with ${res.status}`)
      const raw = data?.choices?.[0]?.message?.content?.trim() || ''
      parsed = normalizeProjectPayload(extractJsonPayload(raw), skillType, variant, mode, performanceProfile)
    } catch {
      parsed = normalizeProjectPayload(fallbackProject, skillType, variant, mode, performanceProfile)
    }

    const progress = ensureProjectProgress({
      project_brief: {
        real_world_context: parsed.real_world_context,
        final_deliverable: parsed.final_deliverable,
        verification_summary: parsed.verification_summary,
        share_summary: parsed.share_summary,
        performance_profile: performanceProfile,
        verification_plan: getProjectVerificationPlan(skillType, isBuildMode ? 'build' : 'guided'),
        variation_context: variant,
        verification_type: verificationType,
      },
    })

    // Save to database — map reference_material to starter_code column
    const row = {
      user_id: user.id,
      goal_id: goalId || null,
      title: parsed.title,
      description: parsed.description,
      difficulty: parsed.difficulty || difficulty || 'beginner',
      concepts_tested: parsed.concepts_tested || [],
      steps: parsed.steps || [],
      starter_code: parsed.starter_code || parsed.reference_material || null,
      starter_language: parsed.starter_language || null,
      deliverables: parsed.deliverables || [],
      estimated_minutes: parsed.estimated_minutes || 60,
      xp_reward: isBuildMode ? 150 : 100,
      gem_reward: isBuildMode ? 40 : 25,
      status: 'not_started',
      progress,
      day_number: dayNumber || null,
    }

    row.progress.proof_summary = buildProjectProofSummary({
      ...row,
      mode: isBuildMode ? 'build' : 'guided',
      skill_type: skillType,
      authenticity_score: null,
    })

    // Try with new columns first, fall back without them
    let saved, error
    const fullRow = {
      ...row,
      mode: isBuildMode ? 'build' : 'guided',
      variant_seed: variantSeed,
      skill_type: skillType,
    }
    ;({ data: saved, error } = await supabase.from('projects').insert(fullRow).select().single())

    if (error) {
      // Try without skill_type (column may not exist)
      const partialRow = { ...row, mode: isBuildMode ? 'build' : 'guided', variant_seed: variantSeed }
      ;({ data: saved, error } = await supabase.from('projects').insert(partialRow).select().single())

      if (error) {
        // Retry without any new columns
        ;({ data: saved, error } = await supabase.from('projects').insert(row).select().single())
        if (error) throw new Error(`Failed to save project: ${error.message}`)
        saved.mode = isBuildMode ? 'build' : 'guided'
      }
      saved.skill_type = skillType
    }

    return Response.json(saved)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
