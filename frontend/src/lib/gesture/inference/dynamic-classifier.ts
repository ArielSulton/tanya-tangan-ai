import * as tf from '@tensorflow/tfjs'
import '@tensorflow/tfjs-backend-webgl'
import type { InferenceResult } from './types'
import { DYNAMIC_HISTORY_SIZE, DYNAMIC_FEATURE_LENGTH, type HistoryPoint } from '../recording/types'
import { softmaxToResult } from './static-classifier'

const MODEL_PATH = '/models/dynamic/model.json'
const LABELS_PATH = '/models/dynamic/labels.json'
// Dynamic classifier confidence floor below which classify() returns null.
// Kept low (0.4) because dynamic gestures are inherently noisier than static
// poses — same gesture varies more between takes, so softmax peaks are
// usually softer. Hook layer applies its own validation threshold on top.
const DEFAULT_THRESHOLD = 0.4
const EXPECTED_HISTORY_LENGTH = DYNAMIC_HISTORY_SIZE
const EXPECTED_FEATURE_LENGTH = DYNAMIC_FEATURE_LENGTH

/** Flatten an N-frame HistoryPoint buffer (N = DYNAMIC_HISTORY_SIZE) into a 2N-float feature vector. */
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
  // Uses tfjs_layers_model (Keras-reconstructed Sequential) rather than
  // tfjs_graph_model — see convert_to_tfjs.sh for the rationale. Layers
  // models handle LSTM via the native Keras LSTM layer impl, so predict()
  // works without dynamic-op gymnastics.
  private model: tf.LayersModel | null = null
  private labels: string[] | null = null
  private loading: Promise<void> | null = null
  private loadFailed = false
  private confidenceThreshold = DEFAULT_THRESHOLD

  setThreshold(t: number): void {
    this.confidenceThreshold = t
  }

  async load(): Promise<boolean> {
    if (this.model && this.labels) return true
    // First load attempt failed — assume model files aren't deployed yet.
    // Cache the failure so engine doesn't retry on every motion_end and spam
    // 404s into the console / server log.
    if (this.loadFailed) return false
    if (this.loading) {
      await this.loading
      return this.model !== null && this.labels !== null
    }
    this.loading = (async () => {
      try {
        const [model, labelsRes] = await Promise.all([
          tf.loadLayersModel(MODEL_PATH),
          fetch(LABELS_PATH),
        ])
        if (!labelsRes.ok) throw new Error(`labels.json fetch failed (${labelsRes.status})`)
        const labels = (await labelsRes.json()) as string[]
        this.model = model
        this.labels = labels
        if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
          console.log(
            '[DynamicClassifier] loaded (layers). input=',
            model.inputs[0]?.shape,
            'output=',
            model.outputs[0]?.shape,
          )
        }
      } catch (err) {
        console.warn('[DynamicClassifier] model not loaded; subsequent calls will no-op:', err)
        this.model = null
        this.labels = null
        this.loadFailed = true
      } finally {
        this.loading = null
      }
    })()
    await this.loading
    return this.model !== null && this.labels !== null
  }

  /** Run inference on a DYNAMIC_HISTORY_SIZE-frame point-history. Returns
   *  null on absent model or below-threshold confidence. */
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
    this.loadFailed = false
  }
}

export const dynamicClassifier = new DynamicClassifier()
