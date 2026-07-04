import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ReportBody, { type Kpi, type Campaign, type AdGroup } from '@/components/report/ReportBody'
import type { KeywordRow } from '@/components/report/KeywordsTable'
import type { DeviceRow, HourlyRow, DayRow, WeeklyRow, AgeGenderRow } from '@/components/report/ReportCharts'
import { generateInsights } from '@/lib/generateInsights'
import { bulletText } from '@/lib/insightsText'

// This is a PUBLIC page — no auth required. It uses the plain anon-key
// Supabase client (no cookies/session), which works because RLS is disabled
// on every table these queries touch.

type Client = { id: string; client_name: string; customer_id: string; status: string }

type Summary = {
  prev_spend: number | null
  prev_clicks: number | null
  prev_impressions: number | null
  prev_conversions: number | null
}

type SavedInsights = {
  points: string[] | null
  what_worked: string | null
  areas_for_attention: string | null
  account_summary: string | null
  campaign_insight: string | null
  campaign_analysis: string | null
  keyword_analysis: string | null
}

function fmtCAD(n: number, decimals = 0) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n ?? 0)
}

function fmtNum(n: number | null) {
  return (n ?? 0).toLocaleString('en-US')
}

function pct(n: number | null) {
  return `${(n ?? 0).toFixed(2)}%`
}

function calcDelta(current: number, previous: number): string {
  if (!previous || previous === 0) return '—'
  const p = ((current - previous) / previous) * 100
  if (p > 0) return `▲ +${p.toFixed(1)}%`
  if (p < 0) return `▼ ${p.toFixed(1)}%`
  return '→ 0.0%'
}

function getDeltaColor(current: number, previous: number): string {
  if (!previous || previous === 0) return '#7fb3d3'
  return current >= previous ? '#5dd68c' : '#ff6b6b'
}

