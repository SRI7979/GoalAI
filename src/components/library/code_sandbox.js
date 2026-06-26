'use client'

import { CodeSandbox } from './expansionRenderers'
import { codeSandboxParamsSchema, componentSignalSchema } from './schemas'

const codeSandboxComponent = {
  type: 'code_sandbox',
  paramsSchema: codeSandboxParamsSchema,
  signalSchema: componentSignalSchema,
  generatorPrompt: 'codeSandbox_v1',
  render: CodeSandbox,
}

export default codeSandboxComponent
