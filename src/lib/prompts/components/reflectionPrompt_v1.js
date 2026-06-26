import { buildExpansionComponentPrompt, getExpansionResponseFormat } from './expansionComponents_v1'

export const REFLECTION_PROMPT_RESPONSE_FORMAT = getExpansionResponseFormat('reflection_prompt')

export function buildReflectionPromptPrompt(input) {
  return buildExpansionComponentPrompt('reflection_prompt', input)
}
