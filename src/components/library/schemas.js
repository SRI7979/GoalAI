import { validateAgainstSchema } from './schemaValidator.js'

export const CORE_COMPONENT_TYPES = Object.freeze([
  'concept_explainer',
  'multiple_choice_quiz',
  'flashcard_drill',
  'worked_example',
  'free_response',
  'code_predictor',
  'dynamic_diagram',
  'code_sandbox',
  'code_debugger',
  'audio_listen',
  'audio_speak',
  'image_identify',
  'drag_match',
  'order_steps',
  'timed_problem_set',
  'roleplay_scenario',
  'case_study_analyze',
  'reflection_prompt',
  'do_in_real_world',
  'mock_exam',
  'concept_map_build',
])

const stringArray = (minItems = 1, maxItems = 12) => ({
  type: 'array',
  minItems,
  maxItems,
  items: { type: 'string', minLength: 1 },
})

export const componentSignalSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'componentType',
    'conceptIds',
    'correct',
    'confidence',
    'hesitationMs',
    'totalMs',
    'hintsUsed',
    'attempts',
  ],
  properties: {
    componentType: { type: 'string', enum: CORE_COMPONENT_TYPES },
    conceptIds: stringArray(0, 20),
    correct: { anyOf: [{ type: 'boolean' }, { type: 'null' }] },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    hesitationMs: { type: 'integer', minimum: 0 },
    totalMs: { type: 'integer', minimum: 0 },
    hintsUsed: { type: 'integer', minimum: 0 },
    attempts: { type: 'integer', minimum: 0 },
    rawResponse: {},
  },
}

export const conceptExplainerParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'paragraphs', 'keyTakeaway'],
  properties: {
    title: { type: 'string', minLength: 1 },
    paragraphs: stringArray(2, 4),
    keyTakeaway: { type: 'string', minLength: 1 },
  },
}

export const multipleChoiceQuizParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['question', 'options', 'correctIndex', 'explanation'],
  properties: {
    question: { type: 'string', minLength: 1 },
    options: stringArray(3, 5),
    correctIndex: { type: 'integer', minimum: 0, maximum: 4 },
    explanation: { type: 'string', minLength: 1 },
  },
}

export const flashcardDrillParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['cards'],
  properties: {
    cards: {
      type: 'array',
      minItems: 3,
      maxItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['front', 'back'],
        properties: {
          front: { type: 'string', minLength: 1 },
          back: { type: 'string', minLength: 1 },
        },
      },
    },
  },
}

export const workedExampleParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['problem', 'steps', 'answer', 'whyItWorks'],
  properties: {
    problem: { type: 'string', minLength: 1 },
    steps: stringArray(2, 8),
    answer: { type: 'string', minLength: 1 },
    whyItWorks: { type: 'string', minLength: 1 },
  },
}

export const freeResponseParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['prompt', 'rubricCriteria'],
  properties: {
    prompt: { type: 'string', minLength: 1 },
    rubricCriteria: stringArray(2, 5),
  },
}

export const codePredictorParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['code', 'language', 'question', 'options', 'correctIndex', 'explanation'],
  properties: {
    code: { type: 'string', minLength: 1 },
    language: { type: 'string', minLength: 1 },
    question: { type: 'string', minLength: 1 },
    options: stringArray(3, 5),
    correctIndex: { type: 'integer', minimum: 0, maximum: 4 },
    explanation: { type: 'string', minLength: 1 },
  },
}

const optionalStringArray = (minItems = 0, maxItems = 8) => ({
  type: 'array',
  minItems,
  maxItems,
  items: { type: 'string', minLength: 1 },
})

const p6ChoiceQuestionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['question', 'options', 'correctIndex', 'explanation'],
  properties: {
    question: { type: 'string', minLength: 1 },
    options: stringArray(3, 5),
    correctIndex: { type: 'integer', minimum: 0, maximum: 4 },
    explanation: { type: 'string', minLength: 1 },
  },
}

