'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, FileText, AlertCircle, Check, ArrowRight, GraduationCap } from 'lucide-react'
import { type Subject } from '@/hooks/useSelectedInstitution'

const JENJANG_OPTIONS = [
  { value: 'SDLB', label: 'SD-LB', description: 'Sekolah Dasar Luar Biasa' },
  { value: 'SMPLB', label: 'SMP-LB', description: 'Sekolah Menengah Pertama Luar Biasa' },
  { value: 'SMALB', label: 'SMA-LB', description: 'Sekolah Menengah Atas Luar Biasa' },
] as const

interface SubjectSelectorProps {
  onSelectSubject?: (subject: Subject) => void
  selectedSubject?: Subject | null
}

export function SubjectSelector({ onSelectSubject, selectedSubject }: SubjectSelectorProps) {
  const [allSubjects, setAllSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedJenjang, setSelectedJenjang] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSubjects() {
      try {
        const response = await fetch('/api/subjects', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })

        if (!response.ok) {
          throw new Error(`Gagal mengambil data mata pelajaran: ${response.status}`)
        }

        const data = await response.json()
        if (data.success) {
          setAllSubjects(data.data.subjects.filter((s: Subject) => s.isActive))
        } else {
          throw new Error(data.error ?? 'Gagal mengambil data mata pelajaran')
        }
      } catch (err) {
        console.error('Error fetching subjects:', err)
        setError(err instanceof Error ? err.message : 'Gagal memuat mata pelajaran')
      } finally {
        setLoading(false)
      }
    }

    void fetchSubjects()
  }, [])

  const filteredSubjects = selectedJenjang ? allSubjects.filter((s) => s.jenjang === selectedJenjang) : allSubjects

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="border-primary mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
          <p className="text-muted-foreground text-sm">Memuat mata pelajaran...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <AlertCircle className="text-destructive mx-auto mb-3 h-10 w-10" />
          <p className="text-destructive font-medium">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            Coba Lagi
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Step 1: Pilih Jenjang */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <GraduationCap className="text-primary h-5 w-5" />
          Pilih Jenjang
        </h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-3">
          {JENJANG_OPTIONS.map((j) => {
            const count = allSubjects.filter((s) => s.jenjang === j.value).length
            const isSelected = selectedJenjang === j.value
            return (
              <button
                key={j.value}
                onClick={() => setSelectedJenjang(isSelected ? null : j.value)}
                className={`rounded-lg border-2 p-4 text-left transition-all ${
                  isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{j.label}</span>
                  {isSelected && <Check className="text-primary h-4 w-4" />}
                </div>
                <p className="text-muted-foreground mt-1 text-xs">{j.description}</p>
                <Badge variant="secondary" className="mt-2 text-xs">
                  {count} mapel
                </Badge>
              </button>
            )
          })}
        </div>
      </div>

      {/* Step 2: Pilih Mata Pelajaran */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <BookOpen className="text-primary h-5 w-5" />
          {selectedJenjang ? `Mata Pelajaran — ${selectedJenjang}` : 'Semua Mata Pelajaran'}
        </h2>

        {filteredSubjects.length === 0 ? (
          <div className="text-muted-foreground rounded-lg border border-dashed py-12 text-center">
            <BookOpen className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p>Belum ada mata pelajaran untuk jenjang ini.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSubjects.map((subject) => {
              const isSelected = selectedSubject?.subjectId === subject.subjectId
              return (
                <Card
                  key={subject.subjectId}
                  className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? 'ring-primary ring-2' : ''}`}
                  onClick={() => onSelectSubject?.(subject)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                        <BookOpen className="text-primary h-5 w-5" />
                      </div>
                      {isSelected && (
                        <div className="bg-primary flex h-6 w-6 items-center justify-center rounded-full">
                          <Check className="text-primary-foreground h-3 w-3" />
                        </div>
                      )}
                    </div>
                    <CardTitle className="mt-2 text-base">{subject.mataPelajaran ?? subject.name}</CardTitle>
                    <CardDescription className="text-xs">{subject.name}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {subject.jenjang && (
                          <Badge variant="outline" className="text-xs">
                            {subject.jenjang}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          <FileText className="mr-1 h-3 w-3" />
                          {subject._count?.ragFiles ?? 0} dok
                        </Badge>
                      </div>
                      <Link
                        href={`/komunikasi/${subject.slug}`}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs"
                      >
                        Mulai
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
