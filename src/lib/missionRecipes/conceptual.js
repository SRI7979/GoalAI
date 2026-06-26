const conceptualRecipe = {
  mode: 'conceptual',
  lengthTargetMinutes: 14,
  componentMix: {
    concept_explainer: 0.24,
    concept_map_build: 0.2,
    case_study_analyze: 0.16,
    worked_example: 0.14,
    reflection_prompt: 0.12,
    multiple_choice_quiz: 0.08,
    flashcard_drill: 0.06,
  },
  pacingRules: {
    minComponents: 4,
    maxComponents: 6,
    opener: 'concept_explainer',
    closer: 'reflection_prompt',
  },
}

export default conceptualRecipe
