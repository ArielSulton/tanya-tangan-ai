import * as tf from '@tensorflow/tfjs'
import '@tensorflow/tfjs-backend-webgl'
import type { InferenceResult } from './types'

const MODEL_PATH = '/models/static/model.json'
const LABELS_PATH = '/models/static/labels.json'
const DEFAULT_THRESHOLD = 0.7
const EXPECTED_FEATURE_LENGTH = 84

/** Returns the index of the largest value in `arr`. Throws on empty input. */
export function argmax(arr: number[] | Float32Array): number {
  if (arr.length === 0) throw new Error('argmax: empty input')
  let best = 0
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] > arr[best]) best = i
  }
  return best
}

/**
 * Convert a softmax probability vector + label list to an InferenceResult.
 * Returns null when max confidence is below `threshold` (default 0).
 */
export function softmaxToResult(
  probs: number[] | Float32Array,
  labels: string[],
  threshold = 0,
): InferenceResult | null {
  if (probs.length !== labels.length) {
    throw new Error(`softmaxToResult: length mismatch (probs=${probs.length}, labels=${labels.length})`)
  }
  const idx = argmax(probs)
  const confidence = probs[idx]
  if (confidence < threshold) return null
  return { label: labels[idx], confidence }
}

/**
 * Singleton TFJS static classifier. Loads the model lazily on first
 * `classify()` call. Built but NOT wired into production (per Phase 2 user
 * decision — fingerpose remains the active static path). Exported for future
 * use, evaluation, or potential swap-in.
 */
export class StaticClassifier {
  private model: tf.GraphModel | null = null
  private labels: string[] | null = null
  private loading: Promise<void> | null = null
  private confidenceThreshold = DEFAULT_THRESHOLD

  setThreshold(t: number): void {
    this.confidenceThreshold = t
  }

  /** Returns true when model files load successfully. False if model missing/corrupt. */
  async load(): Promise<boolean> {
    if (this.model && this.labels) return true
    if (this.loading) {
      await this.loading
      return this.model !== null && this.labels !== null
    }
    this.loading = (async () => {
      try {
        const [model, labelsRes] = await Promise.all([
          tf.loadGraphModel(MODEL_PATH),
          fetch(LABELS_PATH),
        ])
        if (!labelsRes.ok) throw new Error(`labels.json fetch failed (${labelsRes.status})`)
        const labels = (await labelsRes.json()) as string[]
        this.model = model
        this.labels = labels
      } catch (err) {
        console.warn('[StaticClassifier] model not loaded (will fall back):', err)
        this.model = null
        this.labels = null
      } finally {
        this.loading = null
      }
    })()
    await this.loading
    return this.model !== null && this.labels !== null
  }

  /**
   * Run inference on an 84-float feature vector. Returns null if model isn't
   * loaded yet, or if max confidence is below threshold.
   */
  async classify(features: number[]): Promise<InferenceResult | null> {
    if (features.length !== EXPECTED_FEATURE_LENGTH) {
      throw new Error(`classify: expected ${EXPECTED_FEATURE_LENGTH} features, got ${features.length}`)
    }
    const ok = await this.load()
    if (!ok || !this.model || !this.labels) return null

    const input = tf.tensor2d([features], [1, EXPECTED_FEATURE_LENGTH])
    try {
      const output = this.model.predict(input) as tf.Tensor
      const probs = Array.from(await output.data())
      output.dispose()
      return softmaxToResult(probs, this.labels, this.confidenceThreshold)
    } finally {
      input.dispose()
    }
  }

  dispose(): void {
    this.model?.dispose()
    this.model = null
    this.labels = null
  }
}

// Module-level singleton instance for app-wide reuse.
export const staticClassifier = new StaticClassifier()
