'use client'

import { MockExam } from './expansionRenderers'
import { mockExamParamsSchema, componentSignalSchema } from './schemas'

const mockExamComponent = {
  type: 'mock_exam',
  paramsSchema: mockExamParamsSchema,
  signalSchema: componentSignalSchema,
  generatorPrompt: 'mockExam_v1',
  render: MockExam,
}

export default mockExamComponent
