'use client'

import { useState, useCallback } from 'react'

// Subject type for SLB-B (mata pelajaran per jenjang)
export interface Subject {
  subjectId: number
  name: string
  slug: string
  jenjang: 'SDLB' | 'SMPLB' | 'SMALB' | null
  mataPelajaran: string | null
  description?: string | null
  logoUrl?: string | null
  isActive: boolean
  _count?: {
    ragFiles: number
    conversations: number
  }
}

// Backwards-compat alias
export type Institution = Subject & { institutionId: number }

export function useSelectedInstitution() {
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)

  const selectInstitution = useCallback((subject: Subject) => {
    setSelectedSubject(subject)
  }, [])

  const selectSubject = useCallback((subject: Subject) => {
    setSelectedSubject(subject)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedSubject(null)
  }, [])

  return {
    selectedInstitution: selectedSubject,
    selectedSubject,
    selectInstitution,
    selectSubject,
    clearSelection,
    hasSelection: selectedSubject !== null,
    isLoadingDefault: false,
  }
}