export const codeSandboxParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'instructions', 'language', 'starterCode', 'expectedBehavior', 'hints'],
  properties: {
    title: { type: 'string', minLength: 1 },
    instructions: { type: 'string', minLength: 1 },
    language: { type: 'string', minLength: 1 },
    starterCode: { type: 'string', minLength: 1 },
    expectedBehavior: { type: 'string', minLength: 1 },
    hints: optionalStringArray(0, 5),
  },
}

export const codeDebuggerParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'task', 'language', 'buggyCode', 'expectedFix', 'hints'],
  properties: {
    title: { type: 'string', minLength: 1 },
    task: { type: 'string', minLength: 1 },
    language: { type: 'string', minLength: 1 },
    buggyCode: { type: 'string', minLength: 1 },
    expectedFix: { type: 'string', minLength: 1 },
    hints: optionalStringArray(0, 5),
  },
}

export const audioListenParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'transcript', 'prompt', 'options', 'correctIndex', 'explanation'],
  properties: {
    title: { type: 'string', minLength: 1 },
    transcript: { type: 'string', minLength: 1 },
    prompt: { type: 'string', minLength: 1 },
    options: stringArray(3, 5),
    correctIndex: { type: 'integer', minimum: 0, maximum: 4 },
    explanation: { type: 'string', minLength: 1 },
  },
}

export const audioSpeakParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'phrase', 'pronunciationTips', 'rubricCriteria'],
  properties: {
    title: { type: 'string', minLength: 1 },
    phrase: { type: 'string', minLength: 1 },
    pronunciationTips: stringArray(1, 5),
    rubricCriteria: stringArray(1, 5),
  },
}

export const imageIdentifyParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'imageDescription', 'question', 'options', 'correctIndex', 'explanation'],
  properties: {
    title: { type: 'string', minLength: 1 },
    imageDescription: { type: 'string', minLength: 1 },
    question: { type: 'string', minLength: 1 },
    options: stringArray(3, 5),
    correctIndex: { type: 'integer', minimum: 0, maximum: 4 },
    explanation: { type: 'string', minLength: 1 },
  },
}

export const dragMatchParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'instructions', 'pairs'],
  properties: {
    title: { type: 'string', minLength: 1 },
    instructions: { type: 'string', minLength: 1 },
    pairs: {
      type: 'array',
      minItems: 3,
      maxItems: 6,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['prompt', 'match'],
        properties: {
          prompt: { type: 'string', minLength: 1 },
          match: { type: 'string', minLength: 1 },
        },
      },
    },
  },
}

export const orderStepsParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'instruction', 'steps'],
  properties: {
    title: { type: 'string', minLength: 1 },
    instruction: { type: 'string', minLength: 1 },
    steps: stringArray(3, 8),
  },
}

export const timedProblemSetParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'timeLimitSeconds', 'problems'],
  properties: {
    title: { type: 'string', minLength: 1 },
    timeLimitSeconds: { type: 'integer', minimum: 30, maximum: 1800 },
    problems: {
      type: 'array',
      minItems: 2,
      maxItems: 6,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['question', 'answer', 'explanation'],
        properties: {
          question: { type: 'string', minLength: 1 },
          answer: { type: 'string', minLength: 1 },
          explanation: { type: 'string', minLength: 1 },
        },
      },
    },
  },
}

export const roleplayScenarioParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'scenario', 'learnerRole', 'botRole', 'openingLine', 'successCriteria'],
  properties: {
    title: { type: 'string', minLength: 1 },
    scenario: { type: 'string', minLength: 1 },
    learnerRole: { type: 'string', minLength: 1 },
    botRole: { type: 'string', minLength: 1 },
    openingLine: { type: 'string', minLength: 1 },
    successCriteria: stringArray(2, 5),
  },
}

export const caseStudyAnalyzeParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'caseText', 'questions', 'keyTakeaway'],
  properties: {
    title: { type: 'string', minLength: 1 },
    caseText: { type: 'string', minLength: 1 },
    questions: stringArray(2, 5),
    keyTakeaway: { type: 'string', minLength: 1 },
  },
}

export const reflectionPromptParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'prompt', 'sentenceStarters'],
  properties: {
    title: { type: 'string', minLength: 1 },
    prompt: { type: 'string', minLength: 1 },
    sentenceStarters: stringArray(2, 5),
  },
}

