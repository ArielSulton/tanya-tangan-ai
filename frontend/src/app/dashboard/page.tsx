'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  ExternalLink,
  UserPlus,
  Send,
  CheckCircle,
  XCircle,
  RefreshCw,
  Crown,
  Shield,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Activity,
  MessageSquare,
  Search,
  Filter,
  Bot,
  User,
  Clock,
  FileText,
  Edit,
  Plus,
  Trash2,
} from 'lucide-react'
import { useUserRole } from '@/components/auth/SuperAdminOnly'
import { AdminOnly } from '@/components/auth/AdminOnly'

// Force dynamic rendering and disable static optimization
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

interface AdminUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
  fullName?: string
  role: 'admin' | 'superadmin'
  status: 'active' | 'inactive'
  lastActive: string | Date | null
  createdAt: string | Date
  invitedBy?: string
}

interface PendingInvitation {
  id: string
  email: string
  role: 'admin' | 'superadmin'
  invitedBy: string
  invitedAt: string | Date
  status: 'pending' | 'accepted' | 'expired' | 'cancelled'
  expiresAt: string | Date
  customMessage?: string
}

interface QALog {
  id: string
  conversationId: number
  question: string
  answer: string
  confidence?: number
  responseTime?: number
  gestureInput?: string
  contextUsed?: string
  evaluationScore?: number
  serviceMode: 'full_llm_bot' | 'bot_with_admin_validation'
  respondedBy: 'llm' | 'admin'
  llmRecommendationUsed: boolean
  createdAt: string | Date
  conversation: {
    sessionId: string
    status: string
    serviceMode: string
  }
  admin?: {
    id: number
    email: string
    fullName: string
  } | null
}

interface QALogsResponse {
  qaLogs: QALog[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
  statistics: {
    totalLogs: number
    averageConfidence: number
    averageResponseTime: number
    llmResponses: number
    adminResponses: number
  }
  filters: {
    serviceMode?: string
    respondedBy?: string
    searchQuery?: string
    dateFrom?: string
    dateTo?: string
    minConfidence?: string
    maxConfidence?: string
  }
}

interface VocabWord {
  id: string
  text: string
  category: string
  type: 'konkret' | 'abstrak'
  level: string
  imageUrl: string | null
  imageSource: string
  createdAt: string | Date
  comparison?: {
    id: string
    lowImageUrl: string
    highImageUrl: string
    lowLabel: string
    highLabel: string
    referenceWord: string
  } | null
  adverbSubcategory?: string | null
  sliderConfig?: Record<string, unknown> | null
  timelineConfig?: Record<string, unknown> | null
  certaintyConfig?: Record<string, unknown> | null
  gaugeConfig?: Record<string, unknown> | null
}

interface WordRequest {
  id: string
  gesture_input: string
  suggested_word: string | null
  session_id: string | null
  created_at: string | null
}

const VOCAB_CATEGORIES = [
  { value: 'hewan', label: 'Hewan' },
  { value: 'benda', label: 'Benda' },
  { value: 'alam', label: 'Alam' },
  { value: 'perasaan', label: 'Perasaan' },
  { value: 'kata_keterangan', label: 'Keterangan Abstrak' },
]

const ADVERB_SUBCATEGORIES = [
  { value: 'degree', label: 'Derajat (IntensitySlider)', description: 'sangat, agak, terlalu, paling' },
  { value: 'temporal', label: 'Temporal (TimelineAnimation)', description: 'sering, jarang, pernah, baru saja' },
  { value: 'modality', label: 'Modalitas (CertaintyDial)', description: 'mungkin, pasti, kira-kira' },
  { value: 'intensity', label: 'Intensitas (SensationGauge)', description: 'sangat pedas, agak nyeri' },
]

// Component that uses auth hooks - only rendered client-side
function DashboardAuthContent() {
  const { role: _role, isSuperAdmin, isAdmin } = useUserRole()

  return <DashboardContentInner isSuperAdmin={isSuperAdmin ?? false} isAdmin={isAdmin ?? false} />
}

interface DashboardContentInnerProps {
  isSuperAdmin: boolean
  isAdmin: boolean
}

function DashboardContent() {
  const [isMounted, setIsMounted] = useState(false)

  // Client-side mounting check
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Prevent server-side rendering of auth hooks
  if (!isMounted) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2"></div>
          <p className="text-muted-foreground mt-2">Loading...</p>
        </div>
      </div>
    )
  }

  return <DashboardAuthContent />
}

