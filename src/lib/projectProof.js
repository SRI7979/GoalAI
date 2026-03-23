import { getSkillConfig } from '@/lib/skillTypes'

const AUTHENTICITY_LEVELS = {
  verified: { label: 'Verified', color: '#34D399', icon: 'shield_check' },
  likely_genuine: { label: 'Likely Genuine', color: '#3B82F6', icon: 'badge' },
  suspicious: { label: 'Suspicious', color: '#F59E0B', icon: 'alert' },
  low_effort: { label: 'Low Effort', color: '#FF453A', icon: 'shield' },
}

export const PROJECT_REVIEW_CRITERIA = {
  coding: { c1: 'Originality', c2: 'Technical Depth', c3: 'Code Quality', expert: 'senior developer', expertLabel: 'How a Senior Developer Would Improve This', icons: ['lightbulb', 'layers', 'gauge'] },
  language: { c1: 'Fluency', c2: 'Grammar Accuracy', c3: 'Vocabulary Range', expert: 'language coach', expertLabel: 'How a Language Coach Would Improve This', icons: ['message', 'pen', 'book'] },
  math: { c1: 'Method Choice', c2: 'Reasoning Rigor', c3: 'Clarity of Work', expert: 'math mentor', expertLabel: 'How a Math Mentor Would Improve This', icons: ['target', 'brain', 'file'] },
  music: { c1: 'Technique', c2: 'Musicality', c3: 'Practice Discipline', expert: 'music instructor', expertLabel: 'How a Music Instructor Would Improve This', icons: ['music', 'audio', 'timer'] },
  design: { c1: 'Hierarchy', c2: 'Craft', c3: 'Usability', expert: 'product designer', expertLabel: 'How a Product Designer Would Improve This', icons: ['design', 'grid', 'sparkles'] },
  business: { c1: 'Strategic Depth', c2: 'Logic', c3: 'Actionability', expert: 'business strategist', expertLabel: 'How a Strategist Would Improve This', icons: ['briefcase', 'bar_chart', 'rocket'] },
  hardware: { c1: 'System Design', c2: 'Debugging', c3: 'Reliability', expert: 'hardware engineer', expertLabel: 'How an Engineer Would Improve This', icons: ['wrench', 'cpu', 'bot'] },
  writing: { c1: 'Voice', c2: 'Structure', c3: 'Engagement', expert: 'editor', expertLabel: 'How an Editor Would Improve This', icons: ['pen', 'layers', 'sparkles'] },
  science: { c1: 'Scientific Rigor', c2: 'Methodology', c3: 'Interpretation', expert: 'research scientist', expertLabel: 'How a Research Scientist Would Improve This', icons: ['microscope', 'flask', 'line_chart'] },
  general: { c1: 'Originality', c2: 'Depth', c3: 'Execution', expert: 'mentor', expertLabel: 'How a Professional Would Improve This', icons: ['lightbulb', 'layers', 'gauge'] },
}