export const doInRealWorldParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'task', 'steps', 'evidencePrompt', 'safetyNote'],
  properties: {
    title: { type: 'string', minLength: 1 },
    task: { type: 'string', minLength: 1 },
    steps: stringArray(2, 6),
    evidencePrompt: { type: 'string', minLength: 1 },
    safetyNote: { type: 'string', minLength: 0 },
  },
}

export const mockExamParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'timeLimitMinutes', 'questions'],
  properties: {
    title: { type: 'string', minLength: 1 },
    timeLimitMinutes: { type: 'integer', minimum: 1, maximum: 120 },
    questions: {
      type: 'array',
      minItems: 2,
      maxItems: 8,
      items: p6ChoiceQuestionSchema,
    },
  },
}

export const conceptMapBuildParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'centralConcept', 'concepts', 'relationshipPrompts'],
  properties: {
    title: { type: 'string', minLength: 1 },
    centralConcept: { type: 'string', minLength: 1 },
    concepts: stringArray(3, 8),
    relationshipPrompts: stringArray(2, 6),
  },
}

export const STRUCTURED_DIAGRAM_TYPES = Object.freeze([
  'flowchart',
  'hierarchy',
  'comparison',
  'timeline',
  'cycle',
  'layered_stack',
  'quadrant',
  'network',
  'equation_breakdown',
  'annotated_callouts',
  'code_execution',
  'equation_plot',
  'algorithm_step',
])

const optionalCaption = { type: 'string', minLength: 0, maxLength: 500 }
const diagramId = { type: 'string', minLength: 1, maxLength: 80 }
const diagramLabel = { type: 'string', minLength: 1, maxLength: 140 }
const diagramDescription = { type: 'string', minLength: 0, maxLength: 500 }

const diagramNodeSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'label'],
  properties: {
    id: diagramId,
    label: diagramLabel,
    description: diagramDescription,
  },
}

const diagramEdgeSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['from', 'to'],
  properties: {
    from: diagramId,
    to: diagramId,
    label: { type: 'string', minLength: 0, maxLength: 140 },
    description: diagramDescription,
  },
}

const hierarchyNodeSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'label', 'children'],
  properties: {
    id: diagramId,
    label: diagramLabel,
    description: diagramDescription,
    children: { type: 'array', maxItems: 10, items: {} },
  },
}
hierarchyNodeSchema.properties.children.items = hierarchyNodeSchema

const rowSchema = {
  anyOf: [
    { type: 'string', minLength: 1, maxLength: 180 },
    {
      type: 'object',
      additionalProperties: false,
      required: ['label'],
      properties: {
        label: diagramLabel,
        value: { type: 'string', minLength: 0, maxLength: 220 },
        description: diagramDescription,
      },
    },
  ],
}

const looseRuntimeValue = {}

const codeStepSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['line', 'variables', 'output', 'explanation'],
  properties: {
    line: { type: 'integer', minimum: 1, maximum: 500 },
    variables: { type: 'object' },
    output: { type: 'string', minLength: 0, maxLength: 1000 },
    explanation: { type: 'string', minLength: 1, maxLength: 240 },
  },
}

const plotAnnotationSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['x', 'y', 'label'],
  properties: {
    x: { type: 'number', minimum: -10000, maximum: 10000 },
    y: { type: 'number', minimum: -10000, maximum: 10000 },
    label: diagramLabel,
  },
}

const algorithmStepSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['state', 'highlight', 'pseudocodeLine', 'caption'],
  properties: {
    state: looseRuntimeValue,
    highlight: {
      type: 'object',
      additionalProperties: false,
      required: ['nodeIds', 'operation'],
      properties: {
        nodeIds: { type: 'array', minItems: 0, maxItems: 12, items: diagramId },
        operation: diagramLabel,
      },
    },
    pseudocodeLine: { type: 'integer', minimum: 1, maximum: 80 },
    caption: { type: 'string', minLength: 1, maxLength: 240 },
  },
}

