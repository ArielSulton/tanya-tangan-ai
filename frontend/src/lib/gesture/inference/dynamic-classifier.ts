import * as tf from '@tensorflow/tfjs'
import '@tensorflow/tfjs-backend-webgl'
import type { InferenceResult } from './types'
import type { HistoryPoint } from '../recording/types'
import { softmaxToResult } from './static-classifier'

const MODEL_PATH = '/models/dynamic/model.json'
const LABELS_PATH = '/models/dynamic/labels.json'
const DEFAULT_THRESHOLD = 0.6
const EXPECTED_HISTORY_LENGTH = 24
const EXPECTED_FEATURE_LENGTH = EXPECTED_HISTORY_LENGTH * 2 // 48

/** Flatten a 24-frame HistoryPoint buffer into a 48-float feature vector. */
export function historyToFeatures(history: HistoryPoint[]): number[] {
  if (history.length !== EXPECTED_HISTORY_LENGTH) {
    throw new Error(`historyToFeatures: expected ${EXPECTED_HISTORY_LENGTH} points, got ${history.length}`)
  }
  const out: number[] = []
  for (const p of history) {
    out.push(p.x, p.y)
  }
  return out
}

/**
 * Singleton TFJS dynamic classifier. Loaded on demand by the engine when
 * MotionDetector reports a motion_end. Returns null when model files are
 * missing — engine treats null as "no dynamic recognition this take".
 */
export class DynamicClassifier {
  private model: tf.GraphModel | null = null
  private labels: string[] | null = null
  private loading: Promise<void> | null = null
  private confidenceThreshold = DEFAULT_THRESHOLD

  setThreshold(t: number): void {
    this.confidenceThreshold = t
  }

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
        console.warn('[DynamicClassifier] model not loaded (will fall back):', err)
        this.model = null
        this.labels = null
      } finally {
        this.loading = null
      }
    })()
    await this.loading
    return this.model !== null && this.labels !== null
  }

  /** Run inference on a 24-frame point-history. Returns null on absent model
   *  or below-threshold confidence. */
  async classify(history: HistoryPoint[]): Promise<InferenceResult | null> {
    const features = historyToFeatures(history) // throws if wrong length
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

export const dynamicClassifier = new DynamicClassifier()
