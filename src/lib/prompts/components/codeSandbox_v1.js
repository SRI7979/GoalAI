import { buildExpansionComponentPrompt, getExpansionResponseFormat } from './expansionComponents_v1'

export const CODE_SANDBOX_RESPONSE_FORMAT = getExpansionResponseFormat('code_sandbox')

export function buildCodeSandboxPrompt(input) {
  return buildExpansionComponentPrompt('code_sandbox', input)
}
