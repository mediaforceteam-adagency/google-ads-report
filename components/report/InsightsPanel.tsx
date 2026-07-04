'use client'

import { useCallback, useEffect, useState } from 'react'
import SectionHeading from './SectionHeading'
import ActionPoints from './ActionPoints'
import { createClient } from '@/lib/supabase/client'
import type { KeywordRow } from './KeywordsTable'
import type { DeviceRow, HourlyRow, DayRow, AgeGenderRow } from './ReportCharts'

type Campaign = { campaign_name: string; status: string; cost: number | null; clicks: number | null; conversions: number | null }

type Summary = {
  totalSpend: number
  totalClicks: number
  totalImpressions: number
  totalConversions: number
  ctr: number
  avgCpc: number
  cpl: number | 'N/A'
  prevSpend: number
  prevClicks: number
  prevConversions: number
}

type Insights = {
  whatWorked: string[]
  areasForAttention: string[]
  actionPoints: string[]
}

function Spinner() {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-400 py-6 justify-center">
      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      Analyzing performance data…
    </div>
  )
}

function bulletText(items: string[] | undefined) {
  return (items ?? []).map((item) => `• ${item}`).join('\n')
}

async function persistText(clientId: string, reportMonth: string, field: 'what_worked' | 'areas_for_attention', value: string) {
  const supabase = createClient()
  await supabase.from('action_points').upsert(
    { client_id: clientId, report_month: reportMonth, [field]: value, updated_at: new Date().toISOString() },
    { onConflict: 'client_id,report_month' }
  )
}

export default function InsightsPanel({
  clientId,
  reportMonth,
  clientName,
  reportMonthLabel,
  summary,
  campaigns,
  keywords,
  devices,
  dayOfWeek,
  hourly,
  ageGender,
  readOnly = false,
  initialWhatWorked,
  initialAreasForAttention,
  initialActionPoints,
}: {
  clientId: string
  reportMonth: string
  clientName: string
  reportMonthLabel: string
  summary: Summary
  campaigns: Campaign[]
  keywords: KeywordRow[]
  devices: DeviceRow[]
  dayOfWeek: DayRow[]
  hourly: HourlyRow[]
  ageGender: AgeGenderRow[]
  readOnly?: boolean
  initialWhatWorked?: string
  initialAreasForAttention?: string
  initialActionPoints?: string[]
}) {
  const [insights, setInsights] = useState<Insights | null>(null)
  const [loading, setLoading] = useState(!readOnly)
  const [error, setError] = useState<string | null>(null)
  const [generation, setGeneration] = useState(0)

  const generate = useCallback(async () => {
    if (readOnly) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName,
          reportMonth: reportMonthLabel,
          summary,
          campaigns,
          keywords,
          devices,
          dayOfWeek,
          hourly,
          ageGender,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate insights.')
      setInsights(data as Insights)
      setGeneration((g) => g + 1)
      // Persist the freshly generated text so the public report page can
      // display it read-only without calling Claude again.
      persistText(clientId, reportMonth, 'what_worked', bulletText((data as Insights).whatWorked))
      persistText(clientId, reportMonth, 'areas_for_attention', bulletText((data as Insights).areasForAttention))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate insights.')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, clientId, reportMonth])

  useEffect(() => {
    if (readOnly) return
    generate()
  }, [readOnly, generate])

  if (readOnly) {
    return (
      <>
        <section>
          <SectionHeading>Performance Analysis</SectionHeading>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white border border-[#dce6f5] rounded-lg px-5 py-[18px]">
              <h3 className="text-[#1e7a3c] font-bold text-sm mb-3">✅ What Worked — {reportMonthLabel}</h3>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {initialWhatWorked && initialWhatWorked.trim().length > 0 ? (
                  initialWhatWorked
                ) : (
                  <span className="text-gray-400 italic">No notes added.</span>
                )}
              </p>
            </div>
            <div className="bg-white border border-[#dce6f5] rounded-lg px-5 py-[18px]">
              <h3 className="text-[#c5221f] font-bold text-sm mb-3">⚠️ Areas for Attention</h3>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {initialAreasForAttention && initialAreasForAttention.trim().length > 0 ? (
                  initialAreasForAttention
                ) : (
                  <span className="text-gray-400 italic">No notes added.</span>
                )}
              </p>
            </div>
          </div>
        </section>

        <section>
          <SectionHeading>Action Points &amp; Recommendations</SectionHeading>
          <div className="bg-white rounded-lg border border-[#dce6f5] p-6">
            <ActionPoints clientId={clientId} reportMonth={reportMonth} readOnly initialPoints={initialActionPoints} />
          </div>
        </section>
      </>
    )
  }

  return (
    <>
      <section>
        <SectionHeading>Performance Analysis</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white border border-[#dce6f5] rounded-lg px-5 py-[18px]">
            <h3 className="text-[#1e7a3c] font-bold text-sm mb-3">✅ What Worked — {reportMonthLabel}</h3>
            {loading ? (
              <Spinner />
            ) : (
              <textarea
                id="pa-what-worked"
                key={`what-worked-${generation}`}
                defaultValue={bulletText(insights?.whatWorked)}
                placeholder="Add what worked this month..."
                rows={8}
                onBlur={(e) => persistText(clientId, reportMonth, 'what_worked', e.target.value)}
                className="w-full text-sm text-gray-800 border border-[#dce6f5] rounded-lg px-3 py-2 resize-none outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 placeholder-gray-400 transition"
              />
            )}
          </div>
          <div className="bg-white border border-[#dce6f5] rounded-lg px-5 py-[18px]">
            <h3 className="text-[#c5221f] font-bold text-sm mb-3">⚠️ Areas for Attention</h3>
            {loading ? (
              <Spinner />
            ) : (
              <textarea
                id="pa-areas-attention"
                key={`areas-attention-${generation}`}
                defaultValue={bulletText(insights?.areasForAttention)}
                placeholder="Add areas needing attention..."
                rows={8}
                onBlur={(e) => persistText(clientId, reportMonth, 'areas_for_attention', e.target.value)}
                className="w-full text-sm text-gray-800 border border-[#dce6f5] rounded-lg px-3 py-2 resize-none outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 placeholder-gray-400 transition"
              />
            )}
          </div>
        </div>

        {error && <p className="text-[#c5221f] text-xs mt-3">{error}</p>}

        <div className="mt-4 flex justify-end">
          <button
            onClick={generate}
            disabled={loading}
            className="px-4 py-2 bg-[#F5A623] hover:bg-[#e0941f] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition"
          >
            {loading ? 'Generating…' : '↻ Regenerate Insights'}
          </button>
        </div>
      </section>

      <section>
        <SectionHeading>Action Points &amp; Recommendations</SectionHeading>
        <div className="bg-white rounded-lg border border-[#dce6f5] p-6">
          <ActionPoints clientId={clientId} reportMonth={reportMonth} suggestedPoints={insights?.actionPoints} />
        </div>
      </section>
    </>
  )
}
