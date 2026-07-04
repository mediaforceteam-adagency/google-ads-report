import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export type Summary = {
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

export type Campaign = { campaign_name: string; status: string; cost: number | null; clicks: number | null; conversions: number | null }
export type Keyword = { keyword: string; match_type: string; cost: number | null; clicks: number | null; conversions: number | null; quality_score: number | null }
export type Device = { device: string; clicks: number | null; cost: number | null; conversions: number | null }
export type DayRow = { day: string; clicks: number | null; conversions: number | null }
export type HourlyRow = { hour: number | string; clicks: number | null; conversions: number | null }
export type AgeGenderRow = { type: string; segment: string; clicks: number | null; conversions: number | null }

export type InsightsRequestBody = {
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

export type Insights = {
  whatWorked: string[]
  areasForAttention: string[]
  actionPoints: string[]
  accountSummary: string
  campaignInsight: string
  campaignAnalysis: string
  keywordAnalysis: string
}

export class InsightsGenerationError extends Error {
  status: number
  constructor(message: string, status = 502) {
    super(message)
    this.name = 'InsightsGenerationError'
    this.status = status
  }
}

const INSIGHTS_SCHEMA = {
  type: 'object',
  properties: {
    whatWorked: { type: 'array', items: { type: 'string' } },
    areasForAttention: { type: 'array', items: { type: 'string' } },
    actionPoints: { type: 'array', items: { type: 'string' } },
    accountSummary: { type: 'string' },
    campaignInsight: { type: 'string' },
    campaignAnalysis: { type: 'string' },
    keywordAnalysis: { type: 'string' },
  },
  required: [
    'whatWorked',
    'areasForAttention',
    'actionPoints',
    'accountSummary',
    'campaignInsight',
    'campaignAnalysis',
    'keywordAnalysis',
  ],
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
- accountSummary: 2-3 sentences summarizing overall account performance this month vs last month, citing specific spend/click/conversion numbers and the direction of change.
- campaignInsight: exactly 1 sentence flagging the single most important campaign-level observation or warning this month, citing specific numbers (e.g. a device or campaign driving disproportionate spend or conversions).
- campaignAnalysis: 2-3 sentences analyzing campaign performance, naming the top-spending campaign and any campaigns that are a concern (e.g. high spend with no conversions, paused despite budget).
- keywordAnalysis: 2-3 sentences about keyword performance, naming the top-converting keyword and the keyword with the most wasted spend (spend with zero conversions), if any.

Be specific, cite actual numbers from the data, and avoid generic advice.`
}

export async function generateInsights(body: InsightsRequestBody): Promise<Insights> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new InsightsGenerationError('ANTHROPIC_API_KEY is not configured on the server.', 500)
  }

  let message
  try {
    message = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 2048,
      thinking: { type: 'adaptive' },
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: INSIGHTS_SCHEMA },
      },
      messages: [{ role: 'user', content: buildPrompt(body) }],
    })
  } catch (error) {
    const msg = error instanceof Anthropic.APIError ? error.message : 'Failed to generate insights.'
    throw new InsightsGenerationError(msg, 502)
  }

  if (message.stop_reason === 'refusal') {
    throw new InsightsGenerationError('Claude declined to generate insights for this data.', 502)
  }

  const textBlock = message.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new InsightsGenerationError('Claude returned no text content.', 502)
  }

  return JSON.parse(textBlock.text) as Insights
}
