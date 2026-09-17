import { NextRequest, NextResponse } from 'next/server'
import { issueToken, isSameOrigin } from '@/app/lib/security'

export const dynamic = 'force-dynamic'

/** Hands out a short-lived token required by the LLM endpoints. */
export async function GET(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  return NextResponse.json({ token: issueToken() }, { headers: { 'Cache-Control': 'no-store' } })
}
