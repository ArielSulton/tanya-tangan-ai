'use client'

import { type ReactNode } from 'react'
import { DYNAMIC_HISTORY_SIZE } from '@/lib/gesture/recording/types'

interface Props {
  mode: 'static' | 'dynamic'
  onModeChange: (m: 'static' | 'dynamic') => void
  // Static mode
  onRecordStatic: () => void
  staticAutoLabel: boolean
  onToggleAutoLabel: () => void
  // Dynamic mode
  dynamicBufferSize: number
  onSaveDynamicTake: () => void
  onResetDynamicBuffer: () => void
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
    dynamicBufferSize,
    onSaveDynamicTake,
    onResetDynamicBuffer,
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
          <div className="text-sm text-slate-700">
            Buffer: <span className="font-mono">{dynamicBufferSize}/{DYNAMIC_HISTORY_SIZE}</span>
          </div>
          <button
            type="button"
            onClick={onSaveDynamicTake}
            disabled={!classSelected || dynamicBufferSize !== DYNAMIC_HISTORY_SIZE}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
          >
            Save take (Space)
          </button>
          <button
            type="button"
            onClick={onResetDynamicBuffer}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
          >
            Reset buffer
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
