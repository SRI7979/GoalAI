'use client'

import { TimedProblemSet } from './expansionRenderers'
import { timedProblemSetParamsSchema, componentSignalSchema } from './schemas'

const timedProblemSetComponent = {
  type: 'timed_problem_set',
  paramsSchema: timedProblemSetParamsSchema,
  signalSchema: componentSignalSchema,
  generatorPrompt: 'timedProblemSet_v1',
  render: TimedProblemSet,
}

export default timedProblemSetComponent
