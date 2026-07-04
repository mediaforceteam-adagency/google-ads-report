'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import SectionHeading from './SectionHeading'
import ActionPoints from './ActionPoints'
import { createClient } from '@/lib/supabase/client'
import { bulletText, parseBullets } from '@/lib/insightsText'
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

export type InsightsBundle = {
  whatWorked: string[]
  areasForAttention: string[]
  actionPoints: string[]
  accountSummary: string
  campaignInsight: string
  campaignAnalysis: string
  keywordAnalysis: string
}

export type InitialInsights = {
  whatWorked?: string
  areasForAttention?: string
  actionPoints?: string[]
  accountSummary?: string
  campaignInsight?: string
  campaignAnalysis?: string
  keywordAnalysis?: string
}

const EMPTY_BUNDLE: InsightsBundle = {
  whatWorked: [],
  areasForAttention: [],
  actionPoints: [],
  accountSummary: '',
  campaignInsight: '',
  campaignAnalysis: '',
  keywordAnalysis: '',
}

type InsightsContextValue = {
  bundle: InsightsBundle
  loading: boolean
  error: string | null
  readOnly: boolean
  clientId: string
  reportMonth: string
}

const InsightsContext = createContext<InsightsContextValue | null>(null)

function useInsightsContext() {
  const ctx = useContext(InsightsContext)
  if (!ctx) throw new Error('Insights components must be rendered inside <InsightsProvider>.')
  return ctx
}

function hasFullInitialData(initial?: InitialInsights) {
  return !!(
    initial?.accountSummary?.trim() &&
    initial?.campaignInsight?.trim() &&
    initial?.campaignAnalysis?.trim() &&
    initial?.keywordAnalysis?.trim() &&
    initial?.whatWorked?.trim() &&
    initial?.areasForAttention?.trim()
  )
}

async function persistBundle(clientId: string, reportMonth: string, bundle: InsightsBundle) {
  const supabase = createClient()
  await supabase.from('action_points').upsert(
    {
      client_id: clientId,
      report_month: reportMonth,
      what_worked: bulletText(bundle.whatWorked),
      areas_for_attention: bulletText(bundle.areasForAttention),
      account_summary: bundle.accountSummary,
      campaign_insight: bundle.campaignInsight,
      campaign_analysis: bundle.campaignAnalysis,
      keyword_analysis: bundle.keywordAnalysis,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'client_id,report_month' }
  )
}

