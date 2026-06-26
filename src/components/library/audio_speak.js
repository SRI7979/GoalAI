'use client'

import { AudioSpeak } from './expansionRenderers'
import { audioSpeakParamsSchema, componentSignalSchema } from './schemas'

const audioSpeakComponent = {
  type: 'audio_speak',
  paramsSchema: audioSpeakParamsSchema,
  signalSchema: componentSignalSchema,
  generatorPrompt: 'audioSpeak_v1',
  render: AudioSpeak,
}

export default audioSpeakComponent