export const STRUCTURED_DIAGRAM_DATA_SCHEMAS = Object.freeze({
  flowchart: {
    type: 'object',
    additionalProperties: false,
    required: ['nodes', 'edges'],
    properties: {
      caption: optionalCaption,
      nodes: { type: 'array', minItems: 2, maxItems: 12, items: diagramNodeSchema },
      edges: { type: 'array', minItems: 1, maxItems: 20, items: diagramEdgeSchema },
    },
  },
  hierarchy: {
    type: 'object',
    additionalProperties: false,
    required: ['root'],
    properties: {
      caption: optionalCaption,
      root: hierarchyNodeSchema,
    },
  },
  comparison: {
    type: 'object',
    additionalProperties: false,
    required: ['columns'],
    properties: {
      caption: optionalCaption,
      columns: {
        type: 'array',
        minItems: 2,
        maxItems: 3,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['label', 'rows'],
          properties: {
            label: diagramLabel,
            rows: { type: 'array', minItems: 1, maxItems: 8, items: rowSchema },
          },
        },
      },
    },
  },
  timeline: {
    type: 'object',
    additionalProperties: false,
    required: ['events'],
    properties: {
      caption: optionalCaption,
      events: {
        type: 'array',
        minItems: 2,
        maxItems: 12,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['date', 'label'],
          properties: {
            date: { type: 'string', minLength: 1, maxLength: 80 },
            label: diagramLabel,
            description: diagramDescription,
          },
        },
      },
    },
  },
  cycle: {
    type: 'object',
    additionalProperties: false,
    required: ['stages'],
    properties: {
      caption: optionalCaption,
      centerLabel: { type: 'string', minLength: 0, maxLength: 80 },
      stages: {
        type: 'array',
        minItems: 3,
        maxItems: 8,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['label'],
          properties: {
            id: { type: 'string', minLength: 0, maxLength: 80 },
            label: diagramLabel,
            description: diagramDescription,
          },
        },
      },
    },
  },
  layered_stack: {
    type: 'object',
    additionalProperties: false,
    required: ['layers'],
    properties: {
      caption: optionalCaption,
      layers: {
        type: 'array',
        minItems: 1,
        maxItems: 10,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['label'],
          properties: {
            id: { type: 'string', minLength: 0, maxLength: 80 },
            label: diagramLabel,
            description: diagramDescription,
          },
        },
      },
    },
  },
  quadrant: {
    type: 'object',
    additionalProperties: false,
    required: ['xAxis', 'yAxis', 'items'],
    properties: {
      caption: optionalCaption,
      xAxis: { type: 'string', minLength: 1, maxLength: 120 },
      yAxis: { type: 'string', minLength: 1, maxLength: 120 },
      items: {
        type: 'array',
        minItems: 1,
        maxItems: 8,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['label', 'quadrant'],
          properties: {
            label: diagramLabel,
            quadrant: { type: 'integer', minimum: 1, maximum: 4 },
            description: diagramDescription,
          },
        },
      },
    },
  },
  network: {
    type: 'object',
    additionalProperties: false,
    required: ['nodes', 'edges'],
    properties: {
      caption: optionalCaption,
      nodes: { type: 'array', minItems: 2, maxItems: 16, items: diagramNodeSchema },
      edges: { type: 'array', minItems: 1, maxItems: 30, items: diagramEdgeSchema },
    },
  },
  equation_breakdown: {
    type: 'object',
    additionalProperties: false,
    required: ['equation', 'parts'],
    properties: {
      caption: optionalCaption,
      equation: { type: 'string', minLength: 1, maxLength: 240 },
      parts: {
        type: 'array',
        minItems: 1,
        maxItems: 10,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['label'],
          properties: {
            symbol: { type: 'string', minLength: 0, maxLength: 30 },
            label: diagramLabel,
            description: diagramDescription,
          },
        },
      },
    },
  },
  annotated_callouts: {
    type: 'object',
    additionalProperties: false,
    required: ['baseLabel', 'callouts'],
    properties: {
      caption: optionalCaption,
      baseLabel: diagramLabel,
      callouts: {
        type: 'array',
        minItems: 1,
        maxItems: 8,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['label', 'x', 'y'],
          properties: {
            label: diagramLabel,
            text: { type: 'string', minLength: 0, maxLength: 240 },
            description: diagramDescription,
            x: { type: 'number', minimum: 0, maximum: 1 },
            y: { type: 'number', minimum: 0, maximum: 1 },
          },
        },
      },
    },
  },
  code_execution: {
    type: 'object',
    additionalProperties: false,
    required: ['language', 'code', 'steps'],
    properties: {
      caption: optionalCaption,
      language: { type: 'string', minLength: 1, maxLength: 40 },
      code: { type: 'string', minLength: 1, maxLength: 3000 },
      steps: { type: 'array', minItems: 2, maxItems: 20, items: codeStepSchema },
    },
  },
  equation_plot: {
    type: 'object',
    additionalProperties: false,
    required: ['equation', 'plotType', 'plotData', 'annotations'],
    properties: {
      caption: optionalCaption,
      equation: { type: 'string', minLength: 1, maxLength: 240 },
      plotType: { type: 'string', enum: ['function', 'geometry', 'number_line', 'none'] },
      plotData: {
        type: 'object',
        additionalProperties: true,
      },
      annotations: { type: 'array', minItems: 0, maxItems: 12, items: plotAnnotationSchema },
    },
  },
  algorithm_step: {
    type: 'object',
    additionalProperties: false,
    required: ['dataStructure', 'initialState', 'steps', 'pseudocode'],
    properties: {
      caption: optionalCaption,
      dataStructure: { type: 'string', enum: ['array', 'tree'] },
      initialState: looseRuntimeValue,
      steps: { type: 'array', minItems: 2, maxItems: 24, items: algorithmStepSchema },
      pseudocode: { type: 'array', minItems: 1, maxItems: 20, items: { type: 'string', minLength: 1, maxLength: 160 } },
    },
  },
})

