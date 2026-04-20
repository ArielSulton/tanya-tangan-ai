import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/supabase-auth'
import { db } from '@/lib/db'
import { wordRequests } from '@/lib/db/schema'
import { desc, count, sql, isNull, isNotNull } from 'drizzle-orm'

/**
 * Word Requests API Endpoint
 *
 * GET: Fetch unmatched gesture inputs logged by students, for admin content curation.
 * Query params: page, limit, status (pending|resolved)
 */

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100)
    const status = searchParams.get('status')
    const offset = (page - 1) * limit

    const whereConditions = []
    if (status === 'pending') {
      whereConditions.push(isNull(wordRequests.suggestedWord))
    } else if (status === 'resolved') {
      whereConditions.push(isNotNull(wordRequests.suggestedWord))
    }

    const whereClause = whereConditions.length > 0 ? sql`${sql.join(whereConditions, sql` AND `)}` : undefined

    const totalCountResult = await db.select({ count: count() }).from(wordRequests).where(whereClause)
    const total = totalCountResult[0]?.count ?? 0

    const requests = await db
      .select()
      .from(wordRequests)
      .where(whereClause)
      .orderBy(desc(wordRequests.createdAt))
      .limit(limit)
      .offset(offset)

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      success: true,
      data: {
        requests: requests.map((r) => ({
          id: r.id,
          gesture_input: r.gestureInput,
          suggested_word: r.suggestedWord,
          session_id: r.sessionId,
          created_at: r.createdAt?.toISOString() ?? null,
        })),
        total,
        page,
        limit,
        total_pages: totalPages,
      },
    })
  } catch (error) {
    console.error('Error fetching word requests:', error)

    if (error instanceof Error && error.message.includes('Admin access required')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    if (error instanceof Error && error.message.includes('Authentication required')) {
      return NextResponse.json({ error: 'Unauthorized - Authentication required' }, { status: 401 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
