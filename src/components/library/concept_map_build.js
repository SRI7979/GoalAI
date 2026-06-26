'use client'

import { ConceptMapBuild } from './expansionRenderers'
import { conceptMapBuildParamsSchema, componentSignalSchema } from './schemas'

const conceptMapBuildComponent = {
  type: 'concept_map_build',
  paramsSchema: conceptMapBuildParamsSchema,
  signalSchema: componentSignalSchema,
  generatorPrompt: 'conceptMapBuild_v1',
  render: ConceptMapBuild,
}

export default conceptMapBuildComponent
