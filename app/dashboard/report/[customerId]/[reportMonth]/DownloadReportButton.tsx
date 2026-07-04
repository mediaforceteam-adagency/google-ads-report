'use client'

import type { KeywordRow } from '@/components/report/KeywordsTable'
import { topKeywordsBySpend } from '@/components/report/KeywordsTable'
import type { DeviceRow, HourlyRow, DayRow, WeeklyRow, AgeGenderRow } from '@/components/report/ReportCharts'
import type { InsightsBundle } from '@/components/report/InsightsPanel'
import { MEDIAFORCE_LOGO_BASE64 } from '@/lib/logo'
import { dateRangeLabel, prevDbMonth, monthLabel, monthShort } from '@/lib/reportDates'

type Kpi = { label: string; value: string; prev: string; delta: string; deltaColor: string; accent: boolean }

type Campaign = {
  campaign_name: string; status: string; campaign_type?: string | null
  cost: number | null; prev_cost: number | null
  clicks: number | null; impressions: number | null; conversions: number | null
  ctr: number | null; cpl: number | null
  search_impression_share: number | null
  search_lost_is_budget: number | null
  search_lost_is_rank: number | null
}

type AdGroup = {
  ad_group_name: string; campaign_name: string; status: string
  clicks: number | null; impressions: number | null; cost: number | null
  conversions: number | null; ctr: number | null; cpl: number | null
}

const DEVICE_COLORS: Record<string, string> = {
  desktop: '#194A6A',
  mobile: '#F5A623',
  tablet: '#0d8a6e',
}

export default function DownloadReportButton({
  clientName,
  reportMonthLabel,
  dbMonth,
  kpis,
  totals,
  campaigns,
  adGroups,
  keywords,
  devices,
  hourly,
  dayOfWeek,
  weekly,
  ageGender,
  insights,
}: {
  clientName: string
  reportMonthLabel: string
  dbMonth: string
  kpis: Kpi[]
  totals: { totalSpend: number; totalClicks: number; totalImpressions: number; totalConversions: number; ctr: number; cplValue: number | null }
  campaigns: Campaign[]
  adGroups: AdGroup[]
  keywords: KeywordRow[]
  devices: DeviceRow[]
  hourly: HourlyRow[]
  dayOfWeek: DayRow[]
  weekly: WeeklyRow[]
  ageGender: AgeGenderRow[]
  insights: InsightsBundle | null
}) {
  function handleDownload() {
    const actionPointInputs = Array.from(
      document.querySelectorAll<HTMLInputElement>('[data-action-point-input]')
    )
      .map((el) => el.value.trim())
      .filter(Boolean)

    const html = buildReportHtml({
      clientName,
      reportMonthLabel,
      dbMonth,
      kpis,
      totals,
      campaigns,
      adGroups,
      keywords,
      devices,
      hourly,
      dayOfWeek,
      weekly,
      ageGender,
      whatWorked: insights?.whatWorked ?? [],
      areasForAttention: insights?.areasForAttention ?? [],
      accountSummary: insights?.accountSummary ?? '',
      campaignInsight: insights?.campaignInsight ?? '',
      campaignAnalysis: insights?.campaignAnalysis ?? '',
      keywordAnalysis: insights?.keywordAnalysis ?? '',
      actionPoints: actionPointInputs.length > 0 ? actionPointInputs : insights?.actionPoints ?? [],
    })

    const [monthName, year] = reportMonthLabel.split(' ')
    const safeClient = clientName.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '')
    const filename = `${safeClient}_${monthName}_${year}_GoogleAds_Report.html`

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleDownload}
      className="px-5 py-2 bg-[#F5A623] hover:bg-[#e0941f] text-white text-sm font-semibold rounded-lg transition shrink-0"
    >
      ⬇ Download Report
    </button>
  )
}

// ─── standalone HTML export ────────────────────────────────────────────────

