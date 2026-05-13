/**
 * Auto-labeling helper: ask the legacy YOLO backend for the letter it
 * recognizes in the current video frame. Used only inside the recorder's
 * "yolo-auto" mode. Returns null when the backend rejects, doesn't detect,
 * or returns low-confidence predictions.
 */

const MIN_CONFIDENCE = 0.7

export async function labelFrameViaYolo(
  video: HTMLVideoElement,
  sessionId: string,
): Promise<{ letter: string; confidence: number } | null> {
  if (!video || video.readyState < 2) return null
  const w = video.videoWidth || 640
  const h = video.videoHeight || 480
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(video, 0, 0, w, h)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.8)

  let res: Response
  try {
    res = await fetch('/api/v1/gesture/recognize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frame: dataUrl, session_id: sessionId }),
    })
  } catch {
    return null
  }
  if (!res.ok) return null

  type Resp = { detected?: boolean; letter?: string; confidence?: number }
  const data = (await res.json()) as Resp
  if (data.detected === false || !data.letter) return null
  const conf = data.confidence ?? 0
  if (conf < MIN_CONFIDENCE) return null
  return { letter: data.letter, confidence: conf }
}
