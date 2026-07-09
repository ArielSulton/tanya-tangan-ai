import { STATIC_CLASSES } from './types'

const STATIC_CLASS_SET = new Set<string>(STATIC_CLASSES)
const MAX_LABEL_LENGTH = 30

/**
 * Extract a label from either a subfolder name (preferred) or filename pattern.
 * Subfolder name takes precedence if present. Filename pattern strips trailing
 * digits before underscore + sequence number: "A_19.jpg" -> "A",
 * "Besar1_05.jpg" -> "Besar", "A2_09.jpg" -> "A", "frame_00129.jpg" -> "frame".
 * Returns null if no pattern matched.
 *
 * Shared by ImageImporter.tsx and VideoImporter.tsx so both bulk importers
 * parse paths identically — a mismatch here would silently split one class
 * into two in the exported training CSV.
 */
export function extractLabelFromPath(file: { name: string; webkitRelativePath?: string }): string | null {
  const relPath = file.webkitRelativePath || ''
  const parts = relPath.split('/')
  // [rootFolder, ...subfolders, filename]. If subfolder exists, use it.
  if (parts.length >= 3) {
    const subfolder = parts[parts.length - 2]
    if (subfolder) return subfolder
  }
  // Else parse filename
  const name = file.name.replace(/\.[^/.]+$/, '')
  const m = name.match(/^([A-Za-z]+?)\d*_\d+$/)
  return m ? m[1] : null
}

/**
 * Normalize a raw extracted/typed label into the app's canonical form:
 * a single letter matching STATIC_CLASSES (the SIBI alphabet, case-insensitive)
 * becomes uppercase (matches existing alphabet-sample convention); everything
 * else — including single letters NOT in STATIC_CLASSES, like J — becomes
 * lowercase with spaces replaced by underscores (matches DynamicClassInput's
 * existing custom-class convention, e.g. "terima kasih" -> "terima_kasih").
 */
export function normalizeImportLabel(label: string): string {
  const trimmed = label.trim()
  if (/^[A-Za-z]$/.test(trimmed) && STATIC_CLASS_SET.has(trimmed.toUpperCase())) {
    return trimmed.toUpperCase()
  }
  return trimmed.toLowerCase().replace(/\s+/g, '_')
}

/**
 * Validate an already-normalized label (call normalizeImportLabel first).
 * Rejects empty strings and unreasonably long labels as a defensive bound.
 */
export function isValidImportLabel(normalizedLabel: string): boolean {
  return normalizedLabel.length > 0 && normalizedLabel.length <= MAX_LABEL_LENGTH
}