function cleanString(value = '', fallback = '') {
  return String(value ?? fallback).trim()
}

function includeCaption(data = {}) {
  const caption = cleanString(data.caption)
  return caption ? { caption } : {}
}

function cleanNode(node = {}, index = 0) {
  return {
    id: cleanString(node.id, `node_${index}`),
    label: cleanString(node.label || node.name, `Node ${index + 1}`),
    description: cleanString(node.description),
  }
}

function cleanEdge(edge = {}) {
  return {
    from: cleanString(edge.from),
    to: cleanString(edge.to),
    label: cleanString(edge.label),
    description: cleanString(edge.description),
  }
}

function cleanTreeNode(node = {}, index = 0) {
  return {
    id: cleanString(node.id, `node_${index}`),
    label: cleanString(node.label || node.name, `Node ${index + 1}`),
    description: cleanString(node.description),
    children: Array.isArray(node.children)
      ? node.children.map((child, childIndex) => cleanTreeNode(child, childIndex))
      : [],
  }
}

function cleanLabelItem(item = {}, index = 0) {
  return {
    id: cleanString(item.id),
    label: cleanString(item.label || item.value, `Item ${index + 1}`),
    description: cleanString(item.description),
  }
}

function cleanComparisonRow(row = {}) {
  if (typeof row === 'string') return row.trim()
  return {
    label: cleanString(row.label || row.value || row.description),
    value: cleanString(row.value),
    description: cleanString(row.description),
  }
}

function cleanCallout(callout = {}) {
  return {
    label: cleanString(callout.label || callout.text || callout.description),
    text: cleanString(callout.text),
    description: cleanString(callout.description),
    x: Number(callout.x),
    y: Number(callout.y),
  }
}

function cleanCodeStep(step = {}) {
  const variables = step.variables && typeof step.variables === 'object' && !Array.isArray(step.variables)
    ? step.variables
    : {}
  return {
    line: Number(step.line),
    variables,
    output: cleanString(step.output),
    explanation: cleanString(step.explanation),
  }
}

function cleanAnnotation(annotation = {}) {
  return {
    x: Number(annotation.x),
    y: Number(annotation.y),
    label: cleanString(annotation.label),
  }
}

