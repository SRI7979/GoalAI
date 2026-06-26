'use client'

import { RoleplayScenario } from './expansionRenderers'
import { roleplayScenarioParamsSchema, componentSignalSchema } from './schemas'

const roleplayScenarioComponent = {
  type: 'roleplay_scenario',
  paramsSchema: roleplayScenarioParamsSchema,
  signalSchema: componentSignalSchema,
  generatorPrompt: 'roleplayScenario_v1',
  render: RoleplayScenario,
}

export default roleplayScenarioComponent