export function InsightsProvider({
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
  initial,
  onInsightsGenerated,
  children,
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
  initial?: InitialInsights
  onInsightsGenerated?: (bundle: InsightsBundle) => void
  children: React.ReactNode
}) {
  const initialBundle: InsightsBundle = {
    whatWorked: parseBullets(initial?.whatWorked),
    areasForAttention: parseBullets(initial?.areasForAttention),
    actionPoints: initial?.actionPoints ?? [],
    accountSummary: initial?.accountSummary ?? '',
    campaignInsight: initial?.campaignInsight ?? '',
    campaignAnalysis: initial?.campaignAnalysis ?? '',
    keywordAnalysis: initial?.keywordAnalysis ?? '',
  }

  const [bundle, setBundle] = useState<InsightsBundle>(initialBundle)
  const [loading, setLoading] = useState(!readOnly && !hasFullInitialData(initial))
  const [error, setError] = useState<string | null>(null)

  // Notify the parent (e.g. a sibling download/export button that can't read
  // this context directly) whenever the current insights bundle changes.
  useEffect(() => {
    onInsightsGenerated?.(bundle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle])

  useEffect(() => {
    if (readOnly) return
    if (hasFullInitialData(initial)) return

    let cancelled = false
    async function generate() {
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
        if (cancelled) return
        const next: InsightsBundle = {
          whatWorked: data.whatWorked ?? [],
          areasForAttention: data.areasForAttention ?? [],
          actionPoints: data.actionPoints ?? [],
          accountSummary: data.accountSummary ?? '',
          campaignInsight: data.campaignInsight ?? '',
          campaignAnalysis: data.campaignAnalysis ?? '',
          keywordAnalysis: data.keywordAnalysis ?? '',
        }
        setBundle(next)
        persistBundle(clientId, reportMonth, next)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to generate insights.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    generate()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, clientId, reportMonth])

  return (
    <InsightsContext.Provider value={{ bundle, loading, error, readOnly, clientId, reportMonth }}>
      {children}
    </InsightsContext.Provider>
  )
}

// ─── Blue insight banner (Sections 4, 7, 10) + warning variant (Section 5) ────

function BannerSkeleton() {
  return (
    <div className="mt-4 bg-[#eef4ff] border-l-4 border-[#1b5ea6] rounded-r-md px-[18px] py-3.5">
      <div className="h-3.5 bg-[#d7e4f7] rounded animate-pulse w-3/4" />
    </div>
  )
}

export function InsightBanner({
  field,
  tone = 'info',
}: {
  field: keyof Pick<InsightsBundle, 'accountSummary' | 'campaignInsight' | 'campaignAnalysis' | 'keywordAnalysis'>
  tone?: 'info' | 'warning'
}) {
  const { bundle, loading } = useInsightsContext()

  if (loading) return <BannerSkeleton />

  const text = bundle[field]
  if (!text) return null

  const cls =
    tone === 'warning'
      ? 'bg-[#fff8ec] border-[#F5A623] text-[#7a5210]'
      : 'bg-[#eef4ff] border-[#1b5ea6] text-gray-800'

  return (
    <div className={`mt-4 rounded-r-md px-[18px] py-3.5 text-sm leading-relaxed border-l-4 ${cls}`}>
      {text}
    </div>
  )
}

// ─── Section 16: Performance Analysis (premium cards) ─────────────────────────

function BulletCard({
  title,
  titleColor,
  items,
  mark,
  markBg,
  markColor,
  gradient,
  borderTop,
}: {
  title: string
  titleColor: string
  items: string[]
  mark: string
  markBg: string
  markColor: string
  gradient: string
  borderTop: string
}) {
  return (
    <div
      className="rounded-xl p-6"
      style={{
        background: gradient,
        borderTop: `4px solid ${borderTop}`,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      }}
    >
      <h3 className="text-[15px] font-bold mb-3" style={{ color: titleColor }}>
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No notes added.</p>
      ) : (
        <ul>
          {items.map((item, i) => (
            <li
              key={i}
              className={`flex items-start gap-3 py-2 text-sm text-[#1a1a1a] ${i < items.length - 1 ? 'border-b border-[#f0f4fa]' : ''}`}
            >
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5"
                style={{ background: markBg, color: markColor }}
              >
                {mark}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function PerformanceAnalysis({ reportMonthLabel }: { reportMonthLabel: string }) {
  const { bundle, loading } = useInsightsContext()

  return (
    <section>
      <SectionHeading>Performance Analysis</SectionHeading>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <BannerSkeleton />
          <BannerSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <BulletCard
            title={`✅ What Worked — ${reportMonthLabel}`}
            titleColor="#1e7a3c"
            items={bundle.whatWorked}
            mark="✓"
            markBg="#e6f4ea"
            markColor="#1e7a3c"
            gradient="linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)"
            borderTop="#1e7a3c"
          />
          <BulletCard
            title="⚠️ Areas for Attention"
            titleColor="#c5221f"
            items={bundle.areasForAttention}
            mark="!"
            markBg="#fce8e6"
            markColor="#c5221f"
            gradient="linear-gradient(135deg, #fff5f5 0%, #ffffff 100%)"
            borderTop="#c5221f"
          />
        </div>
      )}
    </section>
  )
}

// ─── Section 17: Action Points & Recommendations ──────────────────────────────

function ActionPointsSection({ initialActionPoints }: { initialActionPoints?: string[] }) {
  const { bundle, loading, readOnly, clientId, reportMonth } = useInsightsContext()

  return (
    <section>
      <SectionHeading>Action Points &amp; Recommendations</SectionHeading>
      {loading ? (
        <p className="text-sm text-gray-400 italic">Generating recommendations…</p>
      ) : (
        <ActionPoints
          clientId={clientId}
          reportMonth={reportMonth}
          readOnly={readOnly}
          suggestedPoints={bundle.actionPoints}
          initialPoints={initialActionPoints}
        />
      )}
    </section>
  )
}

export { PerformanceAnalysis, ActionPointsSection }
