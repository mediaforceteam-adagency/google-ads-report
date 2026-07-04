import KeywordsTable, { type KeywordRow } from './KeywordsTable'
import ReportCharts, {
  CampaignSpendChart,
  DeviceDistributionChart,
  type DeviceRow,
  type HourlyRow,
  type DayRow,
  type WeeklyRow,
  type AgeGenderRow,
} from './ReportCharts'
import {
  InsightsProvider,
  InsightBanner,
  PerformanceAnalysis,
  ActionPointsSection,
  type InitialInsights,
  type InsightsBundle,
} from './InsightsPanel'
import SectionHeading from './SectionHeading'
import { MEDIAFORCE_LOGO_BASE64 } from '@/lib/logo'
import { dateRangeLabel, prevDbMonth, monthLabel, monthShort } from '@/lib/reportDates'

// ─── types ────────────────────────────────────────────────────────────────────

export type Kpi = { label: string; value: string; prev: string; delta: string; deltaColor: string; accent: boolean }

export type Campaign = {
  campaign_name: string; status: string; campaign_type?: string | null
  cost: number | null; prev_cost: number | null
  clicks: number | null; impressions: number | null; conversions: number | null
  ctr: number | null; cpl: number | null
  search_impression_share: number | null
  search_lost_is_budget: number | null
  search_lost_is_rank: number | null
}

export type AdGroup = {
  ad_group_name: string; campaign_name: string; status: string
  clicks: number | null; impressions: number | null; cost: number | null
  conversions: number | null; ctr: number | null; cpl: number | null
}

