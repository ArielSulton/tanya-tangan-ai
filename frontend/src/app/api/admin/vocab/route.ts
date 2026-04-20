import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { words, wordComparisons } from '@/lib/db/schema'
import { eq, desc, and } from 'drizzle-orm'
import { isAdminOrSuperAdmin } from '@/lib/auth/supabase-auth'

const VALID_CATEGORIES = ['hewan', 'benda', 'alam', 'perasaan', 'kata_keterangan']

async function getAuthUser() {
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
  return supabase.auth.getUser()
}

// GET /api/admin/vocab?category=&page=&limit=
export async function GET(request: NextRequest) {
  try {
    const {
      data: { user },
      error: authError,
    } = await getAuthUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await isAdminOrSuperAdmin(user.id))) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') ?? ''
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '50'))
    const offset = (page - 1) * limit

    const conditions = category && VALID_CATEGORIES.includes(category) ? [eq(words.category, category)] : []

    const rows = await db
      .select({
        id: words.id,
        text: words.text,
        category: words.category,
        type: words.type,
        level: words.level,
        imageUrl: words.imageUrl,
        imageSource: words.imageSource,
        createdAt: words.createdAt,
        adverbSubcategory: words.adverbSubcategory,
        sliderConfig: words.sliderConfig,
        timelineConfig: words.timelineConfig,
        certaintyConfig: words.certaintyConfig,
        gaugeConfig: words.gaugeConfig,
        compId: wordComparisons.id,
        lowImageUrl: wordComparisons.lowImageUrl,
        highImageUrl: wordComparisons.highImageUrl,
        lowLabel: wordComparisons.lowLabel,
        highLabel: wordComparisons.highLabel,
        referenceWord: wordComparisons.referenceWord,
      })
      .from(words)
      .leftJoin(wordComparisons, eq(wordComparisons.wordId, words.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(words.createdAt))
      .limit(limit)
      .offset(offset)

    const vocabWords = rows.map((r) => ({
      id: r.id,
      text: r.text,
      category: r.category,
      type: r.type,
      level: r.level,
      imageUrl: r.imageUrl,
      imageSource: r.imageSource,
      createdAt: r.createdAt,
      adverbSubcategory: r.adverbSubcategory,
      sliderConfig: r.sliderConfig,
      timelineConfig: r.timelineConfig,
      certaintyConfig: r.certaintyConfig,
      gaugeConfig: r.gaugeConfig,
      comparison: r.compId
        ? {
            id: r.compId,
            lowImageUrl: r.lowImageUrl!,
            highImageUrl: r.highImageUrl!,
            lowLabel: r.lowLabel!,
            highLabel: r.highLabel!,
            referenceWord: r.referenceWord!,
          }
        : null,
    }))

    return NextResponse.json({ success: true, data: { words: vocabWords, total: vocabWords.length } })
  } catch (error) {
    console.error('Error fetching vocab words:', error)
    return NextResponse.json({ error: 'Failed to fetch vocab words' }, { status: 500 })
  }
}

// POST /api/admin/vocab - create word (+ optional comparison)
export async function POST(request: NextRequest) {
  try {
    const {
      data: { user },
      error: authError,
    } = await getAuthUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await isAdminOrSuperAdmin(user.id))) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    const body = await request.json()
    const {
      text,
      category,
      type,
      imageUrl,
      comparison,
      adverbSubcategory,
      sliderConfig,
      timelineConfig,
      certaintyConfig,
      gaugeConfig,
    } = body as {
      text: string
      category: string
      type: 'konkret' | 'abstrak'
      imageUrl?: string
      comparison?: {
        lowImageUrl: string
        highImageUrl: string
        lowLabel: string
        highLabel: string
        referenceWord: string
      }
      adverbSubcategory?: string
      sliderConfig?: unknown
      timelineConfig?: unknown
      certaintyConfig?: unknown
      gaugeConfig?: unknown
    }

    if (!text?.trim() || !category || !type) {
      return NextResponse.json({ error: 'text, category, and type are required' }, { status: 400 })
    }
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 },
      )
    }
    if (!['konkret', 'abstrak'].includes(type)) {
      return NextResponse.json({ error: 'type must be konkret or abstrak' }, { status: 400 })
    }

    const [newWord] = await db
      .insert(words)
      .values({
        text: text.trim().toLowerCase(),
        category,
        type,
        level: 'sdlb',
        imageUrl: imageUrl ?? null,
        imageSource: imageUrl ? 'r2' : 'api',
        adverbSubcategory: adverbSubcategory ?? null,
        sliderConfig: (sliderConfig ?? null) as Record<string, unknown> | null,
        timelineConfig: (timelineConfig ?? null) as Record<string, unknown> | null,
        certaintyConfig: (certaintyConfig ?? null) as Record<string, unknown> | null,
        gaugeConfig: (gaugeConfig ?? null) as Record<string, unknown> | null,
      } as typeof words.$inferInsert)
      .returning()

    if (type === 'abstrak' && comparison) {
      const { lowImageUrl, highImageUrl, lowLabel, highLabel, referenceWord } = comparison
      if (lowImageUrl && highImageUrl && lowLabel && highLabel && referenceWord) {
        await db.insert(wordComparisons).values({
          wordId: newWord.id,
          lowImageUrl,
          highImageUrl,
          lowLabel,
          highLabel,
          referenceWord,
        })
      }
    }

    return NextResponse.json({ success: true, data: { word: newWord } }, { status: 201 })
  } catch (error) {
    console.error('Error creating vocab word:', error)
    return NextResponse.json({ error: 'Failed to create vocab word' }, { status: 500 })
  }
}
