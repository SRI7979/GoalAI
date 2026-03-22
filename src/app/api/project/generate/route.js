import { getSupabaseServerClient } from '@/lib/supabaseServer'
import { detectSkillType, getVerificationType } from '@/lib/skillTypes'

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

// ─── PROMPT BUILDER ──────────────────────────────────────────────────
function buildPrompt(skillType, { goal, concepts, difficulty, variant, isBuildMode }) {
  const modeDesc = isBuildMode
    ? 'BUILD MODE — provide minimal step descriptions (1-2 sentences max), just goals and deliverables. The learner wants to figure it out themselves.'
    : 'GUIDED MODE — provide detailed step descriptions (3-5 sentences) with specific instructions.'

  // ── CODING (existing behavior, preserved) ──
  if (skillType === 'coding') {
    return `Generate a hands-on portfolio project for a learner.

LEARNING GOAL: ${goal}
CONCEPTS COVERED SO FAR: ${concepts || 'Fundamentals'}
DIFFICULTY: ${difficulty || 'beginner'}
ESTIMATED TIME: 45-90 minutes
PROJECT DOMAIN: Use "${variant.domain}" as the theme — the project should involve ${variant.items} with fields like ${variant.fields}
MODE: ${modeDesc}

Return ONLY valid JSON:
{
  "title": "Specific project name themed around ${variant.domain} (e.g., 'Build a ${variant.domain.charAt(0).toUpperCase() + variant.domain.slice(1)} Tracker' not 'Project 1')",
  "description": "2-3 sentence description of what the learner will build and why it matters",
  "skill_type": "coding",
  "difficulty": "${difficulty || 'beginner'}",
  "concepts_tested": ["concept1", "concept2"],
  "estimated_minutes": 60,
  "steps": [
    {
      "id": "s1",
      "title": "Step title",
      "description": "${isBuildMode ? 'Brief goal for this step (1-2 sentences)' : 'Detailed description of what to do in this step (3-5 sentences, very specific and actionable)'}",
      "hint": "A helpful hint if the learner gets stuck",
      "concepts": ["which concepts this step practices"],
      "requires_code": true,
      "checkpoint": ${isBuildMode ? 'true' : 'false'}
    }
  ],
  "starter_code": "// Complete starter code template\\n// Include comments showing where to add code\\n// Must be REAL, runnable starting point",
  "starter_language": "python",
  "deliverables": ["What the finished project should include/demonstrate"],
  "success_criteria": "How to know the project is complete and correct"
}

RULES:
- Generate 5-8 specific, actionable steps
- Steps should build on each other progressively
- Starter code must be complete and runnable as-is
- The project should produce something tangible the learner can show
- Difficulty should match concepts covered — don't require unknown concepts
- Each step should take 5-15 minutes
- Make the project title creative and specific — not generic
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

Return ONLY valid JSON:
{
  "title": "Creative scenario title (e.g., 'Your First Day in Madrid' not 'Spanish Practice')",
  "description": "2-3 sentences about the immersive scenario and what the learner will practice",
  "skill_type": "language",
  "difficulty": "${difficulty || 'beginner'}",
  "concepts_tested": ["greeting", "ordering", "numbers", "polite requests"],
  "estimated_minutes": 50,
  "steps": [
    {
      "id": "s1",
      "title": "Scenario title",
      "description": "${isBuildMode ? 'Brief scenario goal (1-2 sentences)' : 'Detailed scenario with context, what the other person says, and what the learner should practice (3-5 sentences)'}",
      "hint": "Key phrase or grammar tip to help",
      "concepts": ["which language concepts this practices"],
      "requires_response": true,
      "response_prompt": "The other person says: '[dialogue in ${targetLang}]' — Respond in ${targetLang} to [specific goal].",
      "checkpoint": false
    }
  ],
  "reference_material": "KEY VOCABULARY:\\n- word = translation\\n- word = translation\\n\\nKEY GRAMMAR:\\n- Rule: explanation with example\\n\\nUSEFUL PHRASES:\\n- phrase = translation",
  "starter_language": "${targetLang.toLowerCase()}",
  "deliverables": ["Complete all conversation scenarios", "Use at least 15 unique vocabulary words", "Demonstrate correct grammar usage"],
  "success_criteria": "Successfully navigate all scenarios with grammatically appropriate responses"
}

RULES:
- Generate 6-8 conversation scenarios that build in complexity
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

Return ONLY valid JSON:
{
  "title": "Creative project name (e.g., 'Optimize the Pizza Shop Budget' not 'Math Practice')",
  "description": "2-3 sentences about the real-world scenario and what math the learner will apply",
  "skill_type": "math",
  "difficulty": "${difficulty || 'beginner'}",
  "concepts_tested": ["algebra", "graphing", "optimization"],
  "estimated_minutes": 55,
  "steps": [
    {
      "id": "s1",
      "title": "Problem/task title",
      "description": "${isBuildMode ? 'Brief problem statement (1-2 sentences)' : 'Detailed problem with given data, what to solve for, and approach hints (3-5 sentences)'}",
      "hint": "A mathematical hint (which formula or method to use)",
      "concepts": ["which math concepts this step uses"],
      "requires_response": true,
      "response_prompt": "Show your step-by-step solution: [specific problem with numbers and data]",
      "checkpoint": true
    }
  ],
  "reference_material": "FORMULAS:\\n- Formula = explanation\\n\\nGIVEN DATA:\\n- Data point: value\\n\\nMETHOD GUIDE:\\n- Step-by-step approach outline",
  "starter_language": "math",
  "deliverables": ["Complete mathematical model/solution", "Show all work with reasoning", "Verify answer correctness"],
  "success_criteria": "Correct solutions with clear step-by-step reasoning for each problem"
}

RULES:
- Generate 6-8 problems that build toward a complete analysis
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

Return ONLY valid JSON:
{
  "title": "Creative session title (e.g., 'Master the Blues Scale Jam' not 'Practice Session')",
  "description": "2-3 sentences about what the learner will practice and the skill they'll develop",
  "skill_type": "music",
  "difficulty": "${difficulty || 'beginner'}",
  "concepts_tested": ["chord shapes", "rhythm", "timing"],
  "estimated_minutes": 50,
  "steps": [
    {
      "id": "s1",
      "title": "Practice exercise title",
      "description": "${isBuildMode ? 'Brief practice goal (1-2 sentences)' : 'Detailed exercise with specific technique, tempo, and what to focus on (3-5 sentences)'}",
      "hint": "Technique tip or common mistake to avoid",
      "concepts": ["which music concepts this practices"],
      "requires_practice": true,
      "practice_checklist": ["Specific self-check item 1", "Item 2", "Item 3"],
      "checkpoint": false
    }
  ],
  "reference_material": "NOTATION/TABS:\\n- Specific notation for the exercises\\n\\nTECHNIQUE GUIDE:\\n- How to execute each technique\\n\\nTEMPO: Start at X BPM, target Y BPM\\n\\nTIPS:\\n- Practice tips",
  "starter_language": "${instrument.toLowerCase()}",
  "deliverables": ["Complete all practice exercises", "Hit target tempo", "Clean execution of technique"],
  "success_criteria": "Smooth, clean execution at target tempo with proper technique"
}

RULES:
- Generate 6-8 practice exercises that build progressively
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

Return ONLY valid JSON:
{
  "title": "Creative brief title (e.g., 'Redesign the Local Café Menu' not 'Design Project')",
  "description": "2-3 sentences about the design challenge and client/user context",
  "skill_type": "design",
  "difficulty": "${difficulty || 'beginner'}",
  "concepts_tested": ["layout", "typography", "color theory", "hierarchy"],
  "estimated_minutes": 60,
  "steps": [
    {
      "id": "s1",
      "title": "Design phase title",
      "description": "${isBuildMode ? 'Brief design goal (1-2 sentences)' : 'Detailed design task with constraints, requirements, and what to think about (3-5 sentences)'}",
      "hint": "Design principle or tip to apply",
      "concepts": ["which design concepts this step uses"],
      "requires_response": true,
      "response_prompt": "Describe your design decisions: What layout/colors/typography did you choose and why?",
      "checkpoint": false
    }
  ],
  "reference_material": "DESIGN BRIEF:\\n- Client/project context\\n- Target audience\\n\\nCONSTRAINTS:\\n- Size/format requirements\\n- Brand colors or style\\n\\nPRINCIPLES TO APPLY:\\n- Relevant design principles",
  "starter_language": "design",
  "deliverables": ["${variant.deliverable}"],
  "success_criteria": "Complete design that follows the brief, demonstrates design principles, and communicates effectively"
}

RULES:
- Generate 6-8 steps following the design process (research → sketch → refine → polish)
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

Return ONLY valid JSON:
{
  "title": "Specific scenario title (e.g., 'Launch Strategy for EcoBean Coffee' not 'Business Plan')",
  "description": "2-3 sentences about the business scenario and what the learner will analyze/create",
  "skill_type": "business",
  "difficulty": "${difficulty || 'beginner'}",
  "concepts_tested": ["market analysis", "strategy", "financial planning"],
  "estimated_minutes": 60,
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
      "checkpoint": false
    }
  ],
  "reference_material": "SCENARIO:\\n- Business situation details\\n\\nMARKET DATA:\\n- Relevant market data and numbers\\n\\nFRAMEWORK:\\n- Analytical framework to apply",
  "starter_language": "business",
  "deliverables": ["Complete business analysis document", "Data-backed recommendations", "Action plan"],
  "success_criteria": "Thorough, data-supported analysis with actionable recommendations"
}

RULES:
- Generate 6-8 analysis tasks building a complete business document
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

Return ONLY valid JSON:
{
  "title": "Specific build title (e.g., 'Build a Smart Plant Watering System' not 'Arduino Project')",
  "description": "2-3 sentences about what the learner will build and how it works",
  "skill_type": "hardware",
  "difficulty": "${difficulty || 'beginner'}",
  "concepts_tested": ["digital I/O", "sensors", "serial communication"],
  "estimated_minutes": 60,
  "steps": [
    {
      "id": "s1",
      "title": "Build/test phase title",
      "description": "${isBuildMode ? 'Brief build goal (1-2 sentences)' : 'Detailed build instructions with pin connections, expected behavior, and what to test (3-5 sentences)'}",
      "hint": "Wiring tip or common troubleshooting step",
      "concepts": ["which hardware concepts this uses"],
      "requires_response": true,
      "response_prompt": "Report your results: What output/readings did you observe? Does it match expected behavior?",
      "checkpoint": false
    }
  ],
  "reference_material": "COMPONENTS:\\n- Component: specification\\n\\nWIRING:\\n- Pin connections (text-based diagram)\\n\\nCODE:\\n- Starter code for the microcontroller\\n\\nEXPECTED OUTPUT:\\n- What each step should produce",
  "starter_language": "arduino",
  "deliverables": ["Working circuit", "Correct output readings", "Clean wiring"],
  "success_criteria": "Fully functional system matching expected behavior with correct outputs"
}

RULES:
- Generate 6-8 build+test steps alternating between wiring and verification
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

Return ONLY valid JSON:
{
  "title": "Creative project title (e.g., 'The Midnight Café — A Short Story in Five Acts' not 'Writing Assignment')",
  "description": "2-3 sentences about the writing challenge and what the learner will create",
  "skill_type": "writing",
  "difficulty": "${difficulty || 'beginner'}",
  "concepts_tested": ["narrative structure", "dialogue", "descriptive language"],
  "estimated_minutes": 55,
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
      "checkpoint": false
    }
  ],
  "reference_material": "WRITING PROMPT:\\n- Full prompt details and scenario\\n\\nSTYLE GUIDE:\\n- Tone, voice, and style requirements\\n\\nCRAFT FOCUS:\\n- Specific techniques to practice\\n\\nEXAMPLES:\\n- Brief example excerpts showing the technique",
  "starter_language": "english",
  "deliverables": ["Complete written piece", "Demonstrates craft elements", "Polished final draft"],
  "success_criteria": "Engaging, well-structured piece that demonstrates target writing techniques"
}

RULES:
- Generate 6-8 steps following the writing process (brainstorm → outline → draft → revise → polish)
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

Return ONLY valid JSON:
{
  "title": "Engaging investigation title (e.g., 'Why Do Ice Cubes Melt Faster in Salt Water?' not 'Science Lab')",
  "description": "2-3 sentences about the scientific question and investigation approach",
  "skill_type": "science",
  "difficulty": "${difficulty || 'beginner'}",
  "concepts_tested": ["hypothesis testing", "data analysis", "scientific reasoning"],
  "estimated_minutes": 55,
  "steps": [
    {
      "id": "s1",
      "title": "Investigation phase title",
      "description": "${isBuildMode ? 'Brief scientific task (1-2 sentences)' : 'Detailed scientific task with specific observations, data, or analysis to perform (3-5 sentences)'}",
      "hint": "Scientific reasoning tip or approach suggestion",
      "concepts": ["which science concepts this step uses"],
      "requires_response": true,
      "response_prompt": "[Specific scientific question — ask for hypothesis, observations, calculations, or analysis with reasoning]",
      "checkpoint": true
    }
  ],
  "reference_material": "BACKGROUND:\\n- Relevant scientific concepts and laws\\n\\nDATA:\\n- Given observations or experimental data\\n\\nMETHOD:\\n- Investigation approach and tools",
  "starter_language": "science",
  "deliverables": ["Complete investigation with hypothesis", "Data analysis and graphs", "Evidence-based conclusions"],
  "success_criteria": "Rigorous scientific reasoning with clear hypothesis, evidence, and conclusions"
}

RULES:
- Generate 6-8 steps following scientific method (question → hypothesis → method → data → analysis → conclusion)
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

Return ONLY valid JSON:
{
  "title": "Creative, specific project name",
  "description": "2-3 sentence description",
  "skill_type": "general",
  "difficulty": "${difficulty || 'beginner'}",
  "concepts_tested": ["concept1", "concept2"],
  "estimated_minutes": 60,
  "steps": [
    {
      "id": "s1",
      "title": "Step title",
      "description": "Detailed description",
      "hint": "Helpful hint",
      "concepts": ["concepts"],
      "requires_response": true,
      "response_prompt": "What the learner should produce for this step",
      "checkpoint": false
    }
  ],
  "reference_material": "Key reference material and background info",
  "starter_language": "general",
  "deliverables": ["Final output"],
  "success_criteria": "How to know the project is complete"
}

RULES:
- Generate 6-8 specific, actionable steps
- Steps should build on each other progressively
- Each step should take 5-15 minutes
- Make the title creative and specific
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

    // Generate variant seed for anti-copy
    const variantSeed = generateVariantSeed(user.id, goalId, dayNumber)
    const variants = SKILL_VARIANTS[skillType] || SKILL_VARIANTS.coding
    const variant = variants[variantSeed % variants.length]

    const isBuildMode = mode === 'build'

    const prompt = buildPrompt(skillType, {
      goal,
      concepts: (conceptsCovered || []).join(', ') || 'Fundamentals',
      difficulty: difficulty || 'beginner',
      variant,
      isBuildMode,
    })

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
        max_tokens: 2500,
      }),
    })

    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content?.trim() || ''
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const parsed = JSON.parse(clean)

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
      progress: {
        steps_completed: [],
        notes: '',
        started_at: null,
        completed_at: null,
        code_submissions: {},
        response_submissions: {},
        checkpoint_results: {},
        time_tracking: {},
        hints_used: 0,
        ai_usage: {},
      },
      day_number: dayNumber || null,
    }

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
