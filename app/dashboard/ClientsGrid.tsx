'use client'

import { useState } from 'react'
import Link from 'next/link'

type MonthlySummary = {
  report_month: string
  total_spend: number | null
  prev_spend: number | null
  total_clicks: number | null
  total_impressions: number | null
  total_conversions: number | null
  ctr: number | null
}

export type ClientWithSummary = {
  id: string
  client_name: string
  customer_id: string
  email: string
  status: string
  latestSummary: MonthlySummary | null
}

// ─── helpers ────────────────────────────────────────────────────────────────

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

function formatReportMonth(dateStr: string) {
  const [year, month] = dateStr.split('-').map(Number)
  return new Date(year, month - 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

function momChange(total: number, prev: number): number | null {
  if (!prev) return null
  return ((total - prev) / prev) * 100
}

// ─── sub-components ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const active = status?.toLowerCase() === 'active'
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        active
          ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
          : 'bg-gray-100 text-gray-500 ring-1 ring-gray-200'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-500' : 'bg-gray-400'}`}
      />
      {status ?? 'Unknown'}
    </span>
  )
}

function MomBadge({ change }: { change: number | null }) {
  if (change === null) return <span className="text-gray-400 text-xs">—</span>

  const up = change >= 0
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        up ? 'text-green-600' : 'text-red-500'
      }`}
    >
      {up ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
    </span>
  )
}

function ClientCard({ client }: { client: ClientWithSummary }) {
  const s = client.latestSummary
  const change = s ? momChange(s?.total_spend ?? 0, s?.prev_spend ?? 0) : null
  const reportPath = s
    ? `/dashboard/report/${encodeURIComponent(client.customer_id)}/${s.report_month}`
    : null

  return (
    <div className="bg-white rounded-xl border border-border-blue shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 flex flex-col">
      {/* Card header */}
      <div className="p-5 flex-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-navy leading-snug">{client.client_name}</h3>
          <StatusBadge status={client.status} />
        </div>
        <p className="text-xs text-gray-400 font-mono mb-4">
          ID: {client.customer_id}
        </p>

        <div className="border-t border-border-blue mb-4" />

        {s ? (
          <div className="space-y-2.5">
            {/* Report month */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Report month</span>
              <span className="text-xs font-medium text-gray-700">
                {formatReportMonth(s.report_month)}
              </span>
            </div>

            {/* Spend + MoM */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Total spend</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(s?.total_spend ?? 0)}
                </span>
                <MomBadge change={change} />
              </div>
            </div>

            {/* Clicks */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Clicks</span>
              <span className="text-xs font-medium text-gray-700">
                {(s?.total_clicks ?? 0).toLocaleString('en-US')}
              </span>
            </div>

            {/* CTR */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">CTR</span>
              <span className="text-xs font-medium text-gray-700">
                {(s?.ctr ?? 0).toFixed(2)}%
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">No report data yet</p>
        )}
      </div>

      {/* Card footer / CTA */}
      <div className="px-5 pb-5">
        {reportPath ? (
          <Link
            href={reportPath}
            className="block w-full text-center text-sm font-semibold text-white bg-navy hover:bg-navy-dark rounded-lg py-2 transition-colors"
          >
            View Report
          </Link>
        ) : (
          <button
            disabled
            className="block w-full text-center text-sm font-medium text-gray-400 bg-gray-100 rounded-lg py-2 cursor-not-allowed"
          >
            No Report Available
          </button>
        )}
      </div>
    </div>
  )
}

// ─── main export ─────────────────────────────────────────────────────────────

export default function ClientsGrid({ clients }: { clients: ClientWithSummary[] }) {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? clients.filter((c) =>
        c.client_name.toLowerCase().includes(query.toLowerCase())
      )
    : clients

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">Client Reports</h1>
        <p className="text-sm text-gray-500 mt-1">
          Select a client to view their Google Ads performance report
        </p>
      </div>

      {/* Search + count */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search clients…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm rounded-lg border border-border-blue bg-white text-gray-900 placeholder-gray-400 outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 w-64 transition"
          />
        </div>
        <span className="text-sm text-gray-400">
          {filtered.length} of {clients.length} clients
        </span>
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium">No clients found</p>
          <p className="text-sm mt-1">Try a different search term</p>
        </div>
      )}
    </div>
  )
}
