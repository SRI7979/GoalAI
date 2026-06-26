export const PROOF_TARGET_RESPONSE_FORMAT = { type: 'json_object' }
export const PROOF_EVALUATION_RESPONSE_FORMAT = { type: 'json_object' }

export function buildProofTargetPrompt({ goal = {}, decomposition = {} } = {}) {
  return [
    'Create a PathAI proof-of-mastery target for one learning goal.',
    'Return JSON only: { mode, description, evaluationType, passCriteria, rubric }.',
    'evaluationType must be one of: artifact_submission, timed_mock_exam, live_conversation, photo_video_proof, novel_application, ranked_performance, streak_maintained.',
    'rubric must be 3-5 items: { id, label, description, weight, passLevel } where weights sum roughly to 100.',
    'The proof must be concrete, verifiable, and shown to the learner upfront as the finish line.',
    'For coding/web goals, prefer artifact_submission and require a working deployed or runnable project.',
    'Do not ask for vague completion. The learner must produce evidence.',
    '',
    `Goal: ${goal.goal_text || goal.goalText || decomposition.cleanedGoalText || 'Learning goal'}`,
    `Primary mode: ${goal.primary_mode || goal.primaryMode || decomposition.primaryMode || 'skill_build'}`,
    `Secondary modes: ${JSON.stringify(goal.secondary_modes || goal.secondaryModes || decomposition.secondaryModes || [])}`,
    `Top concepts: ${JSON.stringify(decomposition.topLevelConcepts || [])}`,
  ].join('\n')
}

export function buildProofEvaluationPrompt({ goal = {}, proofTarget = {}, submission = {} } = {}) {
  return [
    'Evaluate a PathAI proof-of-mastery submission.',
    'Return JSON only: { passed, score, feedback, rubricResults, strengths, gaps, nextSteps }.',
    'score is 0-100. passed should be true only if score >= 75 and the evidence satisfies the proof target.',
    'rubricResults must mirror the rubric ids: { id, score, passed, feedback }.',
    'Be strict about real evidence, but constructive.',
    '',
    `Goal: ${goal.goal_text || goal.goalText || 'Learning goal'}`,
    `Proof target: ${JSON.stringify(proofTarget)}`,
    `Submission: ${JSON.stringify(submission).slice(0, 8000)}`,
  ].join('\n')
}
