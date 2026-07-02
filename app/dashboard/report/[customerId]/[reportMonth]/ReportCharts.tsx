'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import SectionHeading from './SectionHeading'

export type DeviceRow = { device: string; clicks: number | null; impressions: number | null; cost: number | null; conversions: number | null }
export type HourlyRow = { hour: number; clicks: number; conversions: number }
export type DayRow = { day: string; clicks: number; conversions: number }
export type WeeklyRow = { week_label: string; clicks: number; cost: number; conversions: number }
export type AgeGenderRow = { type: string; segment: string; clicks: number; conversions: number }

const NAVY = '#1b5ea6'
const ORANGE = '#F5A623'
const TEAL = '#2e9e88'
const LIGHT_BLUE = '#6fa8dc'

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function fmtCAD(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n)
}

function formatHour(h: number) {
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

// ─── Section 6: Device ───────────────────────────────────────────────────────

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
              <Bar dataKey="clicks" fill={NAVY} radius={[4, 4, 0, 0]} />
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
      <div className="overflow-x-auto rounded-lg border border-[#dce6f5]">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-[#194A6A]">
              {['Device', 'Clicks', 'Impressions', 'Cost', 'Conversions'].map((h) => (
                <th key={h} className={`px-4 py-2.5 font-semibold text-white uppercase text-xs ${h !== 'Device' ? 'text-right' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((d, i) => (
              <tr key={d.device} className={`border-b border-[#dce6f5] last:border-0 hover:bg-[#eef4ff] transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-[#f7faff]'}`}>
                <td className="px-4 py-2.5 font-medium text-gray-800 capitalize">{d.device}</td>
                <td className="px-4 py-2.5 text-right text-gray-700">{(d?.clicks ?? 0).toLocaleString('en-US')}</td>
                <td className="px-4 py-2.5 text-right text-gray-700">{(d?.impressions ?? 0).toLocaleString('en-US')}</td>
                <td className="px-4 py-2.5 text-right font-medium text-gray-800">{fmtCAD(d?.cost ?? 0)}</td>
                <td className="px-4 py-2.5 text-right text-gray-700">{(d?.conversions ?? 0).toLocaleString('en-US')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ─── Section 7: Hourly ────────────────────────────────────────────────────────

function HourlyChart({ data }: { data: HourlyRow[] }) {
  const chartData = data.map((d) => ({ ...d, label: formatHour(d.hour) }))
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
          <Line type="monotone" dataKey="clicks" stroke={NAVY} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="conversions" stroke={ORANGE} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </section>
  )
}

// ─── Section 8: Day of Week ───────────────────────────────────────────────────

function DayOfWeekChart({ data }: { data: DayRow[] }) {
  const sorted = [...data].sort((a, b) => {
    const ai = DAY_ORDER.findIndex((d) => a.day?.startsWith(d.slice(0, 3)))
    const bi = DAY_ORDER.findIndex((d) => b.day?.startsWith(d.slice(0, 3)))
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })
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
          <Bar dataKey="clicks" fill={NAVY} radius={[4, 4, 0, 0]} />
          <Bar dataKey="conversions" fill={ORANGE} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </section>
  )
}

// ─── Section 9: Weekly Trend ──────────────────────────────────────────────────

function WeeklyChart({ data }: { data: WeeklyRow[] }) {
  return (
    <section className={CHART_SECTION_CLASS}>
      <SectionHeading>Weekly Trend</SectionHeading>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={NAVY} stopOpacity={0.15} />
              <stop offset="95%" stopColor={NAVY} stopOpacity={0} />
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
          <Area yAxisId="left" type="monotone" dataKey="cost" stroke={NAVY} strokeWidth={2} fill="url(#spendGrad)" />
          <Area yAxisId="right" type="monotone" dataKey="conversions" stroke={ORANGE} strokeWidth={2} fill="url(#convGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </section>
  )
}

// ─── Section 10: Age & Gender ─────────────────────────────────────────────────

function AgeGenderChart({ data }: { data: AgeGenderRow[] }) {
  const ageData = data.filter((d) => d.type?.toLowerCase() === 'age')
  const genderData = data.filter((d) => d.type?.toLowerCase() === 'gender')

  return (
    <section className={CHART_SECTION_CLASS}>
      <SectionHeading>Age &amp; Gender Breakdown</SectionHeading>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <ChartTitle>Age Groups</ChartTitle>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ageData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#d0ddef" />
              <XAxis dataKey="segment" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="clicks" fill={NAVY} radius={[4, 4, 0, 0]} />
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
    </section>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

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
