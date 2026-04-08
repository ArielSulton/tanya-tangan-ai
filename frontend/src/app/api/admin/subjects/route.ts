import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { institutions, users } from '@/lib/db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { isAdminOrSuperAdmin } from '@/lib/auth/supabase-auth'

// GET /api/admin/subjects - List all subjects (mata pelajaran) for SLB-B
export async function GET() {
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
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = await isAdminOrSuperAdmin(user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Access denied. Admin role required.' }, { status: 403 })
    }

    const subjectsWithCounts = await db
      .select({
        subjectId: institutions.institutionId,
        name: institutions.name,
        slug: institutions.slug,
        jenjang: institutions.jenjang,
        mataPelajaran: institutions.mataPelajaran,
        description: institutions.description,
        logoUrl: institutions.logoUrl,
        isActive: institutions.isActive,
        createdBy: institutions.createdBy,
        createdAt: institutions.createdAt,
        updatedAt: institutions.updatedAt,
        ragFilesCount: sql<number>`(
          SELECT COUNT(*)::int
          FROM rag_files rf
          WHERE rf.institution_id = ${institutions.institutionId}
          AND rf.is_active = true
        )`.as('ragFilesCount'),
        conversationsCount: sql<number>`(
          SELECT COUNT(*)::int
          FROM conversations c
          WHERE c.institution_id = ${institutions.institutionId}
        )`.as('conversationsCount'),
      })
      .from(institutions)
      .orderBy(desc(institutions.createdAt))

    const formattedSubjects = subjectsWithCounts.map((s) => ({
      ...s,
      _count: {
        ragFiles: s.ragFilesCount,
        conversations: s.conversationsCount,
      },
    }))

    return NextResponse.json({
      success: true,
      data: {
        subjects: formattedSubjects,
        total: formattedSubjects.length,
      },
    })
  } catch (error) {
    console.error('Error fetching subjects:', error)
    return NextResponse.json({ error: 'Failed to fetch subjects' }, { status: 500 })
  }
}

// POST /api/admin/subjects - Create new subject (mata pelajaran)
export async function POST(request: NextRequest) {
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
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = await isAdminOrSuperAdmin(user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Access denied. Admin role required.' }, { status: 403 })
    }

    const currentUser = await db
      .select({ userId: users.userId })
      .from(users)
      .where(eq(users.supabaseUserId, user.id))
      .limit(1)

    if (currentUser.length === 0) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 })
    }

    const body = await request.json()
    const { name, slug, jenjang, mataPelajaran, description } = body

    if (!name || !slug || !jenjang || !mataPelajaran) {
      return NextResponse.json({ error: 'name, slug, jenjang, and mataPelajaran are required' }, { status: 400 })
    }

    const validJenjang = ['SDLB', 'SMPLB', 'SMALB']
    if (!validJenjang.includes(jenjang)) {
      return NextResponse.json({ error: `jenjang must be one of: ${validJenjang.join(', ')}` }, { status: 400 })
    }

    const existingSubject = await db
      .select({ institutionId: institutions.institutionId })
      .from(institutions)
      .where(eq(institutions.slug, slug))
      .limit(1)

    if (existingSubject.length > 0) {
      return NextResponse.json({ error: 'Subject with this slug already exists' }, { status: 400 })
    }

    const [newSubject] = await db
      .insert(institutions)
      .values({
        name,
        slug,
        jenjang,
        mataPelajaran,
        description,
        contactInfo: {},
        createdBy: currentUser[0].userId,
      })
      .returning()

    return NextResponse.json(
      {
        success: true,
        data: {
          subject: {
            subjectId: newSubject.institutionId,
            name: newSubject.name,
            slug: newSubject.slug,
            jenjang: newSubject.jenjang,
            mataPelajaran: newSubject.mataPelajaran,
          },
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Error creating subject:', error)
    return NextResponse.json({ error: 'Failed to create subject' }, { status: 500 })
  }
}
