import { describe, expect, test } from 'bun:test'
import { staticSamplesToCsv, dynamicSamplesToCsv } from './csv-export'
import { DYNAMIC_HISTORY_SIZE, type StaticSample, type DynamicSample } from './types'

const N = DYNAMIC_HISTORY_SIZE
const COLS = 1 + N * 2 // label + 2N coords

describe('staticSamplesToCsv', () => {
  test('empty list → header-only CSV', () => {
    const csv = staticSamplesToCsv([])
    const lines = csv.split('\n')
    expect(lines[0].startsWith('label,')).toBe(true)
    expect(lines[0].split(',')).toHaveLength(85) // label + 84 floats
    expect(lines.length).toBe(1)
  })

  test('one sample → header + one row, label in column 0', () => {
    const sample: StaticSample = {
      id: 'a1',
      label: 'B',
      features: Array.from({ length: 84 }, (_, i) => i * 0.01),
      capturedAt: 1000,
      source: 'manual',
    }
    const csv = staticSamplesToCsv([sample])
    const lines = csv.split('\n')
    expect(lines.length).toBe(2)
    const row = lines[1].split(',')
    expect(row).toHaveLength(85)
    expect(row[0]).toBe('B')
    expect(parseFloat(row[1])).toBeCloseTo(0, 6)
    expect(parseFloat(row[84])).toBeCloseTo(83 * 0.01, 6)
  })

  test('floats serialized with reasonable precision (no NaN, no Infinity)', () => {
    const sample: StaticSample = {
      id: 'a2',
      label: 'A',
      features: [0.123456789, -0.987654321, ...Array.from({ length: 82 }, () => 0)],
      capturedAt: 0,
      source: 'manual',
    }
    const csv = staticSamplesToCsv([sample])
    expect(csv).not.toContain('NaN')
    expect(csv).not.toContain('Infinity')
    const row = csv.split('\n')[1].split(',')
    expect(parseFloat(row[1])).toBeCloseTo(0.123456789, 6)
    expect(parseFloat(row[2])).toBeCloseTo(-0.987654321, 6)
  })

  test('refuses sample whose features length is not 84', () => {
    const bad: StaticSample = {
      id: 'x',
      label: 'A',
      features: [1, 2, 3],
      capturedAt: 0,
      source: 'manual',
    }
    expect(() => staticSamplesToCsv([bad])).toThrow(/84/)
  })
})

describe('dynamicSamplesToCsv', () => {
  test('empty list → header-only CSV', () => {
    const csv = dynamicSamplesToCsv([])
    const lines = csv.split('\n')
    expect(lines[0].startsWith('label,')).toBe(true)
    expect(lines[0].split(',')).toHaveLength(COLS)
    expect(lines.length).toBe(1)
  })

  test('one sample → row with label first and 2N coord columns', () => {
    const sample: DynamicSample = {
      id: 'd1',
      label: 'jeruk',
      history: Array.from({ length: N }, (_, i) => ({ x: i, y: i * 2 })),
      capturedAt: 0,
      source: 'manual',
    }
    const csv = dynamicSamplesToCsv([sample])
    const lines = csv.split('\n')
    expect(lines.length).toBe(2)
    const row = lines[1].split(',')
    expect(row).toHaveLength(COLS)
    expect(row[0]).toBe('jeruk')
    expect(parseFloat(row[1])).toBe(0) // x0
    expect(parseFloat(row[2])).toBe(0) // y0
    const lastIdx = N - 1
    expect(parseFloat(row[1 + 2 * lastIdx])).toBe(lastIdx)
    expect(parseFloat(row[2 + 2 * lastIdx])).toBe(lastIdx * 2)
  })

  test(`refuses sample whose history length is not ${N}`, () => {
    const bad: DynamicSample = {
      id: 'x',
      label: 'jeruk',
      history: [{ x: 0, y: 0 }],
      capturedAt: 0,
      source: 'manual',
    }
    expect(() => dynamicSamplesToCsv([bad])).toThrow(new RegExp(String(N)))
  })
})
