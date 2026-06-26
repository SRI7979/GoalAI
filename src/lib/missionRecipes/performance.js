const performanceRecipe = {
  mode: 'performance',
  lengthTargetMinutes: 15,
  componentMix: {
    worked_example: 0.22,
    case_study_analyze: 0.2,
    roleplay_scenario: 0.16,
    do_in_real_world: 0.14,
    multiple_choice_quiz: 0.1,
    reflection_prompt: 0.1,
    flashcard_drill: 0.08,
  },
  pacingRules: {
    minComponents: 4,
    maxComponents: 7,
    opener: 'worked_example',
    closer: 'reflection_prompt',
  },
}

export default performanceRecipe
