import * as tf from '@tensorflow/tfjs'
import '@tensorflow/tfjs-backend-webgl'
import type { InferenceResult } from './types'
import { softmaxToResult } from './static-classifier'
import { SEQ_LENGTH, FEATURE_DIM } from '../dual-hand-features'

const MODEL_PATH = '/models/dynamic_v2/model.json'
const LABELS_PATH = '/models/dynamic_v2/labels.json'
// Kept low deliberately, same rationale as the old DynamicClassifier: dynamic
// gestures are noisier than static poses, so softmax peaks run softer. The
// caller (engine.ts's majority-vote gate) applies its own, higher threshold
// on top before accepting a final result.
const DEFAULT_THRESHOLD = 0.4

/**
 * Singleton dynamic_v2 classifier — GRU(64, reset_after=False) trained in
 * train_dynamic_v2.ipynb (Task 7), converted via the project's existing
 * convert_to_tfjs.sh (Task 8). Loads lazily via the ordinary
 * tf.loadLayersModel() path (no manual weight decoding — reset_after=False
 * makes this model natively TFJS-layers-compatible), matching the
 * structure of the older inference/dynamic-classifier.ts.
 */
export class DynamicClassifierV2 {
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
    if (this.loadFailed) return false
    if (this.loading) {
      await this.loading
      return this.model !== null && this.labels !== null
    }
    this.loading = (async () => {
      try {
        const [model, labelsRes] = await Promise.all([tf.loadLayersModel(MODEL_PATH), fetch(LABELS_PATH)])
        if (!labelsRes.ok) throw new Error(`labels.json fetch failed (${labelsRes.status})`)
        const labels = (await labelsRes.json()) as string[]
        this.model = model
        this.labels = labels
        if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
          console.log(
            '[DynamicClassifierV2] loaded. input=',
            model.inputs[0]?.shape,
            'output=',
            model.outputs[0]?.shape,
            'labels=',
            labels,
          )
        }
      } catch (err) {
        console.warn('[DynamicClassifierV2] model not loaded; subsequent calls will no-op:', err)
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

  /** Run inference on a SEQ_LENGTH x FEATURE_DIM dual-hand frame sequence.
   *  Returns null on absent model or below-threshold confidence. */
  async classify(frames: number[][]): Promise<InferenceResult | null> {
    if (frames.length !== SEQ_LENGTH || frames.some((f) => f.length !== FEATURE_DIM)) {
      throw new Error(
        `classify: expected ${SEQ_LENGTH}x${FEATURE_DIM} frames, got ${frames.length}x${frames[0]?.length ?? 0}`,
      )
    }
    const ok = await this.load()
    if (!ok || !this.model || !this.labels) return null

    const input = tf.tensor3d([frames], [1, SEQ_LENGTH, FEATURE_DIM])
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

export const dynamicClassifierV2 = new DynamicClassifierV2()
