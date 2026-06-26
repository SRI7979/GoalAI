'use client'

import FlowchartDiagram from './flowchart'
import HierarchyDiagram from './hierarchy'
import ComparisonDiagram from './comparison'
import TimelineDiagram from './timeline'
import CycleDiagram from './cycle'
import LayeredStackDiagram from './layeredStack'
import QuadrantDiagram from './quadrant'
import NetworkDiagram from './network'
import EquationBreakdownDiagram from './equationBreakdown'
import AnnotatedCalloutsDiagram from './annotatedCallouts'
import CodeExecutionDiagram from './code_execution'
import EquationPlotDiagram from './equation_plot'
import AlgorithmStepDiagram from './algorithm_step'

export const STRUCTURED_RENDERERS = Object.freeze({
  flowchart: FlowchartDiagram,
  hierarchy: HierarchyDiagram,
  comparison: ComparisonDiagram,
  timeline: TimelineDiagram,
  cycle: CycleDiagram,
  layered_stack: LayeredStackDiagram,
  quadrant: QuadrantDiagram,
  network: NetworkDiagram,
  equation_breakdown: EquationBreakdownDiagram,
  annotated_callouts: AnnotatedCalloutsDiagram,
  code_execution: CodeExecutionDiagram,
  equation_plot: EquationPlotDiagram,
  algorithm_step: AlgorithmStepDiagram,
})

export function getStructuredRenderer(diagramType) {
  return STRUCTURED_RENDERERS[diagramType] || null
}