function cleanAlgorithmStep(step = {}) {
  const highlight = step.highlight && typeof step.highlight === 'object' && !Array.isArray(step.highlight)
    ? step.highlight
    : {}
  return {
    state: step.state,
    highlight: {
      nodeIds: Array.isArray(highlight.nodeIds) ? highlight.nodeIds.map((item) => cleanString(item)).filter(Boolean) : [],
      operation: cleanString(highlight.operation || step.operation),
    },
    pseudocodeLine: Number(step.pseudocodeLine),
    caption: cleanString(step.caption),
  }
}

export function projectStructuredDiagramData(diagramType, data = {}) {
  const caption = includeCaption(data)
  if (diagramType === 'flowchart') {
    return {
      ...caption,
      nodes: Array.isArray(data.nodes) ? data.nodes.map(cleanNode) : [],
      edges: Array.isArray(data.edges) ? data.edges.map(cleanEdge) : [],
    }
  }
  if (diagramType === 'hierarchy') {
    return {
      ...caption,
      root: data.root && typeof data.root === 'object' && !Array.isArray(data.root)
        ? cleanTreeNode(data.root)
        : { id: '', label: '', description: '', children: [] },
    }
  }
  if (diagramType === 'comparison') {
    return {
      ...caption,
      columns: Array.isArray(data.columns)
        ? data.columns.map((column = {}) => ({
            label: cleanString(column.label),
            rows: Array.isArray(column.rows) ? column.rows.map(cleanComparisonRow) : [],
          }))
        : [],
    }
  }
  if (diagramType === 'timeline') {
    const events = Array.isArray(data.events) && data.events.length ? data.events : data.nodes
    return {
      ...caption,
      events: Array.isArray(events)
        ? events.map((event = {}) => ({
            date: cleanString(event.date),
            label: cleanString(event.label || event.value),
            description: cleanString(event.description),
          }))
        : [],
    }
  }
  if (diagramType === 'cycle') {
    const stages = Array.isArray(data.stages) && data.stages.length ? data.stages : data.nodes
    return {
      ...caption,
      centerLabel: cleanString(data.centerLabel),
      stages: Array.isArray(stages) ? stages.map(cleanLabelItem) : [],
    }
  }
  if (diagramType === 'layered_stack') {
    const layers = Array.isArray(data.layers) && data.layers.length ? data.layers : data.nodes
    return {
      ...caption,
      layers: Array.isArray(layers) ? layers.map(cleanLabelItem) : [],
    }
  }
  if (diagramType === 'quadrant') {
    const items = Array.isArray(data.items) && data.items.length ? data.items : data.quadrants
    return {
      ...caption,
      xAxis: cleanString(data.xAxis),
      yAxis: cleanString(data.yAxis),
      items: Array.isArray(items)
        ? items.map((item = {}, index) => ({
            label: cleanString(item.label || item.value, `Quadrant ${index + 1}`),
            quadrant: Number(item.quadrant),
            description: cleanString(item.description),
          }))
        : [],
    }
  }
  if (diagramType === 'network') {
    return {
      ...caption,
      nodes: Array.isArray(data.nodes) ? data.nodes.map(cleanNode) : [],
      edges: Array.isArray(data.edges) ? data.edges.map(cleanEdge) : [],
    }
  }
  if (diagramType === 'equation_breakdown') {
    const parts = Array.isArray(data.parts) && data.parts.length ? data.parts : data.items
    return {
      ...caption,
      equation: cleanString(data.equation),
      parts: Array.isArray(parts)
        ? parts.map((part = {}) => ({
            symbol: cleanString(part.symbol),
            label: cleanString(part.label || part.description || part.symbol),
            description: cleanString(part.description),
          }))
        : [],
    }
  }
  if (diagramType === 'annotated_callouts') {
    const callouts = Array.isArray(data.callouts) && data.callouts.length ? data.callouts : data.items
    return {
      ...caption,
      baseLabel: cleanString(data.baseLabel || data.label),
      callouts: Array.isArray(callouts) ? callouts.map(cleanCallout) : [],
    }
  }
  if (diagramType === 'code_execution') {
    return {
      ...caption,
      language: cleanString(data.language),
      code: cleanString(data.code),
      steps: Array.isArray(data.steps) ? data.steps.map(cleanCodeStep) : [],
    }
  }
  if (diagramType === 'equation_plot') {
    return {
      ...caption,
      equation: cleanString(data.equation),
      plotType: cleanString(data.plotType, 'none'),
      plotData: data.plotData && typeof data.plotData === 'object' && !Array.isArray(data.plotData) ? data.plotData : {},
      annotations: Array.isArray(data.annotations) ? data.annotations.map(cleanAnnotation) : [],
    }
  }
  if (diagramType === 'algorithm_step') {
    let initialState = data.initialState
    if (data.dataStructure === 'array' && !Array.isArray(initialState) && Array.isArray(data.items)) initialState = data.items
    return {
      ...caption,
      dataStructure: cleanString(data.dataStructure, 'array'),
      initialState,
      steps: Array.isArray(data.steps) ? data.steps.map(cleanAlgorithmStep) : [],
      pseudocode: Array.isArray(data.pseudocode) ? data.pseudocode.map((line) => cleanString(line)).filter(Boolean) : [],
    }
  }
  return data
}

