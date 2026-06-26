function getType(value) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (Number.isInteger(value)) return 'integer'
  return typeof value
}

function matchesType(expectedType, value) {
  if (!expectedType) return true
  if (expectedType === 'integer') return Number.isInteger(value)
  if (expectedType === 'number') return typeof value === 'number' && Number.isFinite(value)
  if (expectedType === 'array') return Array.isArray(value)
  if (expectedType === 'null') return value === null
  return typeof value === expectedType && !Array.isArray(value)
}

export function validateAgainstSchema(schema = {}, value, path = 'value') {
  const errors = []

  function runCustomValidator(currentSchema = {}, currentValue, currentPath) {
    if (typeof currentSchema.validate !== 'function') return
    const customResult = currentSchema.validate(currentValue, currentPath)
    if (Array.isArray(customResult)) {
      errors.push(...customResult)
    } else if (customResult && Array.isArray(customResult.errors)) {
      errors.push(...customResult.errors)
    }
  }

  function visit(currentSchema = {}, currentValue, currentPath) {
    if (Array.isArray(currentSchema.anyOf)) {
      const branchResults = currentSchema.anyOf.map((branch) => {
        const branchErrors = []
        const previousPush = errors.push.bind(errors)
        errors.push = (...items) => branchErrors.push(...items)
        visit(branch, currentValue, currentPath)
        errors.push = previousPush
        return branchErrors
      })
      if (!branchResults.some((branchErrors) => branchErrors.length === 0)) {
        errors.push(`${currentPath} must match one of the allowed shapes.`)
      }
      runCustomValidator(currentSchema, currentValue, currentPath)
      return
    }

    if (currentSchema.type && !matchesType(currentSchema.type, currentValue)) {
      errors.push(`${currentPath} must be ${currentSchema.type}; received ${getType(currentValue)}.`)
      return
    }

    if (currentSchema.enum && !currentSchema.enum.includes(currentValue)) {
      errors.push(`${currentPath} must be one of: ${currentSchema.enum.join(', ')}.`)
    }

    if (typeof currentValue === 'string') {
      if (Number.isFinite(currentSchema.minLength) && currentValue.length < currentSchema.minLength) {
        errors.push(`${currentPath} must contain at least ${currentSchema.minLength} character(s).`)
      }
      if (Number.isFinite(currentSchema.maxLength) && currentValue.length > currentSchema.maxLength) {
        errors.push(`${currentPath} must contain at most ${currentSchema.maxLength} character(s).`)
      }
    }

    if (typeof currentValue === 'number') {
      if (Number.isFinite(currentSchema.minimum) && currentValue < currentSchema.minimum) {
        errors.push(`${currentPath} must be >= ${currentSchema.minimum}.`)
      }
      if (Number.isFinite(currentSchema.maximum) && currentValue > currentSchema.maximum) {
        errors.push(`${currentPath} must be <= ${currentSchema.maximum}.`)
      }
    }

    if (Array.isArray(currentValue)) {
      if (Number.isFinite(currentSchema.minItems) && currentValue.length < currentSchema.minItems) {
        errors.push(`${currentPath} must contain at least ${currentSchema.minItems} item(s).`)
      }
      if (Number.isFinite(currentSchema.maxItems) && currentValue.length > currentSchema.maxItems) {
        errors.push(`${currentPath} must contain at most ${currentSchema.maxItems} item(s).`)
      }
      if (currentSchema.items) {
        currentValue.forEach((item, index) => visit(currentSchema.items, item, `${currentPath}[${index}]`))
      }
    }

    if (currentValue && typeof currentValue === 'object' && !Array.isArray(currentValue)) {
      const properties = currentSchema.properties || {}
      ;(currentSchema.required || []).forEach((key) => {
        if (!(key in currentValue)) errors.push(`${currentPath}.${key} is required.`)
      })
      Object.entries(currentValue).forEach(([key, nextValue]) => {
        if (!properties[key]) {
          if (currentSchema.additionalProperties === false) {
            errors.push(`${currentPath}.${key} is not allowed.`)
          }
          return
        }
        visit(properties[key], nextValue, `${currentPath}.${key}`)
      })
    }

    runCustomValidator(currentSchema, currentValue, currentPath)
  }

  visit(schema, value, path)
  return { ok: errors.length === 0, errors }
}
