'use client'

import { CodeDebugger } from './expansionRenderers'
import { codeDebuggerParamsSchema, componentSignalSchema } from './schemas'

const codeDebuggerComponent = {
  type: 'code_debugger',
  paramsSchema: codeDebuggerParamsSchema,
  signalSchema: componentSignalSchema,
  generatorPrompt: 'codeDebugger_v1',
  render: CodeDebugger,
}

export default codeDebuggerComponent
