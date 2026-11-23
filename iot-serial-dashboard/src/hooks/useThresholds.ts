import { useCallback, useState } from 'react'
import { DEFAULT_THRESHOLDS } from '../lib/constants'
import { loadThresholds, saveThresholds, validateThresholds } from '../lib/thresholds'
import type { Thresholds } from '../types/sensor'

export function useThresholds() {
  const [thresholds, setThresholds] = useState<Thresholds>(loadThresholds)

  const updateThresholds = useCallback((next: Thresholds): boolean => {
    if (!validateThresholds(next)) return false
    setThresholds(next)
    saveThresholds(next)
    return true
  }, [])

  const resetThresholds = useCallback(() => {
    setThresholds(DEFAULT_THRESHOLDS)
    saveThresholds(DEFAULT_THRESHOLDS)
  }, [])

  return { thresholds, updateThresholds, resetThresholds }
}