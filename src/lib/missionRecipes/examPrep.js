const examPrepRecipe = {
  mode: 'exam_prep',
  lengthTargetMinutes: 16,
  componentMix: {
    worked_example: 0.18,
    timed_problem_set: 0.24,
    mock_exam: 0.2,
    multiple_choice_quiz: 0.16,
    flashcard_drill: 0.12,
    reflection_prompt: 0.06,
    concept_explainer: 0.04,
  },
  pacingRules: {
    minComponents: 5,
    maxComponents: 7,
    opener: 'worked_example',
    closer: 'flashcard_drill',
  },
}

export default examPrepRecipe
