import { supabase } from '@/lib/supabase'
import ClientsGrid, { type ClientWithSummary } from './ClientsGrid'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Client = {
  id: string
  client_name: string
  customer_id: string
  email: string
  status: string
  created_at: string
}

type CampaignAgg = {
  client_id: string
  report_month: string
  cost: number | null
  clicks: number | null
  impressions: number | null
  conversions: number | null
}

type PrevSummary = {
  client_id: string
  report_month: string
  prev_spend: number | null
}

export default async function DashboardPage() {
  // Parallel fetch — clients alphabetically, campaigns + monthly_summary latest-first
  const [
    { data: clients, error: clientsError },
    { data: campaigns, error: campaignsError },
    { data: prevSummaries, error: summariesError },
  ] = await Promise.all([
    supabase.from('clients').select('*').order('client_name'),
    supabase
      .from('campaigns')
      .select('client_id, report_month, cost, clicks, impressions, conversions')
      .order('report_month', { ascending: false }),
    supabase.from('monthly_summary').select('client_id, report_month, prev_spend').order('report_month', { ascending: false }),
  ])

  if (clientsError || campaignsError || summariesError) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 font-medium">Failed to load clients.</p>
        <p className="text-sm text-gray-400 mt-1">
          {clientsError?.message ?? campaignsError?.message ?? summariesError?.message}
        </p>
      </div>
    )
  }

  // Real metrics are calculated from campaigns (monthly_summary.total_* can be stale/wrong).
  // Find each client's latest report_month, then sum cost/clicks/impressions/conversions for it.
  const latestMonthByClient = new Map<string, string>()
  for (const c of (campaigns as CampaignAgg[]) ?? []) {
    if (!latestMonthByClient.has(c.client_id)) {
      latestMonthByClient.set(c.client_id, c.report_month)
    }
  }

  type Totals = { spend: number; clicks: number; impressions: number; conversions: number }
  const totalsByClient = new Map<string, Totals>()
  for (const c of (campaigns as CampaignAgg[]) ?? []) {
    if (c.report_month !== latestMonthByClient.get(c.client_id)) continue
    const totals = totalsByClient.get(c.client_id) ?? { spend: 0, clicks: 0, impressions: 0, conversions: 0 }
    totals.spend += c.cost ?? 0
    totals.clicks += c.clicks ?? 0
    totals.impressions += c.impressions ?? 0
    totals.conversions += c.conversions ?? 0
    totalsByClient.set(c.client_id, totals)
  }

  // MoM comparison still comes from monthly_summary's prev_spend, matched to the same latest month.
  const prevSpendMap = new Map<string, number | null>()
  for (const row of (prevSummaries as PrevSummary[]) ?? []) {
    const key = `${row.client_id}|${row.report_month}`
    if (!prevSpendMap.has(key)) prevSpendMap.set(key, row.prev_spend)
  }

  const clientsWithSummaries: ClientWithSummary[] = ((clients as Client[]) ?? []).map((c) => {
    const latestMonth = latestMonthByClient.get(c.id)
    if (!latestMonth) return { ...c, latestSummary: null }

    const totals = totalsByClient.get(c.id) ?? { spend: 0, clicks: 0, impressions: 0, conversions: 0 }
    const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0

    return {
      ...c,
      latestSummary: {
        report_month: latestMonth,
        total_spend: totals.spend,
        prev_spend: prevSpendMap.get(`${c.id}|${latestMonth}`) ?? null,
        total_clicks: totals.clicks,
        total_impressions: totals.impressions,
        total_conversions: totals.conversions,
        ctr,
      },
    }
  })

  return <ClientsGrid clients={clientsWithSummaries} />
}
