'use client'

// Run this migration in the Supabase SQL editor before using this component:
//
// create table if not exists action_points (
//   client_id text not null,
//   report_month text not null,
//   points jsonb not null default '[]'::jsonb,
//   what_worked text not null default '',
//   areas_for_attention text not null default '',
//   account_summary text not null default '',
//   campaign_insight text not null default '',
//   campaign_analysis text not null default '',
//   keyword_analysis text not null default '',
//   updated_at timestamptz not null default now(),
//   primary key (client_id, report_month)
// );
//
// Existing installations — also run:
//   alter table action_points add column if not exists what_worked text not null default '';
//   alter table action_points add column if not exists areas_for_attention text not null default '';
//   alter table action_points add column if not exists account_summary text not null default '';
//   alter table action_points add column if not exists campaign_insight text not null default '';
//   alter table action_points add column if not exists campaign_analysis text not null default '';
//   alter table action_points add column if not exists keyword_analysis text not null default '';

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

function ActionCard({
  index,
  point,
  readOnly,
  onChange,
  onRemove,
}: {
  index: number
  point: string
  readOnly: boolean
  onChange?: (value: string) => void
  onRemove?: () => void
}) {
  return (
    <div
      className="flex items-start gap-5 bg-white rounded-xl border-l-4 border-[#F5A623] px-6 py-5 transition-shadow duration-200 hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)]"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
    >
      <span className="text-[40px] font-black leading-none text-[#F5A623] shrink-0">{index + 1}</span>
      <div className="flex-1 min-w-0 pt-2">
        {readOnly ? (
          <p className="text-sm text-[#1a1a1a] leading-relaxed">{point}</p>
        ) : (
          <input
            type="text"
            value={point}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={`Action point ${index + 1}…`}
            data-action-point-input
            className="w-full text-sm text-[#1a1a1a] outline-none placeholder-gray-400 bg-transparent"
          />
        )}
      </div>
      {!readOnly && (
        <button
          onClick={onRemove}
          className="text-gray-300 hover:text-red-500 transition shrink-0 mt-2"
          aria-label="Delete action point"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

export default function ActionPoints({
  clientId,
  reportMonth,
  suggestedPoints,
  readOnly = false,
  initialPoints,
}: {
  clientId: string
  reportMonth: string
  suggestedPoints?: string[]
  readOnly?: boolean
  initialPoints?: string[]
}) {
  const [points, setPoints] = useState<string[]>(initialPoints ?? ['', '', ''])
  const [loading, setLoading] = useState(!readOnly)
  const [hasSaved, setHasSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const appliedSuggestions = useRef(false)

  useEffect(() => {
    if (readOnly) return
    let cancelled = false
    const supabase = createClient()

    async function load() {
      try {
        const { data } = await supabase
          .from('action_points')
          .select('points')
          .eq('client_id', clientId)
          .eq('report_month', reportMonth)
          .maybeSingle()
        if (cancelled) return
        const loaded = data?.points as string[] | undefined
        if (loaded && loaded.length > 0) {
          setPoints(loaded)
          setHasSaved(true)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()

    return () => {
      cancelled = true
    }
  }, [readOnly, clientId, reportMonth])

  // Pre-populate with Claude's suggested action points, but only once and only
  // when the client has no previously saved points — never clobber real data.
  useEffect(() => {
    if (readOnly) return
    if (loading || hasSaved || appliedSuggestions.current) return
    if (suggestedPoints && suggestedPoints.length > 0) {
      setPoints(suggestedPoints)
      appliedSuggestions.current = true
    }
  }, [readOnly, loading, hasSaved, suggestedPoints])

  function update(index: number, value: string) {
    setPoints((prev) => prev.map((p, i) => (i === index ? value : p)))
  }

  function remove(index: number) {
    setPoints((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    const supabase = createClient()
    const { error } = await supabase.from('action_points').upsert(
      {
        client_id: clientId,
        report_month: reportMonth,
        points,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'client_id,report_month' }
    )
    setSaving(false)
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    }
  }

  if (readOnly) {
    const list = points.map((p) => p.trim()).filter(Boolean)
    return (
      <div className="space-y-3">
        {list.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No action points recorded.</p>
        ) : (
          list.map((point, i) => <ActionCard key={i} index={i} point={point} readOnly />)
        )}
      </div>
    )
  }

  if (loading) {
    return <p className="text-sm text-gray-400 italic">Loading action points…</p>
  }

  return (
    <div className="space-y-4">
      <div id="action-points-list" className="space-y-3">
        {points.map((point, i) => (
          <ActionCard
            key={i}
            index={i}
            point={point}
            readOnly={false}
            onChange={(value) => update(i, value)}
            onRemove={() => remove(i)}
          />
        ))}
      </div>

      <button
        onClick={() => setPoints((prev) => [...prev, ''])}
        className="flex items-center gap-2 text-sm font-medium text-navy hover:text-navy-dark transition"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Point
      </button>

      <div className="pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 bg-navy hover:bg-navy-dark disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition"
        >
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
        </button>
      </div>
    </div>
  )
}
