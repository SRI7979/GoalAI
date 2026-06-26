import 'server-only'
import { getOpenAIModel } from '@/lib/openaiModels'
import {
  DYNAMIC_DIAGRAM_RESPONSE_FORMAT,
  buildDynamicDiagramPrompt,
} from '@/lib/prompts/components/dynamicDiagram_v1'
import {
  compactDiagramPayload,
  conceptIdFromText,
  validateDynamicDiagramResponse,
} from '@/lib/dynamicDiagramSafety'

export function buildFallbackDiagram({ concept = 'this concept', reason = 'diagram_generation_failed' } = {}) {
  const title = String(concept || 'Key concept').slice(0, 120)
  return {
    tier: 'none',
    reason,
    title,
    fallbackText: `The key idea: ${title} can still be understood by focusing on the main relationships and sequence in words.`,
  }
}

function buildCodingDomainDiagram(concept = '') {
  const text = String(concept || '').toLowerCase()
  if (/(trace|step|execute|run).*(for[- ]?loop|loop|code)|for[- ]?loop.*step/.test(text)) {
    return {
      tier: 'structured',
      diagramType: 'code_execution',
      title: 'Tracing a Python for-loop',
      fallbackText: 'A loop updates its variable each pass, runs the body, and accumulates any output or state changes.',
      data: {
        caption: 'Line-by-line execution with changing variables.',
        language: 'python',
        code: 'total = 0\nfor n in [1, 2, 3]:\n    total = total + n\n    print(total)',
        steps: [
          { line: 1, variables: { total: 0 }, output: '', explanation: 'total starts at 0 before the loop begins.' },
          { line: 2, variables: { total: 0, n: 1 }, output: '', explanation: 'The loop assigns the first list item to n.' },
          { line: 3, variables: { total: 1, n: 1 }, output: '', explanation: 'The current n is added into total.' },
          { line: 4, variables: { total: 1, n: 1 }, output: '1', explanation: 'The program prints the updated total.' },
          { line: 2, variables: { total: 1, n: 2 }, output: '1', explanation: 'The loop advances to the next list item.' },
          { line: 3, variables: { total: 3, n: 2 }, output: '1', explanation: 'The second value is added into total.' },
          { line: 4, variables: { total: 3, n: 2 }, output: '3', explanation: 'The new total is printed.' },
        ],
      },
    }
  }

  if (/(plot|graph).*(x\s*(squared|\^2)|x\s*\*\s*x|y\s*=)|y\s*=\s*x/.test(text)) {
    return {
      tier: 'structured',
      diagramType: 'equation_plot',
      title: 'Plot of y = x^2',
      fallbackText: 'The equation y = x^2 forms a parabola: values farther from zero grow upward symmetrically.',
      data: {
        caption: 'A basic quadratic curve.',
        equation: 'y = x^2',
        plotType: 'function',
        plotData: { expression: 'x*x', minX: -5, maxX: 5 },
        annotations: [{ x: 0, y: 0, label: 'vertex' }],
      },
    }
  }

  if (/bubble\s*sort|sort.*array|array.*sort/.test(text)) {
    return {
      tier: 'structured',
      diagramType: 'algorithm_step',
      title: 'Bubble sort step-through',
      fallbackText: 'Bubble sort repeatedly compares neighboring values and swaps them when they are out of order.',
      data: {
        caption: 'Comparisons and swaps move larger values to the right.',
        dataStructure: 'array',
        initialState: [5, 1, 4, 2],
        pseudocode: [
          'repeat passes through the array',
          'compare adjacent items',
          'swap if left item is larger',
          'stop when no swaps remain',
        ],
        steps: [
          { state: [5, 1, 4, 2], highlight: { nodeIds: ['0', '1'], operation: 'compare 5 and 1' }, pseudocodeLine: 2, caption: 'Compare the first pair.' },
          { state: [1, 5, 4, 2], highlight: { nodeIds: ['0', '1'], operation: 'swap' }, pseudocodeLine: 3, caption: 'Swap because 5 is greater than 1.' },
          { state: [1, 5, 4, 2], highlight: { nodeIds: ['1', '2'], operation: 'compare 5 and 4' }, pseudocodeLine: 2, caption: 'Move to the next adjacent pair.' },
          { state: [1, 4, 5, 2], highlight: { nodeIds: ['1', '2'], operation: 'swap' }, pseudocodeLine: 3, caption: 'Swap to keep smaller values left.' },
          { state: [1, 4, 2, 5], highlight: { nodeIds: ['2', '3'], operation: 'swap' }, pseudocodeLine: 3, caption: 'The largest value has bubbled to the end.' },
        ],
      },
    }
  }

  return null
}

async function requestDynamicDiagram({ concept, contextSnippet, learnerState, validationFeedback = '' }) {
  if (!process.env.OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY.')
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: getOpenAIModel('dynamicDiagram'),
      max_completion_tokens: 2400,
      response_format: DYNAMIC_DIAGRAM_RESPONSE_FORMAT,
      messages: [
        { role: 'system', content: 'You create safe educational diagram payloads. Return only schema-valid JSON.' },
        { role: 'user', content: buildDynamicDiagramPrompt({ concept, contextSnippet, learnerState, validationFeedback }) },
      ],
    }),
    signal: AbortSignal.timeout(45000),
  })

  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw new Error(message || `OpenAI returned ${response.status}.`)
  }

  const payload = await response.json()
  const raw = payload?.choices?.[0]?.message?.content
  if (!raw) throw new Error('OpenAI returned an empty dynamic diagram payload.')
  return JSON.parse(raw)
}

export async function generateDynamicDiagram({ concept, contextSnippet = '', learnerState = null } = {}) {
  const startedAt = Date.now()
  const model = getOpenAIModel('dynamicDiagram')
  let raw = null
  try {
    const codingDiagram = buildCodingDomainDiagram(concept)
    if (codingDiagram) {
      const validation = validateDynamicDiagramResponse(codingDiagram)
      if (!validation.ok) throw new Error(validation.error)
      return {
        params: compactDiagramPayload(validation.params),
        raw: codingDiagram,
        model: 'deterministic-coding-router',
        ms: Date.now() - startedAt,
        success: true,
        failureReason: null,
        conceptId: conceptIdFromText(concept),
        tierChoiceReason: 'Matched a coding-domain renderer pattern.',
      }
    }

    raw = await requestDynamicDiagram({ concept, contextSnippet, learnerState })
    let validation = validateDynamicDiagramResponse(raw)
    if (!validation.ok) {
      const validationFeedback = [
        `Validation failed: ${validation.error}`,
        'Regenerate once. Preserve the requested tier when appropriate, but fill the required data fields for that tier.',
      ].join(' ')
      raw = await requestDynamicDiagram({ concept, contextSnippet, learnerState, validationFeedback })
      validation = validateDynamicDiagramResponse(raw)
    }
    if (!validation.ok) throw new Error(validation.error)
    return {
      params: compactDiagramPayload(validation.params),
      raw,
      model,
      ms: Date.now() - startedAt,
      success: validation.params.tier !== 'none',
      failureReason: validation.params.tier === 'none' ? validation.params.reason : null,
      conceptId: conceptIdFromText(concept),
      tierChoiceReason: raw.tierChoiceReason || '',
    }
  } catch (error) {
    const fallback = buildFallbackDiagram({ concept, reason: error?.message || 'diagram_generation_failed' })
    return {
      params: fallback,
      raw,
      model,
      ms: Date.now() - startedAt,
      success: false,
      failureReason: fallback.reason,
      conceptId: conceptIdFromText(concept),
      tierChoiceReason: '',
    }
  }
}
