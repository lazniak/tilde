import { NextResponse } from 'next/server'
import { readCounters } from '@/app/lib/store'

export const dynamic = 'force-dynamic'

export interface Tally {
  identify_total: number
  identify_recognised: number
  confessions_total: number
}

/**
 * Public, unauthenticated tally of the two public counters plus the confession count.
 * No gate: it reveals nothing private, costs nothing and is polled from the hub.
 */
export async function GET() {
  let counters: Record<string, number> = {}
  try {
    counters = await readCounters()
  } catch (error) {
    console.error('Tally API error:', error)
  }
  const tally: Tally = {
    identify_total: counters.identify_total ?? 0,
    identify_recognised: counters.identify_recognised ?? 0,
    confessions_total: counters.confessions_total ?? 0,
  }
  return NextResponse.json(tally, { headers: { 'Cache-Control': 'no-store' } })
}
