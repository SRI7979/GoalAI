import 'server-only'
import { validateTemplateData, TEMPLATE_KINDS, REUSED_TEMPLATE_KINDS, NEW_TEMPLATE_KINDS } from './schemas'
import { renderFlowchartSvg } from './flowchart'
import { renderCycleSvg } from './cycle'
import { renderHierarchySvg } from './hierarchy'
import { renderTimelineSvg } from './timeline'
import { renderComparisonSvg } from './comparison'
import { renderLayeredStackSvg } from './layeredStack'
import { renderQuadrantSvg } from './quadrant'
import { renderNetworkSvg } from './network'
import { renderEquationBreakdownSvg } from './equationBreakdown'
import { renderAnnotatedCalloutsSvg } from './annotatedCallouts'
import { renderCodeExecutionSvg } from './codeExecution'
import { renderAlgorithmStepSvg } from './algorithmStep'
import { renderVennSvg } from './venn'
import { renderNumberLineSvg } from './numberLine'
import { renderTableSvg } from './table'
import { renderStateMachineSvg } from './stateMachine'
import { renderBarChartSvg } from './barChart'

const RENDERERS = Object.freeze({
  flowchart: renderFlowchartSvg,
  cycle: renderCycleSvg,
  hierarchy: renderHierarchySvg,
  timeline: renderTimelineSvg,
  comparison: renderComparisonSvg,
  layered_stack: renderLayeredStackSvg,
  quadrant: renderQuadrantSvg,
  network: renderNetworkSvg,
  equation_breakdown: renderEquationBreakdownSvg,
  annotated_callouts: renderAnnotatedCalloutsSvg,
  code_execution: renderCodeExecutionSvg,
  algorithm_step: renderAlgorithmStepSvg,
  venn: renderVennSvg,
  number_line: renderNumberLineSvg,
  table: renderTableSvg,
  state_machine: renderStateMachineSvg,
  bar_chart: renderBarChartSvg,
})

export { validateTemplateData, TEMPLATE_KINDS, REUSED_TEMPLATE_KINDS, NEW_TEMPLATE_KINDS }

export function renderTemplateSvg(kind, data, title) {
  const renderer = RENDERERS[kind]
  if (!renderer) throw new Error(`Unsupported template SVG kind: ${kind || 'missing'}.`)
  const validation = validateTemplateData(kind, data, kind)
  if (!validation.ok) {
    const error = new Error(validation.errors.join(' '))
    error.code = 'template_data_invalid'
    error.kind = kind
    throw error
  }
  return renderer(validation.data, title)
}
