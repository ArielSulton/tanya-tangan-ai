import { describe, expect, test } from 'bun:test'
import { MotionDetector, type TrackingPoint } from './motion-detector'

function feed(detector: MotionDetector, points: Array<TrackingPoint | null>): string[] {
  return points.map((p) => detector.update(p))
}

describe('MotionDetector', () => {
  test('no point → idle', () => {
    const d = new MotionDetector()
    expect(d.update(null)).toBe('idle')
  })

  test('point present but stationary (15 identical frames) → still', () => {
    const d = new MotionDetector()
    const points: TrackingPoint[] = Array.from({ length: 15 }, () => ({ x: 10, y: 10 }))
    const states = feed(d, points)
    expect(states[14]).toBe('still')
  })

  test('point moving (large variance) → moving', () => {
    const d = new MotionDetector()
    const points: TrackingPoint[] = Array.from({ length: 15 }, (_, i) => ({
      x: i % 2 === 0 ? 0 : 100,
      y: 0,
    }))
    const states = feed(d, points)
    expect(states[14]).toBe('moving')
  })

  test('motion ends → exactly one frame reports motion_end, then still', () => {
    const d = new MotionDetector()
    const moving: TrackingPoint[] = Array.from({ length: 15 }, (_, i) => ({
      x: i % 2 === 0 ? 0 : 100,
      y: 0,
    }))
    feed(d, moving)
    const still: TrackingPoint[] = Array.from({ length: 15 }, () => ({ x: 50, y: 50 }))
    const states = feed(d, still)
    const motionEndCount = states.filter((s) => s === 'motion_end').length
    expect(motionEndCount).toBe(1)
    expect(states[states.length - 1]).toBe('still')
  })

  test('point disappears mid-stream → idle', () => {
    const d = new MotionDetector()
    feed(
      d,
      Array.from({ length: 15 }, () => ({ x: 10, y: 10 })),
    )
    expect(d.update(null)).toBe('idle')
  })

  test('hysteresis: brief tiny motion in still state does not flip to moving', () => {
    const d = new MotionDetector()
    feed(
      d,
      Array.from({ length: 15 }, () => ({ x: 10, y: 10 })),
    )
    const jitter = d.update({ x: 10.01, y: 10.01 })
    expect(jitter).toBe('still')
  })

  test('state property reflects last update', () => {
    const d = new MotionDetector()
    d.update(null)
    expect(d.state).toBe('idle')
    d.update({ x: 10, y: 10 })
    expect(d.state).not.toBe('idle')
  })
})
