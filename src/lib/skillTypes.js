// ─── Skill Type Detection & Configuration ──────────────────────────────
// Detects the type of skill from the learning goal and provides
// per-type configuration for verification, UI, and AI evaluation.

const SKILL_PATTERNS = {
  coding: {
    keywords: ['python', 'javascript', 'react', 'programming', 'web dev', 'software', 'sql', 'html', 'css', 'typescript', 'java ', 'c++', 'rust', 'golang', 'swift', 'kotlin', 'ruby', 'php', 'node', 'django', 'flask', 'next.js', 'vue', 'angular', 'data structures', 'algorithms', 'machine learning', 'deep learning', 'devops', 'docker', 'kubernetes', 'git', 'frontend', 'backend', 'full stack', 'full-stack', 'mobile dev', 'android', 'ios', 'coding', 'code', 'api', 'database'],
    label: 'Coding',
    icon: '💻',
    verification: 'code',
    color: '#0ef5c2',
  },
  language: {
    keywords: ['spanish', 'french', 'german', 'japanese', 'chinese', 'korean', 'italian', 'portuguese', 'arabic', 'hindi', 'russian', 'mandarin', 'cantonese', 'dutch', 'swedish', 'thai', 'vietnamese', 'turkish', 'polish', 'esl', 'english as', 'language learning', 'speaking', 'fluency', 'conversational'],
    label: 'Language',
    icon: '🗣',
    verification: 'conversation',
    color: '#3B82F6',
  },
  math: {
    keywords: ['math', 'calculus', 'algebra', 'statistics', 'geometry', 'trigonometry', 'probability', 'linear algebra', 'differential', 'integral', 'number theory', 'discrete math', 'combinatorics', 'precalculus', 'sat math', 'gre math', 'arithmetic'],
    label: 'Math',
    icon: '➗',
    verification: 'solution',
    color: '#F59E0B',
  },
  music: {
    keywords: ['guitar', 'piano', 'drums', 'singing', 'bass guitar', 'ukulele', 'violin', 'music theory', 'composition', 'music production', 'beatmaking', 'songwriting', 'keyboard instrument', 'saxophone', 'flute', 'cello', 'vocal training'],
    label: 'Music',
    icon: '🎸',
    verification: 'practice',
    color: '#A855F7',
  },
  design: {
    keywords: ['ui design', 'ux design', 'figma', 'photoshop', 'illustrator', 'graphic design', 'web design', 'logo design', 'branding', 'typography', 'wireframe', 'prototype', 'visual design', 'motion design', '3d modeling', 'blender', 'user interface', 'user experience'],
    label: 'Design',
    icon: '🎨',
    verification: 'upload',
    color: '#EC4899',
  },
  business: {
    keywords: ['business', 'marketing', 'finance', 'entrepreneurship', 'management', 'startup', 'mba', 'accounting', 'economics', 'strategy', 'product management', 'sales', 'investing', 'consulting', 'leadership', 'negotiation', 'project management'],
    label: 'Business',
    icon: '💼',
    verification: 'written',
    color: '#10B981',
  },
  hardware: {
    keywords: ['arduino', 'raspberry pi', 'electronics', 'circuits', 'iot', 'embedded', 'microcontroller', 'sensor', 'robotics', 'pcb', 'soldering', 'electrical engineering', '3d printing', 'cad', 'mechanical'],
    label: 'Hardware',
    icon: '🤖',
    verification: 'output_log',
    color: '#EF4444',
  },
  writing: {
    keywords: ['writing', 'creative writing', 'essay', 'journalism', 'copywriting', 'content writing', 'technical writing', 'blogging', 'fiction', 'poetry', 'screenwriting', 'storytelling', 'editing', 'novel'],
    label: 'Writing',
    icon: '✍️',
    verification: 'written',
    color: '#8B5CF6',
  },
  science: {
    keywords: ['physics', 'chemistry', 'biology', 'astronomy', 'ecology', 'anatomy', 'neuroscience', 'genetics', 'biochemistry', 'organic chemistry', 'quantum', 'thermodynamics'],
    label: 'Science',
    icon: '🔬',
    verification: 'solution',
    color: '#06B6D4',
  },
}

