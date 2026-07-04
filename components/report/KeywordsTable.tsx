export type KeywordRow = {
  keyword: string
  match_type: string
  ad_group_name: string
  quality_score: number | null
  landing_page_exp: string | null
  expected_ctr: string | null
  ad_relevance: string | null
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

export function qualityScoreClass(score: number | null) {
  if (score === null || score === undefined) return 'bg-gray-100 text-gray-400 ring-gray-200'
  if (score >= 7) return 'bg-green-50 text-green-700 ring-green-200'
  if (score >= 4) return 'bg-orange-50 text-orange-700 ring-orange-200'
  return 'bg-red-50 text-red-700 ring-red-200'
}

function QualityBadge({ score }: { score: number | null }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${qualityScoreClass(score)}`}>
      {score === null || score === undefined ? '—' : score}
    </span>
  )
}

const QUALITY_METRIC_CLASS: Record<string, string> = {
  ABOVE_AVERAGE: 'bg-[#e6f4ea] text-[#1e7a3c]',
  AVERAGE: 'bg-[#f1f3f4] text-[#5f6368]',
  BELOW_AVERAGE: 'bg-[#fce8e6] text-[#c5221f]',
}

const QUALITY_METRIC_LABEL: Record<string, string> = {
  ABOVE_AVERAGE: 'Above Avg',
  AVERAGE: 'Average',
  BELOW_AVERAGE: 'Below Avg',
}

function QualityMetricBadge({ value }: { value: string | null }) {
  const cls = (value && QUALITY_METRIC_CLASS[value]) || 'bg-[#f1f3f4] text-[#5f6368]'
  const label = (value && QUALITY_METRIC_LABEL[value]) || '--'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
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

export const TOP_KEYWORDS_COUNT = 10

export function topKeywordsBySpend(keywords: KeywordRow[]) {
  return [...keywords].sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0)).slice(0, TOP_KEYWORDS_COUNT)
}

export default function KeywordsTable({ keywords }: { keywords: KeywordRow[] }) {
  const top = topKeywordsBySpend(keywords)
  const hasSpend = top.some((k) => (k.cost ?? 0) > 0)

  if (!hasSpend) {
    return (
      <div
        style={{
          background: '#f8faff',
          border: '1px solid #dce6f5',
          borderRadius: 8,
          padding: '32px 24px',
          textAlign: 'center',
          color: '#6b7280',
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
          No Keyword Activity This Month
        </div>
        <div style={{ fontSize: 13, color: '#6b7280' }}>
          No keywords generated impressions or clicks in this reporting period.
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[#dce6f5]">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="bg-[#194A6A]">
            <th className="px-4 py-3 font-semibold text-white uppercase text-xs whitespace-nowrap">Keyword</th>
            <th className="px-4 py-3 font-semibold text-white uppercase text-xs whitespace-nowrap">Match Type</th>
            <th className="px-4 py-3 font-semibold text-white uppercase text-xs text-right whitespace-nowrap">Clicks</th>
            <th className="px-4 py-3 font-semibold text-white uppercase text-xs text-right whitespace-nowrap">Impr.</th>
            <th className="px-4 py-3 font-semibold text-white uppercase text-xs text-right whitespace-nowrap">CTR</th>
            <th className="px-4 py-3 font-semibold text-white uppercase text-xs text-right whitespace-nowrap">Spend</th>
            <th className="px-4 py-3 font-semibold text-white uppercase text-xs text-right whitespace-nowrap">Avg CPC</th>
            <th className="px-4 py-3 font-semibold text-white uppercase text-xs text-right whitespace-nowrap">Conv.</th>
            <th className="px-4 py-3 font-semibold text-white uppercase text-xs text-center whitespace-nowrap">QS</th>
            <th className="px-4 py-3 font-semibold text-white uppercase text-xs text-center whitespace-nowrap">Landing Page</th>
            <th className="px-4 py-3 font-semibold text-white uppercase text-xs text-center whitespace-nowrap">Exp. CTR</th>
            <th className="px-4 py-3 font-semibold text-white uppercase text-xs text-center whitespace-nowrap">Ad Relevance</th>
          </tr>
        </thead>
        <tbody>
          {top.map((k, i) => {
            const converted = (k.conversions ?? 0) > 0
            return (
              <tr
                key={i}
                className={`border-b border-[#dce6f5] last:border-0 hover:bg-[#eef4ff] transition-colors ${
                  i % 2 === 0 ? 'bg-white' : 'bg-[#f7faff]'
                }`}
              >
                <td className={`px-4 py-3 text-xs max-w-[220px] truncate ${converted ? 'font-bold text-gray-900' : 'font-mono text-gray-800'}`}>
                  {k.keyword}
                </td>
                <td className="px-4 py-3"><MatchBadge type={k.match_type} /></td>
                <td className="px-4 py-3 text-right text-gray-700">{(k?.clicks ?? 0).toLocaleString('en-US')}</td>
                <td className="px-4 py-3 text-right text-gray-700">{(k?.impressions ?? 0).toLocaleString('en-US')}</td>
                <td className="px-4 py-3 text-right text-gray-700">{(k?.ctr ?? 0).toFixed(2)}%</td>
                <td className="px-4 py-3 text-right font-medium text-gray-800">{fmtCAD(k?.cost ?? 0)}</td>
                <td className="px-4 py-3 text-right text-gray-700">{fmtCAD(k?.avg_cpc ?? 0)}</td>
                <td className={`px-4 py-3 text-right ${converted ? 'font-bold text-[#1e7a3c]' : 'text-gray-700'}`}>
                  {(k?.conversions ?? 0).toLocaleString('en-US')}
                </td>
                <td className="px-4 py-3 text-center"><QualityBadge score={k.quality_score} /></td>
                <td className="px-4 py-3 text-center"><QualityMetricBadge value={k.landing_page_exp} /></td>
                <td className="px-4 py-3 text-center"><QualityMetricBadge value={k.expected_ctr} /></td>
                <td className="px-4 py-3 text-center"><QualityMetricBadge value={k.ad_relevance} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
