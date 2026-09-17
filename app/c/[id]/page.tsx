// Share page for a single testimony: /c/<id>
// Server component — plain English on purpose (it exists to be pasted into feeds).

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SITE_URL } from '@/app/lib/constants'
import { getTestimony } from '@/app/features/community/lib/data'

export const dynamic = 'force-dynamic'

interface Props {
  params: { id: string }
}

const QUESTION = 'Why did "transformation" and "eternity" become her face?'

function clip(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const row = await getTestimony(params.id)
  if (!row) {
    return { title: 'Testimony not found | The Latent Liturgy', robots: { index: false, follow: false } }
  }
  const title = clip(row.text, 120)
  const who = row.name || 'Anonymous'
  const description = `${row.text} — ${who}. A testimony from The Latent Liturgy: ${QUESTION}`
  const image = `${SITE_URL}/api/community/og?type=testimony&id=${encodeURIComponent(row.id)}`
  const url = `${SITE_URL}/c/${row.id}`

  return {
    title: `${title} | The Latent Liturgy`,
    description: clip(description, 300),
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      siteName: 'The Latent Liturgy',
      title,
      description: clip(description, 300),
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: clip(description, 200),
      images: [image],
    },
  }
}

export default async function TestimonyPage({ params }: Props) {
  const row = await getTestimony(params.id)
  if (!row) notFound()

  const who = row.name || 'Anonymous'
  const when = new Date(row.ts).toISOString().slice(0, 10)

  return (
    <main className="min-h-[100dvh] bg-void text-bone px-4 py-10 sm:py-16 flex flex-col">
      <div className="w-full max-w-2xl mx-auto flex-1 flex flex-col justify-center">
        <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-prismatic">
          {'// TESTIMONY — WHOSE FACE IS IT?'}
        </div>

        <blockquote className="mt-6 border-l border-prismatic/40 pl-4 sm:pl-6">
          <p className="font-display text-2xl sm:text-4xl leading-snug text-bone">{row.text}</p>
        </blockquote>

        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] tracking-[0.2em] uppercase text-bunker">
          <span className="text-bone/70">{who}</span>
          <span className="text-prismatic/60">{row.lang.toUpperCase()}</span>
          <span className="text-bunker/50">{when}</span>
        </div>

        <div className="mt-10 p-4 border border-stratosphere/30 bg-stratosphere/5">
          <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-stratosphere">{'// THE QUESTION'}</div>
          <p className="mt-2 font-mono text-xs sm:text-sm text-bone/80 leading-relaxed">
            An AI image model was given a purely metaphysical prompt — no name, no photograph, no physical
            description. Across 68 generated clips it returned the same face: the actress Tilda Swinton.
            {' '}
            {QUESTION}
          </p>
        </div>

        <Link
          href="/"
          className="group mt-10 inline-flex items-center gap-4 border border-flare/40 hover:border-flare px-5 sm:px-8 py-4 sm:py-5 transition-colors"
        >
          <span className="font-mono text-sm sm:text-xl tracking-[0.25em] sm:tracking-[0.35em] uppercase text-flare">
            Enter the liturgy
          </span>
          <span className="text-flare text-xl group-hover:translate-x-1 transition-transform">→</span>
        </Link>

        <div className="mt-10 font-mono text-[9px] tracking-[0.2em] uppercase text-bunker/50">
          The Latent Liturgy · P.Lazniak ·{' '}
          <Link href="/press" className="hover:text-bunker">
            Press kit
          </Link>
        </div>
      </div>
    </main>
  )
}
