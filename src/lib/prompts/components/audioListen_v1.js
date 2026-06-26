import { buildExpansionComponentPrompt, getExpansionResponseFormat } from './expansionComponents_v1'

export const AUDIO_LISTEN_RESPONSE_FORMAT = getExpansionResponseFormat('audio_listen')

export function buildAudioListenPrompt(input) {
  return buildExpansionComponentPrompt('audio_listen', input)
}