function esc(s: string | null | undefined): string {
  return (s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fmtCAD(n: number | null, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n ?? 0)
}

function fmtNum(n: number | null | undefined): string {
  return (n ?? 0).toLocaleString('en-US')
}

function pct(n: number | null): string {
  return `${(n ?? 0).toFixed(2)}%`
}

function pct1(n: number | null | undefined): string {
  return n === null || n === undefined ? '--' : `${n.toFixed(1)}%`
}

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function formatHour(hourValue: number | string): string {
  const h = Number(hourValue)
  if (h === 0) return '12 AM'
  if (h < 12) return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

function statusPill(status: string): string {
  const s = status?.toLowerCase()
  const colors =
    s === 'enabled'
      ? 'background:#e6f4ea;color:#1e7a3c'
      : s === 'paused'
      ? 'background:#f1f3f4;color:#5f6368'
      : s === 'removed'
      ? 'background:#fce8e6;color:#c5221f'
      : 'background:#f1f3f4;color:#5f6368'
  return `<span class="pill-status" style="${colors}">${esc(status)}</span>`
}

function qsPill(score: number | null): string {
  const colors =
    score === null || score === undefined
      ? 'background:#f1f3f4;color:#9aa5b1'
      : score >= 7
      ? 'background:#e6f4ea;color:#1e7a3c'
      : score >= 4
      ? 'background:#fff4e0;color:#a0670f'
      : 'background:#fce8e6;color:#c5221f'
  return `<span class="pill-status" style="${colors}">${score === null || score === undefined ? '—' : score}</span>`
}

const QUALITY_METRIC_COLORS: Record<string, string> = {
  ABOVE_AVERAGE: 'background:#e6f4ea;color:#1e7a3c',
  AVERAGE: 'background:#f1f3f4;color:#5f6368',
  BELOW_AVERAGE: 'background:#fce8e6;color:#c5221f',
}

const QUALITY_METRIC_LABELS: Record<string, string> = {
  ABOVE_AVERAGE: 'Above Avg',
  AVERAGE: 'Average',
  BELOW_AVERAGE: 'Below Avg',
}

function qualityMetricPill(value: string | null): string {
  const colors = (value && QUALITY_METRIC_COLORS[value]) || 'background:#f1f3f4;color:#5f6368'
  const label = (value && QUALITY_METRIC_LABELS[value]) || '--'
  return `<span class="pill-status" style="${colors}">${label}</span>`
}

function convCell(value: number | null): string {
  const v = value ?? 0
  return v > 0 ? `<span style="color:#1e7a3c;font-weight:700">${fmtNum(v)} ✓</span>` : `<span style="color:#9aa5b1">0</span>`
}

function cplCell(conversions: number | null, cpl: number | null): string {
  return (conversions ?? 0) > 0 && cpl ? fmtCAD(cpl, 2) : `<span style="color:#9aa5b1">N/A</span>`
}

function dataTable(headers: string[], rows: string[][], totalsRow?: string[]): string {
  const thead = headers.map((h, i) => `<th class="${i > 0 ? 'num' : ''}">${esc(h)}</th>`).join('')
  const tbody = rows
    .map((r, i) => `<tr class="${i % 2 === 0 ? 'row-even' : 'row-odd'}">${r.map((c, j) => `<td class="${j > 0 ? 'num' : ''}">${c}</td>`).join('')}</tr>`)
    .join('')
  const tfoot = totalsRow
    ? `<tr class="row-total">${totalsRow.map((c, j) => `<td class="${j > 0 ? 'num' : ''}">${c}</td>`).join('')}</tr>`
    : ''
  return `<div class="table-wrap"><table><thead><tr>${thead}</tr></thead><tbody>${tbody}${tfoot}</tbody></table></div>`
}

function insightBanner(text: string, tone: 'info' | 'warning' = 'info'): string {
  if (!text) return ''
  const cls = tone === 'warning' ? 'banner banner-warning' : 'banner banner-info'
  return `<div class="${cls}">${esc(text)}</div>`
}

// ─── CSS-only chart reproductions ──────────────────────────────────────────

function hBarChart(rows: { label: string; value: number; display: string; color: string }[]): string {
  if (rows.length === 0) return `<p class="empty">No data.</p>`
  const max = Math.max(1, ...rows.map((r) => r.value))
  return `<div class="hbar-chart">${rows
    .map(
      (r) => `
    <div class="hbar-row">
      <span class="hbar-label">${esc(r.label)}</span>
      <div class="hbar-track"><div class="hbar-fill" style="width:${((r.value / max) * 100).toFixed(1)}%;background:${r.color}"></div></div>
      <span class="hbar-value">${r.display}</span>
    </div>`
    )
    .join('')}</div>`
}

function percentageBarList(rows: { label: string; value: number; pct: number; color: string }[]): string {
  if (rows.length === 0) return `<p class="empty">No data.</p>`
  return `<div class="pct-list">${rows
    .map(
      (r) => `
    <div class="pct-row">
      <span class="pct-swatch" style="background:${r.color}"></span>
      <span class="pct-label">${esc(r.label)}</span>
      <span class="pct-sub">${fmtNum(r.value)} clicks</span>
      <span class="pct-value">${r.pct.toFixed(0)}%</span>
    </div>
    <div class="pct-track"><div class="pct-fill" style="width:${r.pct}%;background:${r.color}"></div></div>`
    )
    .join('')}</div>`
}

function groupedVBarChart(
  data: { label: string; a: number; b: number }[],
  colorA: string,
  colorB: string,
  legendA: string,
  legendB: string
): string {
  if (data.length === 0) return `<p class="empty">No data.</p>`
  const max = Math.max(1, ...data.flatMap((d) => [d.a, d.b]))
  const bars = data
    .map(
      (d) => `
    <div class="vbar-group">
      <div class="vbar-pair">
        <div class="vbar" style="height:${((d.a / max) * 100).toFixed(1)}%;background:${colorA}" title="${d.a}"></div>
        <div class="vbar" style="height:${((d.b / max) * 100).toFixed(1)}%;background:${colorB}" title="${d.b}"></div>
      </div>
      <span class="vbar-label">${esc(d.label)}</span>
    </div>`
    )
    .join('')
  return `<div class="vbar-legend"><span><i style="background:${colorA}"></i>${legendA}</span><span><i style="background:${colorB}"></i>${legendB}</span></div>
  <div class="vbar-chart">${bars}</div>`
}

function bulletListHtml(items: string[], markBg: string, markColor: string, mark: string): string {
  if (items.length === 0) return `<p class="empty">No notes added.</p>`
  return `<ul class="pa-list">${items
    .map(
      (item, i) =>
        `<li style="${i < items.length - 1 ? 'border-bottom:1px solid #f0f4fa' : ''}"><span class="pa-mark" style="background:${markBg};color:${markColor}">${mark}</span><span>${esc(item)}</span></li>`
    )
    .join('')}</ul>`
}

function actionPointCards(points: string[]): string {
  if (points.length === 0) return `<p class="empty">No action points recorded.</p>`
  return points
    .map(
      (p, i) => `
    <div class="ap-card">
      <span class="ap-num">${i + 1}</span>
      <p class="ap-text">${esc(p)}</p>
    </div>`
    )
    .join('')
}

function buildReportHtml(d: {
  clientName: string
  reportMonthLabel: string
  dbMonth: string
  kpis: Kpi[]
  totals: { totalSpend: number; totalClicks: number; totalImpressions: number; totalConversions: number; ctr: number; cplValue: number | null }
  campaigns: Campaign[]
  adGroups: AdGroup[]
  keywords: KeywordRow[]
  devices: DeviceRow[]
  hourly: HourlyRow[]
  dayOfWeek: DayRow[]
  weekly: WeeklyRow[]
  ageGender: AgeGenderRow[]
  whatWorked: string[]
  areasForAttention: string[]
  accountSummary: string
  campaignInsight: string
  campaignAnalysis: string
  keywordAnalysis: string
  actionPoints: string[]
}): string {
  const prevMonth = prevDbMonth(d.dbMonth)
  const curMonthFull = monthLabel(d.dbMonth)
  const prevMonthFull = monthLabel(prevMonth)
  const curMonthShort = monthShort(d.dbMonth)
  const prevMonthShort = monthShort(prevMonth)

  const kpiCards = d.kpis
    .map(
      (k) => `
      <div class="kpi-card">
        <p class="kpi-label">${esc(k.label)}</p>
        <p class="kpi-value" style="color:${k.accent ? '#F5A623' : '#fff'}">${esc(k.value)}</p>
        <p class="kpi-prev">vs ${esc(k.prev)} last month</p>
        <p class="kpi-change" style="color:${k.deltaColor}">${esc(k.delta)}</p>
      </div>`
    )
    .join('')

  // ── Section 5 charts ──
  const spendingCampaigns = d.campaigns.filter((c) => (c.cost ?? 0) > 0).sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0))
  const totalCampaignSpend = spendingCampaigns.reduce((s, c) => s + (c.cost ?? 0), 0)
  const campaignSpendChart = hBarChart(
    spendingCampaigns.map((c) => ({
      label: c.campaign_name,
      value: c.cost ?? 0,
      display: totalCampaignSpend > 0 ? `${fmtCAD(c.cost)} (${(((c.cost ?? 0) / totalCampaignSpend) * 100).toFixed(0)}%)` : fmtCAD(c.cost),
      color: '#194A6A',
    }))
  )
  const totalDeviceClicks = d.devices.reduce((s, dv) => s + (dv.clicks ?? 0), 0)
  const deviceDistributionChart = percentageBarList(
    d.devices.map((dv) => ({
      label: dv.device,
      value: dv.clicks ?? 0,
      pct: totalDeviceClicks > 0 ? ((dv.clicks ?? 0) / totalDeviceClicks) * 100 : 0,
      color: DEVICE_COLORS[dv.device?.toLowerCase()] ?? '#1b5ea6',
    }))
  )

  // ── Section 6 campaigns table ──
  const campaignRows = d.campaigns.map((c) => [
    esc(c.campaign_name),
    esc(c.campaign_type ?? '—'),
    statusPill(c.status),
    fmtCAD(c.cost),
    c.prev_cost ? fmtCAD(c.prev_cost) : '<span style="color:#9aa5b1">—</span>',
    fmtNum(c.clicks),
    fmtNum(c.impressions),
    pct(c.ctr),
    pct1(c.search_impression_share),
    pct1(c.search_lost_is_budget),
    pct1(c.search_lost_is_rank),
    convCell(c.conversions),
    cplCell(c.conversions, c.cpl),
  ])
  const campaignTotals = [
    'TOTAL', '', '', fmtCAD(d.totals.totalSpend), '<span style="color:#9aa5b1">—</span>',
    fmtNum(d.totals.totalClicks), fmtNum(d.totals.totalImpressions), pct(d.totals.ctr),
    '<span style="color:#9aa5b1">—</span>', '<span style="color:#9aa5b1">—</span>', '<span style="color:#9aa5b1">—</span>',
    fmtNum(d.totals.totalConversions), d.totals.cplValue !== null ? fmtCAD(d.totals.cplValue, 2) : 'N/A',
  ]

  // ── Section 8 ad groups (enabled only) ──
  const enabledAdGroups = d.adGroups
    .filter((ag) => ag.status?.toLowerCase() === 'enabled')
    .sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0))
  const adGroupRows = enabledAdGroups.map((ag) => [
    esc(ag.ad_group_name),
    esc(ag.campaign_name),
    statusPill(ag.status),
    fmtNum(ag.clicks),
    fmtNum(ag.impressions),
    fmtCAD(ag.cost ?? 0),
    convCell(ag.conversions),
    pct(ag.ctr),
    cplCell(ag.conversions, ag.cpl),
  ])

  // ── Section 9 top 10 keywords ──
  const topKeywords = topKeywordsBySpend(d.keywords)
  const keywordRows = topKeywords.map((k) => {
    const converted = (k.conversions ?? 0) > 0
    return [
      `<span style="${converted ? 'font-weight:700;color:#111' : ''}">${esc(k.keyword)}</span>`,
      esc(k.match_type),
      fmtNum(k.clicks),
      fmtNum(k.impressions),
      pct(k.ctr),
      fmtCAD(k.cost ?? 0, 2),
      fmtCAD(k.avg_cpc ?? 0, 2),
      convCell(k.conversions),
      qsPill(k.quality_score),
      qualityMetricPill(k.landing_page_exp),
      qualityMetricPill(k.expected_ctr),
      qualityMetricPill(k.ad_relevance),
    ]
  })

  // ── Section 11 device performance ──
  const deviceRows = d.devices.map((dv) => [
    esc(dv.device), fmtNum(dv.clicks), fmtNum(dv.impressions), fmtCAD(dv.cost ?? 0), fmtNum(dv.conversions),
  ])
  const deviceClicksBars = hBarChart(d.devices.map((dv) => ({ label: dv.device, value: dv.clicks ?? 0, display: fmtNum(dv.clicks), color: '#1b5ea6' })))
  const deviceCostBars = hBarChart(d.devices.map((dv) => ({ label: dv.device, value: dv.cost ?? 0, display: fmtCAD(dv.cost ?? 0), color: '#F5A623' })))

  // ── Section 12 hourly ──
  // `hour` comes back from Supabase as text, so key the lookup map on the
  // numeric value — otherwise "0", "1", "10"... never matches the 0-23 loop.
  const hourlyByHour = new Map(d.hourly.map((h) => [Number(h.hour), h]))
  const hourlyFull = Array.from({ length: 24 }, (_, hour) => hourlyByHour.get(hour) ?? { hour, clicks: 0, conversions: 0 })
  const hourlyRows = hourlyFull.map((h) => [formatHour(h.hour), fmtNum(h.clicks), fmtNum(h.conversions)])
  const hourlyChart = groupedVBarChart(
    hourlyFull.map((h) => ({ label: formatHour(h.hour).replace(' ', ''), a: h.clicks, b: h.conversions })),
    '#1b5ea6', '#F5A623', 'Clicks', 'Conversions'
  )

  // ── Section 13 day of week ──
  const sortedDays = [...d.dayOfWeek].sort((a, b) => {
    const ai = DAY_ORDER.findIndex((day) => a.day?.startsWith(day.slice(0, 3)))
    const bi = DAY_ORDER.findIndex((day) => b.day?.startsWith(day.slice(0, 3)))
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })
  const dayRows = sortedDays.map((r) => [esc(r.day), fmtNum(r.clicks), fmtNum(r.conversions)])
  const dayChart = groupedVBarChart(
    sortedDays.map((r) => ({ label: r.day?.slice(0, 3) ?? '', a: r.clicks, b: r.conversions })),
    '#1b5ea6', '#F5A623', 'Clicks', 'Conversions'
  )

  // ── Section 14 weekly trend ──
  const weeklyRows = d.weekly.map((r) => [esc(r.week_label), fmtNum(r.clicks), fmtCAD(r.cost ?? 0), fmtNum(r.conversions)])
  const weeklyChart = hBarChart(d.weekly.map((r) => ({ label: r.week_label, value: r.cost ?? 0, display: fmtCAD(r.cost ?? 0), color: '#194A6A' })))

  // ── Section 15 age & gender ──
  const ageRows = d.ageGender.filter((r) => r.type?.toLowerCase() === 'age').map((r) => [esc(r.segment), fmtNum(r.clicks), fmtNum(r.conversions)])
  const genderRows = d.ageGender.filter((r) => r.type?.toLowerCase() === 'gender').map((r) => [esc(r.segment), fmtNum(r.clicks), fmtNum(r.conversions)])
  const ageChart = groupedVBarChart(
    d.ageGender.filter((r) => r.type?.toLowerCase() === 'age').map((r) => ({ label: r.segment, a: r.clicks, b: r.conversions })),
    '#194A6A', '#6fa8dc', 'Clicks', 'Conversions'
  )
  const genderChart = groupedVBarChart(
    d.ageGender.filter((r) => r.type?.toLowerCase() === 'gender').map((r) => ({ label: r.segment, a: r.clicks, b: r.conversions })),
    '#0d8a6e', '#F5A623', 'Clicks', 'Conversions'
  )

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(d.clientName)} — ${esc(d.reportMonthLabel)} Google Ads Report</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #F5F6F8; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 14px; line-height: 1.55; color: #1a1a1a; }
  .content { max-width: 1100px; margin: 0 auto; padding: 0 24px 60px; }
  .header { background: #fff; border-bottom: 3px solid #1b5ea6; padding: 14px 48px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .header-left { display: flex; align-items: center; gap: 16px; }
  .header-left img { height: 36px; width: auto; display: block; }
  .divider { width: 1px; height: 32px; background: #d0ddef; }
  .client-name { color: #1b5ea6; font-weight: 700; font-size: 17px; }
  .pill { background: #f0f4fa; border: 1px solid #d0ddef; border-radius: 20px; padding: 3px 12px; font-size: 11px; color: #1b5ea6; white-space: nowrap; }
  .pills { display: flex; gap: 8px; flex-wrap: wrap; }
  h1.summary-title { color: #194A6A; font-size: 20px; font-weight: 700; padding: 32px 0 16px; margin: 0; }
  .summary { background: #194A6A; border-radius: 10px; padding: 24px 26px 20px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 12px; }
  .kpi-card { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); border-radius: 7px; padding: 14px 12px; }
  .kpi-label { color: #7fb3d3; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px; margin: 0; }
  .kpi-value { font-size: 22px; font-weight: 800; margin: 6px 0 0; line-height: 1; }
  .kpi-prev { color: #7fb3d3; font-size: 10px; margin: 6px 0 0; }
  .kpi-change { font-size: 11px; margin: 4px 0 0; font-weight: 600; }
  h2.section-title { color: #1b5ea6; font-size: 17px; font-weight: 700; border-bottom: 2px solid #dce6f5; padding-bottom: 8px; margin-top: 48px; margin-bottom: 16px; }
  .banner { margin-top: 16px; border-radius: 0 6px 6px 0; padding: 14px 18px; font-size: 13px; line-height: 1.6; border-left: 4px solid; }
  .banner-info { background: #eef4ff; border-color: #1b5ea6; color: #33475b; }
  .banner-warning { background: #fff8ec; border-color: #F5A623; color: #7a5210; }
  .card-white { background: #fff; border: 1px solid #dce6f5; border-radius: 8px; padding: 18px; }
  .chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .chart-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #194A6A; margin: 0 0 12px; }
  .table-wrap { border: 1px solid #dce6f5; border-radius: 8px; overflow-x: auto; margin-top: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #194A6A; color: #fff; text-transform: uppercase; font-size: 11px; letter-spacing: 0.3px; text-align: left; padding: 10px 14px; white-space: nowrap; }
  th.num, td.num { text-align: right; }
  td { padding: 9px 14px; border-bottom: 1px solid #eef2f8; font-size: 13px; }
  tbody tr:last-child td { border-bottom: none; }
  .row-even { background: #fff; }
  .row-odd { background: #f7faff; }
  tr.row-total td { background: #e8f0fb; font-weight: 700; border-top: 2px solid #194A6A; border-bottom: none; }
  .pill-status { display: inline-block; padding: 2px 9px; border-radius: 12px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
  .empty { color: #9aa5b1; font-size: 13px; font-style: italic; margin: 0; }
  /* horizontal bar chart (campaign spend, device/weekly cost) */
  .hbar-chart { display: flex; flex-direction: column; gap: 10px; }
  .hbar-row { display: grid; grid-template-columns: 140px 1fr 110px; align-items: center; gap: 10px; }
  .hbar-label { font-size: 12px; color: #374151; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .hbar-track { background: #eef2f8; border-radius: 4px; height: 16px; overflow: hidden; }
  .hbar-fill { height: 100%; border-radius: 4px; }
  .hbar-value { font-size: 11px; color: #194A6A; font-weight: 600; text-align: right; white-space: nowrap; }
  /* percentage bar list (device distribution) */
  .pct-row { display: flex; align-items: center; gap: 10px; font-size: 13px; margin-top: 10px; }
  .pct-swatch { width: 11px; height: 11px; border-radius: 2px; flex-shrink: 0; }
  .pct-label { text-transform: capitalize; font-weight: 600; color: #1f2937; width: 64px; }
  .pct-sub { color: #6b7280; }
  .pct-value { margin-left: auto; font-weight: 700; color: #111827; }
  .pct-track { background: #eef2f8; border-radius: 4px; height: 6px; margin-top: 4px; overflow: hidden; }
  .pct-fill { height: 100%; border-radius: 4px; }
  /* grouped vertical bar chart (hourly/day/weekly/age/gender) */
  .vbar-legend { display: flex; gap: 16px; font-size: 11px; color: #5f6368; margin-bottom: 10px; }
  .vbar-legend i { display: inline-block; width: 9px; height: 9px; border-radius: 2px; margin-right: 5px; vertical-align: middle; }
  .vbar-chart { display: flex; align-items: flex-end; gap: 4px; height: 150px; overflow-x: auto; padding-top: 10px; }
  .vbar-group { flex: 1; min-width: 18px; display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .vbar-pair { display: flex; align-items: flex-end; gap: 2px; height: 120px; width: 100%; }
  .vbar { flex: 1; border-radius: 2px 2px 0 0; min-height: 2px; }
  .vbar-label { font-size: 9px; color: #5f6368; white-space: nowrap; }
  /* performance analysis premium cards */
  .pa-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .pa-card { border-radius: 12px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
  .pa-card h3 { margin: 0 0 12px; font-size: 15px; font-weight: 700; }
  ul.pa-list { list-style: none; margin: 0; padding: 0; }
  ul.pa-list li { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; color: #1a1a1a; padding: 8px 0; }
  .pa-mark { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; margin-top: 1px; }
  /* action point premium cards */
  .ap-list { display: flex; flex-direction: column; gap: 12px; }
  .ap-card { display: flex; align-items: flex-start; gap: 20px; background: #fff; border-radius: 12px; border-left: 4px solid #F5A623; padding: 20px 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
  .ap-num { font-size: 40px; font-weight: 900; color: #F5A623; line-height: 1; flex-shrink: 0; }
  .ap-text { font-size: 14px; color: #1a1a1a; margin: 8px 0 0; }
  footer { background: #194A6A; padding: 24px 48px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-top: 48px; }
  footer img { height: 28px; width: auto; display: block; filter: brightness(0) invert(1); }
  footer .f-center { text-align: center; flex: 1; min-width: 240px; }
  footer .f-main { color: #fff; font-size: 13px; font-weight: 600; margin: 0; }
  footer .f-note { color: #a0bcd4; font-size: 11px; margin: 4px 0 0; }
  footer .f-agency { color: #a0bcd4; font-size: 12px; font-weight: 600; margin: 0; text-align: right; }
  @media (max-width: 900px) {
    .kpi-grid { grid-template-columns: repeat(4, 1fr); }
    .chart-grid, .pa-grid { grid-template-columns: 1fr; }
  }
  @media (max-width: 480px) {
    .content { padding: 0 12px 40px; }
    .header, footer { padding: 14px 20px; }
    .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  }
</style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <img src="${MEDIAFORCE_LOGO_BASE64}" alt="Mediaforce" />
      <div class="divider"></div>
      <span class="client-name">${esc(d.clientName)}</span>
    </div>
    <div class="pills">
      <span class="pill">📅 ${esc(dateRangeLabel(d.dbMonth))}</span>
      <span class="pill">Google Ads Only</span>
      <span class="pill">Prepared by Mediaforce</span>
      <span class="pill">💰 CAD</span>
    </div>
  </div>

<div class="content">
  <h1 class="summary-title">${esc(curMonthFull)} — Account Summary vs ${esc(prevMonthFull)}</h1>
  <section class="summary">
    <div class="kpi-grid">${kpiCards}</div>
  </section>
  ${insightBanner(d.accountSummary)}

  <h2 class="section-title">Campaign Performance — ${esc(curMonthFull)} vs ${esc(prevMonthFull)}</h2>
  <div class="chart-grid">
    <div class="card-white">
      <p class="chart-title">Current Month Spend by Campaign (CA$)</p>
      ${campaignSpendChart}
    </div>
    <div class="card-white">
      <p class="chart-title">Click Distribution by Device</p>
      ${deviceDistributionChart}
    </div>
  </div>
  ${insightBanner(d.campaignInsight, 'warning')}

  <h2 class="section-title">Campaigns — ${esc(curMonthFull)} vs ${esc(prevMonthFull)}</h2>
  ${dataTable(
    ['Campaign', 'Type', 'Status', `${curMonthShort} Spend`, `${prevMonthShort} Spend`, `${curMonthShort} Clicks`, `${curMonthShort} Impr.`, `${curMonthShort} CTR`, 'Search IS %', 'Lost IS Budget', 'Lost IS Rank', `${curMonthShort} Conv.`, `${curMonthShort} CPL`],
    campaignRows,
    campaignTotals
  )}
  ${insightBanner(d.campaignAnalysis)}

  <h2 class="section-title">Campaign Report</h2>
  ${dataTable(['Ad Group', 'Campaign', 'Status', 'Clicks', 'Impr.', 'Spend (CAD)', 'Conv.', 'CTR', 'CPL'], adGroupRows)}

  <h2 class="section-title">Top Keywords — ${esc(curMonthFull)}, by Spend</h2>
  ${dataTable(['Keyword', 'Match Type', 'Clicks', 'Impr.', 'CTR', 'Spend', 'Avg CPC', 'Conv.', 'QS', 'Landing Page', 'Exp. CTR', 'Ad Relevance'], keywordRows)}
  ${insightBanner(d.keywordAnalysis)}

  <h2 class="section-title">Device Performance</h2>
  <div class="chart-grid">
    <div class="card-white"><p class="chart-title">Clicks by Device</p>${deviceClicksBars}</div>
    <div class="card-white"><p class="chart-title">Cost by Device</p>${deviceCostBars}</div>
  </div>
  ${dataTable(['Device', 'Clicks', 'Impressions', 'Cost', 'Conversions'], deviceRows)}

  <h2 class="section-title">Hourly Performance</h2>
  <div class="card-white">${hourlyChart}</div>
  ${dataTable(['Hour', 'Clicks', 'Conversions'], hourlyRows)}

  <h2 class="section-title">Day of Week Performance</h2>
  <div class="card-white">${dayChart}</div>
  ${dataTable(['Day', 'Clicks', 'Conversions'], dayRows)}

  <h2 class="section-title">Weekly Trend</h2>
  <div class="card-white">${weeklyChart}</div>
  ${dataTable(['Week', 'Clicks', 'Cost', 'Conversions'], weeklyRows)}

  <h2 class="section-title">Age &amp; Gender Breakdown</h2>
  <div class="chart-grid">
    <div class="card-white"><p class="chart-title">Age Groups</p>${ageChart}</div>
    <div class="card-white"><p class="chart-title">Gender</p>${genderChart}</div>
  </div>
  <div class="chart-grid">
    ${dataTable(['Age Range', 'Clicks', 'Conversions'], ageRows)}
    ${dataTable(['Gender', 'Clicks', 'Conversions'], genderRows)}
  </div>

  <h2 class="section-title">Performance Analysis</h2>
  <div class="pa-grid">
    <div class="pa-card" style="background:linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);border-top:4px solid #1e7a3c">
      <h3 style="color:#1e7a3c">✅ What Worked — ${esc(d.reportMonthLabel)}</h3>
      ${bulletListHtml(d.whatWorked, '#e6f4ea', '#1e7a3c', '✓')}
    </div>
    <div class="pa-card" style="background:linear-gradient(135deg, #fff5f5 0%, #ffffff 100%);border-top:4px solid #c5221f">
      <h3 style="color:#c5221f">⚠️ Areas for Attention</h3>
      ${bulletListHtml(d.areasForAttention, '#fce8e6', '#c5221f', '!')}
    </div>
  </div>

  <h2 class="section-title">Action Points &amp; Recommendations</h2>
  <div class="ap-list">${actionPointCards(d.actionPoints)}</div>
</div>

  <footer>
    <img src="${MEDIAFORCE_LOGO_BASE64}" alt="Mediaforce" />
    <div class="f-center">
      <p class="f-main">Google Ads Performance Report · ${esc(d.clientName)} · ${esc(d.reportMonthLabel)}</p>
      <p class="f-note">This report is confidential and intended solely for the named recipient.</p>
    </div>
    <p class="f-agency">Mediaforce Digital Marketing Agency</p>
  </footer>
</body>
</html>`
}
