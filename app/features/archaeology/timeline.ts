/**
 * Four days of creation — the curated event list behind the TIMELINE scrubber.
 *
 * Most timestamps are the real modification times of the artefacts that ship in
 * `public/eon/` (the pipeline wrote each stage file the moment it finished), so
 * the scrubber is a genuine forensic record rather than a decoration:
 *
 *   scribe_transcription.json          2026-01-08 10:40:24 +01:00
 *   stage1_analysis.txt                2026-01-08 10:41:54
 *   stage3_narrative.json              2026-01-08 10:42:54
 *   stage3_palette.json                2026-01-08 10:43:14
 *   asset_Woman_The_Medium.png         2026-01-08 10:43:36   ← the face
 *   stage5_assets.json                 2026-01-08 10:44:00
 *   stage6_montage.json                2026-01-08 10:46:34
 *   stage7_prompts.json                2026-01-08 10:48:10
 *   stage8_generation_status.txt       2026-01-08 11:35:20
 *   stage9_prompts_status.txt          2026-01-08 11:39:24
 *   eon_000.mp4                        2026-01-08 11:41:40
 *   eon_069.mp4                        2026-01-08 12:02:14
 *   scene_gen_general-video-prompt-EN  2026-01-11 21:52:58
 *
 * Two events have no artefact to date them — the moment the prompt was written
 * and the launch of this site — so they carry `approx: true` and render with "≈".
 *
 * Titles and descriptions live in i18n under `archaeology.timeline.events.<id>`.
 */

export interface TimelineEvent {
  /** i18n key suffix: archaeology.timeline.events.<id>.{title,text} */
  id: string
  /** ISO 8601 with the project's local offset. */
  iso: string
  /** Artefact this event produced, rendered as a mono caption. */
  file?: string
  /** True when the timestamp is reconstructed rather than read off a file. */
  approx?: boolean
}

export const TIMELINE_EVENTS: TimelineEvent[] = [
  { id: 'prompt', iso: '2026-01-08T10:40:00+01:00', file: 'geneza.txt', approx: true },
  { id: 'transcription', iso: '2026-01-08T10:40:24+01:00', file: 'scribe_transcription.json' },
  { id: 'analysis', iso: '2026-01-08T10:41:54+01:00', file: 'stage1_analysis.txt' },
  { id: 'narrative', iso: '2026-01-08T10:42:54+01:00', file: 'stage3_narrative.json' },
  { id: 'palette', iso: '2026-01-08T10:43:14+01:00', file: 'stage3_palette.json' },
  { id: 'face', iso: '2026-01-08T10:43:36+01:00', file: 'asset_Woman_The_Medium.png' },
  { id: 'assets', iso: '2026-01-08T10:44:00+01:00', file: 'stage5_assets.json' },
  { id: 'montage', iso: '2026-01-08T10:46:34+01:00', file: 'stage6_montage.json' },
  { id: 'prompts', iso: '2026-01-08T10:48:10+01:00', file: 'stage7_prompts.json' },
  { id: 'frames', iso: '2026-01-08T11:35:20+01:00', file: 'stage8_generation_status.txt' },
  { id: 'motion', iso: '2026-01-08T11:39:24+01:00', file: 'stage9_prompts_status.txt' },
  { id: 'kling', iso: '2026-01-08T12:02:14+01:00', file: 'eon_069.mp4' },
  { id: 'edit', iso: '2026-01-11T21:52:58+01:00', file: 'stage9_timeline.json' },
  { id: 'launch', iso: '2026-01-12T11:00:00+01:00', file: 'MESSAGE_TO_TILDA_SWINTON.md', approx: true },
]

export interface ResolvedEvent extends TimelineEvent {
  time: number
  /** 0…1 position along the scrubber. */
  pos: number
}

const SPAN_START = Date.parse(TIMELINE_EVENTS[0].iso)
const SPAN_END = Date.parse(TIMELINE_EVENTS[TIMELINE_EVENTS.length - 1].iso)

/**
 * The four days are wildly uneven — 82 minutes of generation on day one, then
 * three quiet days. A pure linear axis would collapse every interesting event
 * into one pixel, so the scrubber uses a square-root eased axis: day one keeps
 * about two thirds of the track, the tail still reads as a long wait.
 */
function ease(fraction: number): number {
  return Math.sqrt(Math.max(0, Math.min(1, fraction)))
}

export const RESOLVED_EVENTS: ResolvedEvent[] = TIMELINE_EVENTS.map(e => {
  const time = Date.parse(e.iso)
  return { ...e, time, pos: ease((time - SPAN_START) / (SPAN_END - SPAN_START)) }
})

export const TIMELINE_SPAN = { start: SPAN_START, end: SPAN_END }

/** Index of the event nearest to a 0…1 scrubber position. */
export function eventAt(pos: number): number {
  let best = 0
  let bestDist = Infinity
  for (let i = 0; i < RESOLVED_EVENTS.length; i++) {
    const d = Math.abs(RESOLVED_EVENTS[i].pos - pos)
    if (d < bestDist) {
      bestDist = d
      best = i
    }
  }
  return best
}

/** `08.01 10:43:36` — stable across locales, matches the house mono captions. */
export function formatStamp(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/.exec(iso)
  if (!m) return iso
  return `${m[3]}.${m[2]} ${m[4]}:${m[5]}:${m[6]}`
}
