// P6 shipped the expanded component library. The function remains so older
// recipe code can still normalize through one place, but it no longer maps
// real P6 components to P4 substitutes.
export const P6_COMPONENT_SUBSTITUTIONS = Object.freeze({})

export function substituteComponentType(type) {
  return P6_COMPONENT_SUBSTITUTIONS[type] || type
}
