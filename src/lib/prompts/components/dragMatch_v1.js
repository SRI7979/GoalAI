import { buildExpansionComponentPrompt, getExpansionResponseFormat } from './expansionComponents_v1'

export const DRAG_MATCH_RESPONSE_FORMAT = getExpansionResponseFormat('drag_match')

export function buildDragMatchPrompt(input) {
  return buildExpansionComponentPrompt('drag_match', input)
}
