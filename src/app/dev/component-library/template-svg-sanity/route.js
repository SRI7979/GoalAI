import { sanitizeSvgServer } from '@/lib/dynamicDiagramSafety'
import { renderTemplateSvg, TEMPLATE_KINDS } from '@/lib/templateSvgRenderers'
import { validateSvgQuality } from '@/lib/standardVisualDiagram'

const TEMPLATE_BASE_CHECKS = new Set(['well_formed_xml', 'view_box', 'readable_text', 'safe_svg_tags'])

function templateBaseValidation(report) {
  const checks = (report.checks || []).filter((check) => TEMPLATE_BASE_CHECKS.has(check.name))
  return {
    ...report,
    checks,
    passed: checks.every((check) => check.passed),
    failureSummary: checks.filter((check) => !check.passed).map((check) => `${check.name}: ${check.detail}`).join(' '),
  }
}

const SAMPLE_DATA = Object.freeze({
  flowchart: {
    caption: 'A loop repeats while its condition stays true.',
    nodes: [
      { id: 'init', label: 'Initialize i = 0', description: '' },
      { id: 'check', label: 'Check i < 5', description: '' },
      { id: 'body', label: 'Run loop body', description: '' },
      { id: 'inc', label: 'Increment i', description: '' },
    ],
    edges: [
      { from: 'init', to: 'check', label: '', description: '' },
      { from: 'check', to: 'body', label: 'true', description: '' },
      { from: 'body', to: 'inc', label: '', description: '' },
      { from: 'inc', to: 'check', label: '', description: '' },
    ],
  },
  cycle: {
    caption: 'The cycle repeats after the final stage.',
    centerLabel: 'Cycle',
    stages: ['Input', 'Process', 'Output', 'Feedback'].map((label, index) => ({ id: `s${index}`, label, description: '' })),
  },
  hierarchy: {
    caption: 'A hierarchy shows parent-child relationships.',
    root: {
      id: 'root',
      label: 'Root',
      description: '',
      children: [
        { id: 'a', label: 'Branch A', description: '', children: [] },
        { id: 'b', label: 'Branch B', description: '', children: [{ id: 'b1', label: 'Leaf', description: '', children: [] }] },
      ],
    },
  },
  timeline: {
    caption: 'Events are ordered from earliest to latest.',
    events: [
      { date: 'Step 1', label: 'Plan', description: '' },
      { date: 'Step 2', label: 'Build', description: '' },
      { date: 'Step 3', label: 'Test', description: '' },
    ],
  },
  comparison: {
    caption: 'Columns compare the key traits.',
    columns: [
      { label: 'Python', rows: [{ label: 'Syntax', value: 'Indented', description: '' }, { label: 'Use', value: 'General', description: '' }] },
      { label: 'JavaScript', rows: [{ label: 'Syntax', value: 'Braces', description: '' }, { label: 'Use', value: 'Web', description: '' }] },
    ],
  },
  layered_stack: {
    caption: 'Higher layers depend on lower layers.',
    layers: ['Physical', 'Network', 'Transport', 'Application'].map((label, index) => ({ id: `l${index}`, label, description: '' })),
  },
  quadrant: {
    caption: 'Items are grouped by two axes.',
    xAxis: 'Effort',
    yAxis: 'Impact',
    items: [
      { label: 'Quick win', quadrant: 1, description: '' },
      { label: 'Big bet', quadrant: 2, description: '' },
      { label: 'Low priority', quadrant: 3, description: '' },
    ],
  },
  network: {
    caption: 'Edges show relationships between nodes.',
    nodes: ['A', 'B', 'C', 'D'].map((label) => ({ id: label.toLowerCase(), label, description: '' })),
    edges: [
      { from: 'a', to: 'b', label: '', description: '' },
      { from: 'b', to: 'c', label: '', description: '' },
      { from: 'c', to: 'd', label: '', description: '' },
    ],
  },
  equation_breakdown: {
    caption: 'Each part has a role in the equation.',
    equation: 'F = m a',
    parts: [
      { symbol: 'F', label: 'Force', description: '' },
      { symbol: 'm', label: 'Mass', description: '' },
      { symbol: 'a', label: 'Acceleration', description: '' },
    ],
  },
  annotated_callouts: {
    caption: 'Callouts identify important parts.',
    baseLabel: 'Structure',
    callouts: [
      { label: 'Input', text: '', description: '', x: 0.2, y: 0.3 },
      { label: 'Output', text: '', description: '', x: 0.8, y: 0.7 },
    ],
  },
  code_execution: {
    caption: 'Trace variable changes line by line.',
    language: 'python',
    code: 'total = 0\nfor n in [1, 2, 3]:\n    total += n\nprint(total)',
    steps: [
      { line: 1, variables: {}, output: '', explanation: 'Initialize total.' },
      { line: 3, variables: {}, output: '', explanation: 'Add a value.' },
      { line: 4, variables: {}, output: '6', explanation: 'Print the final total.' },
    ],
  },
  algorithm_step: {
    caption: 'Bubble sort swaps adjacent out-of-order values.',
    dataStructure: 'array',
    initialState: ['5', '1', '4'],
    steps: [
      { state: ['5', '1', '4'], highlight: { nodeIds: ['0', '1'], operation: 'Compare 5 and 1' }, pseudocodeLine: 1, caption: 'Compare adjacent values.' },
      { state: ['1', '5', '4'], highlight: { nodeIds: ['0', '1'], operation: 'Swap' }, pseudocodeLine: 2, caption: 'Swap into order.' },
    ],
    pseudocode: ['compare neighbors', 'swap if left is larger'],
  },
  venn: {
    caption: 'The overlap contains shared traits.',
    sets: [
      { label: 'Frontend', items: ['HTML', 'CSS'] },
      { label: 'Programming', items: ['Logic', 'Variables'] },
    ],
  },
  number_line: {
    caption: 'The ray shows values greater than 3.',
    min: 0,
    max: 8,
    ticks: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    marks: [{ value: 3, label: 'x > 3', kind: 'open' }],
    intervals: [{ from: 3, to: 8, openLeft: true, openRight: false }],
  },
  table: {
    caption: 'XOR is true when inputs differ.',
    headers: ['A', 'B', 'A XOR B'],
    rows: [['0', '0', '0'], ['0', '1', '1'], ['1', '0', '1'], ['1', '1', '0']],
  },
  state_machine: {
    caption: 'Transitions move between states.',
    states: [
      { id: 'start', label: 'Start', kind: 'start' },
      { id: 'seen', label: 'Seen 1', kind: 'normal' },
      { id: 'accept', label: 'Accept', kind: 'accept' },
    ],
    transitions: [
      { from: 'start', to: 'seen', label: '1' },
      { from: 'seen', to: 'accept', label: '0' },
    ],
  },
  bar_chart: {
    caption: 'Bars compare categorical values.',
    axisLabel: 'Count',
    bars: [
      { label: 'A', value: 4 },
      { label: 'B', value: 7 },
      { label: 'C', value: 3 },
    ],
  },
})

export async function GET() {
  if (process.env.NODE_ENV === 'production' && process.env.PATHAI_ENABLE_DEV_ROUTES !== 'true') {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  const results = TEMPLATE_KINDS.map((kind) => {
    try {
      const svg = renderTemplateSvg(kind, SAMPLE_DATA[kind], `Template sanity: ${kind}`)
      const sanitized = sanitizeSvgServer(svg)
      const validation = sanitized.ok
        ? templateBaseValidation(validateSvgQuality(sanitized.svg))
        : { passed: false, failureSummary: sanitized.error, checks: [] }
      return { kind, ok: sanitized.ok && validation.passed, sanitized: sanitized.ok, validation }
    } catch (error) {
      return { kind, ok: false, error: error?.message || 'Template sanity failed.' }
    }
  })
  return Response.json({ ok: results.every((result) => result.ok), results })
}
