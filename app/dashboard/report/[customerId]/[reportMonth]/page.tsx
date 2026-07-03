import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import MonthSelector from './MonthSelector'
import KeywordsTable, { type KeywordRow } from './KeywordsTable'
import ReportCharts, { type DeviceRow, type HourlyRow, type DayRow, type WeeklyRow, type AgeGenderRow } from './ReportCharts'
import InsightsPanel from './InsightsPanel'
import SectionHeading from './SectionHeading'
import DownloadReportButton from './DownloadReportButton'
import { MEDIAFORCE_LOGO_BASE64 } from '@/lib/logo'

// ─── types ────────────────────────────────────────────────────────────────────

type Client = { id: string; client_name: string; customer_id: string; status: string }

// monthly_summary is only used for prior-month comparison figures — current
// totals are calculated from the campaigns table (see ISSUE 1).
type Summary = {
  prev_spend: number | null
  prev_clicks: number | null
  prev_impressions: number | null
  prev_conversions: number | null
}

type Campaign = {
  campaign_name: string; status: string
  cost: number | null; prev_cost: number | null
  clicks: number | null; impressions: number | null; conversions: number | null
  ctr: number | null; cpl: number | null
}

type AdGroup = {
  ad_group_name: string; campaign_name: string; status: string
  clicks: number | null; impressions: number | null; cost: number | null
  conversions: number | null; ctr: number | null; cpl: number | null
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

function mom(current: number | null, prev: number | null): number | null {
  if (!prev) return null
  return (((current ?? 0) - prev) / prev) * 100
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

// ─── UI atoms ─────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase()
  const cls =
    s === 'enabled'
      ? 'bg-[#e6f4ea] text-[#1e7a3c]'
      : s === 'paused'
      ? 'bg-[#f1f3f4] text-[#5f6368]'
      : s === 'removed'
      ? 'bg-[#fce8e6] text-[#c5221f]'
      : 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>
      {status}
    </span>
  )
}

