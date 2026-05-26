/**
 * Dedupe latch for the YOLO engine path. The backend validates server-side
 * (TemporalValidationService) and keeps reporting validated:true while a
 * letter is held, so we must only surface a validated emission once per
 * held streak. The latch clears when the detected letter changes; the hook
 * also resets it via its stale-timer when the hand disappears, so re-forming
 * the same letter after a pause emits again.
 */
export interface YoloDedupeState {
  lastEmittedLetter: string | null
}

export interface YoloEmissionDecision {
  validated: boolean
  nextState: YoloDedupeState
}

export function decideYoloEmission(
  state: YoloDedupeState,
  letter: string,
  backendValidated: boolean,
): YoloEmissionDecision {
  // A different letter than the one latched → clear the latch first so the
  // new letter is free to emit.
  const cleared: YoloDedupeState =
    state.lastEmittedLetter !== null && state.lastEmittedLetter !== letter
      ? { lastEmittedLetter: null }
      : state

  if (backendValidated && cleared.lastEmittedLetter !== letter) {
    return { validated: true, nextState: { lastEmittedLetter: letter } }
  }

  return { validated: false, nextState: cleared }
}
