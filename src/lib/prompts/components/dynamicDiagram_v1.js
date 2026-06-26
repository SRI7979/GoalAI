import { ALLOWED_SVG_COLORS } from '@/components/library/diagrams/palette'
import { STRUCTURED_DIAGRAM_TYPES } from '@/components/library/schemas'

const genericItem = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'label', 'description', 'from', 'to', 'date', 'value', 'symbol', 'quadrant', 'children'],
  properties: {
    id: { type: 'string' },
    label: { type: 'string' },
    description: { type: 'string' },
    from: { type: 'string' },
    to: { type: 'string' },
    date: { type: 'string' },
    value: { type: 'string' },
    symbol: { type: 'string' },
    quadrant: { type: 'integer' },
    children: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'label', 'description'],
        properties: {
          id: { type: 'string' },
          label: { type: 'string' },
          description: { type: 'string' },
        },
      },
    },
  },
}

const diagramDataSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'caption',
    'nodes',
    'edges',
    'root',
    'columns',
    'events',
    'stages',
    'layers',
    'xAxis',
    'yAxis',
    'items',
    'equation',
    'parts',
    'baseLabel',
    'callouts',
    'centerLabel',
  ],
  properties: {
    caption: { type: 'string' },
    nodes: { type: 'array', items: genericItem },
    edges: { type: 'array', items: genericItem },
    root: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'label', 'description', 'children'],
      properties: {
        id: { type: 'string' },
        label: { type: 'string' },
        description: { type: 'string' },
        children: { type: 'array', items: genericItem },
      },
    },
    columns: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'rows'],
        properties: {
          label: { type: 'string' },
          rows: { type: 'array', items: genericItem },
        },
      },
    },
    events: { type: 'array', items: genericItem },
    stages: { type: 'array', items: genericItem },
    layers: { type: 'array', items: genericItem },
    xAxis: { type: 'string' },
    yAxis: { type: 'string' },
    items: { type: 'array', items: genericItem },
    equation: { type: 'string' },
    parts: { type: 'array', items: genericItem },
    baseLabel: { type: 'string' },
    callouts: { type: 'array', items: genericItem },
    centerLabel: { type: 'string' },
  },
}

export const DYNAMIC_DIAGRAM_RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'pathai_dynamic_diagram_v1',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['tier', 'diagramType', 'data', 'code', 'svg', 'title', 'fallbackText', 'reason', 'tierChoiceReason'],
      properties: {
        tier: { type: 'string', enum: ['structured', 'mermaid', 'svg', 'none'] },
        diagramType: { type: 'string', enum: [...STRUCTURED_DIAGRAM_TYPES, ''] },
        data: diagramDataSchema,
        code: { type: 'string' },
        svg: { type: 'string' },
        title: { type: 'string' },
        fallbackText: { type: 'string' },
        reason: { type: 'string' },
        tierChoiceReason: { type: 'string' },
      },
    },
  },
}

export function buildDynamicDiagramPrompt({
  concept = '',
  contextSnippet = '',
  learnerState = null,
  validationFeedback = '',
} = {}) {
  return [
    'Create one PathAI dynamic_diagram payload. Return schema-valid JSON only.',
    'Decision order: prefer tier structured whenever possible; use mermaid only for sequence/state/class/ER/gantt/git/mindmap/journey; use svg only for highly spatial/domain visuals.',
    'Hard routing: login handshakes or multi-actor auth flows use mermaid sequenceDiagram; state machines use mermaid stateDiagram-v2; chess positions, board tactics, molecule shapes, and DNA double helix visuals use tier svg.',
    'Always include title and fallbackText. For unused top-level fields, use empty string, empty arrays, or empty data fields.',
    '',
    'Structured types: flowchart=process, hierarchy=taxonomy/tree, comparison=2-3 columns, timeline=dated sequence, cycle=closed loop, layered_stack=layers, quadrant=2x2 axes, network=related nodes, equation_breakdown=formula parts, annotated_callouts=labels around a base idea.',
    'Coding structured types: code_execution=trace code line-by-line with variables/output; equation_plot=plot equations/functions/number lines; algorithm_step=step an array/tree algorithm.',
    'Prefer code_execution for tracing loops or code execution, equation_plot for graphing equations, and algorithm_step for sorting/search/tree traversal.',
    'Tier 2 allowed Mermaid starts: sequenceDiagram, stateDiagram-v2, classDiagram, erDiagram, gantt, gitGraph, mindmap, journey.',
    `Tier 3 SVG may use only these hex colors: ${ALLOWED_SVG_COLORS.join(', ')}. No scripts, no event handlers, no external refs, no foreignObject.`,
    '',
    `Concept: ${concept}`,
    contextSnippet ? `Context: ${contextSnippet}` : 'Context: none',
    learnerState ? `Learner state summary: ${JSON.stringify(learnerState).slice(0, 1200)}` : 'Learner state summary: none',
    validationFeedback ? `Validation feedback to fix: ${validationFeedback}` : '',
  ].join('\n')
}
