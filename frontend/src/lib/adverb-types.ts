/**
 * Adverb subcategory types and config interfaces.
 * Each subcategory has a unique interactive UI component.
 * These types mirror the JSONB config columns in the `words` table.
 */

export type AdverbSubcategory = 'degree' | 'temporal' | 'modality' | 'intensity'

/** Degree adverbs (sangat, agak, terlalu, paling) — IntensitySlider component */
export interface SliderConfig {
  default_position: number // 0.0-1.0, where the slider starts
  low_label: string // e.g. "sedikit"
  high_label: string // e.g. "sangat"
  reference_word: string // the word being modified, e.g. "besar"
  accent_color: string // CSS color for the active range
  emoji_low: string // emoji for low intensity, e.g. "🌱"
  emoji_high: string // emoji for high intensity, e.g. "🌳"
}

/** Temporal adverbs (sering, jarang, pernah, baru saja) — TimelineAnimation component */
export interface TimelineConfig {
  frequency: number // 0.0-1.0, how often
  period_label: string // e.g. "seminggu", "sehari"
  occurrence_count: number // how many occurrences per period
  total_slots: number // total slots in period (e.g. 7 for "seminggu")
  accent_color: string // CSS color
  icon_filled: string // emoji/icon for filled slots
  icon_empty: string // emoji/icon for empty slots
  description: string // child-friendly explanation
}

/** Modality adverbs (mungkin, pasti, kira-kira) — CertaintyDial component */
export interface CertaintyConfig {
  certainty_level: number // 0.0-1.0
  low_label: string // e.g. "tidak yakin"
  high_label: string // e.g. "sangat yakin"
  accent_color: string // CSS color
  emoji_uncertain: string // e.g. "🤔"
  emoji_certain: string // e.g. "✅"
  description: string // child-friendly explanation
}

/** Intensity adverbs (sangat pedas, agak nyeri) — SensationGauge component */
export interface GaugeConfig {
  intensity_level: number // 0.0-1.0
  sensation_word: string // e.g. "pedas", "nyeri"
  low_label: string // e.g. "sedikit pedas"
  high_label: string // e.g. "sangat pedas"
  accent_color: string // CSS color
  emoji_low: string // e.g. "😐"
  emoji_high: string // e.g. "🥵"
  unit_symbol: string // e.g. "°", "💡"
}

/**
 * Maps adverb_subcategory to the interactive component type.
 * Returns null for non-adverb words (konkret words and non-kata_keterangan abstrak words).
 */
export function getInteractionComponent(
  category: string,
  adverbSubcategory: AdverbSubcategory | null,
): 'intensity-slider' | 'timeline-animation' | 'certainty-dial' | 'sensation-gauge' | null {
  if (category !== 'kata_keterangan' || !adverbSubcategory) return null
  return (
    (
      {
        degree: 'intensity-slider',
        temporal: 'timeline-animation',
        modality: 'certainty-dial',
        intensity: 'sensation-gauge',
      } as const
    )[adverbSubcategory] ?? null
  )
}