function validateUniqueIds(items = [], itemLabel, path) {
  const seen = new Set()
  const errors = []
  items.forEach((item, index) => {
    if (!item?.id) return
    if (seen.has(item.id)) errors.push(`${path}.${itemLabel}[${index}].id duplicates "${item.id}".`)
    seen.add(item.id)
  })
  return errors
}

function validateEdgesReferenceNodes(data = {}, path) {
  const nodeIds = new Set((data.nodes || []).map((node) => node.id))
  const errors = []
  ;(data.edges || []).forEach((edge, index) => {
    if (!nodeIds.has(edge.from)) errors.push(`${path}.edges[${index}].from references missing node "${edge.from}".`)
    if (!nodeIds.has(edge.to)) errors.push(`${path}.edges[${index}].to references missing node "${edge.to}".`)
  })
  return errors
}

function validateTreeRoots(data = {}, path) {
  const errors = []
  if (!data.root?.id || !data.root?.label) {
    errors.push(`${path}.root must contain a non-empty id and label.`)
  }
  return errors
}

function validateStructuredCrossFields(diagramType, data, path) {
  if (diagramType === 'flowchart' || diagramType === 'network') {
    return [
      ...validateUniqueIds(data.nodes, 'nodes', path),
      ...validateEdgesReferenceNodes(data, path),
    ]
  }
  if (diagramType === 'hierarchy') return validateTreeRoots(data, path)
  if (diagramType === 'code_execution') {
    const lineCount = String(data.code || '').split('\n').length
    return (data.steps || []).flatMap((step, index) => (
      Number(step.line) > lineCount ? [`${path}.steps[${index}].line points beyond the code length.`] : []
    ))
  }
  if (diagramType === 'equation_plot') {
    if (data.plotType === 'function' && !data.plotData?.expression && !Array.isArray(data.plotData?.samples)) {
      return [`${path}.plotData.expression or samples is required for function plots.`]
    }
    if (data.plotType === 'geometry' && (!Array.isArray(data.plotData?.points) || data.plotData.points.length < 2)) {
      return [`${path}.plotData.points must contain at least 2 points for geometry plots.`]
    }
    if (data.plotType === 'number_line' && !Number.isFinite(Number(data.plotData?.value))) {
      return [`${path}.plotData.value is required for number line plots.`]
    }
  }
  if (diagramType === 'algorithm_step') {
    const errors = []
    if (data.dataStructure === 'array') {
      if (!Array.isArray(data.initialState)) errors.push(`${path}.initialState must be an array for array algorithms.`)
      ;(data.steps || []).forEach((step, index) => {
        if (!Array.isArray(step.state)) errors.push(`${path}.steps[${index}].state must be an array for array algorithms.`)
      })
    }
    if (data.dataStructure === 'tree') {
      const validTree = (value) => value && typeof value === 'object' && !Array.isArray(value) && Array.isArray(value.nodes) && Array.isArray(value.edges)
      if (!validTree(data.initialState)) errors.push(`${path}.initialState must contain nodes[] and edges[] for tree algorithms.`)
      ;(data.steps || []).forEach((step, index) => {
        if (!validTree(step.state)) errors.push(`${path}.steps[${index}].state must contain nodes[] and edges[] for tree algorithms.`)
      })
    }
    ;(data.steps || []).forEach((step, index) => {
      if (Number(step.pseudocodeLine) > data.pseudocode.length) {
        errors.push(`${path}.steps[${index}].pseudocodeLine points beyond pseudocode length.`)
      }
    })
    return errors
  }
  return []
}

