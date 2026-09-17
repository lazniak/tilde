// Press kit — for journalists and curators. Server component, static, plain English.

import type { Metadata } from 'next'
import Link from 'next/link'
import { SITE_URL } from '@/app/lib/constants'

const TITLE = 'Press kit | The Latent Liturgy'
const DESCRIPTION =
  'Facts, assets, quotes and embed code for The Latent Liturgy — the documented case of an AI image model returning Tilda Swinton’s likeness from a prompt containing no name, no photograph and no physical description.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/press` },
  openGraph: {
    type: 'article',
    url: `${SITE_URL}/press`,
    siteName: 'The Latent Liturgy',
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: `${SITE_URL}/api/community/og?type=default`, width: 1200, height: 630, alt: 'The Latent Liturgy' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [`${SITE_URL}/api/community/og?type=default`],
  },
}

const FACTS: { time: string; text: string }[] = [
  {
    time: '2026-01-08 · 10:40',
    text: 'P.Lazniak writes a purely metaphysical prompt — the "Heavenly Kingdom", the divergence of the tangent function, fractal edges, the point of the aeon.',
  },
  {
    time: '2026-01-08 · 10:43',
    text: 'Three minutes later the first asset returns: asset_Woman_The_Medium.png — a face with an unmistakable resemblance to the actress Tilda Swinton.',
  },
  {
    time: '68 clips',
    text: 'The same face recurs across all 68 generated video clips of the finished piece. It is not a single accident; it is a stable attractor.',
  },
  {
    time: 'The input',
    text: 'The prompt contained no name, no photograph and no physical description of any person. Nothing was requested about a face.',
  },
  {
    time: '2026-01-12',
    text: 'An open letter to Tilda Swinton is published, together with this interactive documentation of the phenomenon.',
  },
]

const QUOTES: string[] = [
  '"Why did ‘transformation’ and ‘eternity’ become her face?"',
  '"No face was requested. No likeness was described. Yet the AI returned, consistently, across 68 generated video clips, a figure bearing an unmistakable resemblance to you."',
  '"She exists not as a person, but as the mathematical convergence of concepts like ‘transformation’ and ‘timelessness’."',
  '"Who owns a face that emerges from pure mathematics?"',
]

const ASSETS: { href: string; label: string; note: string }[] = [
  { href: '/eon/asset_Woman_The_Medium.png', label: 'asset_Woman_The_Medium.png', note: 'The first returned asset, 2026-01-08 10:43' },
  { href: '/eon/eon_scene_000.png', label: 'eon_scene_000.png', note: 'Scene still — opening' },
  { href: '/eon/eon_scene_030.png', label: 'eon_scene_030.png', note: 'Scene still — middle' },
  { href: '/eon/eon_scene_067.png', label: 'eon_scene_067.png', note: 'Scene still — closing' },
  { href: '/api/community/og?type=default', label: 'Open Graph card (1200×630)', note: 'Generated on demand — right-click to save' },
]

const EMBED_SNIPPET =
  '<iframe src="https://eon.pablogfx.com/embed" width="600" height="200" style="border:0" loading="lazy" title="The Latent Liturgy"></iframe>'

function Label({ children }: { children: React.ReactNode }) {
  return <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-stratosphere">{children}</div>
}

