import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { words, wordComparisons } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { isAdminOrSuperAdmin } from '@/lib/auth/supabase-auth'

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

// PUT /api/admin/vocab/[id]
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const {
      data: { user },
      error: authError,
    } = await getAuthUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await isAdminOrSuperAdmin(user.id))) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    const { id } = await params
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
      text?: string
      category?: string
      type?: 'konkret' | 'abstrak'
      imageUrl?: string | null
      comparison?: {
        lowImageUrl: string
        highImageUrl: string
        lowLabel: string
        highLabel: string
        referenceWord: string
      } | null
      adverbSubcategory?: string | null
      sliderConfig?: unknown
      timelineConfig?: unknown
      certaintyConfig?: unknown
      gaugeConfig?: unknown
    }

    const updateData: Partial<typeof words.$inferInsert> = {}
    if (text !== undefined) updateData.text = text.trim().toLowerCase()
    if (category !== undefined) updateData.category = category
    if (type !== undefined) updateData.type = type
    if (imageUrl !== undefined) {
      updateData.imageUrl = imageUrl
      updateData.imageSource = imageUrl ? 'r2' : 'api'
    }
    if (adverbSubcategory !== undefined) updateData.adverbSubcategory = adverbSubcategory ?? null
    if (sliderConfig !== undefined) (updateData as Record<string, unknown>).sliderConfig = sliderConfig ?? null
    if (timelineConfig !== undefined) (updateData as Record<string, unknown>).timelineConfig = timelineConfig ?? null
    if (certaintyConfig !== undefined) (updateData as Record<string, unknown>).certaintyConfig = certaintyConfig ?? null
    if (gaugeConfig !== undefined) (updateData as Record<string, unknown>).gaugeConfig = gaugeConfig ?? null

    const [updatedWord] = await db.update(words).set(updateData).where(eq(words.id, id)).returning()

    if (!updatedWord) return NextResponse.json({ error: 'Word not found' }, { status: 404 })

    // Handle comparison update for abstrak words
    if (type === 'abstrak' || updatedWord.type === 'abstrak') {
      if (comparison === null) {
        await db.delete(wordComparisons).where(eq(wordComparisons.wordId, id))
      } else if (comparison) {
        const { lowImageUrl, highImageUrl, lowLabel, highLabel, referenceWord } = comparison
        const existing = await db.select().from(wordComparisons).where(eq(wordComparisons.wordId, id)).limit(1)
        if (existing.length > 0) {
          await db
            .update(wordComparisons)
            .set({ lowImageUrl, highImageUrl, lowLabel, highLabel, referenceWord })
            .where(eq(wordComparisons.wordId, id))
        } else {
          await db
            .insert(wordComparisons)
            .values({ wordId: id, lowImageUrl, highImageUrl, lowLabel, highLabel, referenceWord })
        }
      }
    } else if (type === 'konkret') {
      // If switching to konkret, remove comparison
      await db.delete(wordComparisons).where(eq(wordComparisons.wordId, id))
    }

    return NextResponse.json({ success: true, data: { word: updatedWord } })
  } catch (error) {
    console.error('Error updating vocab word:', error)
    return NextResponse.json({ error: 'Failed to update vocab word' }, { status: 500 })
  }
}

// DELETE /api/admin/vocab/[id]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const {
      data: { user },
      error: authError,
    } = await getAuthUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await isAdminOrSuperAdmin(user.id))) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    const { id } = await params
    // wordComparisons are cascade deleted
    const [deleted] = await db.delete(words).where(eq(words.id, id)).returning()
    if (!deleted) return NextResponse.json({ error: 'Word not found' }, { status: 404 })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting vocab word:', error)
    return NextResponse.json({ error: 'Failed to delete vocab word' }, { status: 500 })
  }
}