const VERIFICATION_PLANS = {
  coding: {
    summary: 'Verified through code output, structure checks, and explain-your-choices defense questions.',
    layers: [
      { id: 'artifact', title: 'Artifact', description: 'Runnable code and required outputs are validated.' },
      { id: 'process', title: 'Process', description: 'Step evidence, time spent, and iteration patterns are tracked.' },
      { id: 'defense', title: 'Defense', description: 'Checkpoint questions verify understanding of implementation decisions.' },
    ],
  },
  language: {
    summary: 'Verified through applied responses, scenario coverage, and language-defense prompts about grammar and phrasing.',
    layers: [
      { id: 'artifact', title: 'Artifact', description: 'Written or conversational responses show usable language output.' },
      { id: 'process', title: 'Process', description: 'Scenario completion, vocabulary range, and practice depth are tracked.' },
      { id: 'defense', title: 'Defense', description: 'Follow-up questions verify why the learner chose a phrase or grammar pattern.' },
    ],
  },
  math: {
    summary: 'Verified through step-by-step work, solution quality, and defense checks on method choice.',
    layers: [
      { id: 'artifact', title: 'Artifact', description: 'Step-by-step reasoning and final solution are evaluated.' },
      { id: 'process', title: 'Process', description: 'Work pacing, retries, and checkpoint progression are tracked.' },
      { id: 'defense', title: 'Defense', description: 'Checkpoint questions test why a method was used, not just the answer.' },
    ],
  },
  music: {
    summary: 'Verified through practice evidence, self-check criteria, and reflection on technique and consistency.',
    layers: [
      { id: 'artifact', title: 'Artifact', description: 'Practice checklist and reflection capture tangible session output.' },
      { id: 'process', title: 'Process', description: 'Practice pacing, checkpoints, and repetition evidence are tracked.' },
      { id: 'defense', title: 'Defense', description: 'Reflection and checkpoints verify what improved and what still needs work.' },
    ],
  },
  design: {
    summary: 'Verified through design rationale, structured critique, and proof that decisions match constraints.',
    layers: [
      { id: 'artifact', title: 'Artifact', description: 'Design decisions and outputs are evaluated against the brief.' },
      { id: 'process', title: 'Process', description: 'Iterative thinking, design checkpoints, and rationale depth are tracked.' },
      { id: 'defense', title: 'Defense', description: 'The learner explains hierarchy, usability, and tradeoff choices.' },
    ],
  },
  business: {
    summary: 'Verified through analysis quality, evidence use, and defense of strategic recommendations.',
    layers: [
      { id: 'artifact', title: 'Artifact', description: 'Written plan, memo, or report is evaluated for depth and clarity.' },
      { id: 'process', title: 'Process', description: 'Evidence use, iteration, and completion pacing are tracked.' },
      { id: 'defense', title: 'Defense', description: 'Checkpoint prompts test logic behind the recommendation.' },
    ],
  },
  hardware: {
    summary: 'Verified through output logs, behavior checks, and troubleshooting defense questions.',
    layers: [
      { id: 'artifact', title: 'Artifact', description: 'Observed outputs are compared against expected hardware behavior.' },
      { id: 'process', title: 'Process', description: 'Wiring/test progression and troubleshooting patterns are tracked.' },
      { id: 'defense', title: 'Defense', description: 'Follow-up prompts verify what the system should do and why.' },
    ],
  },
  writing: {
    summary: 'Verified through written output, revision patterns, and defense of structural and stylistic choices.',
    layers: [
      { id: 'artifact', title: 'Artifact', description: 'The written piece is evaluated for craft and completion.' },
      { id: 'process', title: 'Process', description: 'Drafting depth, revisions, and pacing are tracked.' },
      { id: 'defense', title: 'Defense', description: 'Prompts check why the learner chose certain structure or stylistic decisions.' },
    ],
  },
  science: {
    summary: 'Verified through scientific reasoning, analysis artifacts, and defense of interpretation choices.',
    layers: [
      { id: 'artifact', title: 'Artifact', description: 'Hypotheses, analysis, and conclusions are evaluated.' },
      { id: 'process', title: 'Process', description: 'Method progression, data work, and pacing are tracked.' },
      { id: 'defense', title: 'Defense', description: 'Checkpoint prompts verify method and conclusion logic.' },
    ],
  },
  general: {
    summary: 'Verified through submitted work, process evidence, and defense questions tied to the project.',
    layers: [
      { id: 'artifact', title: 'Artifact', description: 'The final work is evaluated against the project brief.' },
      { id: 'process', title: 'Process', description: 'Time, evidence, and completion behavior are tracked.' },
      { id: 'defense', title: 'Defense', description: 'Checkpoint questions verify understanding of the work.' },
    ],
  },
}

function clamp(value, min, max, fallback = 0) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.max(min, Math.min(max, numeric))
}

