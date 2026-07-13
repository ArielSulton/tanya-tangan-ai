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

import { dynamicV2SamplesToCsv } from './csv-export'
import type { DynamicSampleV2 } from './dynamic-v2-types'
import type { RawFrameRow } from './recording-state-machine'

describe('dynamicV2SamplesToCsv', () => {
  function makeRow(handCount: number): RawFrameRow {
    return {
      handCount,
      leftPresent: handCount >= 1,
      rightPresent: handCount >= 2,
      left: handCount >= 1 ? new Array(63).fill(1) : null,
      right: handCount >= 2 ? new Array(63).fill(2) : null,
    }
  }

  function makeSample(label: string, rows: RawFrameRow[]): DynamicSampleV2 {
    return { id: 'x1', label, capturedAt: 0, source: 'manual', rows }
  }

  test('header matches the reference SEQUENCE_HEADER column layout', () => {
    const csv = dynamicV2SamplesToCsv([])
    const header = csv.split('\n')[0].split(',')
    expect(header.slice(0, 5)).toEqual(['label', 'sample_id', 'hand_count', 'left_present', 'right_present'])
    expect(header).toHaveLength(5 + 63 + 63)
    expect(header[5]).toBe('left_x0')
    expect(header[5 + 63]).toBe('right_x0')
  })

  test('emits one row per frame, zero-filling the absent hand', () => {
    const csv = dynamicV2SamplesToCsv([makeSample('halo', [makeRow(1), makeRow(2)])])
    const lines = csv.split('\n')
    expect(lines).toHaveLength(3) // header + 2 frame rows
    const row0 = lines[1].split(',')
    expect(row0[0]).toBe('halo')
    expect(row0[1]).toBe('x1') // sample_id
    expect(row0[2]).toBe('1') // hand_count
    expect(row0[3]).toBe('1') // left_present
    expect(row0[4]).toBe('0') // right_present
    expect(Number(row0[5])).toBe(1) // left_x0
    expect(Number(row0[5 + 63])).toBe(0) // right_x0, zero-filled (absent)

    const row1 = lines[2].split(',')
    expect(row1[3]).toBe('1') // left_present
    expect(row1[4]).toBe('1') // right_present
    expect(Number(row1[5 + 63])).toBe(2) // right_x0 populated
  })

  test('multiple samples each contribute their own rows, all sharing one CSV', () => {
    const csv = dynamicV2SamplesToCsv([makeSample('halo', [makeRow(1)]), makeSample('yang', [makeRow(1), makeRow(1)])])
    expect(csv.split('\n')).toHaveLength(1 + 1 + 2) // header + 1 + 2
  })
})
