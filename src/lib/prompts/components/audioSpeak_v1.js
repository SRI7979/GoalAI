import { buildExpansionComponentPrompt, getExpansionResponseFormat } from './expansionComponents_v1'

export const AUDIO_SPEAK_RESPONSE_FORMAT = getExpansionResponseFormat('audio_speak')

export function buildAudioSpeakPrompt(input) {
  return buildExpansionComponentPrompt('audio_speak', input)
}
