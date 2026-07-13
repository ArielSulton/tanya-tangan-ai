import { describe, expect, test } from 'bun:test'
import { dynamicClassifierV2, DynamicClassifierV2 } from './dynamic-classifier-v2'
import { SEQ_LENGTH, FEATURE_DIM } from '../dual-hand-features'

describe('DynamicClassifierV2', () => {
  test('classify() throws on wrong input shape', async () => {
    const c = new DynamicClassifierV2()
    await expect(c.classify([[1, 2, 3]])).rejects.toThrow(new RegExp(`${SEQ_LENGTH}x${FEATURE_DIM}`))
  })

  test('load() returns false (not throws) when model files are missing (no dev server / fetch in bun:test)', async () => {
    const c = new DynamicClassifierV2()
    const ok = await c.load()
    expect(ok).toBe(false)
  })

  test('classify() returns null (not throws) when the model failed to load, given correctly-shaped input', async () => {
    const c = new DynamicClassifierV2()
    const frames = Array.from({ length: SEQ_LENGTH }, () => new Array(FEATURE_DIM).fill(0))
    const result = await c.classify(frames)
    expect(result).toBeNull()
  })

  test('module-level singleton is exported', () => {
    expect(dynamicClassifierV2).toBeInstanceOf(DynamicClassifierV2)
  })
})
