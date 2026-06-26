'use client'

import { ReflectionPrompt } from './expansionRenderers'
import { reflectionPromptParamsSchema, componentSignalSchema } from './schemas'

const reflectionPromptComponent = {
  type: 'reflection_prompt',
  paramsSchema: reflectionPromptParamsSchema,
  signalSchema: componentSignalSchema,
  generatorPrompt: 'reflectionPrompt_v1',
  render: ReflectionPrompt,
}

export default reflectionPromptComponent
