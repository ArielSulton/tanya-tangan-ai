import { describe, expect, test } from 'bun:test'
import { staticSamplesToCsv, dynamicSamplesToCsv } from './csv-export'
import type { StaticSample, DynamicSample } from './types'

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
    expect(lines[0].split(',')).toHaveLength(49) // label + 24×2
    expect(lines.length).toBe(1)
  })

  test('one sample → 49-column row with label first', () => {
    const sample: DynamicSample = {
      id: 'd1',
      label: 'jeruk',
      history: Array.from({ length: 24 }, (_, i) => ({ x: i, y: i * 2 })),
      capturedAt: 0,
      source: 'manual',
    }
    const csv = dynamicSamplesToCsv([sample])
    const lines = csv.split('\n')
    expect(lines.length).toBe(2)
    const row = lines[1].split(',')
    expect(row).toHaveLength(49)
    expect(row[0]).toBe('jeruk')
    expect(parseFloat(row[1])).toBe(0) // x0
    expect(parseFloat(row[2])).toBe(0) // y0
    expect(parseFloat(row[47])).toBe(23) // x23
    expect(parseFloat(row[48])).toBe(46) // y23
  })

  test('refuses sample whose history length is not 24', () => {
    const bad: DynamicSample = {
      id: 'x',
      label: 'jeruk',
      history: [{ x: 0, y: 0 }],
      capturedAt: 0,
      source: 'manual',
    }
    expect(() => dynamicSamplesToCsv([bad])).toThrow(/24/)
  })
})
