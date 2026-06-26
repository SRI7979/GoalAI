const knowledgeMasteryRecipe = {
  mode: 'knowledge_mastery',
  lengthTargetMinutes: 15,
  componentMix: {
    concept_explainer: 0.22,
    concept_map_build: 0.16,
    multiple_choice_quiz: 0.16,
    drag_match: 0.12,
    image_identify: 0.1,
    flashcard_drill: 0.1,
    case_study_analyze: 0.08,
    reflection_prompt: 0.06,
  },
  pacingRules: {
    minComponents: 4,
    maxComponents: 7,
    opener: 'concept_explainer',
    closer: 'flashcard_drill',
  },
}

export default knowledgeMasteryRecipe