export function validateStructuredDiagramData(diagramType, data = {}, path = 'data') {
  if (!STRUCTURED_DIAGRAM_TYPES.includes(diagramType)) {
    return { ok: false, errors: [`${path}.diagramType must be one of: ${STRUCTURED_DIAGRAM_TYPES.join(', ')}.`], data: null }
  }
  const projected = projectStructuredDiagramData(diagramType, data)
  const schema = STRUCTURED_DIAGRAM_DATA_SCHEMAS[diagramType]
  const validation = validateAgainstSchema(schema, projected, path)
  const errors = [
    ...validation.errors,
    ...validateStructuredCrossFields(diagramType, projected, path),
  ]
  return { ok: errors.length === 0, errors, data: projected }
}

function validateDynamicDiagramParamsShape(value = {}, path = 'dynamic_diagram.params') {
  const errors = []
  if (!value || typeof value !== 'object' || Array.isArray(value)) return errors
  if (value.tier === 'structured') {
    if (!value.diagramType) errors.push(`${path}.diagramType is required.`)
    if (!value.data || typeof value.data !== 'object' || Array.isArray(value.data)) {
      errors.push(`${path}.data must be an object.`)
    } else {
      const dataValidation = validateStructuredDiagramData(value.diagramType, value.data, `${path}.data`)
      errors.push(...dataValidation.errors)
    }
  } else if (value.tier === 'mermaid') {
    if (!cleanString(value.code)) errors.push(`${path}.code is required.`)
  } else if (value.tier === 'svg') {
    if (!cleanString(value.svg)) errors.push(`${path}.svg is required.`)
  } else if (value.tier === 'none') {
    if (!cleanString(value.reason)) errors.push(`${path}.reason is required.`)
  }
  return errors
}

export const dynamicDiagramParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['tier', 'title', 'fallbackText'],
  properties: {
    tier: { type: 'string', enum: ['structured', 'mermaid', 'svg', 'none'] },
    diagramType: { type: 'string', enum: STRUCTURED_DIAGRAM_TYPES },
    data: { type: 'object' },
    code: { type: 'string', minLength: 1, maxLength: 12000 },
    svg: { type: 'string', minLength: 1, maxLength: 51200 },
    reason: { type: 'string', minLength: 1, maxLength: 500 },
    title: { type: 'string', minLength: 1, maxLength: 140 },
    fallbackText: { type: 'string', minLength: 1, maxLength: 900 },
  },
  validate: validateDynamicDiagramParamsShape,
}

export const componentParamSchemas = Object.freeze({
  concept_explainer: conceptExplainerParamsSchema,
  multiple_choice_quiz: multipleChoiceQuizParamsSchema,
  flashcard_drill: flashcardDrillParamsSchema,
  worked_example: workedExampleParamsSchema,
  free_response: freeResponseParamsSchema,
  code_predictor: codePredictorParamsSchema,
  dynamic_diagram: dynamicDiagramParamsSchema,
  code_sandbox: codeSandboxParamsSchema,
  code_debugger: codeDebuggerParamsSchema,
  audio_listen: audioListenParamsSchema,
  audio_speak: audioSpeakParamsSchema,
  image_identify: imageIdentifyParamsSchema,
  drag_match: dragMatchParamsSchema,
  order_steps: orderStepsParamsSchema,
  timed_problem_set: timedProblemSetParamsSchema,
  roleplay_scenario: roleplayScenarioParamsSchema,
  case_study_analyze: caseStudyAnalyzeParamsSchema,
  reflection_prompt: reflectionPromptParamsSchema,
  do_in_real_world: doInRealWorldParamsSchema,
  mock_exam: mockExamParamsSchema,
  concept_map_build: conceptMapBuildParamsSchema,
})
