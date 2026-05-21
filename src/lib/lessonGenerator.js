import { getOpenAIModel } from '@/lib/openaiModels'
import {
  deriveDepthPolicy,
  formatLearningContractForPrompt,
  getLessonDisplayFocus,
  normalizeLearnerProfile,
} from '@/lib/conceptLesson'
import { narrowConceptTopic, normalizeConceptSlideshowLesson } from '@/lib/conceptSlideshow'
import {
  buildDomainConfig,
  parseDomainFromConstraints,
  normalizeDomain,
} from '@/lib/domainAdapter'

function buildLessonError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

const STRING_ARRAY_SCHEMA = {
  type: 'array',
  items: { type: 'string' },
}

const NULLABLE_STRING_ARRAY_SCHEMA = {
  type: ['array', 'null'],
  items: { type: 'string' },
}

const CHECK_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'question',
    'options',
    'correctIndex',
    'explanation',
  ],
  properties: {
    question: { type: 'string' },
    options: STRING_ARRAY_SCHEMA,
    correctIndex: { type: 'integer' },
    explanation: { type: 'string' },
  },
}

const VISUAL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['type', 'title', 'caption', 'imagePrompt', 'nodes'],
  properties: {
	    type: {
	      type: 'string',
	      enum: ['none', 'diagram', 'flow', 'comparison', 'code_flow', 'variable_box', 'check_card', 'nested', 'system_flow'],
	    },
    title: { type: 'string' },
    caption: { type: 'string' },
    imagePrompt: { type: 'string' },
    nodes: {
      type: 'array',
      minItems: 0,
      maxItems: 5,
      items: { type: 'string' },
    },
  },
}

const DOMAIN_VISUAL_TYPES = [
  'code_output_visual',
  'free_body_diagram',
  'graph_visual',
  'equation_builder',
  'dialogue_builder',
  'email_threat_scan',
  'terminal_log_visual',
  'circuit_diagram',
  'anatomy_diagram',
  'chemistry_particle_visual',
  'portfolio_chart_visual',
  'design_canvas_visual',
  'timeline_builder',
  'map_interaction',
  'molecule_builder',
  'probability_visualizer',
  'ecosystem_simulator',
  'architecture_stack_visual',
  'audio_wave_visual',
  'music_pattern_builder',
  'grammar_tree_visual',
  'body_motion_visual',
  'business_strategy_visual',
  'logic_flow_visual',
  'storytelling_scene_visual',
  'ui_layout_visual',
  'ai_model_flow_visual',
]

const INTERACTION_PRIMITIVES = [
  'identify',
  'build',
  'predict',
  'trace',
  'fix',
  'manipulate',
  'compare',
]

