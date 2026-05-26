import { describe, expect, test } from 'bun:test'
import { selectGestureEngine } from './engine-selector'

describe('selectGestureEngine', () => {
  test("returns 'yolo' when env is exactly 'yolo'", () => {
    expect(selectGestureEngine('yolo')).toBe('yolo')
  })

  test("returns 'mediapipe' for undefined (default)", () => {
    expect(selectGestureEngine(undefined)).toBe('mediapipe')
  })

  test("returns 'mediapipe' for empty string", () => {
    expect(selectGestureEngine('')).toBe('mediapipe')
  })

  test("returns 'mediapipe' for 'mediapipe'", () => {
    expect(selectGestureEngine('mediapipe')).toBe('mediapipe')
  })

  test('is case-insensitive and trims whitespace for yolo', () => {
    expect(selectGestureEngine('  YOLO  ')).toBe('yolo')
  })

  test('any unknown value falls back to mediapipe', () => {
    expect(selectGestureEngine('tensorflow')).toBe('mediapipe')
  })
})
