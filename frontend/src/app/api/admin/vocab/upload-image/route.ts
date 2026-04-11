import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { isAdminOrSuperAdmin } from '@/lib/auth/supabase-auth'
import { randomUUID } from 'crypto'

const ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID
const ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
const SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME
const PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL

function getR2Client() {
  if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
    throw new Error('Cloudflare R2 credentials not configured')
  }
  return new S3Client({
    region: 'auto',
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET_ACCESS_KEY,
    },
  })
}

// POST /api/admin/vocab/upload-image
// Multipart form: field "file" (image)
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

    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await isAdminOrSuperAdmin(user.id))) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    if (!BUCKET_NAME || !PUBLIC_URL) {
      return NextResponse.json({ error: 'R2 bucket not configured' }, { status: 503 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, WebP, and GIF images are allowed' }, { status: 400 })
    }

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size must be under 5MB' }, { status: 400 })
    }

    const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
    const key = `vocab/${randomUUID()}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const r2 = getR2Client()

    await r2.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: file.type,
        CacheControl: 'public, max-age=31536000',
      }),
    )

    const publicUrl = `${PUBLIC_URL.replace(/\/$/, '')}/${key}`

    return NextResponse.json({ success: true, data: { url: publicUrl, key } })
  } catch (error) {
    console.error('Error uploading image to R2:', error)
    const message = error instanceof Error ? error.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
