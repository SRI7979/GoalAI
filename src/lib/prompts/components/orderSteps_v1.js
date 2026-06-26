import { buildExpansionComponentPrompt, getExpansionResponseFormat } from './expansionComponents_v1'

export const ORDER_STEPS_RESPONSE_FORMAT = getExpansionResponseFormat('order_steps')

export function buildOrderStepsPrompt(input) {
  return buildExpansionComponentPrompt('order_steps', input)
}
