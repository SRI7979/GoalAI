import { HEARTS_BASE, HEARTS_MAX_CAP } from '@/lib/tokens'

const SHOP_STORAGE_KEYS = {
  maxHearts: 'pathai.maxHearts',
}

function normalizeMaxHearts(value) {
  return Math.min(HEARTS_MAX_CAP, Math.max(HEARTS_BASE, Number(value) || HEARTS_BASE))
}

export function getStoredMaxHearts() {
  if (typeof window === 'undefined') return HEARTS_BASE
  return normalizeMaxHearts(localStorage.getItem(SHOP_STORAGE_KEYS.maxHearts))
}

export function setStoredMaxHearts(maxHearts) {
  if (typeof window === 'undefined') return
  localStorage.setItem(SHOP_STORAGE_KEYS.maxHearts, String(normalizeMaxHearts(maxHearts)))
}
