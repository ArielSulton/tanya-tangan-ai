// The npm @mediapipe/hands package is a UMD script that attaches a Hands
// constructor onto window.Hands via side effects; it has no real ES exports.
// Strict bundlers (webpack prod, turbopack) fail on the named import that
// hand-pose-detection.esm.js does. We alias the package to this shim.
//
// Two contracts this shim satisfies:
//   1. A constructable `Hands` that delegates to window.Hands at `new` time —
//      so handpose-detection's static-captured reference works even though
//      window.Hands isn't defined when this module first evaluates.
//   2. An async `loadHandsScript()` callers can `await` before instantiating
//      the detector, to ensure the CDN UMD script has run and window.Hands
//      is populated.
type HandsCtor = new (config?: { locateFile?: (file: string, base: string) => string }) => unknown

declare global {
  interface Window {
    Hands?: HandsCtor
  }
}

const CDN_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js'

let scriptLoadPromise: Promise<void> | null = null

export function loadHandsScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('loadHandsScript called outside a browser'))
  }
  if (window.Hands) return Promise.resolve()
  if (scriptLoadPromise) return scriptLoadPromise

  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CDN_URL}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('mediapipe hands script failed to load')))
      return
    }
    const script = document.createElement('script')
    script.src = CDN_URL
    script.async = true
    script.crossOrigin = 'anonymous'
    script.onload = () => {
      if (window.Hands) resolve()
      else reject(new Error('mediapipe hands script loaded but window.Hands is still undefined'))
    }
    script.onerror = () => reject(new Error('mediapipe hands script failed to load'))
    document.head.appendChild(script)
  })
  return scriptLoadPromise
}

// Constructable wrapper — hand-pose-detection captures `Hands` at its module
// load time, then later does `new Hands(...)`. We can't return a real class
// object from a const, but we *can* expose a class whose constructor delegates.
// Returning a non-primitive from a constructor overrides `this`, so callers
// get a real window.Hands instance with all prototype methods.
export class Hands {
  constructor(config?: { locateFile?: (file: string, base: string) => string }) {
    if (typeof window === 'undefined') {
      throw new Error('@mediapipe/hands shim invoked outside a browser')
    }
    const RealHands = window.Hands
    if (!RealHands) {
      throw new Error(
        '@mediapipe/hands not loaded yet — call loadHandsScript() from this shim and await it before constructing the detector.',
      )
    }
    return new RealHands(config) as unknown as Hands
  }
}
