import { buildExpansionComponentPrompt, getExpansionResponseFormat } from './expansionComponents_v1'

export const TIMED_PROBLEM_SET_RESPONSE_FORMAT = getExpansionResponseFormat('timed_problem_set')

export function buildTimedProblemSetPrompt(input) {
  return buildExpansionComponentPrompt('timed_problem_set', input)
}
