// RSS 2.0 feed of the testimony wall. One item per approved sentence.

import { SITE_URL } from '@/app/lib/constants'
import { approvedTestimonies } from '@/app/features/community/lib/data'

export const dynamic = 'force-dynamic'

const FEED_TITLE = 'The Latent Liturgy — Testimonies'
const FEED_DESC = 'Whose face is it? Sentences left by visitors of The Latent Liturgy.'

function xml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  let items = ''
  try {
    const rows = await approvedTestimonies(100)
    items = rows
      .map(r => {
        const link = `${SITE_URL}/c/${r.id}`
        const who = r.name ? `${r.name} (${r.lang})` : `Anonymous (${r.lang})`
        return [
          '    <item>',
          `      <title>${xml(r.text)}</title>`,
          `      <link>${xml(link)}</link>`,
          `      <guid isPermaLink="true">${xml(link)}</guid>`,
          `      <pubDate>${new Date(r.ts).toUTCString()}</pubDate>`,
          `      <description>${xml(`${r.text} — ${who}`)}</description>`,
          '    </item>',
        ].join('\n')
      })
      .join('\n')
  } catch (e) {
    console.error('rss GET failed:', e)
  }

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${xml(FEED_TITLE)}</title>`,
    `    <link>${xml(SITE_URL)}</link>`,
    `    <description>${xml(FEED_DESC)}</description>`,
    '    <language>en</language>',
    `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
    `    <atom:link href="${xml(`${SITE_URL}/api/community/rss`)}" rel="self" type="application/rss+xml"/>`,
    items,
    '  </channel>',
    '</rss>',
  ].join('\n')

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
