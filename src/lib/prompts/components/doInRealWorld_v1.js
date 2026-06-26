import { buildExpansionComponentPrompt, getExpansionResponseFormat } from './expansionComponents_v1'

export const DO_IN_REAL_WORLD_RESPONSE_FORMAT = getExpansionResponseFormat('do_in_real_world')

export function buildDoInRealWorldPrompt(input) {
  return buildExpansionComponentPrompt('do_in_real_world', input)
}