function TableMomBadge({ change }: { change: number | null }) {
  if (change === null) return <span className="text-gray-400 text-xs">—</span>
  const up = change >= 0
  return (
    <span className={`text-xs font-medium ${up ? 'text-green-600' : 'text-red-500'}`}>
      {up ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
    </span>
  )
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-[#f0f4fa] border border-[#d0ddef] rounded-full px-3 py-[3px] text-[11px] text-[#1b5ea6]">
      {children}
    </span>
  )
}

const TABLE_HEADER_CLASS = 'px-4 py-3 font-semibold text-white uppercase text-xs whitespace-nowrap'

function rowClass(i: number) {
  return `border-b border-[#dce6f5] last:border-0 hover:bg-[#eef4ff] transition-colors ${
    i % 2 === 0 ? 'bg-white' : 'bg-[#f7faff]'
  }`
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

  // ── ISSUE 1: KPIs computed from campaigns table, not monthly_summary ──────
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

  // ── ISSUE 2: delta strings/colors computed explicitly, before render ──────
  const spendDelta = calcDelta(totalSpend, prevSpend)
  const spendDeltaColor = getDeltaColor(totalSpend, prevSpend)
  const clicksDelta = calcDelta(totalClicks, prevClicks)
  const clicksDeltaColor = getDeltaColor(totalClicks, prevClicks)
  const impressionsDelta = calcDelta(totalImpressions, prevImpressions)
  const impressionsDeltaColor = getDeltaColor(totalImpressions, prevImpressions)
  const conversionsDelta = calcDelta(totalConversions, prevConversions)
  const conversionsDeltaColor = getDeltaColor(totalConversions, prevConversions)
  const ctrDelta = calcDelta(ctr, prevCtr)
  const ctrDeltaColor = getDeltaColor(ctr, prevCtr)
  const avgCpcDelta = calcDelta(avgCpc, prevAvgCpc)
  const avgCpcDeltaColor = getDeltaColor(avgCpc, prevAvgCpc)
  const cplDelta = calcDelta(cplValue ?? 0, prevCpl ?? 0)
  const cplDeltaColor = getDeltaColor(cplValue ?? 0, prevCpl ?? 0)

  const kpis: { label: string; value: string; prev: string; delta: string; deltaColor: string; accent: boolean }[] = [
    { label: 'Total Spend', value: fmtCAD(totalSpend), prev: fmtCAD(prevSpend), delta: spendDelta, deltaColor: spendDeltaColor, accent: true },
    { label: 'Clicks', value: fmtNum(totalClicks), prev: fmtNum(prevClicks), delta: clicksDelta, deltaColor: clicksDeltaColor, accent: false },
    { label: 'Impressions', value: fmtNum(totalImpressions), prev: fmtNum(prevImpressions), delta: impressionsDelta, deltaColor: impressionsDeltaColor, accent: false },
    { label: 'Conversions', value: fmtNum(totalConversions), prev: fmtNum(prevConversions), delta: conversionsDelta, deltaColor: conversionsDeltaColor, accent: false },
    { label: 'CTR', value: pct(ctr), prev: pct(prevCtr), delta: ctrDelta, deltaColor: ctrDeltaColor, accent: false },
    { label: 'Avg CPC', value: fmtCAD(avgCpc, 2), prev: fmtCAD(prevAvgCpc, 2), delta: avgCpcDelta, deltaColor: avgCpcDeltaColor, accent: false },
    {
      label: 'CPL',
      value: cplValue !== null ? fmtCAD(cplValue, 2) : 'N/A',
      prev: prevCpl !== null ? fmtCAD(prevCpl, 2) : 'N/A',
      delta: cplDelta,
      deltaColor: cplDeltaColor,
      accent: true,
    },
  ]

  const clientName = (client as Client).client_name

  return (
    <div>
      {/* ── Utility bar: back link + month switcher (app chrome, not part of the report itself) ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-navy transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <MonthSelector
            customerId={customerId}
            currentMonth={reportMonth}
            availableMonths={availableMonths.length > 0 ? availableMonths : [reportMonth]}
          />
          <DownloadReportButton
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
          />
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto">
        {/* ── ISSUE 4: Report header ─────────────────────────────────────── */}
        <div className="bg-white border-b-[3px] border-[#1b5ea6] px-12 py-3.5 flex items-center justify-between flex-wrap gap-4 rounded-t-lg">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={MEDIAFORCE_LOGO_BASE64} alt="Mediaforce" style={{ height: '36px', width: 'auto' }} />
            <span className="w-px h-8 bg-[#d0ddef]" />
            <span className="text-[#1b5ea6] font-bold text-[17px]">{clientName}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Pill>Google Ads</Pill>
            <Pill>{formatReportMonth(reportMonth)}</Pill>
            <Pill>Monthly Report</Pill>
          </div>
        </div>

        <div>
          {/* ── Account Summary ──────────────────────────────────────────── */}
          <section className="bg-[#194A6A] rounded-[10px] p-6 mt-6">
            <h2 className="text-white font-bold text-lg mb-5">
              Account Summary — {formatReportMonth(reportMonth)}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {kpis.map((kpi) => (
                <div key={kpi.label} className="bg-white/10 rounded-lg p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#7fb3d3] leading-tight">
                    {kpi.label}
                  </p>
                  <p className={`text-[22px] font-bold mt-1.5 leading-none ${kpi.accent ? 'text-[#F5A623]' : 'text-white'}`}>
                    {kpi.value}
                  </p>
                  <p className="text-[#7fb3d3] text-xs mt-1.5">vs {kpi.prev} last month</p>
                  <div className="mt-1">
                    <span style={{ color: kpi.deltaColor, fontSize: '11px', fontWeight: 600 }}>
                      {kpi.delta}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Campaign Performance ─────────────────────────────────────── */}
          <section>
            <SectionHeading>Campaign Performance</SectionHeading>
            {campaigns.length === 0 ? (
              <p className="text-gray-400 text-sm italic">No campaign data for this month.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-[#dce6f5]">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="bg-[#194A6A]">
                      {['Campaign', 'Status', 'Cost', 'vs Last Month', 'Clicks', 'Impressions', 'Conv.', 'CTR', 'CPL'].map((h) => (
                        <th
                          key={h}
                          className={`${TABLE_HEADER_CLASS} ${
                            ['Cost', 'Clicks', 'Impressions', 'Conv.', 'CTR', 'CPL'].includes(h) ? 'text-right' : ''
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((c, i) => (
                      <tr key={i} className={rowClass(i)}>
                        <td className="px-4 py-3 font-medium text-gray-800 max-w-[240px] truncate">{c.campaign_name}</td>
                        <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmtCAD(c.cost ?? 0)}</td>
                        <td className="px-4 py-3 text-right">
                          {c.prev_cost ? (
                            <div className="flex flex-col items-end gap-0.5">
                              <span className={`text-xs font-medium ${(c.cost ?? 0) - c.prev_cost >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                {(c.cost ?? 0) - c.prev_cost >= 0 ? '+' : ''}{fmtCAD((c.cost ?? 0) - c.prev_cost)}
                              </span>
                              <TableMomBadge change={mom(c.cost, c.prev_cost)} />
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">{fmtNum(c.clicks)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{fmtNum(c.impressions)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{fmtNum(c.conversions)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{pct(c.ctr)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{c.cpl ? fmtCAD(c.cpl, 2) : '—'}</td>
                      </tr>
                    ))}
                    {/* ── ISSUE 6: Totals row ──────────────────────────────── */}
                    <tr className="bg-[#e8f0fb] font-bold border-t-2 border-[#194A6A]">
                      <td className="px-4 py-3 text-gray-900" colSpan={2}>TOTAL</td>
                      <td className="px-4 py-3 text-right text-gray-900">{fmtCAD(totalSpend)}</td>
                      <td className="px-4 py-3 text-right text-gray-400">—</td>
                      <td className="px-4 py-3 text-right text-gray-900">{fmtNum(totalClicks)}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{fmtNum(totalImpressions)}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{fmtNum(totalConversions)}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{pct(ctr)}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{cplValue !== null ? fmtCAD(cplValue, 2) : 'N/A'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── Ad Group Performance ─────────────────────────────────────── */}
          <section>
            <SectionHeading>Ad Group Performance</SectionHeading>
            {adGroups.length === 0 ? (
              <p className="text-gray-400 text-sm italic">No ad group data for this month.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-[#dce6f5]">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="bg-[#194A6A]">
                      {['Ad Group', 'Campaign', 'Status', 'Cost', 'Clicks', 'Impressions', 'Conv.', 'CTR', 'CPL'].map((h) => (
                        <th
                          key={h}
                          className={`${TABLE_HEADER_CLASS} ${
                            ['Cost', 'Clicks', 'Impressions', 'Conv.', 'CTR', 'CPL'].includes(h) ? 'text-right' : ''
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {adGroups.map((ag, i) => (
                      <tr key={i} className={rowClass(i)}>
                        <td className="px-4 py-3 font-medium text-gray-800 max-w-[180px] truncate">{ag.ad_group_name}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs max-w-[180px] truncate">{ag.campaign_name}</td>
                        <td className="px-4 py-3"><StatusBadge status={ag.status} /></td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmtCAD(ag.cost ?? 0)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{fmtNum(ag.clicks)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{fmtNum(ag.impressions)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{fmtNum(ag.conversions)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{pct(ag.ctr)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{ag.cpl ? fmtCAD(ag.cpl, 2) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── Keywords ──────────────────────────────────────────────────── */}
          <section>
            <SectionHeading>Keywords Performance</SectionHeading>
            <KeywordsTable keywords={keywords} />
          </section>

          {/* ── Charts ────────────────────────────────────────────────────── */}
          <ReportCharts
            devices={devices}
            hourly={hourly}
            dayOfWeek={dayOfWeek}
            weekly={weekly}
            ageGender={ageGender}
          />

          {/* ── Performance Analysis + Action Points (Claude-generated) ──── */}
          <InsightsPanel
            clientId={cid}
            reportMonth={dbMonth}
            clientName={clientName}
            reportMonthLabel={formatReportMonth(reportMonth)}
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
            campaigns={campaigns}
            keywords={keywords}
            devices={devices}
            dayOfWeek={dayOfWeek}
            hourly={hourly}
            ageGender={ageGender}
          />

          {/* ── Footer ────────────────────────────────────────────────────── */}
          <footer className="bg-[#194A6A] rounded-[10px] p-6 text-center mt-10">
            <p className="text-white font-bold text-sm">Mediaforce</p>
            <p className="text-[#bdd5f0] text-xs mt-1">{clientName} — {formatReportMonth(reportMonth)}</p>
            <p className="text-[#7fb3d3] text-xs mt-2">Confidential report prepared exclusively for the client</p>
          </footer>
        </div>
      </div>
    </div>
  )
}
