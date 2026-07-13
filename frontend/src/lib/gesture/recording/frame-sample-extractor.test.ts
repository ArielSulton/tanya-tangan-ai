import { describe, expect, test } from 'bun:test'
import { extractStaticSampleFromVideoFrame } from './frame-sample-extractor'
import type { HandPoseService } from '@/lib/ai/services/handpose-service'
import type { RawHand } from '../types'

function makeHand(points: Array<[number, number]>): RawHand {
  return {
    landmarks: points.map(([x, y]) => ({ x, y, z: 0 })),
    confidence: 1,
  }
}

function mockHandpose(raws: RawHand[]): HandPoseService {
  return { detectRawHands: async () => raws } as unknown as HandPoseService
}

const fakeVideo = {} as HTMLVideoElement

describe('extractStaticSampleFromVideoFrame', () => {
  test('returns a StaticSample when a hand is detected', async () => {
    const points: Array<[number, number]> = Array.from({ length: 21 }, (_, i) => [i, i * 2])
    const handpose = mockHandpose([makeHand(points)])

    const sample = await extractStaticSampleFromVideoFrame(fakeVideo, handpose, 'A')

    expect(sample).not.toBeNull()
    expect(sample?.label).toBe('A')
    expect(sample?.source).toBe('manual')
    expect(sample?.features.length).toBeGreaterThan(0)
  })

  test('returns null when no hands are detected', async () => {
    const handpose = mockHandpose([])

    const sample = await extractStaticSampleFromVideoFrame(fakeVideo, handpose, 'A')

    expect(sample).toBeNull()
  })

  test('returns null when the extracted feature vector is all-zero', async () => {
    // Every landmark at the exact same point as the wrist: wrist->middle-MCP
    // distance is 0, so normalizeHand skips scaling and every relative
    // offset collapses to (0,0) — the whole 84-float vector ends up all-zero.
    const points: Array<[number, number]> = Array.from({ length: 21 }, () => [5, 5])
    const handpose = mockHandpose([makeHand(points)])

    const sample = await extractStaticSampleFromVideoFrame(fakeVideo, handpose, 'A')

    expect(sample).toBeNull()
  })
})