function formatReportMonth(s: string) {
  const [year, month] = s.split('-').map(Number)
  return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default async function PublicReportPage({
  params,
}: {
  params: Promise<{ customerId: string; reportMonth: string }>
}) {
  const { customerId, reportMonth } = await params
  const dbMonth = `${reportMonth}-01`

  const { data: client } = await supabase
    .from('clients')
    .select('id, client_name, customer_id, status')
    .eq('customer_id', customerId)
    .single()

  if (!client) notFound()

  const cid = (client as Client).id

  const [summaryRes, campaignsRes, adGroupsRes, keywordsRes, devicesRes, hourlyRes, dowRes, weeklyRes, ageGenderRes, insightsRes] =
    await Promise.all([
      supabase.from('monthly_summary').select('*').eq('client_id', cid).eq('report_month', dbMonth).single(),
      supabase.from('campaigns').select('*').eq('client_id', cid).eq('report_month', dbMonth).order('cost', { ascending: false }),
      supabase.from('ad_groups').select('*').eq('client_id', cid).eq('report_month', dbMonth).order('cost', { ascending: false }),
      supabase.from('keywords').select('*').eq('client_id', cid).eq('report_month', dbMonth).order('cost', { ascending: false }),
      supabase.from('devices').select('*').eq('client_id', cid).eq('report_month', dbMonth),
      supabase.from('hourly').select('*').eq('client_id', cid).eq('report_month', dbMonth).order('hour'),
      supabase.from('day_of_week').select('*').eq('client_id', cid).eq('report_month', dbMonth),
      supabase.from('weekly').select('*').eq('client_id', cid).eq('report_month', dbMonth),
      supabase.from('age_gender').select('*').eq('client_id', cid).eq('report_month', dbMonth),
      supabase
        .from('action_points')
        .select('points, what_worked, areas_for_attention, account_summary, campaign_insight, campaign_analysis, keyword_analysis')
        .eq('client_id', cid)
        .eq('report_month', dbMonth)
        .maybeSingle(),
    ])

  // These were previously silently swallowed — an RLS policy or query error
  // would just fall back to an empty array with no way to tell why a public
  // report was missing data that the (authenticated) dashboard could see.
  for (const [name, res] of Object.entries({
    summary: summaryRes, campaigns: campaignsRes, adGroups: adGroupsRes, keywords: keywordsRes,
    devices: devicesRes, hourly: hourlyRes, dayOfWeek: dowRes, weekly: weeklyRes,
    ageGender: ageGenderRes, insights: insightsRes,
  })) {
    if (res.error) console.error(`Public report: failed to fetch ${name}:`, res.error)
  }

  const s = summaryRes.data as Summary | null
  const campaigns = (campaignsRes.data ?? []) as Campaign[]
  const adGroups = (adGroupsRes.data ?? []) as AdGroup[]
  const keywords = (keywordsRes.data ?? []) as KeywordRow[]
  const devices = (devicesRes.data ?? []) as DeviceRow[]
  const hourly = (hourlyRes.data ?? []) as HourlyRow[]
  const dayOfWeek = (dowRes.data ?? []) as DayRow[]
  const weekly = (weeklyRes.data ?? []) as WeeklyRow[]
  const ageGender = (ageGenderRes.data ?? []) as AgeGenderRow[]
  const savedInsights = insightsRes.data as SavedInsights | null

  const totalSpend = campaigns.reduce((sum, c) => sum + (c.cost ?? 0), 0)
  const totalClicks = campaigns.reduce((sum, c) => sum + (c.clicks ?? 0), 0)
  const totalImpressions = campaigns.reduce((sum, c) => sum + (c.impressions ?? 0), 0)
  const totalConversions = campaigns.reduce((sum, c) => sum + (c.conversions ?? 0), 0)
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0
  const cplValue = totalConversions > 0 ? totalSpend / totalConversions : null
  const clientName = (client as Client).client_name
  const reportMonthLabel = formatReportMonth(reportMonth)

  const prevSpend = s?.prev_spend ?? 0
  const prevClicks = s?.prev_clicks ?? 0
  const prevImpressions = s?.prev_impressions ?? 0
  const prevConversions = s?.prev_conversions ?? 0
  const prevCtr = prevImpressions > 0 ? (prevClicks / prevImpressions) * 100 : 0
  const prevAvgCpc = prevClicks > 0 ? prevSpend / prevClicks : 0
  const prevCpl = prevConversions > 0 ? prevSpend / prevConversions : null

  const kpis: Kpi[] = [
    {
      label: 'Total Spend',
      value: fmtCAD(totalSpend),
      prev: fmtCAD(prevSpend),
      delta: calcDelta(totalSpend, prevSpend),
      deltaColor: getDeltaColor(totalSpend, prevSpend),
      accent: true,
    },
    {
      label: 'Clicks',
      value: fmtNum(totalClicks),
      prev: fmtNum(prevClicks),
      delta: calcDelta(totalClicks, prevClicks),
      deltaColor: getDeltaColor(totalClicks, prevClicks),
      accent: false,
    },
    {
      label: 'Impressions',
      value: fmtNum(totalImpressions),
      prev: fmtNum(prevImpressions),
      delta: calcDelta(totalImpressions, prevImpressions),
      deltaColor: getDeltaColor(totalImpressions, prevImpressions),
      accent: false,
    },
    {
      label: 'Conversions',
      value: fmtNum(totalConversions),
      prev: fmtNum(prevConversions),
      delta: calcDelta(totalConversions, prevConversions),
      deltaColor: getDeltaColor(totalConversions, prevConversions),
      accent: false,
    },
    {
      label: 'CTR',
      value: pct(ctr),
      prev: pct(prevCtr),
      delta: calcDelta(ctr, prevCtr),
      deltaColor: getDeltaColor(ctr, prevCtr),
      accent: false,
    },
    {
      label: 'Avg CPC',
      value: fmtCAD(avgCpc, 2),
      prev: fmtCAD(prevAvgCpc, 2),
      delta: calcDelta(avgCpc, prevAvgCpc),
      deltaColor: getDeltaColor(avgCpc, prevAvgCpc),
      accent: false,
    },
    {
      label: 'CPL',
      value: cplValue !== null ? fmtCAD(cplValue, 2) : 'N/A',
      prev: prevCpl !== null ? fmtCAD(prevCpl, 2) : 'N/A',
      delta: calcDelta(cplValue ?? 0, prevCpl ?? 0),
      deltaColor: getDeltaColor(cplValue ?? 0, prevCpl ?? 0),
      accent: true,
    },
  ]

  const insightsSummary = {
    totalSpend,
    totalClicks,
    totalImpressions,
    totalConversions,
    ctr,
    avgCpc,
    cpl: cplValue ?? ('N/A' as const),
    prevSpend,
    prevClicks,
    prevConversions,
  }

  // Normally a team member opens the private dashboard first, which triggers
  // Claude generation and persists the result to action_points. If a public
  // link is shared before that happens, generate it here instead so the
  // report never shows blank — and save it so future visits (and the
  // private dashboard) reuse the same text instead of regenerating it.
  let whatWorked = savedInsights?.what_worked ?? undefined
  let areasForAttention = savedInsights?.areas_for_attention ?? undefined
  let accountSummary = savedInsights?.account_summary ?? undefined
  let campaignInsight = savedInsights?.campaign_insight ?? undefined
  let campaignAnalysis = savedInsights?.campaign_analysis ?? undefined
  let keywordAnalysis = savedInsights?.keyword_analysis ?? undefined
  let actionPoints = (savedInsights?.points as string[] | undefined) ?? undefined

  const hasSavedText =
    !!whatWorked?.trim() &&
    !!areasForAttention?.trim() &&
    !!accountSummary?.trim() &&
    !!campaignInsight?.trim() &&
    !!campaignAnalysis?.trim() &&
    !!keywordAnalysis?.trim()

  if (!hasSavedText) {
    try {
      const generated = await generateInsights({
        clientName,
        reportMonth: reportMonthLabel,
        summary: insightsSummary,
        campaigns,
        keywords,
        devices,
        dayOfWeek,
        hourly,
        ageGender,
      })

      whatWorked = bulletText(generated.whatWorked)
      areasForAttention = bulletText(generated.areasForAttention)
      accountSummary = generated.accountSummary
      campaignInsight = generated.campaignInsight
      campaignAnalysis = generated.campaignAnalysis
      keywordAnalysis = generated.keywordAnalysis
      const hasSavedPoints = !!actionPoints && actionPoints.length > 0
      if (!hasSavedPoints) actionPoints = generated.actionPoints

      const upsertPayload: Record<string, unknown> = {
        client_id: cid,
        report_month: dbMonth,
        what_worked: whatWorked,
        areas_for_attention: areasForAttention,
        account_summary: accountSummary,
        campaign_insight: campaignInsight,
        campaign_analysis: campaignAnalysis,
        keyword_analysis: keywordAnalysis,
        updated_at: new Date().toISOString(),
      }
      if (!hasSavedPoints) upsertPayload.points = actionPoints

      const { error: upsertError } = await supabase
        .from('action_points')
        .upsert(upsertPayload, { onConflict: 'client_id,report_month' })
      if (upsertError) console.error('Failed to persist auto-generated insights:', upsertError)
    } catch (error) {
      // Leave the insight fields undefined — InsightBanner already renders
      // nothing in that case, so the page still renders correctly instead of
      // crashing.
      console.error('Failed to auto-generate public report insights:', error)
    }
  }

  return (
    <div className="min-h-screen bg-bg-grey">
      <ReportBody
        clientId={cid}
        dbMonth={dbMonth}
        clientName={clientName}
        reportMonthLabel={reportMonthLabel}
        kpis={kpis}
        campaigns={campaigns}
        adGroups={adGroups}
        keywords={keywords}
        devices={devices}
        hourly={hourly}
        dayOfWeek={dayOfWeek}
        weekly={weekly}
        ageGender={ageGender}
        summary={insightsSummary}
        readOnly
        initialInsights={{
          whatWorked,
          areasForAttention,
          accountSummary,
          campaignInsight,
          campaignAnalysis,
          keywordAnalysis,
          actionPoints,
        }}
        initialActionPoints={actionPoints}
      />
    </div>
  )
}
