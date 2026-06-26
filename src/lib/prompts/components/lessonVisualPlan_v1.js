import { OPENAI_ALL_TEMPLATE_DATA_SCHEMAS, TEMPLATE_KINDS } from '@/lib/templateSvgRenderers/schemas'

function nullableSchema(schema) {
  return { anyOf: [schema, { type: 'null' }] }
}

const PLAN_DIAGRAM_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['slotId', 'purpose', 'kind', 'title', 'svg', ...TEMPLATE_KINDS],
  properties: {
    slotId: { type: 'string', minLength: 1, maxLength: 80 },
    purpose: { type: 'string', minLength: 1, maxLength: 260 },
    kind: { type: 'string', enum: [...TEMPLATE_KINDS, 'freeform'] },
    title: { type: 'string', minLength: 1, maxLength: 120 },
    svg: nullableSchema({ type: 'string', minLength: 32 }),
    ...Object.fromEntries(TEMPLATE_KINDS.map((kind) => [
      kind,
      nullableSchema(OPENAI_ALL_TEMPLATE_DATA_SCHEMAS[kind]),
    ])),
  },
}

export const LESSON_VISUAL_PLAN_RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'lesson_visual_plan_v1',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['diagrams'],
      properties: {
        diagrams: {
          type: 'array',
          minItems: 0,
          maxItems: 8,
          items: PLAN_DIAGRAM_SCHEMA,
        },
      },
    },
  },
}

const TEMPLATE_GUIDE = [
  ['flowchart', 'processes, loops, input-output steps, decisions'],
  ['cycle', 'repeating cycles and feedback loops'],
  ['hierarchy', 'trees, categories, inheritance, DOM-style structures'],
  ['timeline', 'ordered events with dates or phases'],
  ['comparison', 'side-by-side A/B or before/after contrasts'],
  ['layered_stack', 'abstraction layers, stacks, OSI-like models'],
  ['quadrant', '2x2 matrices with labeled axes'],
  ['network', 'dependency graphs or connected ideas without a single flow'],
  ['equation_breakdown', 'annotating parts of one equation'],
  ['annotated_callouts', 'labeling parts of one object or mental model'],
  ['code_execution', 'line-by-line code tracing with variables and output'],
  ['algorithm_step', 'array algorithm step-throughs like sort/search'],
  ['venn', 'overlapping categories or set relationships'],
  ['number_line', 'inequalities, intervals, marks on a number line'],
  ['table', 'truth tables and compact structured comparisons'],
  ['state_machine', 'finite states and transitions'],
  ['bar_chart', 'simple categorical values'],
]

export function buildLessonVisualPlanPrompt({
  lessonTitle,
  staticGoal,
  slides = [],
  diagramSlots = [],
  validationFeedback = '',
}) {
  return `Plan all diagrams for this devtool lesson in ONE pass.

Return JSON only. For each diagram slot, choose exactly one kind:
- Prefer a template whenever it can teach the idea cleanly.
- Use freeform SVG only for custom spatial visuals that templates cannot represent.
- For this Python-variable lesson, avoid freeform unless absolutely necessary.
- Populate the matching template payload fully; set every other template payload and svg to null.
- If kind is freeform, populate svg and set every template payload to null.

Template guide:
${TEMPLATE_GUIDE.map(([kind, use]) => `- ${kind}: ${use}`).join('\n')}

Lesson context:
${JSON.stringify({ lessonTitle, staticGoal, slides, diagramSlots }, null, 2)}

Teaching rules:
- Each visual must serve its slot purpose and placement, not just repeat the slide title.
- Use the surrounding copy and code snippet to pick the smallest visual that makes the mental model click.
- Use short labels. Put longer explanation in caption fields.
- Prefer code_execution for code tracing and flowchart/io-style templates for print/output flow.
- A visual that appears before code should build intuition; a visual after code should reinforce what happened.

${validationFeedback ? `Previous attempt failed. Fix these exact issues:\n${validationFeedback}` : ''}`
}
