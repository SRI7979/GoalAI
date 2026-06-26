export const ALLOWED_MERMAID_PREFIXES = Object.freeze([
  'sequenceDiagram',
  'stateDiagram-v2',
  'classDiagram',
  'erDiagram',
  'gantt',
  'gitGraph',
  'mindmap',
  'journey',
])

export function getMermaidDiagramType(code = '') {
  const firstLine = String(code || '').trim().split(/\n/).find(Boolean) || ''
  return ALLOWED_MERMAID_PREFIXES.find((prefix) => firstLine.startsWith(prefix)) || null
}
