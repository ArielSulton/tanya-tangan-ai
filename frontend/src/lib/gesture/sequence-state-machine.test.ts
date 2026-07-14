import { describe, expect, test } from 'bun:test'
import {
  SequenceStateMachine,
  majorityVote,
  DETECTION_FRAMES,
  HAND_LOST_FRAMES,
  SEQ_LENGTH,
  SLIDE_STEP,
  COOLDOWN_FRAMES,
} from './sequence-state-machine'
import type { RawHand } from './types'

function makeHands(n: number): RawHand[] {
  return Array.from({ length: n }, (_, i) => ({
    landmarks: Array.from({ length: 21 }, (_, j) => ({ x: j + i, y: j, z: 0 })),
    confidence: 0.9,
    handedness: i === 0 ? ('Right' as const) : ('Left' as const),
  }))
}

describe('SequenceStateMachine', () => {
  test('starts idle, stays idle with no hands', () => {
    const sm = new SequenceStateMachine()
    for (let i = 0; i < 5; i++) sm.step([])
    expect(sm.getState()).toBe('idle')
  })

  test('transitions idle → recording after DETECTION_FRAMES consecutive hand-seen frames', () => {
    const sm = new SequenceStateMachine()
    for (let i = 0; i < DETECTION_FRAMES - 1; i++) {
      sm.step(makeHands(1))
      expect(sm.getState()).toBe('idle')
    }
    sm.step(makeHands(1))
    expect(sm.getState()).toBe('recording')
  })

  test('transitions recording → predicting once the buffer reaches SEQ_LENGTH frames, and shouldPredict fires on SLIDE_STEP cadence', () => {
    const sm = new SequenceStateMachine()
    for (let i = 0; i < DETECTION_FRAMES; i++) sm.step(makeHands(1))
    expect(sm.getState()).toBe('recording')

    let result
    for (let i = 0; i < SEQ_LENGTH; i++) {
      result = sm.step(makeHands(1))
    }
    expect(sm.getState()).toBe('predicting')

    // Keep stepping until shouldPredict fires; if it never fires within the
    // safety cap the loop exits and the assertions below will fail loudly,
    // catching any regression in the SLIDE_STEP cadence gate.
    for (let i = 0; i < SEQ_LENGTH + SLIDE_STEP && !result!.shouldPredict; i++) {
      result = sm.step(makeHands(1))
    }
    expect(result!.shouldPredict).toBe(true)
    expect(result!.frames).toHaveLength(SEQ_LENGTH)
  })

  test('resets to idle if hand is lost for HAND_LOST_FRAMES while recording', () => {
    const sm = new SequenceStateMachine()
    for (let i = 0; i < DETECTION_FRAMES; i++) sm.step(makeHands(1))
    expect(sm.getState()).toBe('recording')
    for (let i = 0; i < HAND_LOST_FRAMES; i++) sm.step([])
    expect(sm.getState()).toBe('idle')
  })

  test('acceptPrediction moves to cooldown, and cooldown auto-returns to idle after COOLDOWN_FRAMES', () => {
    const sm = new SequenceStateMachine()
    for (let i = 0; i < DETECTION_FRAMES; i++) sm.step(makeHands(1))
    sm.acceptPrediction()
    expect(sm.getState()).toBe('cooldown')
    for (let i = 0; i < COOLDOWN_FRAMES - 1; i++) {
      sm.step(makeHands(1))
      expect(sm.getState()).toBe('cooldown')
    }
    sm.step(makeHands(1))
    expect(sm.getState()).toBe('idle')
  })

  test('reset() forces idle from any state', () => {
    const sm = new SequenceStateMachine()
    for (let i = 0; i < DETECTION_FRAMES; i++) sm.step(makeHands(1))
    sm.reset()
    expect(sm.getState()).toBe('idle')
  })
})

describe('majorityVote', () => {
  test('returns the label with the most occurrences when it meets minCount', () => {
    expect(majorityVote(['A', 'A', 'B', 'A'], 3)).toBe('A')
  })

  test('returns null when no label reaches minCount', () => {
    expect(majorityVote(['A', 'B', 'A', 'B'], 3)).toBeNull()
  })

  test('returns null for empty history', () => {
    expect(majorityVote([], 1)).toBeNull()
  })

  test('SEQ_LENGTH is re-exported from dual-hand-features (single source of truth); SLIDE_STEP is a local constant', () => {
    expect(SLIDE_STEP).toBeGreaterThan(0)
    expect(SEQ_LENGTH).toBe(30)
  })
})
