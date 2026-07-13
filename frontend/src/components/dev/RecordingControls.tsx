'use client'

import { type ReactNode } from 'react'
import type { RecordingState } from '@/lib/gesture/recording/recording-state-machine'

export interface LastTakeStatus {
  discarded: boolean
  frameCount: number
}

interface Props {
  mode: 'static' | 'dynamic'
  onModeChange: (m: 'static' | 'dynamic') => void
  // Static mode
  onRecordStatic: () => void
  staticAutoLabel: boolean
  onToggleAutoLabel: () => void
  // Dynamic mode (v2) — fully automatic capture (Task 3's RecordingStateMachine).
  // There's no "Save take" button: recording starts/stops/saves on its own.
  dynamicRecordingState: RecordingState
  dynamicLastTake: LastTakeStatus | null
  onAbortDynamicTake: () => void
  // Common
  onExportCsv: () => void
  onClearAll: () => void
  // Disable interactive controls while no class is selected.
  classSelected: boolean
}

export function RecordingControls(props: Props): ReactNode {
  const {
    mode,
    onModeChange,
    onRecordStatic,
    staticAutoLabel,
    onToggleAutoLabel,
    dynamicRecordingState,
    dynamicLastTake,
    onAbortDynamicTake,
    onExportCsv,
    onClearAll,
    classSelected,
  } = props

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onModeChange('static')}
          className={
            'rounded-md border px-4 py-2 text-sm font-semibold ' +
            (mode === 'static'
              ? 'border-blue-500 bg-blue-50 text-blue-900'
              : 'border-slate-300 bg-white text-slate-700')
          }
        >
          Static (alphabet)
        </button>
        <button
          type="button"
          onClick={() => onModeChange('dynamic')}
          className={
            'rounded-md border px-4 py-2 text-sm font-semibold ' +
            (mode === 'dynamic'
              ? 'border-blue-500 bg-blue-50 text-blue-900'
              : 'border-slate-300 bg-white text-slate-700')
          }
        >
          Dynamic (word)
        </button>
      </div>

      {mode === 'static' ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onRecordStatic}
            disabled={!classSelected}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
          >
            Record sample (Space)
          </button>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={staticAutoLabel} onChange={onToggleAutoLabel} />
            Auto-label via YOLO backend
          </label>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={
              'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-semibold ' +
              (dynamicRecordingState === 'recording'
                ? 'border-red-400 bg-red-50 text-red-700'
                : 'border-slate-300 bg-white text-slate-500')
            }
          >
            <span
              className={
                'inline-block h-2 w-2 rounded-full ' +
                (dynamicRecordingState === 'recording' ? 'animate-pulse bg-red-500' : 'bg-slate-400')
              }
            />
            {dynamicRecordingState === 'recording' ? 'Recording…' : 'Waiting for hand'}
          </span>
          {dynamicLastTake && (
            <span
              className={
                'rounded-md border px-2 py-1 text-xs ' +
                (dynamicLastTake.discarded
                  ? 'border-amber-300 bg-amber-50 text-amber-700'
                  : 'border-emerald-300 bg-emerald-50 text-emerald-700')
              }
            >
              {dynamicLastTake.discarded
                ? `Discarded (only ${dynamicLastTake.frameCount} active frames)`
                : `Saved (${dynamicLastTake.frameCount} frames)`}
            </span>
          )}
          <button
            type="button"
            onClick={onAbortDynamicTake}
            disabled={!classSelected || dynamicRecordingState !== 'recording'}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 disabled:opacity-40"
          >
            Abort take (Space)
          </button>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onExportCsv}
          className="rounded-md bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Export CSV
        </button>
        <button
          type="button"
          onClick={onClearAll}
          className="rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
        >
          Clear all
        </button>
      </div>
    </div>
  )
}
