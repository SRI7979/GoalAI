import { codePredictorParamsSchema } from '@/components/library/schemas'

export const CODE_PREDICTOR_RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'pathai_code_predictor_v1',
    strict: true,
    schema: codePredictorParamsSchema,
  },
}

const LANGUAGE_HINTS = [
  { label: 'Python', pattern: /\b(python|py)\b/i },
  { label: 'JavaScript', pattern: /\b(javascript|js|node)\b/i },
  { label: 'SQL', pattern: /\b(sql|select|database query)\b/i },
  { label: 'Bash', pattern: /\b(bash|shell|terminal|command piping|pipe)\b/i },
  { label: 'Rust', pattern: /\b(rust|borrow checker|cargo)\b/i },
]

export function detectRequestedCodeLanguage(concept = '') {
  const normalized = String(concept || '')
  return LANGUAGE_HINTS.find((hint) => hint.pattern.test(normalized))?.label || null
}

export function detectGeneratedCodeLanguage(params = {}) {
  const language = String(params?.language || '').toLowerCase()
  const code = String(params?.code || '')
  const lowerCode = code.toLowerCase()

  if (language.includes('python') || /\bprint\(|^\s*(def|for|while|if)\s+[\w_].*:/m.test(code)) return 'Python'
  if (language.includes('javascript') || language === 'js' || /\b(console\.log|const |let |var |function\b|=>)\b/.test(code)) return 'JavaScript'
  if (language.includes('sql') || /^\s*(select|insert|update|delete|with)\b/i.test(code)) return 'SQL'
  if (language.includes('bash') || language.includes('shell') || /(^|\n)\s*(echo|printf|cat|grep|awk|sed|ls|pwd)\b/.test(code) || code.includes('|')) return 'Bash'
  if (language.includes('rust') || /\b(fn main|println!|let mut|&mut|cargo)\b/.test(lowerCode)) return 'Rust'

  return null
}

export function buildCodePredictorFallback({ concept = 'code', requestedLanguage = null } = {}) {
  const language = requestedLanguage || detectRequestedCodeLanguage(concept) || 'JavaScript'
  const fallbacks = {
    Python: {
      code: 'items = [10, 20, 30]\nprint(items[1])',
      language: 'Python',
      question: 'What does this code output?',
      options: ['10', '20', '30', '1'],
      correctIndex: 1,
      explanation: 'Python lists start at index 0, so items[1] is the second value: 20.',
    },
    JavaScript: {
      code: 'const items = [10, 20, 30];\nconsole.log(items[1]);',
      language: 'JavaScript',
      question: 'What does this code output?',
      options: ['10', '20', '30', '1'],
      correctIndex: 1,
      explanation: 'JavaScript arrays start at index 0, so items[1] is the second value: 20.',
    },
    SQL: {
      code: 'SELECT name FROM students WHERE id = 2;',
      language: 'SQL',
      question: 'What does this query return?',
      options: ['The name for student id 2', 'All student rows', 'Only the id column', 'A table named id'],
      correctIndex: 0,
      explanation: 'The SELECT clause asks for name, and WHERE id = 2 filters to the row with id 2.',
    },
    Bash: {
      code: "printf 'hi' | wc -c",
      language: 'Bash',
      question: 'What does this command output?',
      options: ['2', 'hi', '1', '0'],
      correctIndex: 0,
      explanation: "printf writes hi, and wc -c counts the two characters flowing through the pipe.",
    },
    Rust: {
      code: 'fn main() {\n    let x = 3;\n    println!("{}", x);\n}',
      language: 'Rust',
      question: 'What does this code output?',
      options: ['3', 'x', '{}', 'Nothing'],
      correctIndex: 0,
      explanation: 'println! prints the value stored in x, which is 3.',
    },
  }

  return fallbacks[language] || fallbacks.JavaScript
}

export function buildCodePredictorPrompt({
  concept = 'JavaScript variables',
  goalText = 'Learn JavaScript from scratch',
  validationFeedback = '',
} = {}) {
  const requestedLanguage = detectRequestedCodeLanguage(concept)
  return [
    'Create params for PathAI component type code_predictor.',
    'Return exactly one schema-valid JSON object.',
    `Goal: ${goalText}`,
    `Concept: ${concept}`,
    requestedLanguage ? `Required language: ${requestedLanguage}` : 'Required language: infer from the concept; default only if no language is named.',
    '',
    'Hard rule: If the concept mentions a specific language, the code MUST be in that language. Do not default to JavaScript.',
    'Set the language field to the actual language used by the snippet.',
    'Ask what the code outputs. Provide 3-5 options and one correct answer.',
    'The explanation should walk through the code in beginner-safe language.',
    validationFeedback ? `Previous validation feedback: ${validationFeedback}` : null,
  ].filter(Boolean).join('\n')
}
