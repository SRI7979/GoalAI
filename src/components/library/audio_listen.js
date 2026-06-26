'use client'

import { AudioListen } from './expansionRenderers'
import { audioListenParamsSchema, componentSignalSchema } from './schemas'

const audioListenComponent = {
  type: 'audio_listen',
  paramsSchema: audioListenParamsSchema,
  signalSchema: componentSignalSchema,
  generatorPrompt: 'audioListen_v1',
  render: AudioListen,
}

export default audioListenComponent
