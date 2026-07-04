'use client'

import type { KeywordRow } from '@/components/report/KeywordsTable'
import type { DeviceRow, HourlyRow, DayRow, WeeklyRow, AgeGenderRow } from '@/components/report/ReportCharts'
import { MEDIAFORCE_LOGO_BASE64 } from '@/lib/logo'

type Kpi = { label: string; value: string; prev: string; delta: string; deltaColor: string; accent: boolean }

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

export default function DownloadReportButton({
  clientName,
  reportMonthLabel,
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
}: {
  clientName: string
  reportMonthLabel: string
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
}) {
  function handleDownload() {
    const whatWorked = (document.getElementById('pa-what-worked') as HTMLTextAreaElement | null)?.value ?? ''
    const areasForAttention = (document.getElementById('pa-areas-attention') as HTMLTextAreaElement | null)?.value ?? ''
    const actionPoints = Array.from(
      document.querySelectorAll<HTMLInputElement>('[data-action-point-input]')
    )
      .map((el) => el.value.trim())
      .filter(Boolean)

    const html = buildReportHtml({
      clientName,
      reportMonthLabel,
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
      whatWorked,
      areasForAttention,
      actionPoints,
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

function esc(s: string): string {
  return s
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

function fmtNum(n: number | null): string {
  return (n ?? 0).toLocaleString('en-US')
}

function pct(n: number | null): string {
  return `${(n ?? 0).toFixed(2)}%`
}

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function formatHour(h: number): string {
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
  return `<span class="pill-status" style="${colors}">${esc(status ?? '')}</span>`
}

function dataTable(headers: string[], rows: string[][], totalsRow?: string[]): string {
  const thead = headers.map((h) => `<th>${esc(h)}</th>`).join('')
  const tbody = rows
    .map((r, i) => `<tr class="${i % 2 === 0 ? 'row-even' : 'row-odd'}">${r.map((c) => `<td>${c}</td>`).join('')}</tr>`)
    .join('')
  const tfoot = totalsRow
    ? `<tr class="row-total">${totalsRow.map((c) => `<td>${c}</td>`).join('')}</tr>`
    : ''
  return `<div class="table-wrap"><table><thead><tr>${thead}</tr></thead><tbody>${tbody}${tfoot}</tbody></table></div>`
}

// Bullet text is stored as "• item" lines (see lib/insightsText.ts); split it
// back into discrete items so the static export can render a real list.
function parseBullets(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.replace(/^[•\s]+/, '').trim())
    .filter(Boolean)
}

function bulletList(items: string[], mark: string, markColor: string): string {
  if (items.length === 0) {
    return '<p style="color:#9aa5b1;font-size:13px;margin:0">No notes added.</p>'
  }
  return `<ul class="pa-list">${items
    .map(
      (item) =>
        `<li><span class="pa-mark" style="color:${markColor}">${mark}</span><span>${esc(item)}</span></li>`
    )
    .join('')}</ul>`
}

function buildReportHtml(d: {
  clientName: string
  reportMonthLabel: string
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
  whatWorked: string
  areasForAttention: string
  actionPoints: string[]
}): string {
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

  const campaignRows = d.campaigns.map((c) => [
    esc(c.campaign_name),
    statusPill(c.status),
    fmtCAD(c.cost),
    fmtNum(c.clicks),
    fmtNum(c.impressions),
    fmtNum(c.conversions),
    pct(c.ctr),
    c.cpl ? fmtCAD(c.cpl, 2) : '—',
  ])
  const campaignTotals = [
    'TOTAL', '', fmtCAD(d.totals.totalSpend), fmtNum(d.totals.totalClicks),
    fmtNum(d.totals.totalImpressions), fmtNum(d.totals.totalConversions),
    pct(d.totals.ctr), d.totals.cplValue !== null ? fmtCAD(d.totals.cplValue, 2) : 'N/A',
  ]

  const adGroupRows = d.adGroups.map((ag) => [
    esc(ag.ad_group_name),
    esc(ag.campaign_name),
    statusPill(ag.status),
    fmtCAD(ag.cost),
    fmtNum(ag.clicks),
    fmtNum(ag.impressions),
    fmtNum(ag.conversions),
    pct(ag.ctr),
    ag.cpl ? fmtCAD(ag.cpl, 2) : '—',
  ])

  const keywordRows = d.keywords.map((k) => [
    esc(k.keyword),
    esc(k.match_type),
    esc(k.ad_group_name),
    String(k.quality_score ?? 0),
    fmtNum(k.clicks),
    fmtCAD(k.cost ?? 0, 2),
    pct(k.ctr),
    fmtCAD(k.avg_cpc ?? 0, 2),
    fmtNum(k.conversions),
  ])

  const deviceRows = d.devices.map((dv) => [
    esc(dv.device), fmtNum(dv.clicks), fmtNum(dv.impressions), fmtCAD(dv.cost ?? 0), fmtNum(dv.conversions),
  ])

  // Always show all 24 hours, even ones with no recorded activity.
  const hourlyByHour = new Map(d.hourly.map((h) => [h.hour, h]))
  const hourlyRows = Array.from({ length: 24 }, (_, hour) => {
    const h = hourlyByHour.get(hour)
    return [formatHour(hour), fmtNum(h?.clicks ?? 0), fmtNum(h?.conversions ?? 0)]
  })

  const dayRows = [...d.dayOfWeek]
    .sort((a, b) => {
      const ai = DAY_ORDER.findIndex((day) => a.day?.startsWith(day.slice(0, 3)))
      const bi = DAY_ORDER.findIndex((day) => b.day?.startsWith(day.slice(0, 3)))
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })
    .map((r) => [esc(r.day), fmtNum(r.clicks), fmtNum(r.conversions)])
  const weeklyRows = d.weekly.map((r) => [esc(r.week_label), fmtNum(r.clicks), fmtCAD(r.cost ?? 0), fmtNum(r.conversions)])
  const ageRows = d.ageGender
    .filter((r) => r.type?.toLowerCase() === 'age')
    .map((r) => [esc(r.segment), fmtNum(r.clicks), fmtNum(r.conversions)])
  const genderRows = d.ageGender
    .filter((r) => r.type?.toLowerCase() === 'gender')
    .map((r) => [esc(r.segment), fmtNum(r.clicks), fmtNum(r.conversions)])

  const whatWorkedItems = parseBullets(d.whatWorked)
  const areasForAttentionItems = parseBullets(d.areasForAttention)

  const actionPointsList = d.actionPoints.length
    ? d.actionPoints.map((p) => `<li>${esc(p)}</li>`).join('')
    : '<li style="color:#9aa5b1">No action points recorded.</li>'

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${esc(d.clientName)} — ${esc(d.reportMonthLabel)} Google Ads Report</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #F5F6F8; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 14px; line-height: 1.55; color: #1a1a1a; }
  .content { max-width: 1000px; margin: 0 auto; padding: 36px 24px 60px; }
  .header { background: #fff; border-bottom: 3px solid #1b5ea6; padding: 14px 48px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
  .header-left { display: flex; align-items: center; gap: 16px; }
  .header-left img { height: 36px; width: auto; display: block; }
  .divider { width: 1px; height: 32px; background: #d0ddef; }
  .client-name { color: #1b5ea6; font-weight: 700; font-size: 17px; }
  .pill { background: #f0f4fa; border: 1px solid #d0ddef; border-radius: 20px; padding: 3px 12px; font-size: 11px; color: #1b5ea6; }
  .pills { display: flex; gap: 8px; flex-wrap: wrap; }
  .summary { background: #194A6A; border-radius: 10px; padding: 24px 26px 20px; margin-top: 24px; }
  .summary h2 { color: #fff; font-weight: 700; font-size: 18px; margin: 0 0 20px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 12px; }
  .kpi-card { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); border-radius: 7px; padding: 14px 12px; }
  .kpi-label { color: #7fb3d3; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px; margin: 0; }
  .kpi-value { font-size: 22px; font-weight: 800; margin: 6px 0 0; line-height: 1; }
  .kpi-prev { color: #7fb3d3; font-size: 10px; margin: 6px 0 0; }
  .kpi-change { font-size: 11px; margin: 4px 0 0; font-weight: 600; }
  h2.section-title { color: #1b5ea6; font-size: 17px; font-weight: 700; border-bottom: 2px solid #dce6f5; padding-bottom: 8px; margin-top: 40px; margin-bottom: 16px; }
  .table-wrap { border: 1px solid #dce6f5; border-radius: 8px; overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #194A6A; color: #fff; text-transform: uppercase; font-size: 11px; letter-spacing: 0.3px; text-align: left; padding: 10px 14px; }
  td { padding: 9px 14px; border-bottom: 1px solid #eef2f8; font-size: 13px; }
  tbody tr:last-child td { border-bottom: none; }
  .row-even { background: #fff; }
  .row-odd { background: #f7faff; }
  tr.row-total td { background: #e8f0fb; font-weight: 700; border-top: 2px solid #194A6A; border-bottom: none; }
  .pill-status { display: inline-block; padding: 2px 9px; border-radius: 12px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
  .pa-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .pa-card { background: #fff; border: 1px solid #dce6f5; border-radius: 8px; padding: 16px 18px; }
  .pa-card h3 { margin: 0 0 12px; font-size: 14px; font-weight: 700; }
  ul.pa-list { list-style: none; margin: 0; padding: 0; }
  ul.pa-list li { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: #374151; padding: 5px 0; }
  .pa-mark { font-weight: 700; line-height: 1.55; }
  .card { background: #fff; border: 1px solid #dce6f5; border-radius: 8px; padding: 18px 20px; }
  ul.action-points { list-style: none; margin: 0; padding: 0; counter-reset: ap; }
  ul.action-points li { counter-increment: ap; position: relative; padding: 8px 0 8px 26px; border-bottom: 1px solid #dce6f5; font-size: 13px; }
  ul.action-points li:last-child { border-bottom: none; }
  ul.action-points li::before { content: counter(ap) "."; position: absolute; left: 0; color: #1b5ea6; font-weight: 700; }
  footer { background: #194A6A; border-radius: 10px; padding: 24px 48px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-top: 40px; }
  footer img { height: 28px; width: auto; display: block; filter: brightness(0) invert(1); }
  footer .f-center { text-align: center; flex: 1; min-width: 240px; }
  footer .f-main { color: #fff; font-size: 13px; font-weight: 600; margin: 0; }
  footer .f-note { color: #a0bcd4; font-size: 11px; margin: 4px 0 0; }
  footer .f-agency { color: #a0bcd4; font-size: 12px; font-weight: 600; margin: 0; text-align: right; }
  @media (max-width: 700px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } .pa-grid { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<div class="content">
  <div class="header">
    <div class="header-left">
      <img src="${MEDIAFORCE_LOGO_BASE64}" alt="Mediaforce" />
      <div class="divider"></div>
      <span class="client-name">${esc(d.clientName)}</span>
    </div>
    <div class="pills">
      <span class="pill">Google Ads</span>
      <span class="pill">${esc(d.reportMonthLabel)}</span>
      <span class="pill">Monthly Report</span>
    </div>
  </div>

  <section class="summary">
    <h2>Account Summary — ${esc(d.reportMonthLabel)}</h2>
    <div class="kpi-grid">${kpiCards}</div>
  </section>

  <h2 class="section-title">Campaign Performance</h2>
  ${dataTable(['Campaign', 'Status', 'Cost', 'Clicks', 'Impressions', 'Conv.', 'CTR', 'CPL'], campaignRows, campaignTotals)}

  <h2 class="section-title">Ad Group Performance</h2>
  ${dataTable(['Ad Group', 'Campaign', 'Status', 'Cost', 'Clicks', 'Impressions', 'Conv.', 'CTR', 'CPL'], adGroupRows)}

  <h2 class="section-title">Keywords Performance</h2>
  ${dataTable(['Keyword', 'Match Type', 'Ad Group', 'QS', 'Clicks', 'Cost', 'CTR', 'Avg CPC', 'Conv.'], keywordRows)}

  <h2 class="section-title">Device Performance</h2>
  ${dataTable(['Device', 'Clicks', 'Impressions', 'Cost', 'Conversions'], deviceRows)}

  <h2 class="section-title">Hourly Performance</h2>
  ${dataTable(['Hour', 'Clicks', 'Conversions'], hourlyRows)}

  <h2 class="section-title">Day of Week Performance</h2>
  ${dataTable(['Day', 'Clicks', 'Conversions'], dayRows)}

  <h2 class="section-title">Weekly Trend</h2>
  ${dataTable(['Week', 'Clicks', 'Cost', 'Conversions'], weeklyRows)}

  <h2 class="section-title">Age Breakdown</h2>
  ${dataTable(['Age Range', 'Clicks', 'Conversions'], ageRows)}

  <h2 class="section-title">Gender Breakdown</h2>
  ${dataTable(['Gender', 'Clicks', 'Conversions'], genderRows)}

  <h2 class="section-title">Performance Analysis</h2>
  <div class="pa-grid">
    <div class="pa-card">
      <h3 style="color:#1e7a3c">✅ What Worked</h3>
      ${bulletList(whatWorkedItems, '✓', '#1e7a3c')}
    </div>
    <div class="pa-card">
      <h3 style="color:#c5221f">⚠️ Areas for Attention</h3>
      ${bulletList(areasForAttentionItems, '⚠', '#c5221f')}
    </div>
  </div>

  <h2 class="section-title">Action Points &amp; Recommendations</h2>
  <div class="card">
    <ul class="action-points">${actionPointsList}</ul>
  </div>

  <footer>
    <img src="${MEDIAFORCE_LOGO_BASE64}" alt="Mediaforce" />
    <div class="f-center">
      <p class="f-main">Google Ads Performance Report · ${esc(d.clientName)} · ${esc(d.reportMonthLabel)}</p>
      <p class="f-note">This report is confidential and intended solely for the named recipient.</p>
    </div>
    <p class="f-agency">Mediaforce Digital Marketing Agency</p>
  </footer>
</div>
</body>
</html>`
}
