'use client'

import { useState } from 'react'

export type KeywordRow = {
  keyword: string
  match_type: string
  ad_group_name: string
  quality_score: number | null
  clicks: number | null
  impressions: number | null
  ctr: number | null
  cost: number | null
  avg_cpc: number | null
  conversions: number | null
}

function fmtCAD(n: number, decimals = 2) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}

function QualityBadge({ score }: { score: number | null }) {
  const s = score ?? 0
  const cls =
    s >= 7
      ? 'bg-green-50 text-green-700 ring-green-200'
      : s >= 4
      ? 'bg-yellow-50 text-yellow-700 ring-yellow-200'
      : 'bg-red-50 text-red-700 ring-red-200'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${cls}`}>
      {s}
    </span>
  )
}

function MatchBadge({ type }: { type: string }) {
  const t = type?.toLowerCase() ?? ''
  const cls =
    t === 'exact'
      ? 'bg-blue-50 text-blue-700 ring-blue-200'
      : t === 'phrase'
      ? 'bg-purple-50 text-purple-700 ring-purple-200'
      : 'bg-gray-100 text-gray-600 ring-gray-200'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1 capitalize ${cls}`}>
      {type}
    </span>
  )
}

const DEFAULT_SHOW = 50

export default function KeywordsTable({ keywords }: { keywords: KeywordRow[] }) {
  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)

  const filtered = query.trim()
    ? keywords.filter(
        (k) =>
          k.keyword?.toLowerCase().includes(query.toLowerCase()) ||
          k.ad_group_name?.toLowerCase().includes(query.toLowerCase()) ||
          k.match_type?.toLowerCase().includes(query.toLowerCase())
      )
    : keywords

  const displayed = showAll ? filtered : filtered.slice(0, DEFAULT_SHOW)
  const hasMore = filtered.length > DEFAULT_SHOW

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search keywords…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowAll(false) }}
            className="pl-9 pr-4 py-2 text-sm rounded-lg border border-[#dce6f5] bg-white text-gray-900 placeholder-gray-400 outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 w-64 transition"
          />
        </div>
        <span className="text-sm text-gray-400">
          Showing {displayed.length} of {filtered.length} keywords
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#dce6f5]">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-[#194A6A]">
              <th className="px-4 py-3 font-semibold text-white uppercase text-xs whitespace-nowrap">Keyword</th>
              <th className="px-4 py-3 font-semibold text-white uppercase text-xs whitespace-nowrap">Match Type</th>
              <th className="px-4 py-3 font-semibold text-white uppercase text-xs whitespace-nowrap">Ad Group</th>
              <th className="px-4 py-3 font-semibold text-white uppercase text-xs text-center whitespace-nowrap">QS</th>
              <th className="px-4 py-3 font-semibold text-white uppercase text-xs text-right whitespace-nowrap">Clicks</th>
              <th className="px-4 py-3 font-semibold text-white uppercase text-xs text-right whitespace-nowrap">Cost</th>
              <th className="px-4 py-3 font-semibold text-white uppercase text-xs text-right whitespace-nowrap">CTR</th>
              <th className="px-4 py-3 font-semibold text-white uppercase text-xs text-right whitespace-nowrap">Avg CPC</th>
              <th className="px-4 py-3 font-semibold text-white uppercase text-xs text-right whitespace-nowrap">Conv.</th>
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                  No keywords found
                </td>
              </tr>
            ) : (
              displayed.map((k, i) => (
                <tr
                  key={i}
                  className={`border-b border-[#dce6f5] last:border-0 hover:bg-[#eef4ff] transition-colors ${
                    i % 2 === 0 ? 'bg-white' : 'bg-[#f7faff]'
                  }`}
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-800 max-w-[200px] truncate">{k.keyword}</td>
                  <td className="px-4 py-3"><MatchBadge type={k.match_type} /></td>
                  <td className="px-4 py-3 text-gray-600 text-xs max-w-[160px] truncate">{k.ad_group_name}</td>
                  <td className="px-4 py-3 text-center"><QualityBadge score={k.quality_score} /></td>
                  <td className="px-4 py-3 text-right text-gray-700">{(k?.clicks ?? 0).toLocaleString('en-US')}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">{fmtCAD(k?.cost ?? 0)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{(k?.ctr ?? 0).toFixed(2)}%</td>
                  <td className="px-4 py-3 text-right text-gray-700">{fmtCAD(k?.avg_cpc ?? 0)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{(k?.conversions ?? 0).toLocaleString('en-US')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowAll((v) => !v)}
            className="text-sm font-medium text-navy hover:text-navy-dark underline transition"
          >
            {showAll ? 'Show fewer' : `Show all ${filtered.length} keywords`}
          </button>
        </div>
      )}
    </div>
  )
}
