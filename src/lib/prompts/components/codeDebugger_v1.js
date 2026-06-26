import { buildExpansionComponentPrompt, getExpansionResponseFormat } from './expansionComponents_v1'

export const CODE_DEBUGGER_RESPONSE_FORMAT = getExpansionResponseFormat('code_debugger')

export function buildCodeDebuggerPrompt(input) {
  return buildExpansionComponentPrompt('code_debugger', input)
}
