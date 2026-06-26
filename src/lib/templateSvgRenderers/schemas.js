import { STRUCTURED_DIAGRAM_DATA_SCHEMAS, validateStructuredDiagramData } from '@/components/library/schemas'
import { validateAgainstSchema } from '@/components/library/schemaValidator'

export const REUSED_TEMPLATE_KINDS = Object.freeze([
  'flowchart',
  'cycle',
  'hierarchy',
  'timeline',
  'comparison',
  'layered_stack',
  'quadrant',
  'network',
  'equation_breakdown',
  'annotated_callouts',
  'code_execution',
  'algorithm_step',
])

export const NEW_TEMPLATE_KINDS = Object.freeze([
  'venn',
  'number_line',
  'table',
  'state_machine',
  'bar_chart',
])

export const TEMPLATE_KINDS = Object.freeze([
  ...REUSED_TEMPLATE_KINDS,
  ...NEW_TEMPLATE_KINDS,
])

const shortString = { type: 'string', minLength: 0, maxLength: 240 }
const label = { type: 'string', minLength: 1, maxLength: 120 }
const id = { type: 'string', minLength: 1, maxLength: 80 }
const caption = { type: 'string', minLength: 0, maxLength: 500 }

const node = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'label', 'description'],
  properties: { id, label, description: shortString },
}

const edge = {
  type: 'object',
  additionalProperties: false,
  required: ['from', 'to', 'label', 'description'],
  properties: { from: id, to: id, label: shortString, description: shortString },
}

const labelItem = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'label', 'description'],
  properties: { id: { type: 'string', minLength: 0, maxLength: 80 }, label, description: shortString },
}

const hierarchyNode = (depth = 0) => ({
  type: 'object',
  additionalProperties: false,
  required: ['id', 'label', 'description', 'children'],
  properties: {
    id,
    label,
    description: shortString,
    children: {
      type: 'array',
      minItems: 0,
      maxItems: depth >= 2 ? 0 : 6,
      items: depth >= 2 ? { type: 'object', additionalProperties: false, required: [], properties: {} } : hierarchyNode(depth + 1),
    },
  },
})

const comparisonRow = {
  type: 'object',
  additionalProperties: false,
  required: ['label', 'value', 'description'],
  properties: { label, value: shortString, description: shortString },
}

const codeStep = {
  type: 'object',
  additionalProperties: false,
  required: ['line', 'variables', 'output', 'explanation'],
  properties: {
    line: { type: 'integer', minimum: 1, maximum: 500 },
    variables: { type: 'object', additionalProperties: false, required: [], properties: {} },
    output: { type: 'string', minLength: 0, maxLength: 1000 },
    explanation: { type: 'string', minLength: 1, maxLength: 240 },
  },
}

const algorithmStep = {
  type: 'object',
  additionalProperties: false,
  required: ['state', 'highlight', 'pseudocodeLine', 'caption'],
  properties: {
    state: { type: 'array', minItems: 1, maxItems: 20, items: { type: 'string', minLength: 1, maxLength: 80 } },
    highlight: {
      type: 'object',
      additionalProperties: false,
      required: ['nodeIds', 'operation'],
      properties: {
        nodeIds: { type: 'array', minItems: 0, maxItems: 12, items: id },
        operation: label,
      },
    },
    pseudocodeLine: { type: 'integer', minimum: 1, maximum: 80 },
    caption: { type: 'string', minLength: 1, maxLength: 240 },
  },
}

