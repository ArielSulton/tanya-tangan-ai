import { describe, expect, test } from 'bun:test'
import { extractLabelFromPath, normalizeImportLabel, isValidImportLabel } from './label-extraction'

describe('extractLabelFromPath', () => {
  test('extracts label from subfolder name', () => {
    const file = { name: 'video1.mp4', webkitRelativePath: 'root/kucing/video1.mp4' }
    expect(extractLabelFromPath(file)).toBe('kucing')
  })

  test('falls back to filename pattern when no subfolder', () => {
    const file = { name: 'Besar1_05.jpg', webkitRelativePath: '' }
    expect(extractLabelFromPath(file)).toBe('Besar')
  })

  test('extracts single-letter filename pattern', () => {
    const file = { name: 'A2_09.jpg', webkitRelativePath: '' }
    expect(extractLabelFromPath(file)).toBe('A')
  })

  test('returns null when no pattern matches', () => {
    const file = { name: 'random_video.mp4', webkitRelativePath: '' }
    expect(extractLabelFromPath(file)).toBe(null)
  })

  test('returns null when webkitRelativePath is absent and filename has no pattern', () => {
    const file = { name: 'clip.mp4' }
    expect(extractLabelFromPath(file)).toBe(null)
  })
})

describe('normalizeImportLabel', () => {
  test('uppercases a single alphabet letter matching STATIC_CLASSES', () => {
    expect(normalizeImportLabel('a')).toBe('A')
  })

  test('leaves an already-uppercase alphabet letter as-is', () => {
    expect(normalizeImportLabel('B')).toBe('B')
  })

  test('lowercases and underscores a custom multi-char label', () => {
    expect(normalizeImportLabel('Besar')).toBe('besar')
  })

  test('lowercases and replaces spaces with underscores', () => {
    expect(normalizeImportLabel('terima kasih')).toBe('terima_kasih')
  })

  test('trims surrounding whitespace', () => {
    expect(normalizeImportLabel('  kucing  ')).toBe('kucing')
  })

  test('a single letter NOT in STATIC_CLASSES (J) is treated as a custom label', () => {
    // J is excluded from STATIC_CLASSES (traced in the air, dynamic-only per types.ts)
    expect(normalizeImportLabel('j')).toBe('j')
  })
})

describe('isValidImportLabel', () => {
  test('rejects an empty string', () => {
    expect(isValidImportLabel('')).toBe(false)
  })

  test('accepts a normal label', () => {
    expect(isValidImportLabel('kucing')).toBe(true)
  })

  test('rejects a label longer than 30 characters', () => {
    expect(isValidImportLabel('a'.repeat(31))).toBe(false)
  })

  test('accepts a label exactly 30 characters', () => {
    expect(isValidImportLabel('a'.repeat(30))).toBe(true)
  })
})
