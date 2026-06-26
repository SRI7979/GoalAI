const habitRecipe = {
  mode: 'habit',
  lengthTargetMinutes: 12,
  componentMix: {
    concept_explainer: 0.18,
    reflection_prompt: 0.3,
    do_in_real_world: 0.24,
    flashcard_drill: 0.16,
    multiple_choice_quiz: 0.08,
    worked_example: 0.04,
  },
  pacingRules: {
    minComponents: 4,
    maxComponents: 6,
    opener: 'concept_explainer',
    closer: 'reflection_prompt',
  },
}

export default habitRecipe
