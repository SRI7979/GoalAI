import { buildExpansionComponentPrompt, getExpansionResponseFormat } from './expansionComponents_v1'

export const CONCEPT_MAP_BUILD_RESPONSE_FORMAT = getExpansionResponseFormat('concept_map_build')

export function buildConceptMapBuildPrompt(input) {
  return buildExpansionComponentPrompt('concept_map_build', input)
}