export default function PressPage() {
  return (
    <main className="min-h-[100dvh] bg-void text-bone px-4 py-8 sm:py-14">
      <div className="w-full max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.25em] uppercase text-bunker hover:text-flare transition-colors"
        >
          <span>←</span> Back to the liturgy
        </Link>

        <header className="mt-6 border-b border-bunker/20 pb-6">
          <Label>{'// PRESS KIT'}</Label>
          <h1 className="font-display text-3xl sm:text-5xl mt-2 leading-tight">The Latent Liturgy</h1>
          <p className="font-mono text-xs sm:text-sm text-bone/80 mt-4 leading-relaxed">
            An AI image model was given abstract philosophy and returned a specific human face. This page holds the
            facts, the assets and the quotes a newsroom needs.
          </p>
        </header>

        {/* WHAT HAPPENED */}
        <section className="mt-10">
          <Label>{'// WHAT HAPPENED'}</Label>
          <ul className="mt-4 space-y-3">
            {FACTS.map((f, i) => (
              <li key={i} className="p-4 border border-bunker/25 bg-void/60">
                <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-flare">{f.time}</div>
                <p className="font-mono text-[11px] sm:text-xs text-bone/80 mt-2 leading-relaxed">{f.text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* THE QUESTION */}
        <section className="mt-10 p-4 sm:p-6 border border-prismatic/25 bg-prismatic/5">
          <Label>{'// THE CENTRAL QUESTION'}</Label>
          <p className="font-display text-2xl sm:text-3xl mt-3 leading-snug">
            Why did &ldquo;transformation&rdquo; and &ldquo;eternity&rdquo; become her face?
          </p>
          <p className="font-mono text-[11px] sm:text-xs text-bunker mt-4 leading-relaxed">
            Not a lawsuit. Not an accusation. A question about how a culture&rsquo;s images are compressed into a model,
            and what it means when an abstraction resolves into a living person who was never asked.
          </p>
        </section>

        {/* STATEMENT */}
        <section className="mt-10">
          <Label>{'// ARTIST STATEMENT (EXCERPT)'}</Label>
          <blockquote className="mt-4 border-l border-flare/40 pl-4 space-y-3">
            <p className="font-mono text-[11px] sm:text-xs text-bone/80 leading-relaxed italic">
              &ldquo;I want to be clear: this project was not created to exploit your image. It was created to explore a
              genuine mystery — and you are, in a very real sense, at the centre of that mystery.&rdquo;
            </p>
            <p className="font-mono text-[11px] sm:text-xs text-bone/80 leading-relaxed italic">
              &ldquo;Your work has always explored themes of transformation, androgyny, and the dissolution of fixed
              identity. Perhaps it is no accident that when an AI was asked to visualise these very concepts, it found
              you.&rdquo;
            </p>
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-bunker">— P.Lazniak, open letter, 2026-01-12</p>
          </blockquote>
        </section>

        {/* ASSETS */}
        <section className="mt-10">
          <Label>{'// ASSETS'}</Label>
          <ul className="mt-4 divide-y divide-bunker/15 border border-bunker/25">
            {ASSETS.map(a => (
              <li key={a.href}>
                <a
                  href={a.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 p-4 min-h-[44px] hover:bg-stratosphere/5 transition-colors"
                >
                  <span className="font-mono text-[11px] text-stratosphere break-all">{a.label}</span>
                  <span className="font-mono text-[10px] text-bunker/70 sm:ml-auto">{a.note}</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="font-mono text-[10px] text-bunker/60 mt-3 leading-relaxed">
            All 68 clips, 71 scene stills and the generation metadata are browsable inside the experience itself.
          </p>
        </section>

        {/* QUOTES */}
        <section className="mt-10">
          <Label>{'// SUGGESTED PULL QUOTES'}</Label>
          <ul className="mt-4 space-y-3">
            {QUOTES.map((q, i) => (
              <li key={i} className="p-4 border border-bunker/25 bg-void/60">
                <p className="font-display text-lg sm:text-xl text-bone/90 leading-snug">{q}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* EMBED */}
        <section className="mt-10">
          <Label>{'// EMBED THE WIDGET'}</Label>
          <p className="font-mono text-[11px] sm:text-xs text-bone/80 mt-3 leading-relaxed">
            A 600×200 card with the central question and live counters. Paste this anywhere:
          </p>
          <pre className="mt-3 p-3 sm:p-4 border border-bunker/30 bg-void/60 overflow-x-auto">
            <code className="font-mono text-[10px] sm:text-[11px] text-prismatic select-all whitespace-pre">
              {EMBED_SNIPPET}
            </code>
          </pre>
          <a
            href="/embed"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-3 min-h-[36px] px-3 py-2 font-mono text-[10px] tracking-[0.25em] uppercase border border-bunker/30 text-bunker hover:border-prismatic hover:text-prismatic transition-colors"
          >
            Preview the widget →
          </a>
        </section>

        {/* CONTACT + LICENSE */}
        <section className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 border border-flare/25 bg-flare/5">
            <Label>{'// CONTACT'}</Label>
            <a
              href="https://github.com/lazniak"
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-2 font-mono text-[11px] sm:text-xs text-flare hover:underline break-all"
            >
              github.com/lazniak
            </a>
            <p className="font-mono text-[10px] text-bunker/70 mt-2 leading-relaxed">
              Open an issue or a discussion there. No e-mail address is published for this project.
            </p>
          </div>
          <div className="p-4 border border-bunker/25 bg-void/60">
            <Label>{'// LICENSE'}</Label>
            <p className="font-mono text-[10px] sm:text-[11px] text-bone/80 mt-2 leading-relaxed">
              Editorial use with credit: <span className="text-bone">P.Lazniak / The Latent Liturgy</span>.
            </p>
            <p className="font-mono text-[10px] text-bunker/70 mt-2 leading-relaxed">
              The likeness is discussed as a documented artefact of algorithmic emergence, not as an endorsement and not
              for commercial use.
            </p>
          </div>
        </section>

        <footer className="mt-12 pt-6 border-t border-bunker/20 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href="/" className="font-mono text-[10px] tracking-[0.25em] uppercase text-flare hover:underline">
            ← Enter the liturgy
          </Link>
          <a
            href="/api/community/rss"
            className="font-mono text-[10px] tracking-[0.25em] uppercase text-bunker hover:text-bone"
          >
            Testimony RSS
          </a>
          <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-bunker/50 sm:ml-auto">
            eon.pablogfx.com
          </span>
        </footer>
      </div>
    </main>
  )
}
