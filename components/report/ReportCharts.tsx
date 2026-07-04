'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from 'recharts'
import SectionHeading from './SectionHeading'

export type DeviceRow = { device: string; clicks: number | null; impressions: number | null; cost: number | null; conversions: number | null }
export type HourlyRow = { hour: number | string; clicks: number; conversions: number }
export type DayRow = { day: string; clicks: number; conversions: number }
export type WeeklyRow = { week_label: string; clicks: number; cost: number; conversions: number }
export type AgeGenderRow = { type: string; segment: string; clicks: number; conversions: number }
export type CampaignSpendRow = { campaign_name: string; cost: number | null }

const NAVY = '#194A6A'
const ACCENT_NAVY = '#1b5ea6'
const ORANGE = '#F5A623'
const TEAL = '#0d8a6e'
const LIGHT_BLUE = '#6fa8dc'

const DEVICE_COLORS: Record<string, string> = {
  desktop: '#194A6A',
  mobile: '#F5A623',
  tablet: '#0d8a6e',
}

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function fmtCAD(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n)
}

function fmtNum(n: number | null | undefined) {
  return (n ?? 0).toLocaleString('en-US')
}

function formatHour(hourValue: number | string) {
  const h = Number(hourValue)
  if (h === 0) return '12 AM'
  if (h < 12) return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

function ChartTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-wide text-[#194A6A] mb-3" style={{ letterSpacing: '0.5px' }}>
      {children}
    </p>
  )
}

const CHART_SECTION_CLASS = 'bg-white rounded-lg border border-[#dce6f5] p-[18px]'
const DATA_TABLE_WRAP_CLASS = 'overflow-x-auto rounded-lg border border-[#dce6f5] mt-6'
const DATA_TABLE_CLASS = 'w-full text-sm text-left'

function DataTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className={DATA_TABLE_WRAP_CLASS}>
      <table className={DATA_TABLE_CLASS}>
        <thead>
          <tr className="bg-[#194A6A]">
            {headers.map((h, i) => (
              <th key={h} className={`px-4 py-2.5 font-semibold text-white uppercase text-xs whitespace-nowrap ${i > 0 ? 'text-right' : ''}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

function dataRowClass(i: number) {
  return `border-b border-[#dce6f5] last:border-0 hover:bg-[#eef4ff] transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-[#f7faff]'}`
}

// ─── Section 5 (left): Current Month Spend by Campaign ────────────────────────

export function CampaignSpendChart({ data }: { data: CampaignSpendRow[] }) {
  const spending = data.filter((c) => (c.cost ?? 0) > 0).sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0))
  const total = spending.reduce((sum, c) => sum + (c.cost ?? 0), 0)
  const chartData = spending.map((c) => ({
    name: c.campaign_name,
    spend: c.cost ?? 0,
    pctLabel: total > 0 ? `${fmtCAD(c.cost ?? 0)} (${(((c.cost ?? 0) / total) * 100).toFixed(0)}%)` : fmtCAD(c.cost ?? 0),
  }))
  const height = Math.max(180, chartData.length * 42)

  return (
    <div>
      <ChartTitle>Current Month Spend by Campaign (CA$)</ChartTitle>
      {chartData.length === 0 ? (
        <p className="text-gray-400 text-sm italic">No campaign spend this month.</p>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d0ddef" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `CA$${((v ?? 0) / 1000).toFixed(0)}k`} />
            <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => (typeof v === 'number' ? fmtCAD(v) : String(v))} />
            <Bar dataKey="spend" fill={NAVY} radius={[0, 4, 4, 0]} barSize={20}>
              <LabelList dataKey="pctLabel" position="right" style={{ fontSize: 11, fill: '#194A6A', fontWeight: 600 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

// ─── Section 5 (right): Click Distribution by Device ───────────────────────────

export function DeviceDistributionChart({ data }: { data: DeviceRow[] }) {
  const total = data.reduce((sum, d) => sum + (d.clicks ?? 0), 0)
  const chartData = data.map((d) => ({
    device: d.device,
    clicks: d.clicks ?? 0,
    pct: total > 0 ? ((d.clicks ?? 0) / total) * 100 : 0,
  }))

  return (
    <div>
      <ChartTitle>Click Distribution by Device</ChartTitle>
      {chartData.length === 0 ? (
        <p className="text-gray-400 text-sm italic">No device data this month.</p>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <ResponsiveContainer width="100%" height={200} className="max-w-[200px]">
            <PieChart>
              <Pie data={chartData} dataKey="clicks" nameKey="device" innerRadius={45} outerRadius={80} paddingAngle={2}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={DEVICE_COLORS[d.device?.toLowerCase()] ?? ACCENT_NAVY} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => (typeof v === 'number' ? v.toLocaleString('en-US') : String(v))} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 w-full space-y-2.5">
            {chartData.map((d, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: DEVICE_COLORS[d.device?.toLowerCase()] ?? ACCENT_NAVY }} />
                <span className="capitalize text-gray-800 font-medium w-16">{d.device}</span>
                <span className="text-gray-600">{fmtNum(d.clicks)} clicks</span>
                <span className="ml-auto font-semibold text-gray-900">{d.pct.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Section 11: Device ────────────────────────────────────────────────────────

function DeviceChart({ data }: { data: DeviceRow[] }) {
  return (
    <section className={CHART_SECTION_CLASS}>
      <SectionHeading>Device Performance</SectionHeading>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div>
          <ChartTitle>Clicks by Device</ChartTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#d0ddef" />
              <XAxis dataKey="device" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => typeof v === 'number' ? v.toLocaleString('en-US') : String(v)} />
              <Bar dataKey="clicks" fill={ACCENT_NAVY} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div>
          <ChartTitle>Cost by Device</ChartTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#d0ddef" />
              <XAxis dataKey="device" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `CA$${((v ?? 0) / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => typeof v === 'number' ? fmtCAD(v) : String(v)} />
              <Bar dataKey="cost" fill={ORANGE} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <DataTable headers={['Device', 'Clicks', 'Impressions', 'Cost', 'Conversions']}>
        {data.map((d, i) => (
          <tr key={d.device} className={dataRowClass(i)}>
            <td className="px-4 py-2.5 font-medium text-gray-800 capitalize">{d.device}</td>
            <td className="px-4 py-2.5 text-right text-gray-700">{fmtNum(d.clicks)}</td>
            <td className="px-4 py-2.5 text-right text-gray-700">{fmtNum(d.impressions)}</td>
            <td className="px-4 py-2.5 text-right font-medium text-gray-800">{fmtCAD(d?.cost ?? 0)}</td>
            <td className="px-4 py-2.5 text-right text-gray-700">{fmtNum(d.conversions)}</td>
          </tr>
        ))}
      </DataTable>
    </section>
  )
}

// ─── Section 12: Hourly ────────────────────────────────────────────────────────

function HourlyChart({ data }: { data: HourlyRow[] }) {
  // `hour` comes back from Supabase as text, so sort numerically (not
  // lexicographically) and key the lookup map on the numeric value —
  // otherwise "0", "1", "10"... sorts/matches incorrectly.
  const sorted = [...data].sort((a, b) => Number(a.hour) - Number(b.hour))
  const chartData = sorted.map((d) => ({ ...d, label: formatHour(d.hour) }))
  const byHour = new Map(sorted.map((d) => [Number(d.hour), d]))

  return (
    <section className={CHART_SECTION_CLASS}>
      <SectionHeading>Hourly Performance</SectionHeading>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d0ddef" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={1} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="clicks" stroke={ACCENT_NAVY} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="conversions" stroke={ORANGE} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
      <DataTable headers={['Hour', 'Clicks', 'Conversions']}>
        {Array.from({ length: 24 }, (_, hour) => {
          const h = byHour.get(hour)
          return (
            <tr key={hour} className={dataRowClass(hour)}>
              <td className="px-4 py-2.5 font-medium text-gray-800">{formatHour(hour)}</td>
              <td className="px-4 py-2.5 text-right text-gray-700">{fmtNum(h?.clicks)}</td>
              <td className="px-4 py-2.5 text-right text-gray-700">{fmtNum(h?.conversions)}</td>
            </tr>
          )
        })}
      </DataTable>
    </section>
  )
}

// ─── Section 13: Day of Week ───────────────────────────────────────────────────

function sortByDayOfWeek<T extends { day: string }>(data: T[]) {
  return [...data].sort((a, b) => {
    const ai = DAY_ORDER.findIndex((d) => a.day?.startsWith(d.slice(0, 3)))
    const bi = DAY_ORDER.findIndex((d) => b.day?.startsWith(d.slice(0, 3)))
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })
}

function DayOfWeekChart({ data }: { data: DayRow[] }) {
  const sorted = sortByDayOfWeek(data)
  const chartData = sorted.map((d) => ({ ...d, label: d.day?.slice(0, 3) }))

  return (
    <section className={CHART_SECTION_CLASS}>
      <SectionHeading>Day of Week Performance</SectionHeading>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="#d0ddef" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="clicks" fill={ACCENT_NAVY} radius={[4, 4, 0, 0]} />
          <Bar dataKey="conversions" fill={ORANGE} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <DataTable headers={['Day', 'Clicks', 'Conversions']}>
        {sorted.map((d, i) => (
          <tr key={d.day} className={dataRowClass(i)}>
            <td className="px-4 py-2.5 font-medium text-gray-800">{d.day}</td>
            <td className="px-4 py-2.5 text-right text-gray-700">{fmtNum(d.clicks)}</td>
            <td className="px-4 py-2.5 text-right text-gray-700">{fmtNum(d.conversions)}</td>
          </tr>
        ))}
      </DataTable>
    </section>
  )
}

// ─── Section 14: Weekly Trend ──────────────────────────────────────────────────

function WeeklyChart({ data }: { data: WeeklyRow[] }) {
  return (
    <section className={CHART_SECTION_CLASS}>
      <SectionHeading>Weekly Trend</SectionHeading>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={ACCENT_NAVY} stopOpacity={0.15} />
              <stop offset="95%" stopColor={ACCENT_NAVY} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="convGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={ORANGE} stopOpacity={0.2} />
              <stop offset="95%" stopColor={ORANGE} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#d0ddef" />
          <XAxis dataKey="week_label" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v) => `CA$${((v ?? 0) / 1000).toFixed(0)}k`} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(v, name) =>
              typeof v === 'number'
                ? name === 'cost' ? fmtCAD(v) : v.toLocaleString('en-US')
                : String(v)
            }
          />
          <Legend />
          <Area yAxisId="left" type="monotone" dataKey="cost" stroke={ACCENT_NAVY} strokeWidth={2} fill="url(#spendGrad)" />
          <Area yAxisId="right" type="monotone" dataKey="conversions" stroke={ORANGE} strokeWidth={2} fill="url(#convGrad)" />
        </AreaChart>
      </ResponsiveContainer>
      <DataTable headers={['Week', 'Clicks', 'Cost', 'Conversions']}>
        {data.map((w, i) => (
          <tr key={w.week_label} className={dataRowClass(i)}>
            <td className="px-4 py-2.5 font-medium text-gray-800">{w.week_label}</td>
            <td className="px-4 py-2.5 text-right text-gray-700">{fmtNum(w.clicks)}</td>
            <td className="px-4 py-2.5 text-right font-medium text-gray-800">{fmtCAD(w?.cost ?? 0)}</td>
            <td className="px-4 py-2.5 text-right text-gray-700">{fmtNum(w.conversions)}</td>
          </tr>
        ))}
      </DataTable>
    </section>
  )
}

// ─── Section 15: Age & Gender ─────────────────────────────────────────────────

function AgeGenderChart({ data }: { data: AgeGenderRow[] }) {
  const ageData = data.filter((d) => d.type?.toLowerCase() === 'age')
  const genderData = data.filter((d) => d.type?.toLowerCase() === 'gender')

  return (
    <section className={CHART_SECTION_CLASS}>
      <SectionHeading>Age &amp; Gender Breakdown</SectionHeading>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div>
          <ChartTitle>Age Groups</ChartTitle>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ageData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#d0ddef" />
              <XAxis dataKey="segment" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="clicks" fill={ACCENT_NAVY} radius={[4, 4, 0, 0]} />
              <Bar dataKey="conversions" fill={LIGHT_BLUE} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div>
          <ChartTitle>Gender</ChartTitle>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={genderData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#d0ddef" />
              <XAxis dataKey="segment" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="clicks" fill={TEAL} radius={[4, 4, 0, 0]} />
              <Bar dataKey="conversions" fill={ORANGE} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DataTable headers={['Age Range', 'Clicks', 'Conversions']}>
          {ageData.map((a, i) => (
            <tr key={a.segment} className={dataRowClass(i)}>
              <td className="px-4 py-2.5 font-medium text-gray-800">{a.segment}</td>
              <td className="px-4 py-2.5 text-right text-gray-700">{fmtNum(a.clicks)}</td>
              <td className="px-4 py-2.5 text-right text-gray-700">{fmtNum(a.conversions)}</td>
            </tr>
          ))}
        </DataTable>
        <DataTable headers={['Gender', 'Clicks', 'Conversions']}>
          {genderData.map((g, i) => (
            <tr key={g.segment} className={dataRowClass(i)}>
              <td className="px-4 py-2.5 font-medium text-gray-800 capitalize">{g.segment}</td>
              <td className="px-4 py-2.5 text-right text-gray-700">{fmtNum(g.clicks)}</td>
              <td className="px-4 py-2.5 text-right text-gray-700">{fmtNum(g.conversions)}</td>
            </tr>
          ))}
        </DataTable>
      </div>
    </section>
  )
}

// ─── Main export (sections 11-15) ──────────────────────────────────────────────

export default function ReportCharts({
  devices,
  hourly,
  dayOfWeek,
  weekly,
  ageGender,
}: {
  devices: DeviceRow[]
  hourly: HourlyRow[]
  dayOfWeek: DayRow[]
  weekly: WeeklyRow[]
  ageGender: AgeGenderRow[]
}) {
  return (
    <>
      {devices.length > 0 && <DeviceChart data={devices} />}
      {hourly.length > 0 && <HourlyChart data={hourly} />}
      {dayOfWeek.length > 0 && <DayOfWeekChart data={dayOfWeek} />}
      {weekly.length > 0 && <WeeklyChart data={weekly} />}
      {ageGender.length > 0 && <AgeGenderChart data={ageGender} />}
    </>
  )
}
