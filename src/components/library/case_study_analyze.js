'use client'

import { CaseStudyAnalyze } from './expansionRenderers'
import { caseStudyAnalyzeParamsSchema, componentSignalSchema } from './schemas'

const caseStudyAnalyzeComponent = {
  type: 'case_study_analyze',
  paramsSchema: caseStudyAnalyzeParamsSchema,
  signalSchema: componentSignalSchema,
  generatorPrompt: 'caseStudyAnalyze_v1',
  render: CaseStudyAnalyze,
}

export default caseStudyAnalyzeComponent
