import 'server-only'
import { getOpenAIModel } from '@/lib/openaiModels'
import { componentParamSchemas } from '@/components/library/schemas'
import { validateAgainstSchema } from '@/components/library/schemaValidator'
import {
  CONCEPT_EXPLAINER_RESPONSE_FORMAT,
  buildConceptExplainerPrompt,
} from '@/lib/prompts/components/conceptExplainer_v1'
import {
  MULTIPLE_CHOICE_QUIZ_RESPONSE_FORMAT,
  buildMultipleChoiceQuizPrompt,
} from '@/lib/prompts/components/multipleChoiceQuiz_v1'
import {
  FLASHCARD_DRILL_RESPONSE_FORMAT,
  buildFlashcardDrillPrompt,
} from '@/lib/prompts/components/flashcardDrill_v1'
import {
  WORKED_EXAMPLE_RESPONSE_FORMAT,
  buildWorkedExamplePrompt,
} from '@/lib/prompts/components/workedExample_v1'
import {
  FREE_RESPONSE_RESPONSE_FORMAT,
  buildFreeResponsePrompt,
} from '@/lib/prompts/components/freeResponse_v1'
import {
  CODE_PREDICTOR_RESPONSE_FORMAT,
  buildCodePredictorFallback,
  buildCodePredictorPrompt,
  detectGeneratedCodeLanguage,
  detectRequestedCodeLanguage,
} from '@/lib/prompts/components/codePredictor_v1'
import { EXPANSION_COMPONENT_GENERATORS } from '@/lib/prompts/components/expansionComponents_v1'

export const COMPONENT_GENERATORS = Object.freeze({
  concept_explainer: {
    responseFormat: CONCEPT_EXPLAINER_RESPONSE_FORMAT,
    buildPrompt: buildConceptExplainerPrompt,
  },
  multiple_choice_quiz: {
    responseFormat: MULTIPLE_CHOICE_QUIZ_RESPONSE_FORMAT,
    buildPrompt: buildMultipleChoiceQuizPrompt,
  },
  flashcard_drill: {
    responseFormat: FLASHCARD_DRILL_RESPONSE_FORMAT,
    buildPrompt: buildFlashcardDrillPrompt,
  },
  worked_example: {
    responseFormat: WORKED_EXAMPLE_RESPONSE_FORMAT,
    buildPrompt: buildWorkedExamplePrompt,
  },
  free_response: {
    responseFormat: FREE_RESPONSE_RESPONSE_FORMAT,
    buildPrompt: buildFreeResponsePrompt,
  },
  code_predictor: {
    responseFormat: CODE_PREDICTOR_RESPONSE_FORMAT,
    buildPrompt: buildCodePredictorPrompt,
  },
  ...EXPANSION_COMPONENT_GENERATORS,
})

function collectCorrectIndexErrors(value, path) {
  const errors = []
  if (Array.isArray(value)) {
    value.forEach((item, index) => errors.push(...collectCorrectIndexErrors(item, `${path}[${index}]`)))
    return errors
  }
  if (!value || typeof value !== 'object') return errors
  if (Array.isArray(value.options) && Number.isInteger(value.correctIndex) && value.correctIndex >= value.options.length) {
    errors.push(`${path}.correctIndex must point to an existing option.`)
  }
  Object.entries(value).forEach(([key, nextValue]) => {
    errors.push(...collectCorrectIndexErrors(nextValue, `${path}.${key}`))
  })
  return errors
}

export function validateGeneratedParams(componentType, params) {
  const schema = componentParamSchemas[componentType]
  if (!schema) return { ok: false, errors: [`No params schema for ${componentType}.`] }

  const validation = validateAgainstSchema(schema, params, `${componentType}.params`)
  const errors = [...validation.errors, ...collectCorrectIndexErrors(params, `${componentType}.params`)]
  return { ok: errors.length === 0, errors }
}

function formatConcept(concept) {
  if (!concept || typeof concept !== 'object') return String(concept || 'the current concept').trim()
  return [
    concept.label || concept.id || 'the current concept',
    concept.description ? `Description: ${concept.description}` : null,
    Number.isFinite(Number(concept.difficulty)) ? `Difficulty: ${concept.difficulty}` : null,
  ].filter(Boolean).join('\n')
}

function summarizeLearnerState(learnerState = {}, conceptId = null) {
  const mastery = conceptId ? learnerState?.knowledge?.[conceptId] : null
  if (!mastery) return 'No prior learner-state signal for this concept yet.'
  return `Current mastery: ${Number(mastery.mastery || 0).toFixed(2)}; confidence: ${Number(mastery.confidence || 0).toFixed(2)}.`
}

function buildPromptInput({ concept, learnerState, goalText, validationFeedback }) {
  const conceptText = formatConcept(concept)
  const learnerContext = summarizeLearnerState(learnerState, concept?.id || null)
  const feedback = validationFeedback ? `\nValidation feedback: ${validationFeedback}` : ''
  return {
    concept: `${conceptText}\nLearner context: ${learnerContext}${feedback}`,
    goalText,
    validationFeedback,
  }
}

