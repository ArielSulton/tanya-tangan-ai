/**
 * Types for runtime inference of trained TFJS classifiers (Phase 2D/2F).
 */

/** Result of a classifier inference: predicted label + confidence. */
export interface InferenceResult {
  /** Predicted class label (string from the labels.json file). */
  label: string
  /** Softmax probability for the predicted class, in [0, 1]. */
  confidence: number
}
