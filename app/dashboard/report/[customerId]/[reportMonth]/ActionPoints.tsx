'use client'

// Run this migration in the Supabase SQL editor before using this component:
//
// create table if not exists action_points (
//   client_id text not null,
//   report_month text not null,
//   points jsonb not null default '[]'::jsonb,
//   updated_at timestamptz not null default now(),
//   primary key (client_id, report_month)
// );

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ActionPoints({
  clientId,
  reportMonth,
  suggestedPoints,
}: {
  clientId: string
  reportMonth: string
  suggestedPoints?: string[]
}) {
  const [points, setPoints] = useState(['', '', ''])
  const [loading, setLoading] = useState(true)
  const [hasSaved, setHasSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const appliedSuggestions = useRef(false)

  useEffect(() => {
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
  }, [clientId, reportMonth])

  // Pre-populate with Claude's suggested action points, but only once and only
  // when the client has no previously saved points — never clobber real data.
  useEffect(() => {
    if (loading || hasSaved || appliedSuggestions.current) return
    if (suggestedPoints && suggestedPoints.length > 0) {
      setPoints(suggestedPoints)
      appliedSuggestions.current = true
    }
  }, [loading, hasSaved, suggestedPoints])

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

  if (loading) {
    return <p className="text-sm text-gray-400 italic">Loading action points…</p>
  }

  return (
    <div className="space-y-3">
      <div id="action-points-list" className="space-y-3">
        {points.map((point, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-navy shrink-0" />
            <input
              type="text"
              value={point}
              onChange={(e) => update(i, e.target.value)}
              placeholder={`Action point ${i + 1}…`}
              data-action-point-input
              className="flex-1 text-sm text-gray-800 border border-[#dce6f5] rounded-lg px-3 py-2 outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 placeholder-gray-400 transition"
            />
            <button
              onClick={() => remove(i)}
              className="text-red-500 hover:text-red-600 transition shrink-0"
              aria-label="Delete action point"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
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