async function requestParams({ componentType, concept, learnerState, goalText, validationFeedback = '' }) {
  if (!process.env.OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY.')
  const generator = COMPONENT_GENERATORS[componentType]
  if (!generator) throw new Error(`No generator registered for ${componentType}.`)

  const promptInput = buildPromptInput({ concept, learnerState, goalText, validationFeedback })
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: getOpenAIModel('componentGenerator'),
      max_completion_tokens: 1600,
      response_format: generator.responseFormat,
      messages: [
        { role: 'system', content: 'You return exactly one schema-valid JSON object. No markdown.' },
        { role: 'user', content: generator.buildPrompt(promptInput) },
      ],
    }),
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw new Error(message || `OpenAI returned ${response.status}.`)
  }

  const payload = await response.json()
  const raw = payload?.choices?.[0]?.message?.content
  if (!raw) throw new Error('OpenAI returned an empty component payload.')
  return JSON.parse(raw)
}

async function requestCodePredictorParams({ concept, learnerState, goalText }) {
  const conceptText = formatConcept(concept)
  const requestedLanguage = detectRequestedCodeLanguage(conceptText)
  const firstParams = await requestParams({ componentType: 'code_predictor', concept, learnerState, goalText })
  const firstDetectedLanguage = detectGeneratedCodeLanguage(firstParams)

  if (!requestedLanguage || firstDetectedLanguage === requestedLanguage) {
    return firstParams
  }

  const validationFeedback = [
    `Validation failed: concept requested ${requestedLanguage}, but the generated code appears to be ${firstDetectedLanguage || 'unknown'}.`,
    `Regenerate using ${requestedLanguage} code only. Keep the snippet tiny and beginner-safe.`,
  ].join(' ')

  const secondParams = await requestParams({
    componentType: 'code_predictor',
    concept,
    learnerState,
    goalText,
    validationFeedback,
  })
  const secondDetectedLanguage = detectGeneratedCodeLanguage(secondParams)

  if (secondDetectedLanguage === requestedLanguage) {
    return secondParams
  }

  return buildCodePredictorFallback({ concept: conceptText, requestedLanguage })
}