const INTERACTIVE_DATA_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'code',
    'output',
    'highlightedLine',
    'objectLabel',
    'arrows',
    'xLabel',
    'yLabel',
    'points',
    'highlight',
    'target',
    'pieces',
    'scenario',
    'nativePrompt',
    'targetLanguage',
    'correctSentence',
    'wordTiles',
    'sender',
    'subject',
    'body',
    'redFlags',
    'logs',
    'suspiciousIndex',
    'components',
    'question',
    'answer',
    'choices',
    'system',
    'labels',
    'concept',
    'particles',
    'allocations',
    'insight',
    'issue',
    'before',
    'after',
    'explanation',
    'events',
    'regions',
    'route',
    'atoms',
    'bonds',
    'variableLabel',
    'min',
    'max',
    'value',
    'layers',
    'notes',
    'sentence',
    'muscleGroups',
    'strategies',
    'branches',
    'scenes',
    'modelNodes',
  ],
  properties: {
    code: { type: ['string', 'null'] },
    output: { type: ['string', 'null'] },
    highlightedLine: { type: ['integer', 'null'] },
    objectLabel: { type: ['string', 'null'] },
    arrows: {
      type: ['array', 'null'],
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['direction', 'label', 'correct'],
        properties: {
          direction: { type: 'string', enum: ['up', 'down', 'left', 'right'] },
          label: { type: 'string' },
          correct: { type: 'boolean' },
        },
      },
    },
    xLabel: { type: ['string', 'null'] },
    yLabel: { type: ['string', 'null'] },
    points: {
      type: ['array', 'null'],
      items: {
        type: 'array',
        minItems: 2,
        maxItems: 2,
        items: { type: 'number' },
      },
    },
    highlight: { type: ['string', 'null'] },
    target: { type: ['string', 'null'] },
    pieces: NULLABLE_STRING_ARRAY_SCHEMA,
    scenario: { type: ['string', 'null'] },
    nativePrompt: { type: ['string', 'null'] },
    targetLanguage: { type: ['string', 'null'] },
    correctSentence: { type: ['string', 'null'] },
    wordTiles: NULLABLE_STRING_ARRAY_SCHEMA,
    sender: { type: ['string', 'null'] },
    subject: { type: ['string', 'null'] },
    body: { type: ['string', 'null'] },
    redFlags: NULLABLE_STRING_ARRAY_SCHEMA,
    logs: NULLABLE_STRING_ARRAY_SCHEMA,
    suspiciousIndex: { type: ['integer', 'null'] },
    components: NULLABLE_STRING_ARRAY_SCHEMA,
    question: { type: ['string', 'null'] },
    answer: { type: ['string', 'null'] },
    choices: NULLABLE_STRING_ARRAY_SCHEMA,
    system: { type: ['string', 'null'] },
    labels: NULLABLE_STRING_ARRAY_SCHEMA,
    concept: { type: ['string', 'null'] },
    particles: {
      type: ['array', 'null'],
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'count'],
        properties: {
          label: { type: 'string' },
          count: { type: 'integer' },
        },
      },
    },
    allocations: {
      type: ['array', 'null'],
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'value'],
        properties: {
          label: { type: 'string' },
          value: { type: 'number' },
        },
      },
    },
    insight: { type: ['string', 'null'] },
    issue: { type: ['string', 'null'] },
    before: { type: ['string', 'null'] },
    after: { type: ['string', 'null'] },
    explanation: { type: ['string', 'null'] },
    events: NULLABLE_STRING_ARRAY_SCHEMA,
    regions: NULLABLE_STRING_ARRAY_SCHEMA,
    route: NULLABLE_STRING_ARRAY_SCHEMA,
    atoms: NULLABLE_STRING_ARRAY_SCHEMA,
    bonds: NULLABLE_STRING_ARRAY_SCHEMA,
    variableLabel: { type: ['string', 'null'] },
    min: { type: ['number', 'null'] },
    max: { type: ['number', 'null'] },
    value: { type: ['number', 'null'] },
    layers: NULLABLE_STRING_ARRAY_SCHEMA,
    notes: NULLABLE_STRING_ARRAY_SCHEMA,
    sentence: { type: ['string', 'null'] },
    muscleGroups: NULLABLE_STRING_ARRAY_SCHEMA,
    strategies: NULLABLE_STRING_ARRAY_SCHEMA,
    branches: NULLABLE_STRING_ARRAY_SCHEMA,
    scenes: NULLABLE_STRING_ARRAY_SCHEMA,
    modelNodes: NULLABLE_STRING_ARRAY_SCHEMA,
  },
}

