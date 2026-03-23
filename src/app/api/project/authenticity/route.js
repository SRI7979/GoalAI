import { getSupabaseServerClient } from '@/lib/supabaseServer'
import { buildProjectProofSummary, calculateProjectAuthenticity } from '@/lib/projectProof'

function extractAccessToken(request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!authHeader) return null
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim() || null
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { projectId, timeTracking, codeSubmissions } = body
    if (!projectId) return Response.json({ error: 'Missing projectId' }, { status: 400 })

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

    // If already scored, return cached
    if (project.authenticity_score !== null && project.authenticity_score !== undefined) {
      const cached = calculateProjectAuthenticity(project, { timeTracking, codeSubmissions })
      cached.score = project.authenticity_score
      return Response.json(cached)
    }

    const result = calculateProjectAuthenticity(project, { timeTracking, codeSubmissions })

    // Persist to DB — try with authenticity_score column, fall back without it
    const updatedProgress = {
      ...project.progress,
      time_tracking: timeTracking || project.progress?.time_tracking || {},
      code_submissions: codeSubmissions || project.progress?.code_submissions || {},
      authenticity: result,
      proof_summary: buildProjectProofSummary(
        {
          ...project,
          progress: {
            ...project.progress,
            time_tracking: timeTracking || project.progress?.time_tracking || {},
            code_submissions: codeSubmissions || project.progress?.code_submissions || {},
            authenticity: result,
          },
          authenticity_score: result.score,
        },
        result,
      ),
    }

    const { error: updateErr } = await supabase
      .from('projects')
      .update({ authenticity_score: result.score, progress: updatedProgress })
      .eq('id', projectId)

    if (updateErr) {
      // Column may not exist yet — save progress without authenticity_score
      await supabase
        .from('projects')
        .update({ progress: updatedProgress })
        .eq('id', projectId)
    }

    return Response.json(result)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
