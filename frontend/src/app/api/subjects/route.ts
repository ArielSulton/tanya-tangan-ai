import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { institutions } from '@/lib/db/schema'
import { eq, desc, sql } from 'drizzle-orm'

// GET /api/subjects - Public endpoint to list active subjects (mata pelajaran) for SLB-B
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const jenjang = searchParams.get('jenjang') // optional filter: SDLB | SMPLB | SMALB

    const query = db
      .select({
        subjectId: institutions.institutionId,
        name: institutions.name,
        slug: institutions.slug,
        jenjang: institutions.jenjang,
        mataPelajaran: institutions.mataPelajaran,
        description: institutions.description,
        logoUrl: institutions.logoUrl,
        ragFilesCount: sql<number>`(
          SELECT COUNT(*)::int
          FROM rag_files rf
          WHERE rf.institution_id = ${institutions.institutionId}
          AND rf.is_active = true
          AND rf.processing_status = 'completed'
        )`.as('ragFilesCount'),
      })
      .from(institutions)
      .where(eq(institutions.isActive, true))
      .orderBy(desc(institutions.createdAt))

    const allSubjects = await query

    // Filter by jenjang if provided
    const filtered = jenjang ? allSubjects.filter((s) => s.jenjang === jenjang) : allSubjects

    // Only return subjects that have at least one completed RAG file
    const subjectsWithData = filtered.filter((s) => s.ragFilesCount > 0)

    return NextResponse.json({
      success: true,
      data: {
        subjects: subjectsWithData.map((s) => ({
          subjectId: s.subjectId,
          name: s.name,
          slug: s.slug,
          jenjang: s.jenjang,
          mataPelajaran: s.mataPelajaran,
          description: s.description,
          logoUrl: s.logoUrl,
          isActive: true, // already filtered by isActive=true in query
          ragFilesCount: s.ragFilesCount,
          _count: { ragFiles: s.ragFilesCount, conversations: 0 },
        })),
        total: subjectsWithData.length,
      },
    })
  } catch (error) {
    console.error('Error fetching public subjects:', error)
    return NextResponse.json({ error: 'Failed to fetch subjects' }, { status: 500 })
  }
}
