import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { ragFiles, institutions, users } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { isAdminOrSuperAdmin } from '@/lib/auth/supabase-auth'

export const runtime = 'nodejs'
export const maxDuration = 20

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)),
  ])
}

// GET /api/admin/subjects/[id]/rag-files - List RAG files for subject
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          },
        },
      },
    )

    const {
      data: { user },
      error: authError,
    } = await withTimeout(supabase.auth.getUser(), 5000)

    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = await withTimeout(isAdminOrSuperAdmin(user.id), 3000)
    if (!isAdmin) return NextResponse.json({ error: 'Access denied. Admin role required.' }, { status: 403 })

    const subjectId = parseInt(id)
    if (isNaN(subjectId)) return NextResponse.json({ error: 'Invalid subject ID' }, { status: 400 })

    const subject = await db
      .select({ institutionId: institutions.institutionId })
      .from(institutions)
      .where(eq(institutions.institutionId, subjectId))
      .limit(1)

    if (subject.length === 0) return NextResponse.json({ error: 'Subject not found' }, { status: 404 })

    const files = await db
      .select()
      .from(ragFiles)
      .where(eq(ragFiles.institutionId, subjectId))
      .orderBy(desc(ragFiles.createdAt))

    return NextResponse.json({
      success: true,
      data: { ragFiles: files, total: files.length, subjectId },
    })
  } catch (error) {
    console.error('Error fetching RAG files:', error)
    return NextResponse.json({ error: 'Failed to fetch RAG files' }, { status: 500 })
  }
}

// POST /api/admin/subjects/[id]/rag-files - Upload new RAG file for subject
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          },
        },
      },
    )

    const {
      data: { user },
      error: authError,
    } = await withTimeout(supabase.auth.getUser(), 5000)

    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = await withTimeout(isAdminOrSuperAdmin(user.id), 3000)
    if (!isAdmin) return NextResponse.json({ error: 'Access denied. Admin role required.' }, { status: 403 })

    const subjectId = parseInt(id)
    if (isNaN(subjectId)) return NextResponse.json({ error: 'Invalid subject ID' }, { status: 400 })

    const currentUser = await db
      .select({ userId: users.userId })
      .from(users)
      .where(eq(users.supabaseUserId, user.id))
      .limit(1)

    if (currentUser.length === 0) return NextResponse.json({ error: 'User not found in database' }, { status: 404 })

    const subject = await db
      .select({ institutionId: institutions.institutionId, slug: institutions.slug })
      .from(institutions)
      .where(eq(institutions.institutionId, subjectId))
      .limit(1)

    if (subject.length === 0) return NextResponse.json({ error: 'Subject not found' }, { status: 404 })

    const body = await request.json()
    const { fileName, fileType, filePath, fileSize, description } = body

    if (!fileName || !fileType || !filePath) {
      return NextResponse.json({ error: 'fileName, fileType, and filePath are required' }, { status: 400 })
    }

    if (!['pdf', 'txt', 'docx', 'md'].includes(fileType)) {
      return NextResponse.json({ error: 'fileType must be one of: pdf, txt, docx, md' }, { status: 400 })
    }

    // Namespace uses subject_ prefix for SLB-B
    const pineconeNamespace = `subject_${subject[0].slug}`

    const [newRagFile] = await db
      .insert(ragFiles)
      .values({
        institutionId: subjectId,
        fileName,
        fileType,
        filePath,
        fileSize: fileSize ?? null,
        description,
        pineconeNamespace,
        processingStatus: 'pending',
        createdBy: currentUser[0].userId,
      })
      .returning()

    // Trigger backend processing in background (non-blocking)
    if (newRagFile.processingStatus === 'pending') {
      setImmediate(() => {
        void (async () => {
          try {
            const backendUrl = process.env.BACKEND_URL ?? 'http://backend:8000'
            const processResponse = await withTimeout(
              fetch(`${backendUrl}/api/v1/rag-processing/process-file`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rag_file_id: newRagFile.ragFileId, force_reprocess: true }),
              }),
              10000,
            )
            if (!processResponse.ok) {
              console.warn(`⚠️ Failed to trigger RAG processing: ${processResponse.status}`)
            }
          } catch (error) {
            console.warn('❌ Failed to trigger backend RAG processing:', error)
          }
        })()
      })
    }

    return NextResponse.json({ success: true, data: { ragFile: newRagFile } }, { status: 201 })
  } catch (error) {
    console.error('Error creating RAG file:', error)
    return NextResponse.json({ error: 'Failed to create RAG file record' }, { status: 500 })
  }
}
