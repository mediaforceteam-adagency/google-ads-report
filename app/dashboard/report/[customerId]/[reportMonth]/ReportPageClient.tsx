'use client'

import { useState } from 'react'
import Link from 'next/link'
import MonthSelector from './MonthSelector'
import DownloadReportButton from './DownloadReportButton'
import GeneratePublicLinkButton from './GeneratePublicLinkButton'
import ReportBody, { type Kpi, type Campaign, type AdGroup, type InsightsSummary } from '@/components/report/ReportBody'
import type { InsightsBundle } from '@/components/report/InsightsPanel'
import type { KeywordRow } from '@/components/report/KeywordsTable'
import type { DeviceRow, HourlyRow, DayRow, WeeklyRow, AgeGenderRow } from '@/components/report/ReportCharts'

export default function ReportPageClient({
  customerId,
  reportMonth,
  availableMonths,
  clientId,
  dbMonth,
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
  summary,
}: {
  customerId: string
  reportMonth: string
  availableMonths: string[]
  clientId: string
  dbMonth: string
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
  summary: InsightsSummary
}) {
  const [insights, setInsights] = useState<InsightsBundle | null>(null)

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
          <MonthSelector customerId={customerId} currentMonth={reportMonth} availableMonths={availableMonths} />
          <GeneratePublicLinkButton customerId={customerId} reportMonth={reportMonth} />
          <DownloadReportButton
            clientName={clientName}
            reportMonthLabel={reportMonthLabel}
            dbMonth={dbMonth}
            kpis={kpis}
            totals={totals}
            campaigns={campaigns}
            adGroups={adGroups}
            keywords={keywords}
            devices={devices}
            hourly={hourly}
            dayOfWeek={dayOfWeek}
            weekly={weekly}
            ageGender={ageGender}
            insights={insights}
          />
        </div>
      </div>

      <ReportBody
        clientId={clientId}
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
        summary={summary}
        onInsightsGenerated={setInsights}
      />
    </div>
  )
}
