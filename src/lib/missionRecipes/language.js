const languageRecipe = {
  mode: 'language',
  lengthTargetMinutes: 15,
  componentMix: {
    audio_listen: 0.22,
    audio_speak: 0.22,
    roleplay_scenario: 0.18,
    flashcard_drill: 0.16,
    multiple_choice_quiz: 0.12,
    concept_explainer: 0.1,
    code_predictor: 0,
  },
  pacingRules: {
    minComponents: 4,
    maxComponents: 7,
    opener: 'audio_listen',
    closer: 'audio_speak',
  },
}

export default languageRecipe
