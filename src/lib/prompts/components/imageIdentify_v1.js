import { buildExpansionComponentPrompt, getExpansionResponseFormat } from './expansionComponents_v1'

export const IMAGE_IDENTIFY_RESPONSE_FORMAT = getExpansionResponseFormat('image_identify')

export function buildImageIdentifyPrompt(input) {
  return buildExpansionComponentPrompt('image_identify', input)
}
