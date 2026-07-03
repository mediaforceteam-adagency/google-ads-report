import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic()

type Summary = {
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

type Campaign = { campaign_name: string; status: string; cost: number | null; clicks: number | null; conversions: number | null }
type Keyword = { keyword: string; match_type: string; cost: number | null; clicks: number | null; conversions: number | null; quality_score: number | null }
type Device = { device: string; clicks: number | null; cost: number | null; conversions: number | null }
type DayRow = { day: string; clicks: number | null; conversions: number | null }
type HourlyRow = { hour: number; clicks: number | null; conversions: number | null }
type AgeGenderRow = { type: string; segment: string; clicks: number | null; conversions: number | null }

type InsightsRequestBody = {
  clientName: string
  reportMonth: string
  summary: Summary
  campaigns: Campaign[]
  keywords: Keyword[]
  devices: Device[]
  dayOfWeek: DayRow[]
  hourly: HourlyRow[]
  ageGender: AgeGenderRow[]
}

type Insights = {
  whatWorked: string[]
  areasForAttention: string[]
  actionPoints: string[]
}

const INSIGHTS_SCHEMA = {
  type: 'object',
  properties: {
    whatWorked: { type: 'array', items: { type: 'string' } },
    areasForAttention: { type: 'array', items: { type: 'string' } },
    actionPoints: { type: 'array', items: { type: 'string' } },
  },
  required: ['whatWorked', 'areasForAttention', 'actionPoints'],
  additionalProperties: false,
} as const

function money(n: number | null | undefined) {
  return `CA$${(n ?? 0).toFixed(2)}`
}

function buildPrompt(data: InsightsRequestBody): string {
  const { clientName, reportMonth, summary, campaigns, keywords, devices, dayOfWeek, hourly, ageGender } = data

  const topCampaigns =
    campaigns
      .slice(0, 5)
      .map((c) => `- ${c.campaign_name}: ${money(c.cost)} spend, ${c.clicks ?? 0} clicks, ${c.conversions ?? 0} conv, status: ${c.status}`)
      .join('\n') || 'No campaign data.'

  const topKeywords =
    keywords
      .slice(0, 10)
      .map((k) => `- "${k.keyword}" [${k.match_type}]: ${money(k.cost)} spend, ${k.clicks ?? 0} clicks, ${k.conversions ?? 0} conv, QS: ${k.quality_score ?? 'N/A'}`)
      .join('\n') || 'No keyword data.'

  const deviceLines =
    devices.map((d) => `- ${d.device}: ${d.clicks ?? 0} clicks, ${money(d.cost)} spend, ${d.conversions ?? 0} conv`).join('\n') ||
    'No device data.'

  const bestDays =
    [...dayOfWeek]
      .sort((a, b) => (b.clicks ?? 0) - (a.clicks ?? 0))
      .slice(0, 3)
      .map((d) => `- ${d.day}: ${d.clicks ?? 0} clicks, ${d.conversions ?? 0} conv`)
      .join('\n') || 'No day-of-week data.'

  const bestHours =
    [...hourly]
      .sort((a, b) => (b.clicks ?? 0) - (a.clicks ?? 0))
      .slice(0, 3)
      .map((h) => `- Hour ${h.hour}: ${h.clicks ?? 0} clicks, ${h.conversions ?? 0} conv`)
      .join('\n') || 'No hourly data.'

  const ageGenderLines =
    ageGender.map((a) => `- ${a.type} ${a.segment}: ${a.clicks ?? 0} clicks, ${a.conversions ?? 0} conv`).join('\n') ||
    'No age/gender data.'

  const cpl = summary.cpl === 'N/A' ? 'N/A' : money(summary.cpl)

  return `You are a senior Google Ads strategist at Mediaforce digital marketing agency.
Analyze this Google Ads performance data for ${clientName} for ${reportMonth} and provide specific, data-driven insights.

ACCOUNT SUMMARY:
- Total Spend: ${money(summary.totalSpend)}
- Clicks: ${summary.totalClicks}
- Impressions: ${summary.totalImpressions}
- Conversions: ${summary.totalConversions}
- CTR: ${summary.ctr.toFixed(2)}%
- Avg CPC: ${money(summary.avgCpc)}
- CPL: ${cpl}
- vs Last Month — Spend: ${money(summary.prevSpend)}, Clicks: ${summary.prevClicks}, Conversions: ${summary.prevConversions}

TOP CAMPAIGNS (by spend):
${topCampaigns}

TOP KEYWORDS (by spend):
${topKeywords}

DEVICE BREAKDOWN:
${deviceLines}

BEST DAYS OF WEEK (by clicks):
${bestDays}

BEST HOURS (by clicks):
${bestHours}

AGE/GENDER:
${ageGenderLines}

Provide:
- whatWorked: 3-5 specific insights about what performed well this month, each citing real numbers from the data above.
- areasForAttention: 3-4 specific concerns, each with real numbers and a concrete recommendation.
- actionPoints: 3-5 specific, actionable next steps, each with a timeline and expected outcome.

Be specific, cite actual numbers from the data, and avoid generic advice.`
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured on the server.' }, { status: 500 })
  }

  let body: InsightsRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 2048,
      thinking: { type: 'adaptive' },
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: INSIGHTS_SCHEMA },
      },
      messages: [{ role: 'user', content: buildPrompt(body) }],
    })

    if (message.stop_reason === 'refusal') {
      return NextResponse.json({ error: 'Claude declined to generate insights for this data.' }, { status: 502 })
    }

    const textBlock = message.content.find((block) => block.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'Claude returned no text content.' }, { status: 502 })
    }

    const insights = JSON.parse(textBlock.text) as Insights
    return NextResponse.json(insights)
  } catch (error) {
    console.error('Failed to generate insights:', error)
    const message = error instanceof Anthropic.APIError ? error.message : 'Failed to generate insights.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
