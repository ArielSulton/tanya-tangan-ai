import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { institutions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// GET /api/subjects/[slug] - Public endpoint to get subject details by slug
export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params

    if (!slug) {
      return NextResponse.json({ success: false, error: 'Slug parameter is required' }, { status: 400 })
    }

    const subject = await db.select().from(institutions).where(eq(institutions.slug, slug)).limit(1)

    if (subject.length === 0) {
      return NextResponse.json({ success: false, error: 'Subject not found' }, { status: 404 })
    }

    const s = subject[0]
    return NextResponse.json({
      success: true,
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
    })
  } catch (error) {
    console.error('Error fetching subject by slug:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch subject' }, { status: 500 })
  }
}
