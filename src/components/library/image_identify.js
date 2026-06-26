'use client'

import { ImageIdentify } from './expansionRenderers'
import { imageIdentifyParamsSchema, componentSignalSchema } from './schemas'

const imageIdentifyComponent = {
  type: 'image_identify',
  paramsSchema: imageIdentifyParamsSchema,
  signalSchema: componentSignalSchema,
  generatorPrompt: 'imageIdentify_v1',
  render: ImageIdentify,
}

export default imageIdentifyComponent