export const OPENAI_TEMPLATE_DATA_SCHEMAS = Object.freeze({
  flowchart: {
    type: 'object',
    additionalProperties: false,
    required: ['caption', 'nodes', 'edges'],
    properties: {
      caption,
      nodes: { type: 'array', minItems: 2, maxItems: 12, items: node },
      edges: { type: 'array', minItems: 1, maxItems: 20, items: edge },
    },
  },
  cycle: {
    type: 'object',
    additionalProperties: false,
    required: ['caption', 'centerLabel', 'stages'],
    properties: {
      caption,
      centerLabel: { type: 'string', minLength: 0, maxLength: 80 },
      stages: { type: 'array', minItems: 3, maxItems: 8, items: labelItem },
    },
  },
  hierarchy: {
    type: 'object',
    additionalProperties: false,
    required: ['caption', 'root'],
    properties: { caption, root: hierarchyNode() },
  },
  timeline: {
    type: 'object',
    additionalProperties: false,
    required: ['caption', 'events'],
    properties: {
      caption,
      events: {
        type: 'array',
        minItems: 2,
        maxItems: 12,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['date', 'label', 'description'],
          properties: { date: label, label, description: shortString },
        },
      },
    },
  },
  comparison: {
    type: 'object',
    additionalProperties: false,
    required: ['caption', 'columns'],
    properties: {
      caption,
      columns: {
        type: 'array',
        minItems: 2,
        maxItems: 3,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['label', 'rows'],
          properties: {
            label,
            rows: { type: 'array', minItems: 1, maxItems: 8, items: comparisonRow },
          },
        },
      },
    },
  },
  layered_stack: {
    type: 'object',
    additionalProperties: false,
    required: ['caption', 'layers'],
    properties: {
      caption,
      layers: { type: 'array', minItems: 1, maxItems: 10, items: labelItem },
    },
  },
  quadrant: {
    type: 'object',
    additionalProperties: false,
    required: ['caption', 'xAxis', 'yAxis', 'items'],
    properties: {
      caption,
      xAxis: label,
      yAxis: label,
      items: {
        type: 'array',
        minItems: 1,
        maxItems: 8,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['label', 'quadrant', 'description'],
          properties: { label, quadrant: { type: 'integer', minimum: 1, maximum: 4 }, description: shortString },
        },
      },
    },
  },
  network: {
    type: 'object',
    additionalProperties: false,
    required: ['caption', 'nodes', 'edges'],
    properties: {
      caption,
      nodes: { type: 'array', minItems: 2, maxItems: 16, items: node },
      edges: { type: 'array', minItems: 1, maxItems: 30, items: edge },
    },
  },
  equation_breakdown: {
    type: 'object',
    additionalProperties: false,
    required: ['caption', 'equation', 'parts'],
    properties: {
      caption,
      equation: { type: 'string', minLength: 1, maxLength: 240 },
      parts: {
        type: 'array',
        minItems: 1,
        maxItems: 10,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['symbol', 'label', 'description'],
          properties: { symbol: { type: 'string', minLength: 0, maxLength: 30 }, label, description: shortString },
        },
      },
    },
  },
  annotated_callouts: {
    type: 'object',
    additionalProperties: false,
    required: ['caption', 'baseLabel', 'callouts'],
    properties: {
      caption,
      baseLabel: label,
      callouts: {
        type: 'array',
        minItems: 1,
        maxItems: 8,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['label', 'text', 'description', 'x', 'y'],
          properties: {
            label,
            text: shortString,
            description: shortString,
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
    required: ['caption', 'language', 'code', 'steps'],
    properties: {
      caption,
      language: { type: 'string', minLength: 1, maxLength: 40 },
      code: { type: 'string', minLength: 1, maxLength: 3000 },
      steps: { type: 'array', minItems: 2, maxItems: 20, items: codeStep },
    },
  },
  algorithm_step: {
    type: 'object',
    additionalProperties: false,
    required: ['caption', 'dataStructure', 'initialState', 'steps', 'pseudocode'],
    properties: {
      caption,
      dataStructure: { type: 'string', enum: ['array'] },
      initialState: { type: 'array', minItems: 1, maxItems: 20, items: { type: 'string', minLength: 1, maxLength: 80 } },
      steps: { type: 'array', minItems: 2, maxItems: 24, items: algorithmStep },
      pseudocode: { type: 'array', minItems: 1, maxItems: 20, items: { type: 'string', minLength: 1, maxLength: 160 } },
    },
  },
})

export const NEW_TEMPLATE_DATA_SCHEMAS = Object.freeze({
  venn: {
    type: 'object',
    additionalProperties: false,
    required: ['caption', 'sets'],
    properties: {
      caption,
      sets: {
        type: 'array',
        minItems: 2,
        maxItems: 3,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['label', 'items'],
          properties: {
            label,
            items: { type: 'array', minItems: 0, maxItems: 8, items: label },
          },
        },
      },
    },
  },
  number_line: {
    type: 'object',
    additionalProperties: false,
    required: ['caption', 'min', 'max', 'ticks', 'marks', 'intervals'],
    properties: {
      caption,
      min: { type: 'number', minimum: -10000, maximum: 10000 },
      max: { type: 'number', minimum: -10000, maximum: 10000 },
      ticks: { type: 'array', minItems: 2, maxItems: 24, items: { type: 'number', minimum: -10000, maximum: 10000 } },
      marks: {
        type: 'array',
        minItems: 0,
        maxItems: 8,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['value', 'label', 'kind'],
          properties: {
            value: { type: 'number', minimum: -10000, maximum: 10000 },
            label,
            kind: { type: 'string', enum: ['point', 'open', 'closed'] },
          },
        },
      },
      intervals: {
        type: 'array',
        minItems: 0,
        maxItems: 6,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['from', 'to', 'openLeft', 'openRight'],
          properties: {
            from: { type: 'number', minimum: -10000, maximum: 10000 },
            to: { type: 'number', minimum: -10000, maximum: 10000 },
            openLeft: { type: 'boolean' },
            openRight: { type: 'boolean' },
          },
        },
      },
    },
  },
  table: {
    type: 'object',
    additionalProperties: false,
    required: ['caption', 'headers', 'rows'],
    properties: {
      caption,
      headers: { type: 'array', minItems: 1, maxItems: 6, items: label },
      rows: {
        type: 'array',
        minItems: 1,
        maxItems: 10,
        items: { type: 'array', minItems: 1, maxItems: 6, items: { type: 'string', minLength: 0, maxLength: 120 } },
      },
    },
  },
  state_machine: {
    type: 'object',
    additionalProperties: false,
    required: ['caption', 'states', 'transitions'],
    properties: {
      caption,
      states: {
        type: 'array',
        minItems: 1,
        maxItems: 10,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'label', 'kind'],
          properties: {
            id,
            label,
            kind: { type: 'string', enum: ['start', 'accept', 'normal'] },
          },
        },
      },
      transitions: {
        type: 'array',
        minItems: 0,
        maxItems: 18,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['from', 'to', 'label'],
          properties: { from: id, to: id, label: shortString },
        },
      },
    },
  },
  bar_chart: {
    type: 'object',
    additionalProperties: false,
    required: ['caption', 'axisLabel', 'bars'],
    properties: {
      caption,
      axisLabel: { type: 'string', minLength: 0, maxLength: 120 },
      bars: {
        type: 'array',
        minItems: 1,
        maxItems: 10,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['label', 'value'],
          properties: { label, value: { type: 'number', minimum: -1000000, maximum: 1000000 } },
        },
      },
    },
  },
})

