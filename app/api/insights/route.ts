import { NextRequest, NextResponse } from 'next/server'
import { generateInsights, InsightsGenerationError, type InsightsRequestBody } from '@/lib/generateInsights'

export async function POST(request: NextRequest) {
  let body: InsightsRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  try {
    const insights = await generateInsights(body)
    return NextResponse.json(insights)
  } catch (error) {
    console.error('Failed to generate insights:', error)
    if (error instanceof InsightsGenerationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: 'Failed to generate insights.' }, { status: 502 })
  }
}
