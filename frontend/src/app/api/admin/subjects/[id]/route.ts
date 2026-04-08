import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { institutions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { isAdminOrSuperAdmin } from '@/lib/auth/supabase-auth'

function makeSupabaseClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
      },
    },
  })
}

// GET /api/admin/subjects/[id] - Get specific subject
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const cookieStore = await cookies()
    const supabase = makeSupabaseClient(cookieStore)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = await isAdminOrSuperAdmin(user.id)
    if (!isAdmin) return NextResponse.json({ error: 'Access denied. Admin role required.' }, { status: 403 })

    const subjectId = parseInt(id)
    if (isNaN(subjectId)) return NextResponse.json({ error: 'Invalid subject ID' }, { status: 400 })

    const subject = await db.select().from(institutions).where(eq(institutions.institutionId, subjectId)).limit(1)

    if (subject.length === 0) return NextResponse.json({ error: 'Subject not found' }, { status: 404 })

    const s = subject[0]
    return NextResponse.json({
      success: true,
      data: {
        subject: {
          subjectId: s.institutionId,
          name: s.name,
          slug: s.slug,
          jenjang: s.jenjang,
          mataPelajaran: s.mataPelajaran,
          description: s.description,
          logoUrl: s.logoUrl,
          isActive: s.isActive,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching subject:', error)
    return NextResponse.json({ error: 'Failed to fetch subject' }, { status: 500 })
  }
}

// PUT /api/admin/subjects/[id] - Update subject
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const cookieStore = await cookies()
    const supabase = makeSupabaseClient(cookieStore)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = await isAdminOrSuperAdmin(user.id)
    if (!isAdmin) return NextResponse.json({ error: 'Access denied. Admin role required.' }, { status: 403 })

    const subjectId = parseInt(id)
    if (isNaN(subjectId)) return NextResponse.json({ error: 'Invalid subject ID' }, { status: 400 })

    const body = await request.json()
    const { name, slug, jenjang, mataPelajaran, description, isActive } = body

    if (!name || !slug) return NextResponse.json({ error: 'name and slug are required' }, { status: 400 })

    const existing = await db.select().from(institutions).where(eq(institutions.institutionId, subjectId)).limit(1)
    if (existing.length === 0) return NextResponse.json({ error: 'Subject not found' }, { status: 404 })

    if (slug !== existing[0].slug) {
      const slugCheck = await db
        .select({ institutionId: institutions.institutionId })
        .from(institutions)
        .where(eq(institutions.slug, slug))
        .limit(1)
      if (slugCheck.length > 0)
        return NextResponse.json({ error: 'Subject with this slug already exists' }, { status: 400 })
    }

    const [updated] = await db
      .update(institutions)
      .set({
        name,
        slug,
        jenjang: jenjang ?? existing[0].jenjang,
        mataPelajaran: mataPelajaran ?? existing[0].mataPelajaran,
        description,
        isActive: isActive !== undefined ? isActive : existing[0].isActive,
        updatedAt: new Date(),
      })
      .where(eq(institutions.institutionId, subjectId))
      .returning()

    return NextResponse.json({
      success: true,
      data: {
        subject: {
          subjectId: updated.institutionId,
          name: updated.name,
          slug: updated.slug,
          jenjang: updated.jenjang,
          mataPelajaran: updated.mataPelajaran,
        },
      },
    })
  } catch (error) {
    console.error('Error updating subject:', error)
    return NextResponse.json({ error: 'Failed to update subject' }, { status: 500 })
  }
}

// DELETE /api/admin/subjects/[id] - Soft delete subject
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const cookieStore = await cookies()
    const supabase = makeSupabaseClient(cookieStore)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = await isAdminOrSuperAdmin(user.id)
    if (!isAdmin) return NextResponse.json({ error: 'Access denied. Admin role required.' }, { status: 403 })

    const subjectId = parseInt(id)
    if (isNaN(subjectId)) return NextResponse.json({ error: 'Invalid subject ID' }, { status: 400 })

    const [deactivated] = await db
      .update(institutions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(institutions.institutionId, subjectId))
      .returning()

    if (!deactivated) return NextResponse.json({ error: 'Subject not found' }, { status: 404 })

    return NextResponse.json({ success: true, data: { subjectId: deactivated.institutionId } })
  } catch (error) {
    console.error('Error deleting subject:', error)
    return NextResponse.json({ error: 'Failed to delete subject' }, { status: 500 })
  }
}
