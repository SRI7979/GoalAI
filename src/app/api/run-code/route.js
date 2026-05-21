import { executeProjectCode } from '@/lib/projectRuntime'
import { normalizeCodeLanguage } from '@/lib/codeLanguages'

export const runtime = 'nodejs'

function normalizeLanguage(language) {
  return normalizeCodeLanguage(language, 'javascript')
}

export async function POST(request) {
  try {
    const body = await request.json()
    const code = String(body?.code || '')
    const language = normalizeLanguage(body?.language)
    if (!code.trim()) return Response.json({ error: 'No code provided' }, { status: 400 })

    const execution = await executeProjectCode({
      code,
      language,
      timeoutMs: Math.min(Math.max(Number(body?.timeoutMs) || 8000, 1000), 12000),
    })

    return Response.json({
      ...execution,
      language,
      executedAt: new Date().toISOString(),
    })
  } catch (error) {
    return Response.json({ error: error.message || 'Code execution failed.' }, { status: 500 })
  }
}
