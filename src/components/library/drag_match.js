'use client'

import { DragMatch } from './expansionRenderers'
import { dragMatchParamsSchema, componentSignalSchema } from './schemas'

const dragMatchComponent = {
  type: 'drag_match',
  paramsSchema: dragMatchParamsSchema,
  signalSchema: componentSignalSchema,
  generatorPrompt: 'dragMatch_v1',
  render: DragMatch,
}

export default dragMatchComponent
