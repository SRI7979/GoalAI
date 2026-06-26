const proceduralRecipe = {
  mode: 'procedural',
  lengthTargetMinutes: 15,
  componentMix: {
    worked_example: 0.22,
    order_steps: 0.24,
    do_in_real_world: 0.22,
    image_identify: 0.12,
    reflection_prompt: 0.1,
    multiple_choice_quiz: 0.1,
  },
  pacingRules: {
    minComponents: 4,
    maxComponents: 7,
    opener: 'worked_example',
    closer: 'do_in_real_world',
  },
}

export default proceduralRecipe