function DashboardContentInner({ isSuperAdmin, isAdmin }: DashboardContentInnerProps) {
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [_pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Invitation form state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'superadmin'>('admin')
  const [customMessage, setCustomMessage] = useState('')
  const [isInviting, setIsInviting] = useState(false)
  const [invitationStatus, setInvitationStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)

  // QA Logs state
  const [qaLogs, setQaLogs] = useState<QALog[]>([])
  const [qaLogsLoading, setQaLogsLoading] = useState(false)
  const [qaLogsPage, setQaLogsPage] = useState(1)
  const [qaLogsPagination, setQaLogsPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  })
  const [qaLogsStatistics, setQaLogsStatistics] = useState({
    totalLogs: 0,
    averageConfidence: 0,
    averageResponseTime: 0,
    llmResponses: 0,
    adminResponses: 0,
  })
  const [qaLogsFilters, setQaLogsFilters] = useState({
    serviceMode: 'all',
    respondedBy: 'all',
    searchQuery: '',
  })
  const [showQaLogs, setShowQaLogs] = useState(false)

  // Word Requests state
  const [wordRequests, setWordRequests] = useState<WordRequest[]>([])
  const [wordRequestsLoading, setWordRequestsLoading] = useState(false)
  const [wordRequestsPage, setWordRequestsPage] = useState(1)
  const [wordRequestsTotalPages, setWordRequestsTotalPages] = useState(0)
  const [wordRequestsTotal, setWordRequestsTotal] = useState(0)
  const [wordRequestsStatusFilter, setWordRequestsStatusFilter] = useState<string>('all')
  const [showWordRequests, setShowWordRequests] = useState(false)

  // Vocab word management state
  const [vocabWords, setVocabWords] = useState<VocabWord[]>([])
  const [wordLoading, setWordLoading] = useState(false)
  const [showWords, setShowWords] = useState(false)
  const [wordDialogOpen, setWordDialogOpen] = useState(false)
  const [editingWord, setEditingWord] = useState<VocabWord | null>(null)
  const [uploading, setUploading] = useState(false)

  // Word form state
  const [wordText, setWordText] = useState('')
  const [wordCategory, setWordCategory] = useState('')
  const [wordType, setWordType] = useState<'konkret' | 'abstrak' | ''>('')
  const [wordImageFile, setWordImageFile] = useState<File | null>(null)
  const [wordImagePreview, setWordImagePreview] = useState<string | null>(null)
  const [wordImageUrl, setWordImageUrl] = useState<string>('')
  const [wordCategoryFilter, setWordCategoryFilter] = useState('')

  // Abstrak comparison state
  const [compLowFile, setCompLowFile] = useState<File | null>(null)
  const [compLowPreview, setCompLowPreview] = useState<string | null>(null)
  const [compLowUrl, setCompLowUrl] = useState('')
  const [compLowLabel, setCompLowLabel] = useState('')
  const [compHighFile, setCompHighFile] = useState<File | null>(null)
  const [compHighPreview, setCompHighPreview] = useState<string | null>(null)
  const [compHighUrl, setCompHighUrl] = useState('')
  const [compHighLabel, setCompHighLabel] = useState('')
  const [compReferenceWord, setCompReferenceWord] = useState('')

  // Adverb subcategory state
  const [wordAdverbSubcategory, setWordAdverbSubcategory] = useState('')
  const [wordSliderConfig, setWordSliderConfig] = useState('')
  const [wordTimelineConfig, setWordTimelineConfig] = useState('')
  const [wordCertaintyConfig, setWordCertaintyConfig] = useState('')
  const [wordGaugeConfig, setWordGaugeConfig] = useState('')

  // Fetch admin users and invitations
  const fetchAdminData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch current admins
      const adminsResponse = await fetch('/api/admin/users')
      if (adminsResponse.ok) {
        const adminsData = await adminsResponse.json()
        if (adminsData.success && adminsData.data) {
          setAdmins(adminsData.data.users ?? [])
        }
      }

      // Fetch pending invitations
      const invitationsResponse = await fetch('/api/admin/invitations')
      if (invitationsResponse.ok) {
        const invitationsData = await invitationsResponse.json()
        if (invitationsData.success && invitationsData.data) {
          setPendingInvitations(invitationsData.data.invitations ?? [])
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch admin data'
      setError(errorMessage)
      console.error('Admin data fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch QA logs
  const fetchQaLogs = useCallback(
    async (page: number = 1) => {
      try {
        setQaLogsLoading(true)

        const params = new URLSearchParams({
          page: page.toString(),
          limit: '20',
        })

        if (qaLogsFilters.serviceMode && qaLogsFilters.serviceMode !== 'all')
          params.append('serviceMode', qaLogsFilters.serviceMode)
        if (qaLogsFilters.respondedBy && qaLogsFilters.respondedBy !== 'all')
          params.append('respondedBy', qaLogsFilters.respondedBy)
        if (qaLogsFilters.searchQuery) params.append('search', qaLogsFilters.searchQuery)

        const response = await fetch(`/api/admin/qa-logs?${params.toString()}`)
        if (response.ok) {
          const data: { success: boolean; data: QALogsResponse } = await response.json()
          if (data.success && data.data) {
            setQaLogs(data.data.qaLogs)
            setQaLogsPagination(data.data.pagination)
            setQaLogsStatistics(data.data.statistics)
            setQaLogsPage(page)
          }
        } else {
          console.error('Failed to fetch QA logs:', response.statusText)
        }
      } catch (error) {
        console.error('Error fetching QA logs:', error)
      } finally {
        setQaLogsLoading(false)
      }
    },
    [qaLogsFilters],
  )

  const fetchWordRequests = useCallback(async (page: number = 1, statusFilter: string = 'all') => {
    try {
      setWordRequestsLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter)

      const response = await fetch(`/api/admin/vocab/requests?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setWordRequests(data.data.requests)
          setWordRequestsTotalPages(data.data.total_pages)
          setWordRequestsTotal(data.data.total)
          setWordRequestsPage(page)
        }
      } else {
        console.error('Failed to fetch word requests:', response.statusText)
      }
    } catch (error) {
      console.error('Error fetching word requests:', error)
    } finally {
      setWordRequestsLoading(false)
    }
  }, [])

  // Fetch vocab words
  const fetchVocabWords = useCallback(async (category?: string) => {
    try {
      setWordLoading(true)
      const params = new URLSearchParams({ limit: '100' })
      if (category) params.set('category', category)
      const response = await fetch(`/api/admin/vocab?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setVocabWords(data.data.words ?? [])
        }
      }
    } catch (error) {
      console.error('Error fetching vocab words:', error)
    } finally {
      setWordLoading(false)
    }
  }, [])

  // Upload image to R2
  const uploadVocabImage = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/admin/vocab/upload-image', { method: 'POST', body: formData })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? 'Upload failed')
    return json.data.url as string
  }

  // Reset word form
  const resetWordForm = () => {
    setWordText('')
    setWordCategory('')
    setWordType('')
    setWordImageFile(null)
    setWordImagePreview(null)
    setWordImageUrl('')
    setCompLowFile(null)
    setCompLowPreview(null)
    setCompLowUrl('')
    setCompLowLabel('')
    setCompHighFile(null)
    setCompHighPreview(null)
    setCompHighUrl('')
    setCompHighLabel('')
    setCompReferenceWord('')
    setWordAdverbSubcategory('')
    setWordSliderConfig('')
    setWordTimelineConfig('')
    setWordCertaintyConfig('')
    setWordGaugeConfig('')
    setEditingWord(null)
  }

  // Create or update vocab word
  const handleSaveWord = async () => {
    if (!wordText.trim() || !wordCategory || !wordType) return

    try {
      setIsInviting(true)
      setUploading(true)

      let finalImageUrl = wordImageUrl
      let finalLowUrl = compLowUrl
      let finalHighUrl = compHighUrl

      // Upload images if new files were selected
      if (wordType === 'konkret' && wordImageFile) {
        finalImageUrl = await uploadVocabImage(wordImageFile)
      }
      if (wordType === 'abstrak') {
        if (compLowFile) finalLowUrl = await uploadVocabImage(compLowFile)
        if (compHighFile) finalHighUrl = await uploadVocabImage(compHighFile)
      }

      const body: Record<string, unknown> = {
        text: wordText.trim(),
        category: wordCategory,
        type: wordType,
        imageUrl: wordType === 'konkret' ? finalImageUrl || null : null,
      }

      if (wordType === 'abstrak' && finalLowUrl && finalHighUrl) {
        body.comparison = {
          lowImageUrl: finalLowUrl,
          highImageUrl: finalHighUrl,
          lowLabel: compLowLabel,
          highLabel: compHighLabel,
          referenceWord: compReferenceWord,
        }
      }

      // Add adverb fields for kata_keterangan words
      if (wordCategory === 'kata_keterangan' && wordAdverbSubcategory) {
        body.adverbSubcategory = wordAdverbSubcategory
        if (wordSliderConfig)
          try {
            body.sliderConfig = JSON.parse(wordSliderConfig)
          } catch {
            /* invalid JSON, skip */
          }
        if (wordTimelineConfig)
          try {
            body.timelineConfig = JSON.parse(wordTimelineConfig)
          } catch {
            /* invalid JSON, skip */
          }
        if (wordCertaintyConfig)
          try {
            body.certaintyConfig = JSON.parse(wordCertaintyConfig)
          } catch {
            /* invalid JSON, skip */
          }
        if (wordGaugeConfig)
          try {
            body.gaugeConfig = JSON.parse(wordGaugeConfig)
          } catch {
            /* invalid JSON, skip */
          }
      }

      const method = editingWord ? 'PUT' : 'POST'
      const url = editingWord ? `/api/admin/vocab/${editingWord.id}` : '/api/admin/vocab'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error ?? 'Operasi gagal')
      }

      setInvitationStatus('success')
      setStatusMessage(`Kosakata "${wordText}" berhasil ${editingWord ? 'diperbarui' : 'ditambahkan'}`)
      setWordDialogOpen(false)
      resetWordForm()
      await fetchVocabWords(wordCategoryFilter || undefined)
    } catch (error) {
      setInvitationStatus('error')
      setStatusMessage(error instanceof Error ? error.message : 'Operasi gagal')
    } finally {
      setIsInviting(false)
      setUploading(false)
    }
  }

  // Delete vocab word
  const handleDeleteWord = async (word: VocabWord) => {
    if (!window.confirm(`Hapus kosakata "${word.text}"?`)) return
    try {
      const response = await fetch(`/api/admin/vocab/${word.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Gagal menghapus kosakata')
      setStatusMessage(`Kosakata "${word.text}" berhasil dihapus`)
      setInvitationStatus('success')
      await fetchVocabWords(wordCategoryFilter || undefined)
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Gagal menghapus')
      setInvitationStatus('error')
    }
  }

  // Image file select helper
  const handleImageFileSelect = (
    file: File | null,
    setFile: (f: File | null) => void,
    setPreview: (p: string | null) => void,
  ) => {
    if (!file) {
      setFile(null)
      setPreview(null)
      return
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      setStatusMessage('Hanya gambar JPEG, PNG, WebP yang diizinkan')
      setInvitationStatus('error')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setStatusMessage('Ukuran gambar maks 5MB')
      setInvitationStatus('error')
      return
    }
    setFile(file)
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    void fetchAdminData()
  }, [fetchAdminData])

  useEffect(() => {
    if (showQaLogs) {
      void fetchQaLogs(1)
    }
  }, [showQaLogs, fetchQaLogs])

  useEffect(() => {
    if (showWordRequests) {
      void fetchWordRequests(1, wordRequestsStatusFilter)
    }
  }, [showWordRequests, wordRequestsStatusFilter, fetchWordRequests])

  useEffect(() => {
    if (showWords) {
      void fetchVocabWords(wordCategoryFilter || undefined)
    }
  }, [showWords, wordCategoryFilter, fetchVocabWords])

  const handleSendInvitation = async () => {
    if (!inviteEmail) return

    setIsInviting(true)
    setInvitationStatus('idle')

    try {
      const response = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          customMessage: customMessage || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error ?? 'Failed to send invitation')
      }

      await response.json()

      setInvitationStatus('success')
      setStatusMessage(`Invitation sent successfully to ${inviteEmail}`)

      // Reset form
      setInviteEmail('')
      setCustomMessage('')
      setInviteRole('admin')
      setInviteDialogOpen(false)

      // Refresh data
      await fetchAdminData()
    } catch (error) {
      setInvitationStatus('error')
      setStatusMessage(error instanceof Error ? error.message : 'Failed to send invitation. Please try again.')
      console.error('Invitation error:', error)
    } finally {
      setIsInviting(false)
    }
  }

  const getRoleIcon = (userRole: string) => {
    return userRole === 'superadmin' ? (
      <Crown className="h-4 w-4 text-amber-600" />
    ) : (
      <Shield className="h-4 w-4 text-blue-600" />
    )
  }

  const getRoleBadge = (userRole: string) => {
    return userRole === 'superadmin' ? (
      <Badge variant="secondary" className="border-amber-200 bg-amber-50 text-amber-700">
        <Crown className="mr-1 h-3 w-3" />
        Super Admin
      </Badge>
    ) : (
      <Badge variant="secondary" className="border-blue-200 bg-blue-50 text-blue-700">
        <Shield className="mr-1 h-3 w-3" />
        Admin
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    return status === 'active' ? (
      <Badge variant="secondary" className="border-green-200 bg-green-50 text-green-700">
        <CheckCircle className="mr-1 h-3 w-3" />
        Aktif
      </Badge>
    ) : (
      <Badge variant="secondary" className="border-gray-200 bg-gray-50 text-gray-700">
        <XCircle className="mr-1 h-3 w-3" />
        Tidak Aktif
      </Badge>
    )
  }

  const formatDate = (date: string | Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date))
  }

  const formatLastActive = (date: string | Date | null) => {
    if (!date) return 'Tidak Pernah'
    try {
      const now = new Date()
      const lastActive = new Date(date)
      const diffInMs = now.getTime() - lastActive.getTime()
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

      if (diffInDays === 0) {
        return 'Hari Ini'
      } else if (diffInDays === 1) {
        return '1 hari yang lalu'
      } else if (diffInDays < 7) {
        return `${diffInDays} hari yang lalu`
      } else {
        return formatDate(date)
      }
    } catch {
      return 'Tidak Diketahui'
    }
  }

  if (loading) {
    return (
      <div className="bg-background min-h-screen">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="text-primary h-8 w-8 animate-spin" />
            <span className="text-muted-foreground ml-3 text-lg font-medium">Memuat dashboard...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard Admin</h1>
            <p className="text-muted-foreground mt-2">Kelola administrator dan monitor kesehatan sistem</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => void fetchAdminData()} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Perbarui
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {invitationStatus !== 'idle' && (
          <Alert variant={invitationStatus === 'success' ? 'default' : 'destructive'}>
            <AlertDescription>{statusMessage}</AlertDescription>
          </Alert>
        )}

        {/* Main Content - Clean Grid Layout */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Grafana Link Card - Fixed and Centered */}
          <Card className="lg:sticky lg:top-8 lg:col-span-1 lg:self-start">
            <CardContent className="flex min-h-[280px] items-center justify-center p-6">
              <div className="w-full space-y-4 text-center">
                <div className="bg-primary/10 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
                  <Activity className="text-primary h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Monitoring</h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    Analitik lanjutan & metrik sistem
                  </p>
                </div>
                <Button className="w-full" size="lg" asChild>
                  <a
                    href={process.env.NEXT_PUBLIC_GRAFANA_URL ?? 'http://localhost:3030'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Buka Grafana
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Limited Access Card for Admin (Non-SuperAdmin) */}
          {isAdmin && !isSuperAdmin && (
            <Card className="lg:col-span-3">
              <CardContent className="flex items-center justify-center p-8">
                <div className="max-w-md text-center">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <Shield className="h-6 w-6 text-red-600" />
                  </div>
                  <h2 className="mb-2 text-lg font-semibold text-red-600">Akses Terbatas</h2>
                  <p className="mb-4 text-sm text-gray-600">
                    Anda memerlukan hak akses superadmin untuk mengakses area manajemen administrator.
                  </p>
                  <div className="space-y-1 text-xs text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <Crown className="h-3 w-3 text-yellow-600" />
                      <span>SuperAdmin: Akses penuh sistem</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Shield className="h-3 w-3 text-blue-600" />
                      <span>Admin: Akses terbatas sistem</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Admin Management Actions - SuperAdmin Only */}
          {isSuperAdmin && (
            <Card className="lg:col-span-3">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="text-primary h-5 w-5" />
                      Manajemen Administrator
                    </CardTitle>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {admins.length} administrator{admins.length !== 1 ? '' : ''} aktif saat ini
                    </p>
                  </div>
                  {isSuperAdmin && (
                    <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Undang Admin
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                          <DialogTitle>Undang Administrator Baru</DialogTitle>
                          <DialogDescription>
                            Kirim email undangan untuk menambahkan administrator baru ke sistem.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="invite-email">Alamat Email</Label>
                              <Input
                                id="invite-email"
                                type="email"
                                placeholder="admin@mail.pensyarat.my.id"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="invite-role">Role</Label>
                              <Select
                                value={inviteRole}
                                onValueChange={(value: 'admin' | 'superadmin') => setInviteRole(value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Pilih peran" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="superadmin">Super Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="custom-message">Pesan Kustom (Opsional)</Label>
                            <Textarea
                              id="custom-message"
                              placeholder="Tambahkan pesan pribadi ke email undangan..."
                              value={customMessage}
                              onChange={(e) => setCustomMessage(e.target.value)}
                              rows={3}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setInviteDialogOpen(false)} disabled={isInviting}>
                              Batal
                            </Button>
                            <Button onClick={() => void handleSendInvitation()} disabled={!inviteEmail || isInviting}>
                              {isInviting ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Mengirim...
                                </>
                              ) : (
                                <>
                                  <Send className="mr-2 h-4 w-4" />
                                  Kirim Undangan
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>
              <CardContent className="h-[200px] overflow-hidden p-6">
                <div className="h-full">
                  <div className="mb-3 border-t pt-3">
                    <h3 className="mb-2 text-lg font-semibold">Administrator Saat Ini</h3>
                    <p className="text-muted-foreground mb-3 text-sm">
                      Semua administrator sistem dengan peran, status, dan informasi aktivitas mereka
                    </p>
                  </div>

                  {admins.length === 0 ? (
                    <div className="flex h-[120px] items-center justify-center">
                      <div className="text-center">
                        <Shield className="text-muted-foreground/40 mx-auto mb-2 h-8 w-8" />
                        <h3 className="mb-1 text-sm font-semibold">Tidak ada administrator ditemukan</h3>
                        <p className="text-muted-foreground text-xs">
                          Tidak ada administrator yang dikonfigurasi dalam sistem.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-[120px] overflow-hidden rounded-md border">
                      <div className="h-full overflow-y-auto pb-1">
                        <Table className="relative">
                          <TableHeader className="supports-[backdrop-filter]:bg-background/95 bg-background/95 sticky top-0 z-10 backdrop-blur">
                            <TableRow className="border-b">
                              <TableHead className="h-8 px-2 text-xs font-medium">Nama</TableHead>
                              <TableHead className="h-8 px-2 text-xs font-medium">Email</TableHead>
                              <TableHead className="h-8 px-2 text-xs font-medium">Peran</TableHead>
                              <TableHead className="h-8 px-2 text-xs font-medium">Status</TableHead>
                              <TableHead className="h-8 px-2 text-xs font-medium">Terakhir Aktif</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {admins.map((admin, _index) => (
                              <TableRow key={admin.id} className="border-b last:border-0">
                                <TableCell className="h-10 px-2 py-1">
                                  <div className="flex items-center gap-2">
                                    {getRoleIcon(admin.role)}
                                    <div className="min-w-0 flex-1">
                                      <div className="truncate text-xs font-medium">
                                        {admin.fullName ??
                                          (`${admin.firstName ?? ''} ${admin.lastName ?? ''}`.trim() ||
                                            'Pengguna Tanpa Nama')}
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="h-10 px-2 py-1">
                                  <div className="truncate font-mono text-xs">{admin.email}</div>
                                </TableCell>
                                <TableCell className="h-10 px-2 py-1">{getRoleBadge(admin.role)}</TableCell>
                                <TableCell className="h-10 px-2 py-1">{getStatusBadge(admin.status)}</TableCell>
                                <TableCell className="h-10 px-2 py-1">
                                  <div className="text-muted-foreground text-xs">
                                    {formatLastActive(admin.lastActive)}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                            {/* Add spacer row for better scroll experience */}
                            {admins.length > 0 && (
                              <TableRow className="h-2">
                                <TableCell colSpan={5} className="h-2 p-0"></TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* QA Logs Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="text-primary h-5 w-5" />
                  Logs & System Monitoring
                </CardTitle>
                <p className="text-muted-foreground mt-1 text-sm">Logs from the system with performance metrics</p>
              </div>
              <Button
                variant={showQaLogs ? 'secondary' : 'outline'}
                onClick={() => setShowQaLogs(!showQaLogs)}
                className="flex items-center gap-2"
              >
                {showQaLogs ? 'Sembunyikan Log' : 'Lihat Log'}
              </Button>
            </div>
          </CardHeader>

          {showQaLogs && (
            <CardContent className="space-y-6">
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{qaLogsStatistics.totalLogs}</div>
                    <p className="text-muted-foreground text-xs">Total Log</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{qaLogsStatistics.averageConfidence}%</div>
                    <p className="text-muted-foreground text-xs">Rata-rata Kepercayaan</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600">{qaLogsStatistics.averageResponseTime}ms</div>
                    <p className="text-muted-foreground text-xs">Rata-rata Respons</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Bot className="h-4 w-4 text-purple-600" />
                      <div className="text-2xl font-bold text-purple-600">{qaLogsStatistics.llmResponses}</div>
                    </div>
                    <p className="text-muted-foreground text-xs">Respons LLM</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <User className="h-4 w-4 text-indigo-600" />
                      <div className="text-2xl font-bold text-indigo-600">{qaLogsStatistics.adminResponses}</div>
                    </div>
                    <p className="text-muted-foreground text-xs">Respons Admin</p>
                  </CardContent>
                </Card>
              </div>

              {/* Filters */}
              <div className="bg-muted/50 flex flex-wrap items-center gap-4 rounded-lg border p-4">
                <div className="flex items-center gap-2">
                  <Search className="text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Cari pertanyaan/jawaban..."
                    value={qaLogsFilters.searchQuery}
                    onChange={(e) => setQaLogsFilters({ ...qaLogsFilters, searchQuery: e.target.value })}
                    className="w-64"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="text-muted-foreground h-4 w-4" />
                  <Select
                    value={qaLogsFilters.serviceMode}
                    onValueChange={(value) => setQaLogsFilters({ ...qaLogsFilters, serviceMode: value })}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Semua Mode Layanan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Mode Layanan</SelectItem>
                      <SelectItem value="full_llm_bot">Full LLM Bot</SelectItem>
                      <SelectItem value="bot_with_admin_validation">Bot + Validasi Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <User className="text-muted-foreground h-4 w-4" />
                  <Select
                    value={qaLogsFilters.respondedBy}
                    onValueChange={(value) => setQaLogsFilters({ ...qaLogsFilters, respondedBy: value })}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Semua Respons" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Respons</SelectItem>
                      <SelectItem value="llm">Hanya LLM</SelectItem>
                      <SelectItem value="admin">Hanya Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  onClick={() => void fetchQaLogs(1)}
                  disabled={qaLogsLoading}
                  className="flex items-center gap-2"
                >
                  {qaLogsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Terapkan Filter
                </Button>
              </div>

              {/* QA Logs Table */}
              {qaLogsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="text-primary h-8 w-8 animate-spin" />
                  <span className="text-muted-foreground ml-3">Memuat log QA...</span>
                </div>
              ) : qaLogs.length === 0 ? (
                <div className="py-12 text-center">
                  <MessageSquare className="text-muted-foreground/40 mx-auto mb-4 h-12 w-12" />
                  <h3 className="mb-2 text-lg font-semibold">Tidak ada log QA ditemukan</h3>
                  <p className="text-muted-foreground">
                    {Object.values(qaLogsFilters).some(Boolean)
                      ? 'Tidak ada log yang cocok dengan filter saat ini. Coba sesuaikan kriteria pencarian.'
                      : 'Belum ada log pertanyaan & jawaban yang tercatat.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[300px]">Pertanyaan</TableHead>
                          <TableHead className="w-[300px]">Jawaban</TableHead>
                          <TableHead className="w-[100px]">Kepercayaan</TableHead>
                          <TableHead className="w-[100px]">Waktu Respons</TableHead>
                          <TableHead className="w-[120px]">Mode Layanan</TableHead>
                          <TableHead className="w-[100px]">Dijawab Oleh</TableHead>
                          <TableHead className="w-[140px]">Waktu</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {qaLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>
                              <div className="max-w-[280px] truncate text-sm">{log.question}</div>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-[280px] truncate text-sm">{log.answer}</div>
                            </TableCell>
                            <TableCell>
                              {log.confidence !== null && log.confidence !== undefined ? (
                                <Badge
                                  variant={
                                    log.confidence >= 80 ? 'default' : log.confidence >= 60 ? 'secondary' : 'outline'
                                  }
                                  className="font-mono text-xs"
                                >
                                  {log.confidence}%
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">N/A</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {log.responseTime ? (
                                <div className="flex items-center gap-1">
                                  <Clock className="text-muted-foreground h-3 w-3" />
                                  <span className="font-mono text-xs">{log.responseTime}ms</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">N/A</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {log.serviceMode === 'full_llm_bot' ? 'Full LLM' : 'LLM + Admin'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {log.respondedBy === 'llm' ? (
                                  <>
                                    <Bot className="h-3 w-3 text-purple-600" />
                                    <span className="text-xs text-purple-600">LLM</span>
                                  </>
                                ) : (
                                  <>
                                    <User className="h-3 w-3 text-indigo-600" />
                                    <span className="text-xs text-indigo-600">Admin</span>
                                  </>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-muted-foreground text-xs">{formatDate(log.createdAt)}</div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {qaLogsPagination.totalPages > 1 && (
                    <div className="flex items-center justify-between">
                      <p className="text-muted-foreground text-sm">
                        Menampilkan {qaLogs.length} dari {qaLogsPagination.total} log
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!qaLogsPagination.hasPrevPage || qaLogsLoading}
                          onClick={() => void fetchQaLogs(qaLogsPage - 1)}
                        >
                          Sebelumnya
                        </Button>
                        <span className="text-muted-foreground text-sm">
                          Halaman {qaLogsPagination.page} dari {qaLogsPagination.totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!qaLogsPagination.hasNextPage || qaLogsLoading}
                          onClick={() => void fetchQaLogs(qaLogsPage + 1)}
                        >
                          Berikutnya
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          )}

          {/* Permintaan Kosakata Section */}
          <CardHeader className="border-t pt-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Permintaan Kosakata
                </CardTitle>
                <p className="text-muted-foreground mt-1 text-sm">
                  Input isyarat dari siswa yang belum cocok di database
                </p>
              </div>
              <Button
                variant={showWordRequests ? 'secondary' : 'outline'}
                onClick={() => setShowWordRequests(!showWordRequests)}
                className="flex items-center gap-2"
              >
                {showWordRequests ? 'Sembunyikan' : 'Lihat Permintaan'}
              </Button>
            </div>
          </CardHeader>

          {showWordRequests && (
            <CardContent className="space-y-6">
              {/* Status filter */}
              <div className="bg-muted/50 flex flex-wrap items-center gap-4 rounded-lg border p-4">
                <div className="flex items-center gap-2">
                  <Filter className="text-muted-foreground h-4 w-4" />
                  <Select
                    value={wordRequestsStatusFilter}
                    onValueChange={(value) => setWordRequestsStatusFilter(value)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Semua Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua</SelectItem>
                      <SelectItem value="pending">Belum Ditangani</SelectItem>
                      <SelectItem value="resolved">Sudah Ditangani</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  onClick={() => void fetchWordRequests(1, wordRequestsStatusFilter)}
                  disabled={wordRequestsLoading}
                  className="flex items-center gap-2"
                >
                  {wordRequestsLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Terapkan Filter
                </Button>
              </div>

              {/* Word Requests Table */}
              {wordRequestsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="text-primary h-8 w-8 animate-spin" />
                  <span className="text-muted-foreground ml-3">Memuat permintaan kosakata...</span>
                </div>
              ) : wordRequests.length === 0 ? (
                <div className="py-12 text-center">
                  <AlertTriangle className="text-muted-foreground/40 mx-auto mb-4 h-12 w-12" />
                  <h3 className="mb-2 text-lg font-semibold">Tidak ada permintaan kosakata</h3>
                  <p className="text-muted-foreground">
                    {wordRequestsStatusFilter !== 'all'
                      ? 'Tidak ada permintaan yang cocok dengan filter saat ini.'
                      : 'Belum ada input isyarat yang belum cocok di database.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[250px]">Input Isyarat</TableHead>
                          <TableHead className="w-[200px]">Kata Saran</TableHead>
                          <TableHead className="w-[130px]">Status</TableHead>
                          <TableHead className="w-[160px]">Waktu</TableHead>
                          <TableHead className="w-[100px] text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {wordRequests.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>
                              <div className="max-w-[230px] truncate text-sm font-medium">{r.gesture_input}</div>
                            </TableCell>
                            <TableCell>
                              {r.suggested_word ? (
                                <span className="text-sm">{r.suggested_word}</span>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {r.suggested_word ? (
                                <Badge variant="secondary" className="border-green-200 bg-green-50 text-green-700">
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                  Resolved
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="border-red-200 bg-red-50 text-red-700">
                                  <Clock className="mr-1 h-3 w-3" />
                                  Pending
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-muted-foreground text-xs">
                                {r.created_at ? formatDate(r.created_at) : '—'}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 gap-1 px-2 text-xs"
                                onClick={() => {
                                  resetWordForm()
                                  setWordText(r.gesture_input)
                                  if (r.suggested_word) {
                                    setWordCategory('')
                                  }
                                  setWordDialogOpen(true)
                                }}
                              >
                                <Plus className="h-3 w-3" />
                                Tambah Kata
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {wordRequestsTotalPages > 1 && (
                    <div className="flex items-center justify-between">
                      <p className="text-muted-foreground text-sm">
                        Menampilkan {wordRequests.length} dari {wordRequestsTotal} permintaan
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={wordRequestsPage <= 1 || wordRequestsLoading}
                          onClick={() => void fetchWordRequests(wordRequestsPage - 1, wordRequestsStatusFilter)}
                        >
                          Sebelumnya
                        </Button>
                        <span className="text-muted-foreground text-sm">
                          Halaman {wordRequestsPage} dari {wordRequestsTotalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={wordRequestsPage >= wordRequestsTotalPages || wordRequestsLoading}
                          onClick={() => void fetchWordRequests(wordRequestsPage + 1, wordRequestsStatusFilter)}
                        >
                          Berikutnya
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Vocab Word Management Section - SuperAdmin Only */}
        {isSuperAdmin && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="text-primary h-5 w-5" />
                    Manajemen Kosakata dan Visual
                  </CardTitle>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Kelola kata, kategori, dan gambar visual untuk platform belajar SDLB-B
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={showWords ? 'secondary' : 'outline'}
                    onClick={() => setShowWords(!showWords)}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    {showWords ? 'Sembunyikan' : 'Kelola Kosakata'}
                  </Button>
                </div>
              </div>
            </CardHeader>

            {showWords && (
              <CardContent className="space-y-6">
                {/* Stats row */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">{vocabWords.length}</div>
                      <p className="text-muted-foreground text-xs">Total Kosakata</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {vocabWords.filter((w) => w.type === 'konkret').length}
                      </div>
                      <p className="text-muted-foreground text-xs">Kata Konkret</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {vocabWords.filter((w) => w.type === 'abstrak').length}
                      </div>
                      <p className="text-muted-foreground text-xs">Kata Abstrak</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Filter + Add button */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Filter className="text-muted-foreground h-4 w-4" />
                    <select
                      value={wordCategoryFilter}
                      onChange={(e) => setWordCategoryFilter(e.target.value)}
                      className="border-input bg-background h-9 rounded-md border px-2 text-sm"
                    >
                      <option value="">Semua Kategori</option>
                      {VOCAB_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Dialog
                    open={wordDialogOpen}
                    onOpenChange={(open) => {
                      setWordDialogOpen(open)
                      if (!open) resetWordForm()
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        onClick={() => {
                          resetWordForm()
                          setWordDialogOpen(true)
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Tambah Kosakata
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
                      <DialogHeader>
                        <DialogTitle>{editingWord ? 'Edit' : 'Tambah'} Kosakata</DialogTitle>
                        <DialogDescription>
                          {editingWord
                            ? 'Perbarui data kata dan gambar visual'
                            : 'Tambah kata baru dengan gambar visual ke database'}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        {/* Word text */}
                        <div className="space-y-2">
                          <Label htmlFor="word-text">
                            Kata <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="word-text"
                            placeholder="e.g., kucing, sedikit, apel"
                            value={wordText}
                            onChange={(e) => setWordText(e.target.value)}
                          />
                        </div>

                        {/* Category */}
                        <div className="space-y-2">
                          <Label htmlFor="word-category">
                            Kategori <span className="text-red-500">*</span>
                          </Label>
                          <select
                            id="word-category"
                            value={wordCategory}
                            onChange={(e) => {
                              const cat = e.target.value
                              setWordCategory(cat)
                              if (cat === 'kata_keterangan') setWordType('abstrak')
                            }}
                            className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
                          >
                            <option value="">Pilih Kategori</option>
                            {VOCAB_CATEGORIES.map((c) => (
                              <option key={c.value} value={c.value}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Adverb Subcategory — only for kata_keterangan */}
                        {wordCategory === 'kata_keterangan' && (
                          <div className="space-y-2">
                            <Label htmlFor="word-adverb-subcategory">
                              Sub-kategori Keterangan <span className="text-red-500">*</span>
                            </Label>
                            <select
                              id="word-adverb-subcategory"
                              value={wordAdverbSubcategory}
                              onChange={(e) => setWordAdverbSubcategory(e.target.value)}
                              className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
                            >
                              <option value="">Pilih Sub-kategori</option>
                              {ADVERB_SUBCATEGORIES.map((sc) => (
                                <option key={sc.value} value={sc.value}>
                                  {sc.label}
                                </option>
                              ))}
                            </select>
                            {wordAdverbSubcategory && (
                              <p className="text-xs text-purple-600">
                                {ADVERB_SUBCATEGORIES.find((sc) => sc.value === wordAdverbSubcategory)?.description}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Config JSON — only show for the relevant subcategory */}
                        {wordCategory === 'kata_keterangan' && wordAdverbSubcategory && (
                          <div className="space-y-2 rounded-lg border border-purple-200 bg-purple-50 p-3">
                            <p className="text-sm font-medium text-purple-800">Konfigurasi Komponen Interaktif</p>
                            {wordAdverbSubcategory === 'degree' && (
                              <div className="space-y-2">
                                <Label className="text-xs">Slider Config (JSON)</Label>
                                <Textarea
                                  placeholder='{"default_position": 0.7, "low_label": "sedikit", "high_label": "sangat", "reference_word": "besar", "accent_color": "#22c55e", "emoji_low": "🌱", "emoji_high": "🌳"}'
                                  value={wordSliderConfig}
                                  onChange={(e) => setWordSliderConfig(e.target.value)}
                                  rows={4}
                                  className="font-mono text-xs"
                                />
                              </div>
                            )}
                            {wordAdverbSubcategory === 'temporal' && (
                              <div className="space-y-2">
                                <Label className="text-xs">Timeline Config (JSON)</Label>
                                <Textarea
                                  placeholder='{"frequency": 0.85, "period_label": "seminggu", "occurrence_count": 6, "total_slots": 7, "accent_color": "#3b82f6", "icon_filled": "✅", "icon_empty": "⬜", "description": "Hampir setiap hari"}'
                                  value={wordTimelineConfig}
                                  onChange={(e) => setWordTimelineConfig(e.target.value)}
                                  rows={4}
                                  className="font-mono text-xs"
                                />
                              </div>
                            )}
                            {wordAdverbSubcategory === 'modality' && (
                              <div className="space-y-2">
                                <Label className="text-xs">Certainty Config (JSON)</Label>
                                <Textarea
                                  placeholder='{"certainty_level": 0.3, "low_label": "tidak yakin", "high_label": "sangat yakin", "accent_color": "#f59e0b", "emoji_uncertain": "🤔", "emoji_certain": "✅", "description": "Kemungkinan terjadi"}'
                                  value={wordCertaintyConfig}
                                  onChange={(e) => setWordCertaintyConfig(e.target.value)}
                                  rows={4}
                                  className="font-mono text-xs"
                                />
                              </div>
                            )}
                            {wordAdverbSubcategory === 'intensity' && (
                              <div className="space-y-2">
                                <Label className="text-xs">Gauge Config (JSON)</Label>
                                <Textarea
                                  placeholder='{"intensity_level": 0.8, "sensation_word": "pedas", "low_label": "sedikit pedas", "high_label": "sangat pedas", "accent_color": "#ef4444", "emoji_low": "😐", "emoji_high": "🥵", "unit_symbol": "°"}'
                                  value={wordGaugeConfig}
                                  onChange={(e) => setWordGaugeConfig(e.target.value)}
                                  rows={4}
                                  className="font-mono text-xs"
                                />
                              </div>
                            )}
                            <p className="text-muted-foreground text-xs">
                              Masukkan konfigurasi JSON untuk komponen interaktif. Biarkan kosong jika tidak diperlukan.
                            </p>
                          </div>
                        )}

                        {/* Word type */}
                        {wordCategory === 'kata_keterangan' ? (
                          <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 text-sm text-purple-800">
                            <p className="font-medium">Tipe: Abstrak (otomatis)</p>
                            <p className="mt-1 text-xs text-purple-600">
                              Keterangan abstrak selalu membutuhkan dua gambar perbandingan derajat (rendah ↔ tinggi).
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Label>
                              Tipe Kata <span className="text-red-500">*</span>
                            </Label>
                            <div className="flex gap-4">
                              {(['konkret', 'abstrak'] as const).map((t) => (
                                <label key={t} className="flex cursor-pointer items-center gap-2">
                                  <input
                                    type="radio"
                                    name="word-type"
                                    value={t}
                                    checked={wordType === t}
                                    onChange={() => setWordType(t)}
                                    className="accent-green-600"
                                  />
                                  <span className="text-sm capitalize">{t}</span>
                                </label>
                              ))}
                            </div>
                            <p className="text-muted-foreground text-xs">
                              Konkret = satu gambar objek. Abstrak = dua gambar perbandingan derajat.
                            </p>
                          </div>
                        )}

                        {/* Konkret: single image */}
                        {wordType === 'konkret' && (
                          <div className="space-y-2 rounded-lg bg-green-50 p-4">
                            <Label>Gambar Objek</Label>
                            {(wordImagePreview ?? wordImageUrl) && (
                              <Image
                                src={wordImagePreview ?? wordImageUrl}
                                alt="preview"
                                width={112}
                                height={112}
                                className="h-28 w-28 rounded-lg object-cover"
                              />
                            )}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={(e) =>
                                handleImageFileSelect(
                                  e.target.files?.[0] ?? null,
                                  setWordImageFile,
                                  setWordImagePreview,
                                )
                              }
                              className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm"
                            />
                            <p className="text-muted-foreground text-xs">
                              JPEG/PNG/WebP, maks 5MB. Akan diupload ke Cloudflare R2.
                            </p>
                          </div>
                        )}

                        {/* Abstrak: two comparison images */}
                        {wordType === 'abstrak' && (
                          <div className="space-y-4 rounded-lg bg-purple-50 p-4">
                            <p className="text-sm font-medium text-purple-800">
                              {wordCategory === 'kata_keterangan'
                                ? 'Gambar Derajat: objek pada intensitas rendah ↔ tinggi'
                                : 'Gambar Perbandingan (Rendah ↔ Tinggi)'}
                            </p>

                            {/* Low image */}
                            <div className="space-y-2">
                              <Label>
                                {wordCategory === 'kata_keterangan'
                                  ? 'Gambar Derajat Rendah (e.g., sedikit besar)'
                                  : 'Gambar Rendah (e.g., "sedikit")'}
                              </Label>
                              {(compLowPreview ?? compLowUrl) && (
                                <Image
                                  src={compLowPreview ?? compLowUrl}
                                  alt="low"
                                  width={80}
                                  height={80}
                                  className="h-20 w-20 rounded-lg object-cover"
                                />
                              )}
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(e) =>
                                  handleImageFileSelect(e.target.files?.[0] ?? null, setCompLowFile, setCompLowPreview)
                                }
                                className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm"
                              />
                              <Input
                                placeholder="Label rendah (e.g., Sedikit)"
                                value={compLowLabel}
                                onChange={(e) => setCompLowLabel(e.target.value)}
                              />
                            </div>

                            {/* High image */}
                            <div className="space-y-2">
                              <Label>
                                {wordCategory === 'kata_keterangan'
                                  ? 'Gambar Derajat Tinggi (e.g., sangat besar)'
                                  : 'Gambar Tinggi (e.g., "sangat")'}
                              </Label>
                              {(compHighPreview ?? compHighUrl) && (
                                <Image
                                  src={compHighPreview ?? compHighUrl}
                                  alt="high"
                                  width={80}
                                  height={80}
                                  className="h-20 w-20 rounded-lg object-cover"
                                />
                              )}
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(e) =>
                                  handleImageFileSelect(
                                    e.target.files?.[0] ?? null,
                                    setCompHighFile,
                                    setCompHighPreview,
                                  )
                                }
                                className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm"
                              />
                              <Input
                                placeholder="Label tinggi (e.g., Sangat)"
                                value={compHighLabel}
                                onChange={(e) => setCompHighLabel(e.target.value)}
                              />
                            </div>

                            {/* Reference word */}
                            <div className="space-y-2">
                              <Label>
                                {wordCategory === 'kata_keterangan'
                                  ? 'Kata Sifat Referensi (yang dimodifikasi)'
                                  : 'Kata Referensi (objek yang diukur)'}
                              </Label>
                              <Input
                                placeholder={
                                  wordCategory === 'kata_keterangan'
                                    ? 'e.g., besar, panas, jauh'
                                    : 'e.g., makanan, minuman'
                                }
                                value={compReferenceWord}
                                onChange={(e) => setCompReferenceWord(e.target.value)}
                              />
                              {wordCategory === 'kata_keterangan' && (
                                <p className="text-xs text-purple-600">
                                  Kata sifat yang dimodifikasi oleh keterangan ini, misalnya &quot;
                                  {wordText || 'sangat'}&quot; + &quot;besar&quot; = sangat besar.
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setWordDialogOpen(false)
                              resetWordForm()
                            }}
                            disabled={isInviting}
                          >
                            Batal
                          </Button>
                          <Button
                            onClick={() => void handleSaveWord()}
                            disabled={!wordText.trim() || !wordCategory || !wordType || isInviting || uploading}
                          >
                            {isInviting || uploading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {uploading ? 'Mengupload...' : 'Menyimpan...'}
                              </>
                            ) : (
                              <>
                                <Plus className="mr-2 h-4 w-4" />
                                {editingWord ? 'Perbarui' : 'Tambah'} Kosakata
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Word list */}
                {wordLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="text-primary h-8 w-8 animate-spin" />
                    <span className="text-muted-foreground ml-3">Memuat kosakata...</span>
                  </div>
                ) : vocabWords.length === 0 ? (
                  <div className="py-12 text-center">
                    <FileText className="text-muted-foreground/40 mx-auto mb-4 h-12 w-12" />
                    <h3 className="mb-2 text-lg font-semibold">Belum ada kosakata</h3>
                    <p className="text-muted-foreground">Tambah kata pertama untuk mulai membangun database visual.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Kata</TableHead>
                          <TableHead>Kategori</TableHead>
                          <TableHead>Sub-kategori</TableHead>
                          <TableHead>Tipe</TableHead>
                          <TableHead>Gambar</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vocabWords.map((word) => (
                          <TableRow key={word.id}>
                            <TableCell className="font-medium">{word.text}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {VOCAB_CATEGORIES.find((c) => c.value === word.category)?.label ?? word.category}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {word.category === 'kata_keterangan' && word.adverbSubcategory ? (
                                <Badge
                                  variant="outline"
                                  className="border-purple-200 bg-purple-50 text-xs text-purple-700"
                                >
                                  {ADVERB_SUBCATEGORIES.find((sc) => sc.value === word.adverbSubcategory)?.label ??
                                    word.adverbSubcategory}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={
                                  word.type === 'konkret'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-purple-100 text-purple-700'
                                }
                              >
                                {word.type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {word.type === 'konkret' && word.imageUrl ? (
                                <Image
                                  src={word.imageUrl}
                                  alt={word.text}
                                  width={40}
                                  height={40}
                                  className="h-10 w-10 rounded object-cover"
                                />
                              ) : word.type === 'abstrak' && word.comparison ? (
                                <div className="flex gap-1">
                                  <Image
                                    src={word.comparison.lowImageUrl}
                                    alt="low"
                                    width={40}
                                    height={40}
                                    className="h-10 w-10 rounded object-cover"
                                  />
                                  <Image
                                    src={word.comparison.highImageUrl}
                                    alt="high"
                                    width={40}
                                    height={40}
                                    className="h-10 w-10 rounded object-cover"
                                  />
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 w-7 p-0"
                                  onClick={() => {
                                    setEditingWord(word)
                                    setWordText(word.text)
                                    setWordCategory(word.category)
                                    setWordType(word.type)
                                    setWordImageUrl(word.imageUrl ?? '')
                                    setWordAdverbSubcategory(word.adverbSubcategory ?? '')
                                    setWordSliderConfig(
                                      word.sliderConfig ? JSON.stringify(word.sliderConfig, null, 2) : '',
                                    )
                                    setWordTimelineConfig(
                                      word.timelineConfig ? JSON.stringify(word.timelineConfig, null, 2) : '',
                                    )
                                    setWordCertaintyConfig(
                                      word.certaintyConfig ? JSON.stringify(word.certaintyConfig, null, 2) : '',
                                    )
                                    setWordGaugeConfig(
                                      word.gaugeConfig ? JSON.stringify(word.gaugeConfig, null, 2) : '',
                                    )
                                    if (word.comparison) {
                                      setCompLowUrl(word.comparison.lowImageUrl)
                                      setCompHighUrl(word.comparison.highImageUrl)
                                      setCompLowLabel(word.comparison.lowLabel)
                                      setCompHighLabel(word.comparison.highLabel)
                                      setCompReferenceWord(word.comparison.referenceWord)
                                    }
                                    setWordDialogOpen(true)
                                  }}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                                  onClick={() => void handleDeleteWord(word)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}

// Wrap the dashboard with AdminOnly protection
export default function AdminDashboard() {
  const [isMounted, setIsMounted] = useState(false)

  // Client-side mounting check
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Prevent server-side rendering of auth hooks
  if (!isMounted) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2"></div>
          <p className="text-muted-foreground mt-2">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <AdminOnly>
      <DashboardContent />
    </AdminOnly>
  )
}