export type InsightsSummary = {
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

function pct1(n: number | null | undefined) {
  return n === null || n === undefined ? '--' : `${n.toFixed(1)}%`
}

function mom(current: number | null, prev: number | null): number | null {
  if (!prev) return null
  return (((current ?? 0) - prev) / prev) * 100
}

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

function ConvCell({ value }: { value: number | null }) {
  const v = value ?? 0
  return v > 0 ? (
    <span className="text-[#1e7a3c] font-semibold">{fmtNum(v)} ✓</span>
  ) : (
    <span className="text-gray-400">0</span>
  )
}

function CplCell({ conversions, cpl }: { conversions: number | null; cpl: number | null }) {
  return (conversions ?? 0) > 0 && cpl ? <>{fmtCAD(cpl, 2)}</> : <span className="text-gray-400">N/A</span>
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-[#f0f4fa] border border-[#d0ddef] rounded-full px-3 py-[3px] text-[11px] text-[#1b5ea6] whitespace-nowrap">
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

// ─── main export ───────────────────────────────────────────────────────────────

export default function ReportBody({
  clientId,
  dbMonth,
  clientName,
  reportMonthLabel,
  kpis,
  campaigns,
  adGroups,
  keywords,
  devices,
  hourly,
  dayOfWeek,
  weekly,
  ageGender,
  summary,
  readOnly = false,
  initialInsights,
  initialActionPoints,
  onInsightsGenerated,
}: {
  clientId: string
  dbMonth: string
  clientName: string
  reportMonthLabel: string
  kpis: Kpi[]
  campaigns: Campaign[]
  adGroups: AdGroup[]
  keywords: KeywordRow[]
  devices: DeviceRow[]
  hourly: HourlyRow[]
  dayOfWeek: DayRow[]
  weekly: WeeklyRow[]
  ageGender: AgeGenderRow[]
  summary: InsightsSummary
  readOnly?: boolean
  initialInsights?: InitialInsights
  initialActionPoints?: string[]
  onInsightsGenerated?: (bundle: InsightsBundle) => void
}) {
  const totalSpend = campaigns.reduce((sum, c) => sum + (c.cost ?? 0), 0)
  const totalClicks = campaigns.reduce((sum, c) => sum + (c.clicks ?? 0), 0)
  const totalImpressions = campaigns.reduce((sum, c) => sum + (c.impressions ?? 0), 0)
  const totalConversions = campaigns.reduce((sum, c) => sum + (c.conversions ?? 0), 0)
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const cplValue = totalConversions > 0 ? totalSpend / totalConversions : null

  const prevMonth = prevDbMonth(dbMonth)
  const curMonthFull = monthLabel(dbMonth)
  const prevMonthFull = monthLabel(prevMonth)
  const curMonthShort = monthShort(dbMonth)
  const prevMonthShort = monthShort(prevMonth)

  const enabledAdGroups = adGroups
    .filter((ag) => ag.status?.toLowerCase() === 'enabled')
    .sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0))

  return (
    <div>
      {/* ── 1. Full-width header ───────────────────────────────────────── */}
      <header
        className="w-full bg-white border-b-[3px] border-[#1b5ea6] px-6 md:px-12 py-3.5 flex items-center justify-between flex-wrap gap-4"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={MEDIAFORCE_LOGO_BASE64} alt="Mediaforce" style={{ height: '36px', width: 'auto' }} />
          <span className="w-px h-8 bg-[#d0ddef]" />
          <span className="text-[#1b5ea6] font-bold text-[17px]">{clientName}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Pill>📅 {dateRangeLabel(dbMonth)}</Pill>
          <Pill>Google Ads Only</Pill>
          <Pill>Prepared by Mediaforce</Pill>
          <Pill>💰 CAD</Pill>
        </div>
      </header>

      <InsightsProvider
        clientId={clientId}
        reportMonth={dbMonth}
        clientName={clientName}
        reportMonthLabel={reportMonthLabel}
        summary={summary}
        campaigns={campaigns}
        keywords={keywords}
        devices={devices}
        dayOfWeek={dayOfWeek}
        hourly={hourly}
        ageGender={ageGender}
        readOnly={readOnly}
        initial={initialInsights}
        onInsightsGenerated={onInsightsGenerated}
      >
        <div className="max-w-[1100px] mx-auto px-6 md:px-12">
          {/* ── 2. Account Summary heading ──────────────────────────────── */}
          <h2 className="text-[20px] font-bold text-[#194A6A]" style={{ padding: '32px 0 16px' }}>
            {curMonthFull} — Account Summary vs {prevMonthFull}
          </h2>

          {/* ── 3. Account Summary KPI cards ────────────────────────────── */}
          <section className="bg-[#194A6A] rounded-[10px] p-6">
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
                    <span style={{ color: kpi.deltaColor, fontSize: '11px', fontWeight: 600 }}>{kpi.delta}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── 4. Analysis notes (auto-generated) ──────────────────────── */}
          <InsightBanner field="accountSummary" />

          {/* ── 5. Campaign Performance — current vs previous month ─────── */}
          <section>
            <SectionHeading>Campaign Performance — {curMonthFull} vs {prevMonthFull}</SectionHeading>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border border-[#dce6f5] p-[18px]">
                <CampaignSpendChart data={campaigns} />
              </div>
              <div className="bg-white rounded-lg border border-[#dce6f5] p-[18px]">
                <DeviceDistributionChart data={devices} />
              </div>
            </div>
            <InsightBanner field="campaignInsight" tone="warning" />
          </section>

          {/* ── 6. Campaigns table — current vs previous month ──────────── */}
          <section>
            <SectionHeading>Campaigns — {curMonthFull} vs {prevMonthFull}</SectionHeading>
            {campaigns.length === 0 ? (
              <p className="text-gray-400 text-sm italic">No campaign data for this month.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-[#dce6f5]">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="bg-[#194A6A]">
                      {[
                        'Campaign', 'Type', 'Status',
                        `${curMonthShort} Spend`, `${prevMonthShort} Spend`,
                        `${curMonthShort} Clicks`, `${curMonthShort} Impr.`,
                        `${curMonthShort} CTR`, 'Search IS %', 'Lost IS Budget', 'Lost IS Rank',
                        `${curMonthShort} Conv.`, `${curMonthShort} CPL`,
                      ].map((h) => (
                        <th
                          key={h}
                          className={`${TABLE_HEADER_CLASS} ${
                            !['Campaign', 'Type', 'Status'].includes(h) ? 'text-right' : ''
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
                        <td className="px-4 py-3 font-medium text-gray-800 max-w-[220px] truncate">{c.campaign_name}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{c.campaign_type ?? '—'}</td>
                        <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmtCAD(c.cost ?? 0)}</td>
                        <td className="px-4 py-3 text-right">
                          {c.prev_cost ? (
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-gray-700">{fmtCAD(c.prev_cost)}</span>
                              <TableMomBadge change={mom(c.cost, c.prev_cost)} />
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">{fmtNum(c.clicks)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{fmtNum(c.impressions)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{pct(c.ctr)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{pct1(c.search_impression_share)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{pct1(c.search_lost_is_budget)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{pct1(c.search_lost_is_rank)}</td>
                        <td className="px-4 py-3 text-right"><ConvCell value={c.conversions} /></td>
                        <td className="px-4 py-3 text-right text-gray-700"><CplCell conversions={c.conversions} cpl={c.cpl} /></td>
                      </tr>
                    ))}
                    <tr className="bg-[#e8f0fb] font-bold border-t-2 border-[#194A6A]">
                      <td className="px-4 py-3 text-gray-900" colSpan={3}>TOTAL</td>
                      <td className="px-4 py-3 text-right text-gray-900">{fmtCAD(totalSpend)}</td>
                      <td className="px-4 py-3 text-right text-gray-400">—</td>
                      <td className="px-4 py-3 text-right text-gray-900">{fmtNum(totalClicks)}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{fmtNum(totalImpressions)}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{pct(ctr)}</td>
                      <td className="px-4 py-3 text-right text-gray-400">—</td>
                      <td className="px-4 py-3 text-right text-gray-400">—</td>
                      <td className="px-4 py-3 text-right text-gray-400">—</td>
                      <td className="px-4 py-3 text-right text-gray-900">{fmtNum(totalConversions)}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{cplValue !== null ? fmtCAD(cplValue, 2) : 'N/A'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── 7. Campaign analysis notes (auto-generated) ─────────────── */}
          <InsightBanner field="campaignAnalysis" />

          {/* ── 8. Campaign Report — enabled ad groups ───────────────────── */}
          <section>
            <SectionHeading>Campaign Report</SectionHeading>
            {enabledAdGroups.length === 0 ? (
              <p className="text-gray-400 text-sm italic">No enabled ad groups for this month.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-[#dce6f5]">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="bg-[#194A6A]">
                      {['Ad Group', 'Campaign', 'Status', 'Clicks', 'Impr.', 'Spend (CAD)', 'Conv.', 'CTR', 'CPL'].map((h) => (
                        <th
                          key={h}
                          className={`${TABLE_HEADER_CLASS} ${
                            !['Ad Group', 'Campaign', 'Status'].includes(h) ? 'text-right' : ''
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {enabledAdGroups.map((ag, i) => (
                      <tr key={i} className={rowClass(i)}>
                        <td className="px-4 py-3 font-medium text-gray-800 max-w-[180px] truncate">{ag.ad_group_name}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs max-w-[180px] truncate">{ag.campaign_name}</td>
                        <td className="px-4 py-3"><StatusBadge status={ag.status} /></td>
                        <td className="px-4 py-3 text-right text-gray-700">{fmtNum(ag.clicks)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{fmtNum(ag.impressions)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmtCAD(ag.cost ?? 0)}</td>
                        <td className="px-4 py-3 text-right"><ConvCell value={ag.conversions} /></td>
                        <td className="px-4 py-3 text-right text-gray-700">{pct(ag.ctr)}</td>
                        <td className="px-4 py-3 text-right text-gray-700"><CplCell conversions={ag.conversions} cpl={ag.cpl} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── 9. Top Keywords — current month by spend ─────────────────── */}
          <section>
            <SectionHeading>Top Keywords — {curMonthFull}, by Spend</SectionHeading>
            <KeywordsTable keywords={keywords} />
          </section>

          {/* ── 10. Keyword analysis notes (auto-generated) ──────────────── */}
          <InsightBanner field="keywordAnalysis" />

          {/* ── 11-15. Device / Hourly / Day / Weekly / Age & Gender ─────── */}
          <ReportCharts devices={devices} hourly={hourly} dayOfWeek={dayOfWeek} weekly={weekly} ageGender={ageGender} />

          {/* ── 16. Performance Analysis (premium) ───────────────────────── */}
          <PerformanceAnalysis reportMonthLabel={reportMonthLabel} />

          {/* ── 17. Action Points & Recommendations (premium) ────────────── */}
          <ActionPointsSection initialActionPoints={initialActionPoints} />
        </div>
      </InsightsProvider>

      {/* ── 18. Full-width footer ─────────────────────────────────────── */}
      <footer className="w-full bg-[#194A6A] px-6 md:px-12 py-6 flex items-center justify-between flex-wrap gap-4 mt-12">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={MEDIAFORCE_LOGO_BASE64}
          alt="Mediaforce"
          style={{ height: '28px', width: 'auto', filter: 'brightness(0) invert(1)' }}
        />
        <div className="text-center flex-1 min-w-[240px]">
          <p className="text-white text-sm font-semibold">Google Ads Performance Report · {clientName} · {reportMonthLabel}</p>
          <p className="text-[#a0bcd4] text-xs mt-1">This report is confidential and intended solely for the named recipient.</p>
        </div>
        <p className="text-[#a0bcd4] text-xs font-semibold text-right">Mediaforce Digital Marketing Agency</p>
      </footer>
    </div>
  )
}
