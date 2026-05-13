import { describe, expect, test } from 'bun:test'
import { MotionDetector } from './motion-detector'
import type { HandPair, NormalizedHand } from './types'

function handAt(x: number, y: number): NormalizedHand {
  return {
    landmarks: [{ x, y, z: 0 }, ...Array.from({ length: 20 }, () => ({ x: 0, y: 0, z: 0 }))],
    confidence: 1,
  }
}

function feed(detector: MotionDetector, frames: HandPair[]): string[] {
  return frames.map((f) => detector.update(f))
}

describe('MotionDetector', () => {
  test('no hand → idle', () => {
    const d = new MotionDetector()
    expect(d.update([null, null])).toBe('idle')
  })

  test('hand present but stationary (15 identical frames) → still', () => {
    const d = new MotionDetector()
    const frames: HandPair[] = Array.from({ length: 15 }, () => [handAt(10, 10), null])
    const states = feed(d, frames)
    // Once buffer fills, state stabilises to 'still'
    expect(states[14]).toBe('still')
  })

  test('hand moving (large variance) → moving', () => {
    const d = new MotionDetector()
    // 15 frames with wrist x oscillating widely
    const frames: HandPair[] = Array.from({ length: 15 }, (_, i) => [
      handAt(i % 2 === 0 ? 0 : 100, 0),
      null,
    ])
    const states = feed(d, frames)
    expect(states[14]).toBe('moving')
  })

  test('motion ends → exactly one frame reports motion_end, then still', () => {
    const d = new MotionDetector()
    // First 15 frames: moving
    const moving: HandPair[] = Array.from({ length: 15 }, (_, i) => [
      handAt(i % 2 === 0 ? 0 : 100, 0),
      null,
    ])
    feed(d, moving)
    // Next 15 frames: stationary at one point — variance drains
    const still: HandPair[] = Array.from({ length: 15 }, () => [handAt(50, 50), null])
    const states = feed(d, still)
    const motionEndCount = states.filter((s) => s === 'motion_end').length
    expect(motionEndCount).toBe(1)
    // After the motion_end, state settles to 'still'
    expect(states[states.length - 1]).toBe('still')
  })

  test('hand disappears mid-stream → idle', () => {
    const d = new MotionDetector()
    feed(d, Array.from({ length: 15 }, () => [handAt(10, 10), null]))
    expect(d.update([null, null])).toBe('idle')
  })

  test('hysteresis: brief tiny motion in still state does not flip to moving', () => {
    const d = new MotionDetector()
    feed(d, Array.from({ length: 15 }, () => [handAt(10, 10), null]))
    // Tiny jitter — below MOTION_START_THRESHOLD
    const jitter = d.update([handAt(10.01, 10.01), null])
    expect(jitter).toBe('still')
  })

  test('state property reflects last update', () => {
    const d = new MotionDetector()
    d.update([null, null])
    expect(d.state).toBe('idle')
    d.update([handAt(10, 10), null])
    expect(d.state).not.toBe('idle')
  })
})
