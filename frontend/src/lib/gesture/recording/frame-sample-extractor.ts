import type { HandPoseService } from '@/lib/ai/services/handpose-service'
import { sortHandsByXPosition } from '../normalize'
import { extractFrameFeatures } from '../feature-extractor'
import { captureStaticSample } from './keypoint-recorder'
import type { StaticSample } from './types'

/**
 * Detect hands at the video's current (already-seeked) position and, if a
 * hand is present, build a StaticSample for `label`. Returns null if no hand
 * was detected or the extracted feature vector is all-zero (mirrors the skip
 * condition VideoImporter's bulk loop already used inline). Does not persist
 * the sample — callers decide whether/when to call addStatic.
 */
export async function extractStaticSampleFromVideoFrame(
  video: HTMLVideoElement,
  handpose: HandPoseService,
  label: string,
): Promise<StaticSample | null> {
  const raws = await handpose.detectRawHands(video)
  if (raws.length === 0) return null
  const pair = sortHandsByXPosition(raws)
  const features = extractFrameFeatures(pair)
  if (features.every((v) => v === 0)) return null
  return captureStaticSample(pair, label, 'manual')
}
