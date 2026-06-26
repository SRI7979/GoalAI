import { COMPONENT_REGISTRY } from './index'
import { componentSignalSchema } from './schemas'
import { validateAgainstSchema } from './schemaValidator'

function collectCorrectIndexErrors(value, path) {
  const errors = []
  if (Array.isArray(value)) {
    value.forEach((item, index) => errors.push(...collectCorrectIndexErrors(item, `${path}[${index}]`)))
    return errors
  }
  if (!value || typeof value !== 'object') return errors
  if (Array.isArray(value.options) && Number.isInteger(value.correctIndex) && value.correctIndex >= value.options.length) {
    errors.push(`${path}.correctIndex must point to an existing option.`)
  }
  Object.entries(value).forEach(([key, nextValue]) => {
    errors.push(...collectCorrectIndexErrors(nextValue, `${path}.${key}`))
  })
  return errors
}

export function getComponent(type) {
  return COMPONENT_REGISTRY[type] || null
}

export function listRegisteredTypes() {
  return Object.keys(COMPONENT_REGISTRY)
}

export function validateComponentParams(type, params) {
  const component = getComponent(type)
  if (!component) {
    return { ok: false, errors: [`No component registered for ${type}.`] }
  }
  const validation = validateAgainstSchema(component.paramsSchema, params, `${type}.params`)
  const errors = [...validation.errors, ...collectCorrectIndexErrors(params, `${type}.params`)]
  return { ok: errors.length === 0, errors }
}

export function validateComponentSignalPayload(signal) {
  return validateAgainstSchema(componentSignalSchema, signal, 'componentSignal')
}
