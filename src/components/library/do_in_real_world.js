'use client'

import { DoInRealWorld } from './expansionRenderers'
import { doInRealWorldParamsSchema, componentSignalSchema } from './schemas'

const doInRealWorldComponent = {
  type: 'do_in_real_world',
  paramsSchema: doInRealWorldParamsSchema,
  signalSchema: componentSignalSchema,
  generatorPrompt: 'doInRealWorld_v1',
  render: DoInRealWorld,
}

export default doInRealWorldComponent