function average(values, fallback = 0) {
  if (!Array.isArray(values) || values.length === 0) return fallback
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function sumObjectValues(input = {}) {
  return Object.values(input).reduce((sum, value) => sum + (Number(value) || 0), 0)
}

export function getProjectReviewCriteria(skillType = 'general') {
  return PROJECT_REVIEW_CRITERIA[skillType] || PROJECT_REVIEW_CRITERIA.general
}

export function getProjectCriteriaCards(review = {}, skillType = 'general') {
  const criteria = getProjectReviewCriteria(skillType)
  const safeReview = review || {}
  return [
    { label: criteria.c1, score: safeReview.originality_score, icon: criteria.icons?.[0] || 'lightbulb' },
    { label: criteria.c2, score: safeReview.complexity_score, icon: criteria.icons?.[1] || 'layers' },
    { label: criteria.c3, score: safeReview.efficiency_score, icon: criteria.icons?.[2] || 'gauge' },
  ].filter((item) => item.score !== null && item.score !== undefined)
}

export function getProjectVerificationPlan(skillType = 'general', mode = 'guided') {
  const basePlan = VERIFICATION_PLANS[skillType] || VERIFICATION_PLANS.general
  const modeSummary = mode === 'build'
    ? 'Build Mode raises the independence bar and gives more weight to self-directed execution.'
    : 'Guided Mode still verifies real understanding, but allows more scaffolding during execution.'
  return {
    ...basePlan,
    modeSummary,
  }
}

export function getAuthenticityLevel(score = 0) {
  if (score >= 85) return { key: 'verified', ...AUTHENTICITY_LEVELS.verified }
  if (score >= 70) return { key: 'likely_genuine', ...AUTHENTICITY_LEVELS.likely_genuine }
  if (score >= 45) return { key: 'suspicious', ...AUTHENTICITY_LEVELS.suspicious }
  return { key: 'low_effort', ...AUTHENTICITY_LEVELS.low_effort }
}

function getSubmissionEntries(project, overrides = {}) {
  const progress = project?.progress || {}
  const codeSubmissions = overrides.codeSubmissions || progress.code_submissions || {}
  const responseSubmissions = overrides.responseSubmissions || progress.response_submissions || {}
  return {
    codeSubmissions,
    responseSubmissions,
    allSubmissions: { ...codeSubmissions, ...responseSubmissions },
  }
}

function getTimingMetrics(project, overrides = {}) {
  const progress = project?.progress || {}
  const timeTracking = overrides.timeTracking || progress.time_tracking || {}
  const startedAt = progress.started_at
  const completedAt = progress.completed_at
  const stepTimes = Object.values(timeTracking)
    .map((value) => clamp(value, 0, 60 * 60 * 8, 0))
    .filter((value) => value > 0)

  const trackedSeconds = stepTimes.reduce((sum, value) => sum + value, 0)
  const sessionSeconds = startedAt && completedAt
    ? Math.max(0, Math.round((new Date(completedAt) - new Date(startedAt)) / 1000))
    : 0
  const actualSeconds = Math.max(trackedSeconds, sessionSeconds)
  const expectedSeconds = Math.max(60, (Number(project?.estimated_minutes) || 60) * 60)
  const timeRatio = expectedSeconds > 0 ? actualSeconds / expectedSeconds : 1
  const avgStepTime = average(stepTimes, 0)
  const ultraFastSteps = stepTimes.filter((value) => value < 5).length
  const stepTimeVariance = stepTimes.length > 0
    ? average(stepTimes.map((value) => Math.pow(value - avgStepTime, 2)))
    : 0

  return {
    timeTracking,
    stepTimes,
    trackedSeconds,
    sessionSeconds,
    actualSeconds,
    expectedSeconds,
    timeRatio,
    avgStepTime,
    ultraFastSteps,
    stepTimeVariance,
  }
}

export function calculateProjectAuthenticity(project, overrides = {}) {
  const steps = Array.isArray(project?.steps) ? project.steps : []
  const progress = project?.progress || {}
  const completedSteps = Array.isArray(progress.steps_completed) ? progress.steps_completed : []
  const totalSteps = Math.max(steps.length, 1)
  const stepVerification = progress.step_verification || {}
  const verificationEntries = Object.values(stepVerification)
  const requiredSubmissionSteps = steps.filter((step) => step.requires_code || step.requires_response || step.requires_practice)
  const { codeSubmissions, responseSubmissions, allSubmissions } = getSubmissionEntries(project, overrides)
  const checkpointResults = progress.checkpoint_results || {}
  const aiUsage = progress.ai_usage || {}
  const hintsUsed = clamp(progress.hints_used, 0, 999, 0)
  const mode = project?.mode || 'guided'
  const timing = getTimingMetrics(project, overrides)
  const completedRatio = clamp(completedSteps.length / totalSteps, 0, 1, 0)
  const submissionCoverage = requiredSubmissionSteps.length > 0
    ? clamp(Object.keys(allSubmissions).length / requiredSubmissionSteps.length, 0, 1, 0)
    : completedRatio
  const verifiedSubmissionRate = Object.values(allSubmissions).length > 0
    ? average(Object.values(allSubmissions).map((submission) => (submission?.validated || submission?.passed) ? 1 : 0), 0)
    : 0
  const totalAiUsage = sumObjectValues(aiUsage)
  const expectedCheckpointCount = steps.filter((step) => step.checkpoint).length
  const checkpointCoverage = expectedCheckpointCount > 0
    ? clamp(Object.keys(checkpointResults).length / expectedCheckpointCount, 0, 1, 0)
    : completedRatio
  const checkpointPassRate = Object.values(checkpointResults).length > 0
    ? average(Object.values(checkpointResults).map((checkpoint) => checkpoint?.passed ? 1 : 0), 0)
    : 0
  const submissionAttempts = Object.values(allSubmissions).map((submission) => clamp(submission?.attempts || submission?.submission_count || 1, 1, 20, 1))
  const avgSubmissionAttempts = average(submissionAttempts, 1)
  const suspiciousFlags = verificationEntries.flatMap((verification) => verification?.suspicious_flags || [])
  const suspiciousPenaltyCount = suspiciousFlags.length
  const totalPasteCount = verificationEntries.reduce((sum, verification) => sum + clamp(verification?.paste_count, 0, 20, 0), 0)
  const averageRunCount = average(verificationEntries.map((verification) => clamp(verification?.run_count, 0, 20, 0)).filter((value) => value > 0), 1)
  const verifiedStepRate = verificationEntries.length > 0
    ? average(verificationEntries.map((verification) => verification?.verified_at ? 1 : 0), 0)
    : completedRatio

  const processDepth = clamp(
    (completedRatio * 35) +
    (submissionCoverage * 25) +
    ((timing.stepTimes.length > 0 ? Math.min(1, timing.stepTimes.length / totalSteps) : 0) * 20) +
    (checkpointCoverage * 10) +
    (verifiedStepRate * 10),
    0,
    100,
    0,
  )

  const evidenceCoverage = clamp(
    (submissionCoverage * 55) +
    (verifiedSubmissionRate * 25) +
    (completedRatio * 10) +
    (verifiedStepRate * 10),
    0,
    100,
    0,
  )

  const helpRate = (hintsUsed + totalAiUsage) / Math.max(totalSteps, 1)
  const helpPenaltyMultiplier = mode === 'build' ? 22 : 16
  const independence = clamp(
    100 - (helpRate * helpPenaltyMultiplier) - (hintsUsed * 2.5) - (mode === 'build' ? totalAiUsage * 3 : totalAiUsage * 2),
    15,
    100,
    65,
  )

  let timingRealism = 70
  if (timing.actualSeconds <= 0) timingRealism = 38
  else if (timing.timeRatio < 0.1) timingRealism = 10
  else if (timing.timeRatio < 0.25) timingRealism = 35
  else if (timing.timeRatio < 0.45) timingRealism = 65
  else if (timing.timeRatio <= 2.8) timingRealism = 92
  else if (timing.timeRatio <= 4.5) timingRealism = 72
  else timingRealism = 52

  const revisionQuality = clamp(
    55 +
    Math.min(20, Math.max(0, avgSubmissionAttempts - 1) * 12) +
    Math.min(10, Math.max(0, averageRunCount - 1) * 5) +
    (timing.stepTimeVariance > 200 ? 10 : 0) +
    (checkpointCoverage > 0.5 ? 8 : 0),
    25,
    95,
    55,
  )

  const defenseConsistency = clamp(
    (checkpointPassRate * 55) +
    (verifiedSubmissionRate * 25) +
    (verifiedStepRate * 10) +
    ((progress?.status === 'reviewed' || project?.status === 'reviewed' || project?.ai_review) ? 20 : 0),
    20,
    100,
    40,
  )

  const novelty = clamp(
    58 +
    (project?.variant_seed ? 14 : 0) +
    (mode === 'build' ? 10 : 0) +
    (project?.title && !/project|assignment|practice/i.test(project.title) ? 10 : 0),
    35,
    95,
    60,
  )

  const penalties = []
  if (timing.timeRatio > 0 && timing.timeRatio < 0.1) penalties.push({ label: 'Completed unusually fast', points: 25 })
  if (timing.stepTimes.length > 0 && timing.ultraFastSteps > timing.stepTimes.length * 0.7) penalties.push({ label: 'Most steps were completed in under 5 seconds', points: 18 })
  if (submissionCoverage < 0.4 && requiredSubmissionSteps.length > 0) penalties.push({ label: 'Missing proof submissions on key steps', points: 16 })
  if (checkpointCoverage > 0 && checkpointPassRate < 0.45) penalties.push({ label: 'Weak defense/checkpoint performance', points: 10 })
  if (totalAiUsage > totalSteps * 4) penalties.push({ label: 'Very high AI dependence', points: mode === 'build' ? 14 : 9 })
  if (timing.actualSeconds <= 0) penalties.push({ label: 'Missing usable timing data', points: 10 })
  if (suspiciousPenaltyCount > 0) penalties.push({ label: 'Suspicious verification signals detected', points: Math.min(18, suspiciousPenaltyCount * 4) })
  if (totalPasteCount >= totalSteps * 2) penalties.push({ label: 'Heavy paste behavior reduced trust', points: mode === 'build' ? 14 : 9 })

  const totalPenalty = penalties.reduce((sum, penalty) => sum + penalty.points, 0)
  const weightedScore = (
    (processDepth * 0.25) +
    (evidenceCoverage * 0.20) +
    (independence * 0.15) +
    (timingRealism * 0.15) +
    (revisionQuality * 0.10) +
    (defenseConsistency * 0.10) +
    (novelty * 0.05)
  )

  const score = clamp(Math.round(weightedScore - totalPenalty), 0, 100, 0)
  const level = getAuthenticityLevel(score)

  const verificationLayers = [
    {
      id: 'artifact',
      title: 'Artifact',
      passed: evidenceCoverage >= 70 && verifiedSubmissionRate >= 0.55,
      confidence: evidenceCoverage >= 85 ? 'high' : evidenceCoverage >= 65 ? 'medium' : 'low',
    },
    {
      id: 'process',
      title: 'Process',
      passed: processDepth >= 70 && timingRealism >= 60,
      confidence: processDepth >= 85 ? 'high' : processDepth >= 65 ? 'medium' : 'low',
    },
    {
      id: 'defense',
      title: 'Defense',
      passed: defenseConsistency >= 70,
      confidence: defenseConsistency >= 85 ? 'high' : defenseConsistency >= 65 ? 'medium' : 'low',
    },
  ]

  const positives = []
  if (timing.timeRatio >= 0.45 && timing.timeRatio <= 2.8) positives.push('Realistic completion time')
  if (submissionCoverage >= 0.8) positives.push('Strong evidence coverage across required steps')
  if (checkpointPassRate >= 0.75 && expectedCheckpointCount > 0) positives.push('Strong checkpoint and defense performance')
  if (mode === 'build') positives.push('Completed in Build Mode with higher independence expectations')
  if (verifiedSubmissionRate >= 0.75) positives.push('Submitted work passed most verifier checks')
  if (verifiedStepRate >= 0.9) positives.push('Most project steps were fully verified end-to-end')
  if (totalPasteCount === 0 && averageRunCount > 1) positives.push('Iteration pattern looks like genuine problem solving')

  return {
    score,
    label: level.label,
    labelKey: level.key,
    labelColor: level.color,
    icon: level.icon,
    summary: `${level.label} proof based on artifact quality, process evidence, and skill defense.`,
    breakdown: [
      { key: 'process', label: 'Process Depth', score: Math.round(processDepth) },
      { key: 'evidence', label: 'Evidence Coverage', score: Math.round(evidenceCoverage) },
      { key: 'independence', label: 'Independence', score: Math.round(independence) },
      { key: 'timing', label: 'Timing Realism', score: Math.round(timingRealism) },
      { key: 'revision', label: 'Revision Quality', score: Math.round(revisionQuality) },
      { key: 'defense', label: 'Defense Consistency', score: Math.round(defenseConsistency) },
      { key: 'novelty', label: 'Novelty', score: Math.round(novelty) },
    ],
    flags: penalties.map((penalty) => penalty.label),
    positives,
    verificationLayers,
    metrics: {
      completedRatio,
      submissionCoverage,
      verifiedSubmissionRate,
      checkpointCoverage,
      checkpointPassRate,
      totalAiUsage,
      hintsUsed,
      suspiciousSignals: suspiciousPenaltyCount,
      pasteCount: totalPasteCount,
      averageRunCount: Number(averageRunCount.toFixed(2)),
      timeRatio: Number(timing.timeRatio.toFixed(2)),
      actualMinutes: Math.round(timing.actualSeconds / 60),
      expectedMinutes: Math.round(timing.expectedSeconds / 60),
      avgSubmissionAttempts: Number(avgSubmissionAttempts.toFixed(2)),
    },
  }
}

export function buildProjectProofSummary(project, authenticityResult = null) {
  const skillType = project?.skill_type || 'general'
  const skill = getSkillConfig(skillType)
  const verificationPlan = getProjectVerificationPlan(skillType, project?.mode || 'guided')
  const meta = project?.progress?.project_brief || {}
  const authenticity = authenticityResult || project?.progress?.authenticity || null

  return {
    skillType,
    skillLabel: skill.label,
    skillIcon: skill.icon,
    finalDeliverable: meta.final_deliverable || project?.deliverables?.[0] || project?.title,
    realWorldContext: meta.real_world_context || project?.description,
    verificationSummary: meta.verification_summary || verificationPlan.summary,
    verificationLayers: authenticity?.verificationLayers || verificationPlan.layers.map((layer) => ({ ...layer, passed: false, confidence: 'pending' })),
    authenticityScore: authenticity?.score ?? project?.authenticity_score ?? null,
    authenticityLabel: authenticity?.label || (project?.authenticity_score != null ? getAuthenticityLevel(project.authenticity_score).label : null),
    mode: project?.mode || 'guided',
  }
}
