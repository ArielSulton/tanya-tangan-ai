/**
 * Load a Blob (a File, or a MediaRecorder-produced in-memory recording) as an
 * offscreen HTMLVideoElement, resolving once metadata (incl. duration) is ready.
 */
export function loadVideo(source: Blob): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(source)
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.onloadedmetadata = () => resolve(video)
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('video load failed'))
    }
    video.src = url
    // Caller revokes URL once done. Storing on element for later cleanup.
    ;(video as HTMLVideoElement & { __objectUrl?: string }).__objectUrl = url
  })
}

export function releaseVideo(video: HTMLVideoElement): void {
  const url = (video as HTMLVideoElement & { __objectUrl?: string }).__objectUrl
  if (url) URL.revokeObjectURL(url)
}

/** Seek a video to a given timestamp (seconds), resolving once the frame is ready to read. */
export function seekTo(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('error', onError)
      resolve()
    }
    const onError = () => {
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('error', onError)
      reject(new Error('video seek failed'))
    }
    video.addEventListener('seeked', onSeeked)
    video.addEventListener('error', onError)
    video.currentTime = t
  })
}
