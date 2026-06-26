import { buildExpansionComponentPrompt, getExpansionResponseFormat } from './expansionComponents_v1'

export const CASE_STUDY_ANALYZE_RESPONSE_FORMAT = getExpansionResponseFormat('case_study_analyze')

export function buildCaseStudyAnalyzePrompt(input) {
  return buildExpansionComponentPrompt('case_study_analyze', input)
}
