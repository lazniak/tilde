'use client'

import React from 'react'

/**
 * A deliberately tiny markdown renderer — headings, paragraphs, blockquotes,
 * bullet lists, horizontal rules, bold/italic and bare links. No dependency,
 * no HTML passthrough (everything is escaped by React).
 */

function inline(text: string, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  const re = /(\*\*[^*]+\*\*)|(\*[^*]+\*)|(https?:\/\/[^\s)]+)/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[1]) {
      out.push(
        <strong key={`${keyPrefix}b${i++}`} className="text-bone font-medium">
          {m[1].slice(2, -2)}
        </strong>
      )
    } else if (m[2]) {
      out.push(
        <em key={`${keyPrefix}i${i++}`} className="italic text-bone/90">
          {m[2].slice(1, -1)}
        </em>
      )
    } else if (m[3]) {
      out.push(
        <a
          key={`${keyPrefix}a${i++}`}
          href={m[3]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-stratosphere underline decoration-stratosphere/40 underline-offset-2 break-all"
        >
          {m[3]}
        </a>
      )
    }
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function Markdown({ source, className = '' }: { source: string; className?: string }) {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const blocks: React.ReactNode[] = []
  let para: string[] = []
  let quote: string[] = []
  let list: string[] = []
  let k = 0

  const flushPara = () => {
    if (!para.length) return
    blocks.push(
      <p key={`p${k++}`} className="font-mono text-[11px] sm:text-xs text-bone/80 leading-relaxed">
        {inline(para.join(' '), `p${k}`)}
      </p>
    )
    para = []
  }
  const flushQuote = () => {
    if (!quote.length) return
    blocks.push(
      <blockquote key={`q${k++}`} className="border-l border-stratosphere/50 pl-3 py-1 bg-stratosphere/5">
        <span className="font-mono text-[11px] sm:text-xs text-bone/70 italic leading-relaxed">
          {inline(quote.join(' '), `q${k}`)}
        </span>
      </blockquote>
    )
    quote = []
  }
  const flushList = () => {
    if (!list.length) return
    blocks.push(
      <ul key={`u${k++}`} className="space-y-1.5">
        {list.map((item, idx) => (
          <li key={idx} className="flex gap-2 font-mono text-[11px] sm:text-xs text-bone/80 leading-relaxed">
            <span className="text-flare shrink-0" aria-hidden>
              ·
            </span>
            <span>{inline(item, `u${k}-${idx}`)}</span>
          </li>
        ))}
      </ul>
    )
    list = []
  }
  const flushAll = () => {
    flushPara()
    flushQuote()
    flushList()
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (!line.trim()) {
      flushAll()
      continue
    }
    if (/^---+$/.test(line.trim())) {
      flushAll()
      blocks.push(<hr key={`h${k++}`} className="border-t border-bunker/20" />)
      continue
    }
    const heading = line.match(/^(#{1,4})\s+(.*)$/)
    if (heading) {
      flushAll()
      const level = heading[1].length
      const size = level === 1 ? 'text-2xl sm:text-3xl' : level === 2 ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'
      blocks.push(
        <div key={`hd${k++}`} className={`font-display ${size} text-bone mt-2`}>
          {inline(heading[2], `hd${k}`)}
        </div>
      )
      continue
    }
    if (line.startsWith('>')) {
      flushPara()
      flushList()
      quote.push(line.replace(/^>\s?/, ''))
      continue
    }
    const bullet = line.match(/^\s*[-*]\s+(.*)$/)
    if (bullet) {
      flushPara()
      flushQuote()
      list.push(bullet[1])
      continue
    }
    flushQuote()
    flushList()
    para.push(line.trim())
  }
  flushAll()

  return <div className={`space-y-3 ${className}`}>{blocks}</div>
}