export function buildFallbackComponentParams(componentType, concept = {}) {
  const label = concept?.label || String(concept || 'the concept')
  switch (componentType) {
    case 'multiple_choice_quiz':
      return {
        question: `What is the main idea behind ${label}?`,
        options: [
          `Understanding how ${label} works`,
          `Ignoring ${label} until later`,
          `Memorizing a definition without using it`,
        ],
        correctIndex: 0,
        explanation: `The useful first step is to understand how ${label} works and when to use it.`,
      }
    case 'flashcard_drill':
      return {
        cards: [
          { front: `What is ${label}?`, back: `${label} is the concept you are practicing in this mission.` },
          { front: `Why practice ${label}?`, back: `Practice helps you connect the idea to actual use.` },
          { front: `What should you do next?`, back: `Explain the idea in your own words, then try a small example.` },
        ],
      }
    case 'worked_example':
      return {
        problem: `Work through a simple example involving ${label}.`,
        steps: [
          `Identify what ${label} is asking you to notice.`,
          `Apply the core rule or idea one small step at a time.`,
          `Check whether the result matches the original goal.`,
        ],
        answer: `A completed example that uses ${label} correctly.`,
        whyItWorks: `Breaking ${label} into small steps keeps the reasoning visible.`,
      }
    case 'free_response':
      return {
        prompt: `Explain ${label} in 1-3 sentences, using your own words.`,
        rubricCriteria: [
          `Names the core idea of ${label}`,
          'Includes one concrete example or use case',
        ],
      }
    case 'code_predictor':
      return buildCodePredictorFallback({ concept: label })
    case 'code_sandbox':
      return {
        title: `Try ${label}`,
        instructions: `Edit the starter code to show the smallest useful example of ${label}.`,
        language: 'javascript',
        starterCode: 'const value = 1;\nconsole.log(value);',
        expectedBehavior: `The code should demonstrate ${label} in a visible way.`,
        hints: ['Keep the example small.', 'Print or display the final result.'],
      }
    case 'code_debugger':
      return {
        title: `Debug ${label}`,
        task: `Find and fix the bug in this tiny ${label} example.`,
        language: 'javascript',
        buggyCode: 'const total = 1;\ntotal = total + 1;\nconsole.log(total);',
        expectedFix: 'Use let for a variable that changes, or avoid reassignment.',
        hints: ['Look for a line that changes a value.', 'Check whether the variable declaration allows that change.'],
      }
    case 'audio_listen':
      return {
        title: `Listen for ${label}`,
        transcript: `${label} means noticing the important detail and choosing the best response.`,
        prompt: `Which detail best matches ${label}?`,
        options: [`The detail about ${label}`, 'An unrelated detail', 'A repeated filler phrase'],
        correctIndex: 0,
        explanation: `The transcript directly describes ${label}.`,
      }
    case 'audio_speak':
      return {
        title: `Say ${label}`,
        phrase: `I can explain ${label} clearly.`,
        pronunciationTips: ['Say it slowly once.', 'Repeat the phrase with natural rhythm.'],
        rubricCriteria: ['Clear enough to understand', 'Uses the key concept accurately'],
      }
    case 'image_identify':
      return {
        title: `Identify ${label}`,
        imageDescription: `A clean educational visual showing the main parts of ${label}.`,
        question: `Which part best represents ${label}?`,
        options: [`The highlighted ${label}`, 'The background decoration', 'An unrelated label'],
        correctIndex: 0,
        explanation: `The highlighted part is the one connected to ${label}.`,
      }
    case 'drag_match':
      return {
        title: `Match ${label}`,
        instructions: `Match each ${label} prompt to its best partner.`,
        pairs: [
          { prompt: 'Definition', match: `What ${label} means` },
          { prompt: 'Example', match: `A real use of ${label}` },
          { prompt: 'Mistake', match: `A common confusion about ${label}` },
        ],
      }
    case 'order_steps':
      return {
        title: `Order ${label}`,
        instruction: `Put the ${label} process in a sensible order.`,
        steps: ['Notice the goal', 'Apply the main rule', 'Check the result'],
      }
    case 'timed_problem_set':
      return {
        title: `${label} speed check`,
        timeLimitSeconds: 180,
        problems: [
          { question: `Name the core idea of ${label}.`, answer: label, explanation: `The core idea is ${label}.` },
          { question: `What should you do after learning ${label}?`, answer: 'practice', explanation: 'A small practice attempt turns the idea into skill.' },
        ],
      }
    case 'roleplay_scenario':
      return {
        title: `Use ${label} in context`,
        scenario: `A partner asks you to explain ${label} simply.`,
        learnerRole: 'Learner explaining the concept',
        botRole: 'Curious partner',
        openingLine: `Can you explain ${label} without jargon?`,
        successCriteria: ['Answers directly', 'Uses one concrete example'],
      }
    case 'case_study_analyze':
      return {
        title: `${label} case study`,
        caseText: `A learner tries to use ${label} in a small task and gets stuck at the first decision.`,
        questions: ['What decision matters most?', 'What should they try next?'],
        keyTakeaway: `Use ${label} by identifying the next small action.`,
      }
    case 'reflection_prompt':
      return {
        title: `Reflect on ${label}`,
        prompt: `Where could you use ${label} in your own learning goal?`,
        sentenceStarters: [`I would use ${label} when...`, 'One thing that still feels unclear is...'],
      }
    case 'do_in_real_world':
      return {
        title: `Try ${label} for real`,
        task: `Find one tiny real-world place where ${label} appears and describe it.`,
        steps: ['Pick a simple example', 'Notice the relevant detail', 'Write one sentence about it'],
        evidencePrompt: `What did you notice about ${label}?`,
        safetyNote: '',
      }
    case 'mock_exam':
      return {
        title: `${label} mock exam`,
        timeLimitMinutes: 5,
        questions: [
          {
            question: `What is the best first step for ${label}?`,
            options: ['Identify the core idea', 'Ignore the context', 'Memorize unrelated details'],
            correctIndex: 0,
            explanation: 'Start by identifying the core idea.',
          },
          {
            question: `What proves you understand ${label}?`,
            options: ['Using it in a small example', 'Only rereading it', 'Skipping practice'],
            correctIndex: 0,
            explanation: 'A small example shows usable understanding.',
          },
        ],
      }
    case 'concept_map_build':
      return {
        title: `Map ${label}`,
        centralConcept: label,
        concepts: ['definition', 'example', 'common mistake'],
        relationshipPrompts: [`Connect ${label} to its definition.`, `Connect ${label} to one useful example.`],
      }
    case 'concept_explainer':
    default:
      return {
        title: label,
        paragraphs: [
          `${label} is one of the ideas this mission is helping you build.`,
          'Focus on the smallest useful version first: what it means, when it appears, and how you can recognize it.',
        ],
        keyTakeaway: `Learn ${label} by explaining it simply and applying it once.`,
      }
  }
}

export async function generateComponentParams({
  componentType,
  concept,
  learnerState,
  goalText,
  allowFallback = true,
} = {}) {
  let params
  try {
    params = componentType === 'code_predictor'
      ? await requestCodePredictorParams({ concept, learnerState, goalText })
      : await requestParams({ componentType, concept, learnerState, goalText })

    const validation = validateGeneratedParams(componentType, params)
    if (!validation.ok) {
      throw new Error(`Generated params failed schema validation: ${validation.errors.join('; ')}`)
    }
    return {
      params,
      model: getOpenAIModel('componentGenerator'),
      fallback: false,
    }
  } catch (error) {
    if (!allowFallback) throw error
    params = buildFallbackComponentParams(componentType, concept)
    return {
      params,
      model: getOpenAIModel('componentGenerator'),
      fallback: true,
      failureReason: error?.message || 'component_generation_failed',
    }
  }
}
