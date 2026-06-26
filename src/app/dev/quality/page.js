import { notFound } from 'next/navigation'
import QualityHallClient from './QualityHallClient'

export const dynamic = 'force-dynamic'

function qualityDevEnabled() {
  return process.env.NODE_ENV !== 'production' || process.env.ENABLE_QUALITY_DEV === 'true'
}

export default function QualityHallPage() {
  if (!qualityDevEnabled()) notFound()
  return <QualityHallClient />
}
