const skillBuildRecipe = {
  mode: 'skill_build',
  lengthTargetMinutes: 15,
  componentMix: {
    concept_explainer: 0.14,
    worked_example: 0.16,
    code_sandbox: 0.2,
    code_debugger: 0.12,
    code_predictor: 0.12,
    multiple_choice_quiz: 0.1,
    reflection_prompt: 0.08,
    flashcard_drill: 0.08,
  },
  pacingRules: {
    minComponents: 4,
    maxComponents: 7,
    opener: 'concept_explainer',
    closer: 'flashcard_drill',
  },
}

export default skillBuildRecipe
