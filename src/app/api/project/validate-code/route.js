import { getSupabaseServerClient } from '@/lib/supabaseServer'

function extractAccessToken(request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!authHeader) return null
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim() || null
}

// Basic code validation — checks for expected patterns and structure
function validateCode(code, step, language) {
  const checks = []
  const normalizedCode = code.toLowerCase().replace(/\s+/g, ' ')

  // Auto-detect validation rules from step concepts and description
  const keywords = extractExpectedKeywords(step, language)

  for (const kw of keywords) {
    const found = normalizedCode.includes(kw.pattern.toLowerCase())
    checks.push({
      name: kw.name,
      passed: found,
      message: found ? kw.successMsg : kw.failMsg,
    })
  }

  // Structure checks
  if (code.trim().length < 15) {
    checks.push({
      name: 'Code Length',
      passed: false,
      message: 'Code seems too short — make sure you\'ve written the full implementation',
    })
  } else {
    checks.push({
      name: 'Code Length',
      passed: true,
      message: 'Code has sufficient content',
    })
  }

  // Check for common copy-paste indicators
  if (code.includes('TODO') || code.includes('FIXME') || code.includes('your code here')) {
    checks.push({
      name: 'Completeness',
      passed: false,
      message: 'Found placeholder comments — replace them with your actual code',
    })
  }

  const passedCount = checks.filter(c => c.passed).length
  const totalChecks = checks.length
  const score = totalChecks > 0 ? Math.round((passedCount / totalChecks) * 100) : 0
  const passed = score >= 60

  return { passed, score, checks, passedCount, totalChecks }
}

// Extract expected keywords based on step content and language
function extractExpectedKeywords(step, language) {
  const keywords = []
  const desc = (step.description || '').toLowerCase()
  const title = (step.title || '').toLowerCase()
  const concepts = (step.concepts || []).map(c => c.toLowerCase())

  // Python patterns
  if (language === 'python') {
    if (desc.includes('function') || desc.includes('def ')) {
      keywords.push({ pattern: 'def ', name: 'Function Definition', successMsg: 'Contains function definition', failMsg: 'Expected a function definition (def)' })
    }
    if (desc.includes('class')) {
      keywords.push({ pattern: 'class ', name: 'Class Definition', successMsg: 'Contains class definition', failMsg: 'Expected a class definition' })
    }
    if (desc.includes('import') || desc.includes('library') || desc.includes('module')) {
      keywords.push({ pattern: 'import ', name: 'Import Statement', successMsg: 'Includes necessary imports', failMsg: 'May need import statements' })
    }
    if (desc.includes('loop') || desc.includes('iterate')) {
      keywords.push({ pattern: 'for ', name: 'Loop', successMsg: 'Contains loop construct', failMsg: 'Expected a loop (for/while)' })
    }
    if (desc.includes('flask') || desc.includes('route')) {
      keywords.push({ pattern: '@app.route', name: 'Flask Route', successMsg: 'Has Flask route decorator', failMsg: 'Expected @app.route() decorator' })
    }
    if (desc.includes('return')) {
      keywords.push({ pattern: 'return ', name: 'Return Statement', successMsg: 'Contains return statement', failMsg: 'Expected a return statement' })
    }
  }

  // JavaScript/React patterns
  if (language === 'javascript' || language === 'js' || language === 'react' || language === 'jsx') {
    if (desc.includes('function') || desc.includes('handler')) {
      keywords.push({ pattern: 'function', name: 'Function', successMsg: 'Contains function', failMsg: 'Expected a function definition' })
    }
    if (desc.includes('component') || desc.includes('react')) {
      keywords.push({ pattern: 'return', name: 'Component Return', successMsg: 'Has return statement', failMsg: 'Expected a return statement' })
    }
    if (desc.includes('state') || desc.includes('usestate')) {
      keywords.push({ pattern: 'usestate', name: 'State Hook', successMsg: 'Uses useState', failMsg: 'Expected useState hook' })
    }
    if (desc.includes('event') || desc.includes('click') || desc.includes('handler')) {
      keywords.push({ pattern: 'on', name: 'Event Handler', successMsg: 'Has event handling', failMsg: 'Expected event handler' })
    }
  }

  // HTML patterns
  if (language === 'html' || desc.includes('html')) {
    if (desc.includes('form') || desc.includes('input')) {
      keywords.push({ pattern: '<form', name: 'Form Element', successMsg: 'Contains form element', failMsg: 'Expected a <form> element' })
    }
    if (desc.includes('div') || desc.includes('structure') || desc.includes('layout')) {
      keywords.push({ pattern: '<div', name: 'HTML Structure', successMsg: 'Has HTML structure', failMsg: 'Expected HTML elements' })
    }
  }

  // Generic concept-based checks
  for (const concept of concepts) {
    if (concept.includes('variable') || concept.includes('assignment')) {
      keywords.push({ pattern: '=', name: 'Variable Assignment', successMsg: 'Contains variable assignment', failMsg: 'Expected variable assignment' })
    }
    if (concept.includes('conditional') || concept.includes('if')) {
      keywords.push({ pattern: 'if', name: 'Conditional', successMsg: 'Contains conditional logic', failMsg: 'Expected conditional (if) statement' })
    }
    if (concept.includes('array') || concept.includes('list')) {
      keywords.push({ pattern: '[', name: 'Array/List', successMsg: 'Uses array/list', failMsg: 'Expected array/list usage' })
    }
  }

  // Deduplicate by name
  const seen = new Set()
  return keywords.filter(kw => {
    if (seen.has(kw.name)) return false
    seen.add(kw.name)
    return true
  })
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { projectId, stepId, code } = body

    if (!projectId || !stepId) {
      return Response.json({ error: 'Missing projectId or stepId' }, { status: 400 })
    }
    if (!code || code.trim().length === 0) {
      return Response.json({ error: 'No code submitted' }, { status: 400 })
    }

    const accessToken = extractAccessToken(request) || body?.accessToken || null
    const supabase = getSupabaseServerClient({ accessToken })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

    const { data: project, error: fetchErr } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (fetchErr || !project) return Response.json({ error: 'Project not found' }, { status: 404 })

    const step = (project.steps || []).find(s => s.id === stepId)
    if (!step) return Response.json({ error: 'Step not found' }, { status: 404 })

    const result = validateCode(code, step, project.starter_language)

    // Save code submission to project progress
    const codeSubmissions = project.progress?.code_submissions || {}
    codeSubmissions[stepId] = {
      code: code.slice(0, 5000), // Limit stored code size
      validated: result.passed,
      score: result.score,
      submittedAt: new Date().toISOString(),
    }

    await supabase
      .from('projects')
      .update({
        progress: { ...project.progress, code_submissions: codeSubmissions },
      })
      .eq('id', projectId)

    return Response.json(result)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
