'use client'

import { OrderSteps } from './expansionRenderers'
import { orderStepsParamsSchema, componentSignalSchema } from './schemas'

const orderStepsComponent = {
  type: 'order_steps',
  paramsSchema: orderStepsParamsSchema,
  signalSchema: componentSignalSchema,
  generatorPrompt: 'orderSteps_v1',
  render: OrderSteps,
}

export default orderStepsComponent
