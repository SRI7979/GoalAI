import { getOpenAIModel } from '@/lib/openaiModels'
import {
  generateComponentParams,
  validateGeneratedParams,
} from '@/lib/componentGenerator'

function devLibraryEnabled() {
  return process.env.NODE_ENV !== 'production' || process.env.ENABLE_COMPONENT_LIBRARY_DEV === 'true'
}

export async function POST(request) {
  if (!devLibraryEnabled()) {
    return Response.json({ error: 'Component library dev generation is disabled.' }, { status: 404 })
  }

  try {
    const body = await request.json()
    const componentType = String(body?.componentType || '').trim()
    const concept = String(body?.concept || 'JavaScript variables').trim()
    const goalText = String(body?.goalText || 'Learn JavaScript from scratch').trim()
    const { params } = await generateComponentParams({
      componentType,
      concept,
      goalText,
      allowFallback: false,
    })
    const validation = validateGeneratedParams(componentType, params)
    if (!validation.ok) {
      return Response.json(
        { error: 'Generated params failed schema validation.', details: validation.errors, params },
        { status: 422 },
      )
    }

    return Response.json({ componentType, params, model: getOpenAIModel('componentGenerator') })
  } catch (error) {
    return Response.json({ error: error?.message || 'Failed to generate component params.' }, { status: 500 })
  }
}
