'use client'

import ComponentShell from './ComponentShell'
import { getComponent, validateComponentParams } from './registry'

export default function ComponentRenderer({
  componentInstance,
  onSignal,
  missionId = null,
  conceptIds = [],
}) {
  const componentType = componentInstance?.componentType
  const component = getComponent(componentType)
  const params = componentInstance?.params || {}
  const position = Number(componentInstance?.position) || 0
  const resolvedConceptIds = componentInstance?.conceptIds || params?.conceptIds || conceptIds || []

  if (!component) {
    return (
      <ComponentShell
        componentType={componentType || 'unknown'}
        title="Unknown component"
        position={position}
        missionId={missionId}
        conceptIds={resolvedConceptIds}
        error={`No component is registered for "${componentType}".`}
      />
    )
  }

  const validation = validateComponentParams(componentType, params)
  const RenderComponent = component.render
  const title = params.title || params.question || params.problem || componentType.replace(/_/g, ' ')
  const componentHandlesInvalidParams = componentType === 'dynamic_diagram'

  return (
    <ComponentShell
      componentType={componentType}
      title={title}
      position={position}
      missionId={missionId}
      conceptIds={resolvedConceptIds}
      onSignal={onSignal}
      error={validation.ok || componentHandlesInvalidParams ? null : validation.errors.join(' ')}
    >
      {({ emitSignal, markInteraction, completedSignal, setLoading, loading }) => (
        <RenderComponent
          params={params}
          emitSignal={emitSignal}
          markInteraction={markInteraction}
          completedSignal={completedSignal}
          setLoading={setLoading}
          shellLoading={loading}
          componentType={componentType}
          conceptIds={resolvedConceptIds}
          missionId={missionId}
          validationErrors={validation.ok ? [] : validation.errors}
        />
      )}
    </ComponentShell>
  )
}