/**
 * Detect the skill type from a learning goal string.
 * Scores each type by total matched keyword length (longer matches = more specific).
 */
export function detectSkillType(goal) {
  if (!goal) return 'coding'
  const lower = goal.toLowerCase()

  let bestType = null
  let bestScore = 0

  for (const [type, config] of Object.entries(SKILL_PATTERNS)) {
    let score = 0
    for (const kw of config.keywords) {
      if (lower.includes(kw)) score += kw.length
    }
    if (score > bestScore) {
      bestScore = score
      bestType = type
    }
  }

  return bestType || 'coding'
}

/** Get config for a skill type */
export function getSkillConfig(skillType) {
  return SKILL_PATTERNS[skillType] || {
    label: 'General',
    icon: '📚',
    verification: 'written',
    color: '#6B7280',
  }
}

/** Get the verification type for a skill */
export function getVerificationType(skillType) {
  return (SKILL_PATTERNS[skillType]?.verification) || 'written'
}

/** UI info for each verification type — used by ProjectViewer */
export const VERIFICATION_UI = {
  code: {
    label: 'Submit Your Code',
    icon: '💻',
    placeholder: 'Paste your code here...',
    submitLabel: 'Submit Code',
    passLabel: '✅ Code Passed',
    failLabel: '❌ Needs Work',
  },
  conversation: {
    label: 'Your Response',
    icon: '💬',
    placeholder: 'Write your response in the target language...',
    submitLabel: 'Submit Response',
    passLabel: '✅ Great Response!',
    failLabel: '💡 Keep Practicing',
  },
  solution: {
    label: 'Your Solution',
    icon: '📝',
    placeholder: 'Show your step-by-step reasoning...',
    submitLabel: 'Submit Solution',
    passLabel: '✅ Solution Correct',
    failLabel: '💡 Review Your Work',
  },
  written: {
    label: 'Your Response',
    icon: '✍️',
    placeholder: 'Write your detailed response...',
    submitLabel: 'Submit Response',
    passLabel: '✅ Well Written',
    failLabel: '💡 Needs More Depth',
  },
  upload: {
    label: 'Describe Your Design',
    icon: '🎨',
    placeholder: 'Describe your design decisions — layout, colors, typography, and reasoning...',
    submitLabel: 'Submit Description',
    passLabel: '✅ Design Reviewed',
    failLabel: '💡 Consider Revising',
  },
  practice: {
    label: 'Practice Reflection',
    icon: '🎯',
    placeholder: 'How did your practice go? What felt easy? What was challenging?',
    submitLabel: 'Submit Reflection',
    passLabel: '✅ Great Practice!',
    failLabel: '💡 Keep At It',
  },
  output_log: {
    label: 'Your Output',
    icon: '📊',
    placeholder: 'Paste your output, readings, or observations...',
    submitLabel: 'Submit Output',
    passLabel: '✅ Output Verified',
    failLabel: '💡 Check Your Setup',
  },
}

/** Reference material label per skill type (replaces "Starter Code") */
export function getReferenceMaterialLabel(skillType) {
  switch (skillType) {
    case 'coding': return '💻 Starter Code'
    case 'language': return '📖 Vocabulary & Grammar'
    case 'math': return '📐 Formulas & Data'
    case 'music': return '🎵 Notation & Reference'
    case 'design': return '📋 Design Brief'
    case 'business': return '📊 Scenario & Data'
    case 'hardware': return '🔧 Specs & Diagrams'
    case 'writing': return '📝 Prompt & Guidelines'
    case 'science': return '🔬 Background & Data'
    default: return '📚 Reference Material'
  }
}

export const SKILL_TYPES = SKILL_PATTERNS