const LESSON_RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'pathai_concept_slideshow',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['lessonDoc'],
      properties: {
        lessonDoc: {
          type: 'object',
          additionalProperties: false,
          required: [
            'id',
            'lessonType',
            'domain',
            'topic',
            'title',
            'estimatedMinutes',
            'xp',
            'worldId',
            'unitId',
            'conceptClusterId',
            'atomicConceptId',
            'zoneTheme',
            'mapColor',
            'specificityCheck',
            'slides',
          ],
          properties: {
            id: { type: 'string' },
            lessonType: { type: 'string', enum: ['concept_slideshow'] },
            domain: { type: 'string' },
            topic: { type: 'string' },
            title: { type: 'string' },
            estimatedMinutes: { type: 'integer' },
            xp: { type: 'integer' },
            worldId: { type: ['string', 'null'] },
            unitId: { type: ['string', 'null'] },
            conceptClusterId: { type: ['string', 'null'] },
            atomicConceptId: { type: ['string', 'null'] },
            zoneTheme: { type: ['string', 'null'] },
            mapColor: { type: ['string', 'null'] },
            specificityCheck: {
              type: 'object',
              additionalProperties: false,
              required: ['isSpecific', 'rejectedBroadTopic'],
              properties: {
                isSpecific: { type: 'boolean' },
                rejectedBroadTopic: { type: ['string', 'null'] },
              },
            },
            slides: {
              type: 'array',
              minItems: 4,
              maxItems: 8,
              items: {
                anyOf: [
                  {
                    type: 'object',
                    additionalProperties: false,
                    required: ['type', 'title', 'body', 'visual'],
                    properties: {
                      type: { type: 'string', enum: ['concept_intro'] },
                      title: { type: 'string' },
                      body: { type: 'string' },
                      visual: VISUAL_SCHEMA,
                    },
                  },
                  {
                    type: 'object',
                    additionalProperties: false,
                    required: ['type', 'title', 'code', 'explanation', 'visual'],
                    properties: {
                      type: { type: 'string', enum: ['example'] },
                      title: { type: 'string' },
                      code: { type: 'string' },
                      explanation: { type: 'string' },
                      visual: VISUAL_SCHEMA,
                    },
                  },
                  {
                    type: 'object',
                    additionalProperties: false,
                    required: ['type', 'title', 'domainVisualType', 'interactionPrimitive', 'data', 'prompt', 'correctAnswer', 'explanation'],
                    properties: {
                      type: { type: 'string', enum: ['visual_interactive'] },
                      title: { type: 'string' },
                      domainVisualType: { type: 'string', enum: DOMAIN_VISUAL_TYPES },
                      interactionPrimitive: { type: 'string', enum: INTERACTION_PRIMITIVES },
                      data: INTERACTIVE_DATA_SCHEMA,
                      prompt: { type: 'string' },
                      correctAnswer: { type: 'string' },
                      explanation: { type: 'string' },
                    },
                  },
                  {
                    type: 'object',
                    additionalProperties: false,
                    required: ['type', 'title', 'code', 'language', 'steps', 'visual'],
                    properties: {
                      type: { type: 'string', enum: ['code_breakdown'] },
                      title: { type: 'string' },
                      code: { type: 'string' },
                      language: { type: 'string' },
                      steps: {
                        type: 'array',
                        minItems: 1,
                        maxItems: 5,
                        items: {
                          type: 'object',
                          additionalProperties: false,
                          required: ['line', 'explanation'],
                          properties: {
                            line: { type: 'integer' },
                            explanation: { type: 'string' },
                          },
                        },
                      },
                      visual: VISUAL_SCHEMA,
                    },
                  },
                  {
                    type: 'object',
                    additionalProperties: false,
                    required: ['type', 'title', 'question', 'options', 'correctIndex', 'explanation', 'visual'],
                    properties: {
                      type: { type: 'string', enum: ['mini_check'] },
                      title: { type: 'string' },
                      question: { type: 'string' },
                      options: STRING_ARRAY_SCHEMA,
                      correctIndex: { type: 'integer' },
                      explanation: { type: 'string' },
                      visual: VISUAL_SCHEMA,
                    },
                  },
                  {
                    type: 'object',
                    additionalProperties: false,
                    required: ['type', 'title', 'question', 'options', 'correctIndex', 'explanation', 'redemptionQuestion', 'visual'],
                    properties: {
                      type: { type: 'string', enum: ['final_check'] },
                      title: { type: 'string' },
                      question: { type: 'string' },
                      options: STRING_ARRAY_SCHEMA,
                      correctIndex: { type: 'integer' },
                      explanation: { type: 'string' },
                      redemptionQuestion: CHECK_SCHEMA,
                      visual: VISUAL_SCHEMA,
                    },
                  },
                ],
              },
            },
          },
        },
      },
    },
  },
}

async function callOpenAI(prompt, openaiApiKey) {
  const model = getOpenAIModel('lesson')
  let response
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model,
        max_completion_tokens: 4000,
        response_format: LESSON_RESPONSE_FORMAT,
        messages: [
          {
            role: 'system',
            content: 'You output exactly one schema-valid JSON object. No markdown. No prose outside JSON.',
          },
          { role: 'user', content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(60000),
    })
  } catch (error) {
    throw buildLessonError('openai_request_failed', error?.message || 'OpenAI request failed')
  }

  if (!response.ok) {
    const errText = await response.text()
    throw buildLessonError('openai_http_error', `OpenAI lesson error: ${errText}`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content) throw buildLessonError('empty_openai_response', 'OpenAI returned an empty lesson')
  return content
}

function parseLessonJson(raw, context) {
  try {
    const parsed = JSON.parse(raw)
    return normalizeConceptSlideshowLesson(parsed?.lessonDoc || parsed, context)
  } catch (error) {
    throw buildLessonError('invalid_json', error?.message || 'Could not parse schema-locked lesson JSON')
  }
}

