import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ReportPageClient from './ReportPageClient'
import type { Kpi, Campaign, AdGroup } from '@/components/report/ReportBody'
import type { KeywordRow } from '@/components/report/KeywordsTable'
import type { DeviceRow, HourlyRow, DayRow, WeeklyRow, AgeGenderRow } from '@/components/report/ReportCharts'

// ─── types ────────────────────────────────────────────────────────────────────

type Client = { id: string; client_name: string; customer_id: string; status: string }

// monthly_summary is only used for prior-month comparison figures — current
// totals are calculated from the campaigns table.
type Summary = {
  prev_spend: number | null
  prev_clicks: number | null
  prev_impressions: number | null
  prev_conversions: number | null
}

// ─── helpers ─────────────────────────────────────────────────────────────────

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
  const pct = ((current - previous) / previous) * 100
  if (pct > 0) return `▲ +${pct.toFixed(1)}%`
  if (pct < 0) return `▼ ${pct.toFixed(1)}%`
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

// ─── page ─────────────────────────────────────────────────────────────────────

export default async function ReportPage({
  params,
}: {
  params: Promise<{ customerId: string; reportMonth: string }>
}) {
  const { customerId, reportMonth } = await params
  const dbMonth = `${reportMonth}-01`
  const supabase = await createClient()

  // Step 1: resolve client UUID by customer_id
  const { data: client } = await supabase
    .from('clients')
    .select('id, client_name, customer_id, status')
    .eq('customer_id', customerId)
    .single()

  if (!client) notFound()

  const cid = (client as Client).id

  // Step 2: parallel fetch everything, filtered by client_id + report_month
  const [
    summaryRes, campaignsRes, adGroupsRes, keywordsRes,
    devicesRes, hourlyRes, dowRes, weeklyRes, ageGenderRes, monthsRes,
  ] = await Promise.all([
    supabase.from('monthly_summary').select('*').eq('client_id', cid).eq('report_month', dbMonth).single(),
    supabase.from('campaigns').select('*').eq('client_id', cid).eq('report_month', dbMonth).order('cost', { ascending: false }),
    supabase.from('ad_groups').select('*').eq('client_id', cid).eq('report_month', dbMonth).order('cost', { ascending: false }),
    supabase.from('keywords').select('*').eq('client_id', cid).eq('report_month', dbMonth).order('cost', { ascending: false }),
    supabase.from('devices').select('*').eq('client_id', cid).eq('report_month', dbMonth),
    supabase.from('hourly').select('*').eq('client_id', cid).eq('report_month', dbMonth).order('hour'),
    supabase.from('day_of_week').select('*').eq('client_id', cid).eq('report_month', dbMonth),
    supabase.from('weekly').select('*').eq('client_id', cid).eq('report_month', dbMonth),
    supabase.from('age_gender').select('*').eq('client_id', cid).eq('report_month', dbMonth),
    supabase.from('monthly_summary').select('report_month').eq('client_id', cid).order('report_month', { ascending: false }),
  ])

  for (const [name, res] of Object.entries({
    summary: summaryRes, campaigns: campaignsRes, adGroups: adGroupsRes, keywords: keywordsRes,
    devices: devicesRes, hourly: hourlyRes, dayOfWeek: dowRes, weekly: weeklyRes,
    ageGender: ageGenderRes, months: monthsRes,
  })) {
    if (res.error) console.error(`Dashboard report: failed to fetch ${name}:`, res.error)
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

  // Deduplicate and format available months for selector
  const seenMonths = new Set<string>()
  const availableMonths: string[] = []
  for (const row of (monthsRes.data ?? []) as { report_month: string }[]) {
    const key = row.report_month.slice(0, 7)
    if (!seenMonths.has(key)) { seenMonths.add(key); availableMonths.push(key) }
  }

  // KPIs computed from campaigns table, not monthly_summary
  const totalSpend = campaigns.reduce((sum, c) => sum + (c.cost ?? 0), 0)
  const totalClicks = campaigns.reduce((sum, c) => sum + (c.clicks ?? 0), 0)
  const totalImpressions = campaigns.reduce((sum, c) => sum + (c.impressions ?? 0), 0)
  const totalConversions = campaigns.reduce((sum, c) => sum + (c.conversions ?? 0), 0)
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0
  const cplValue = totalConversions > 0 ? totalSpend / totalConversions : null

  // MoM comparisons come from monthly_summary's prev_* columns
  const prevSpend = s?.prev_spend ?? 0
  const prevClicks = s?.prev_clicks ?? 0
  const prevImpressions = s?.prev_impressions ?? 0
  const prevConversions = s?.prev_conversions ?? 0
  const prevCtr = prevImpressions > 0 ? (prevClicks / prevImpressions) * 100 : 0
  const prevAvgCpc = prevClicks > 0 ? prevSpend / prevClicks : 0
  const prevCpl = prevConversions > 0 ? prevSpend / prevConversions : null

  const kpis: Kpi[] = [
    { label: 'Total Spend', value: fmtCAD(totalSpend), prev: fmtCAD(prevSpend), delta: calcDelta(totalSpend, prevSpend), deltaColor: getDeltaColor(totalSpend, prevSpend), accent: true },
    { label: 'Clicks', value: fmtNum(totalClicks), prev: fmtNum(prevClicks), delta: calcDelta(totalClicks, prevClicks), deltaColor: getDeltaColor(totalClicks, prevClicks), accent: false },
    { label: 'Impressions', value: fmtNum(totalImpressions), prev: fmtNum(prevImpressions), delta: calcDelta(totalImpressions, prevImpressions), deltaColor: getDeltaColor(totalImpressions, prevImpressions), accent: false },
    { label: 'Conversions', value: fmtNum(totalConversions), prev: fmtNum(prevConversions), delta: calcDelta(totalConversions, prevConversions), deltaColor: getDeltaColor(totalConversions, prevConversions), accent: false },
    { label: 'CTR', value: pct(ctr), prev: pct(prevCtr), delta: calcDelta(ctr, prevCtr), deltaColor: getDeltaColor(ctr, prevCtr), accent: false },
    { label: 'Avg CPC', value: fmtCAD(avgCpc, 2), prev: fmtCAD(prevAvgCpc, 2), delta: calcDelta(avgCpc, prevAvgCpc), deltaColor: getDeltaColor(avgCpc, prevAvgCpc), accent: false },
    {
      label: 'CPL',
      value: cplValue !== null ? fmtCAD(cplValue, 2) : 'N/A',
      prev: prevCpl !== null ? fmtCAD(prevCpl, 2) : 'N/A',
      delta: calcDelta(cplValue ?? 0, prevCpl ?? 0),
      deltaColor: getDeltaColor(cplValue ?? 0, prevCpl ?? 0),
      accent: true,
    },
  ]

  const clientName = (client as Client).client_name

  return (
    <ReportPageClient
      customerId={customerId}
      reportMonth={reportMonth}
      availableMonths={availableMonths.length > 0 ? availableMonths : [reportMonth]}
      clientId={cid}
      dbMonth={dbMonth}
      clientName={clientName}
      reportMonthLabel={formatReportMonth(reportMonth)}
      kpis={kpis}
      totals={{ totalSpend, totalClicks, totalImpressions, totalConversions, ctr, cplValue }}
      campaigns={campaigns}
      adGroups={adGroups}
      keywords={keywords}
      devices={devices}
      hourly={hourly}
      dayOfWeek={dayOfWeek}
      weekly={weekly}
      ageGender={ageGender}
      summary={{
        totalSpend,
        totalClicks,
        totalImpressions,
        totalConversions,
        ctr,
        avgCpc,
        cpl: cplValue ?? 'N/A',
        prevSpend,
        prevClicks,
        prevConversions,
      }}
    />
  )
}