export const TEMPLATE_DATA_SCHEMAS = Object.freeze({
  ...Object.fromEntries(REUSED_TEMPLATE_KINDS.map((kind) => [kind, STRUCTURED_DIAGRAM_DATA_SCHEMAS[kind]])),
  ...NEW_TEMPLATE_DATA_SCHEMAS,
})

export const OPENAI_ALL_TEMPLATE_DATA_SCHEMAS = Object.freeze({
  ...OPENAI_TEMPLATE_DATA_SCHEMAS,
  ...NEW_TEMPLATE_DATA_SCHEMAS,
})

function nullableSchema(schema) {
  return { anyOf: [schema, { type: 'null' }] }
}

export const FULL_AI_ROUTED_RESPONSE_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'title', 'svg', ...TEMPLATE_KINDS],
  properties: {
    kind: { type: 'string', enum: [...TEMPLATE_KINDS, 'freeform'] },
    title: { type: 'string', minLength: 1, maxLength: 120 },
    svg: nullableSchema({ type: 'string', minLength: 32 }),
    ...Object.fromEntries(TEMPLATE_KINDS.map((kind) => [kind, nullableSchema(OPENAI_ALL_TEMPLATE_DATA_SCHEMAS[kind])])),
  },
})

export function isTemplateKind(kind) {
  return TEMPLATE_KINDS.includes(kind)
}

function validateNewTemplateCrossFields(kind, data = {}, path = 'data') {
  const errors = []
  if (kind === 'number_line') {
    if (!(Number(data.min) < Number(data.max))) errors.push(`${path}.min must be less than ${path}.max.`)
    ;(data.ticks || []).forEach((tick, index) => {
      if (tick < data.min || tick > data.max) errors.push(`${path}.ticks[${index}] must be within min/max.`)
    })
    ;(data.marks || []).forEach((mark, index) => {
      if (mark.value < data.min || mark.value > data.max) errors.push(`${path}.marks[${index}].value must be within min/max.`)
    })
  }
  if (kind === 'table') {
    ;(data.rows || []).forEach((row, index) => {
      if (row.length !== data.headers.length) errors.push(`${path}.rows[${index}] must have ${data.headers.length} cells.`)
    })
  }
  if (kind === 'state_machine') {
    const ids = new Set((data.states || []).map((state) => state.id))
    ;(data.transitions || []).forEach((transition, index) => {
      if (!ids.has(transition.from)) errors.push(`${path}.transitions[${index}].from references a missing state.`)
      if (!ids.has(transition.to)) errors.push(`${path}.transitions[${index}].to references a missing state.`)
    })
  }
  return errors
}

export function validateTemplateData(kind, data = {}, path = 'data') {
  if (REUSED_TEMPLATE_KINDS.includes(kind)) return validateStructuredDiagramData(kind, data, path)
  if (!NEW_TEMPLATE_KINDS.includes(kind)) {
    return { ok: false, errors: [`Unsupported template kind: ${kind || 'missing'}.`], data: null }
  }
  const schema = NEW_TEMPLATE_DATA_SCHEMAS[kind]
  const validation = validateAgainstSchema(schema, data, path)
  const errors = [
    ...validation.errors,
    ...validateNewTemplateCrossFields(kind, data, path),
  ]
  return { ok: errors.length === 0, errors, data }
}
