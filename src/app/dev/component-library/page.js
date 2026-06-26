import { notFound } from 'next/navigation'
import ComponentLibraryDevClient from './ComponentLibraryDevClient'

export const dynamic = 'force-dynamic'

function devLibraryEnabled() {
  return process.env.NODE_ENV !== 'production' || process.env.ENABLE_COMPONENT_LIBRARY_DEV === 'true'
}

export default function ComponentLibraryDevPage() {
  if (!devLibraryEnabled()) notFound()
  return <ComponentLibraryDevClient />
}
