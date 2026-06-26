import { buildExpansionComponentPrompt, getExpansionResponseFormat } from './expansionComponents_v1'

export const MOCK_EXAM_RESPONSE_FORMAT = getExpansionResponseFormat('mock_exam')

export function buildMockExamPrompt(input) {
  return buildExpansionComponentPrompt('mock_exam', input)
}