export async function generateLessonFromOpenAI({
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
  learnerProfile,
  domain = null,
  domainConfig = null,
  userLevel = null,
  xp = 0,
  depthOverride = null,
  visualPreference = null,
  openaiApiKey,
}) {
  if (!concept || !goal) throw buildLessonError('missing_inputs', 'Missing concept or goal')
  if (!openaiApiKey) throw buildLessonError('missing_api_key', 'Missing OPENAI_API_KEY')

  const rawProfile = learnerProfile || learningContract?.learnerProfile || {}
  const profile = normalizeLearnerProfile(
    rawProfile,
    { knowledge, goal },
  )
  const resolvedDomain = normalizeDomain(
    domain
      || learningContract?.domain
      || rawProfile?.domain
      || rawProfile?.domainConfig?.domain
      || parseDomainFromConstraints([knowledge, learningContract?.domainKnowledgeLine]),
    null,
  )
  const resolvedDomainConfig = resolvedDomain
    ? (domainConfig || learningContract?.domainConfig || rawProfile?.domainConfig || buildDomainConfig(resolvedDomain))
    : null
  const depthPolicy = deriveDepthPolicy(profile, depthOverride)
  const context = {
    concept,
    taskTitle,
    goal,
    knowledge,
    taskDescription,
    taskAction,
    taskOutcome,
    resourceUrl,
    resourceTitle,
    learnerProfile: profile,
    domain: resolvedDomain,
    domainConfig: resolvedDomainConfig,
    depthOverride,
    visualPreference: visualPreference || profile.visualPreference,
    learningContract: {
      ...(learningContract || {}),
      domain: resolvedDomain,
      domainConfig: resolvedDomainConfig,
      learnerProfile: profile,
      depthPolicy,
      visualPreference: visualPreference || profile.visualPreference,
      prerequisiteMode: learningContract?.prerequisiteMode || 'compressed',
    },
  }
  const displayFocus = getLessonDisplayFocus(context)
  const topicSpec = narrowConceptTopic(displayFocus, {
    ...context,
    domain: resolvedDomain,
    domainConfig: resolvedDomainConfig,
  })
  const exactTopic = topicSpec.topic
  const depthInstruction = depthPolicy.level === 'foundational'
    ? 'Use absolute beginner language. Define the topic directly before using it.'
    : depthPolicy.level === 'advanced'
      ? 'Keep definitions short, then test the non-obvious behavior.'
      : 'Teach the exact mechanic clearly with one tiny example.'

  const prompt = `You are a subject-matter expert teaching a specific concept for a premium learning app.

${resolvedDomain && resolvedDomainConfig ? `You are teaching a lesson on ${displayFocus} in the domain of ${resolvedDomain}.
Lesson tone: ${resolvedDomainConfig.lessonTone}
Use examples like: ${resolvedDomainConfig.exampleStyle}
The user is at level ${userLevel || rawProfile?.level || profile.level} with ${rawProfile?.xp ?? xp ?? 0} XP.
Adapt complexity accordingly.
` : ''}
GOAL: ${goal}
RAW TASK TITLE: ${taskTitle || concept}
RAW CONCEPT: ${concept}
EXACT LESSON TOPIC TO TEACH: ${exactTopic}
${topicSpec.specificityCheck.rejectedBroadTopic ? `REJECTED BROAD TOPIC: ${topicSpec.specificityCheck.rejectedBroadTopic}` : 'REJECTED BROAD TOPIC: none'}
${knowledge ? `PRIVATE LEARNER CONTEXT, DO NOT QUOTE: ${knowledge}` : 'PRIVATE LEARNER CONTEXT: beginner / assume very little'}
LEARNER PROFILE JSON, DO NOT QUOTE: ${JSON.stringify(profile)}
DEPTH INSTRUCTIONS: ${depthInstruction}
VISUAL PREFERENCE: ${visualPreference || profile.visualPreference || 'visual'}
${taskDescription ? `TASK DESCRIPTION: ${taskDescription}` : ''}
${taskAction ? `NEXT TASK HANDOFF: ${taskAction}` : ''}
${taskOutcome ? `TARGET OUTCOME: ${taskOutcome}` : ''}
${resourceTitle ? `PRIMARY RESOURCE: ${resourceTitle}${resourceUrl ? ` (${resourceUrl})` : ''}` : ''}

LEARNING CONTRACT:
${formatLearningContractForPrompt({ ...context.learningContract, dayFocus: exactTopic, conceptLabel: exactTopic })}

TODAY'S WIN CONDITION:
- Teach exactly one specific topic: ${exactTopic}
- The learner should finish able to say: "Today I learned exactly ${exactTopic}."
${resolvedDomainConfig?.workspaceType ? `- The follow-up practice workspace is ${resolvedDomainConfig.workspaceType}. Prepare the learner for that kind of action without turning the lesson into a generic quiz.` : ''}

Generate a full-screen concept slideshow lesson.

CONTENT RULES:
- Teach directly. Do not describe what the lesson will do.
- Assume the learner does not know any prerequisite unless it appears in KNOWN BEFORE TODAY or TAUGHT IN COMPLETED LESSONS.
- If a prerequisite is not in that boundary, define it briefly before using it, and do not turn it into a quiz target.
- mini_check and final_check questions may only ask about NEW CONCEPTS TODAY after the slideshow teaches them, plus concepts inside the ASSESSMENT BOUNDARY.
- Never ask about a future or adjacent concept just because it is related to ${exactTopic}.
- No broad titles. No "Introduction to", "Basics", "Fundamentals", "Control Flow", "Functions and Scope", "Variables and Data Types".
- Do not combine topics with "and".
- Do not title a lesson with learner-intent verbs. Never output titles like "What is understand Python basics" or "What is learn HTML".
- If the raw task says "understand/study/learn X", convert it into the exact teachable topic, such as "How an HTML document is structured" or "How to use print()".
- Do not create a mental_model slide or any analogy-only slide.
- Usually produce 6-7 slides. Allowed range is 4-8.
- Use only these slide types: concept_intro, example, visual_interactive, code_breakdown, mini_check, final_check.
- Slide 1 must be concept_intro and must define ${exactTopic} immediately.
- Include at least one visual_interactive slide when the domain has a useful visual pattern.
- Put the first visual_interactive slide after the example or soon after it.
- Include 2-3 mini_check slides.
- Last slide must be final_check and must include a redemptionQuestion.
- Every visual_interactive slide must include interactionPrimitive. Use one of: identify, build, predict, trace, fix, manipulate, compare.
- Pick the primitive by cognitive mechanic, not decoration: identify = click/select a target; build = assemble order; predict = predict outcome; trace = follow a flow; fix = repair a mistake; manipulate = change one variable; compare = choose between states.
- Keep every slide short. One idea per slide.
- For programming lessons, use runnable snippets and explain what each line does.
- For code questions, put the question first, then a blank line, then the code. Example: "What does this print?\n\nx = 4\nprint(x)".
- Every explanation must explain the topic itself, not why learning is useful.
- Every non-visual_interactive slide must include a visual object, but most should use type "none".
- Use diagrams only when they add a relationship, hierarchy, lifecycle, system boundary, cause/effect, role mapping, or data movement that is not already obvious from the text or code.
- Good diagrams: AI contains Machine Learning contains Deep Learning; client request goes to API/server, server uses database/service, response returns to client; HTML page hierarchy; CSS box-model layers; for "What is a variable?", variable_box labels the variable name, assignment operator, and stored value.
- Bad diagrams: restating a code line, "read / track / choose", generic concept maps, mental model labels, repeating answer choices, or showing the same thing the code block already shows.
- Use only none, diagram, flow, nested, system_flow, comparison, or variable_box. Prefer none for example, code_breakdown, mini_check, and final_check slides.
- visual.imagePrompt must be an empty string for now. PathAI is using diagrams only until image generation is added later.
- visual.nodes should contain the visible labels or steps in the diagram. Do not use vague labels like "foundation" or "journey".
- For variable_box, visual.nodes must be exactly ["variableName", "=", "value"], for example ["age", "=", "15"]. Never output ["age", "15", "value"].
- visual_interactive must directly teach ${exactTopic}; it is not a decorative image.
- visual_interactive.prompt must ask the learner to click, build, scan, or identify one specific thing.
- visual_interactive.correctAnswer must be the exact target interaction answer.
- visual_interactive.data is schema-strict: include every data key. For keys not used by the selected domainVisualType, use null. Do not invent unrelated filler data just to fill fields.
- Choose domainVisualType by domain:
  - programming: code_output_visual
  - physics: free_body_diagram or graph_visual
  - math: graph_visual or equation_builder
  - language: dialogue_builder
  - cybersecurity: email_threat_scan or terminal_log_visual
  - Arduino/electronics/engineering circuits: circuit_diagram
  - biology/health: anatomy_diagram
  - chemistry: chemistry_particle_visual or equation_builder
  - finance/business/economics: portfolio_chart_visual
  - design/art/UI/UX: design_canvas_visual
  - data science/statistics/ML: graph_visual
- Choose interactionPrimitive by topic:
  - programming: predict for output, trace for execution flow, fix for debugging, identify for code parts, build for ordering code
  - physics: identify force arrows, predict motion, manipulate sliders, trace force/motion flow
  - math: build equations, manipulate graphs, identify slope/intercepts, compare solutions
  - language: build sentences, identify grammar/meaning, fix sentence errors, compare phrasing
  - cybersecurity: identify red flags, trace attack flow, fix mitigations, compare safe vs unsafe
  - Arduino/electronics: identify components, trace current, predict circuit behavior, fix wiring
  - finance: compare portfolios, manipulate allocations, identify concentration risk
  - design: compare before/after, identify issues, fix layout
- Additional reusable visual types when relevant: timeline_builder, map_interaction, molecule_builder, probability_visualizer, ecosystem_simulator, architecture_stack_visual, audio_wave_visual, music_pattern_builder, grammar_tree_visual, body_motion_visual, business_strategy_visual, logic_flow_visual, storytelling_scene_visual, ui_layout_visual, ai_model_flow_visual.
- Good visual_interactive examples: slope -> graph_visual with rise/run points; gravity -> free_body_diagram with the downward arrow correct; phishing urgency -> email_threat_scan with urgency as a red flag; Spanish "I want" -> dialogue_builder with "quiero agua"; LED resistor -> circuit_diagram with resistor protection answer.
- Bad visual_interactive examples: generic icon, flag, planet image, vague "key idea" card, random chart unrelated to ${exactTopic}.
- visual_interactive data shape examples:
  - code_output_visual: data has code, output, highlightedLine
  - free_body_diagram: data has objectLabel and arrows [{ direction, label, correct }]
  - graph_visual: data has xLabel, yLabel, points, highlight
  - equation_builder: data has target, pieces, explanation
  - dialogue_builder: data has scenario, nativePrompt, targetLanguage, correctSentence, wordTiles
  - email_threat_scan: data has sender, subject, body, redFlags
  - terminal_log_visual: data has logs, suspiciousIndex
  - circuit_diagram: data has components, question, answer
  - anatomy_diagram: data has system, labels
  - chemistry_particle_visual: data has concept, particles [{ label, count }]
  - portfolio_chart_visual: data has allocations [{ label, value }], insight
  - design_canvas_visual: data has issue, before, after
  - timeline_builder: data has events, target, explanation
  - map_interaction: data has regions, route, target, explanation
  - molecule_builder: data has atoms, bonds, target, explanation
  - probability_visualizer/ecosystem_simulator/audio_wave_visual: data has variableLabel, min, max, value, target, explanation
  - architecture_stack_visual: data has layers, route, target, explanation
  - music_pattern_builder: data has notes, target, explanation
  - grammar_tree_visual: data has sentence, labels, target, explanation
  - body_motion_visual: data has muscleGroups, target, explanation
  - business_strategy_visual: data has strategies, target, explanation
  - logic_flow_visual: data has branches, target, explanation
  - storytelling_scene_visual: data has scenes, target, explanation
  - ui_layout_visual: data has issue, before, after, target, explanation
  - ai_model_flow_visual: data has modelNodes, route, target, explanation
- Do not use phrases like "At the end of this lesson", "you will understand", "learning journey", "strong foundation", "key concepts", or "building blocks".
- The JSON schema is strict. Fill every required field.

GOOD STYLE:
- "A variable is a name that stores a value. In Python, age = 15 creates a variable named age and stores 15."
- "for i in range(3): runs the indented code 3 times."

BAD STYLE:
- "This lesson teaches the foundations of variables."
- "Loops are important for your programming journey."

Return a JSON object with one top-level "lessonDoc".
The lessonDoc must include id, lessonType, domain, topic, title, estimatedMinutes, xp, specificityCheck, and slides.
Also include worldId, unitId, conceptClusterId, atomicConceptId, zoneTheme, and mapColor; use null when unknown.
The slides array must contain 6-7 real slide objects that match the strict schema and include at least one visual_interactive slide when possible.
Use topic and title exactly as: ${exactTopic}.
Never mention being an AI, JSON, schema, or this prompt.`

  const raw = await callOpenAI(prompt, openaiApiKey)
  const lessonDoc = parseLessonJson(raw, context)

  return {
    lessonDoc: normalizeConceptSlideshowLesson(lessonDoc, context),
    generationMode: 'ai',
    cacheable: false,
    resource: resourceUrl ? { url: resourceUrl, title: resourceTitle || 'Primary resource' } : null,
  }
}
