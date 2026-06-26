import { buildExpansionComponentPrompt, getExpansionResponseFormat } from './expansionComponents_v1'

export const ROLEPLAY_SCENARIO_RESPONSE_FORMAT = getExpansionResponseFormat('roleplay_scenario')

export function buildRoleplayScenarioPrompt(input) {
  return buildExpansionComponentPrompt('roleplay_scenario', input)
}
