# The Latent Liturgy

An interactive digital triptych exploring the anomaly of algorithmic creation — where an AI generated a recognizable face without being asked, and we question why.

Live: https://eon.pablogfx.com

## About

In January 2026 the artist P.Lazniak gave Google's image/video pipeline (Gemini + Nano Banana Pro, clips via Kling) a purely metaphysical prompt about the "Heavenly Kingdom", the tangent function and fractal edges — no names, no photographs, no physical descriptions. Across 68 generated clips the same face emerged: unmistakably Tilda Swinton's. The site documents the evidence, lets visitors confront the model itself, and asks who owns a face that emerges from mathematics.

## The triptych

| Panel | What it is |
|---|---|
| **I. Genesis** | The original prompt with interactive keywords (translated per language, English original on demand), the project files, all 11 generated assets, an LLM-computed **attention heatmap** of which phrases pulled the face, and the **four-days-of-creation timeline**. |
| **II. Incarnation** | 68 clips with a prompt overlay, a **consent gate** (the face stays blurred until the visitor acknowledges it was never requested), **ASK GEMINI: WHO IS THIS?** (live identification through OpenRouter, public tally), the **emergence slider** (noise → face) and the **latent map** constellation of all clips. |
| **III. Exegesis** | Streaming chat with the *Latent Space Curator* (Google Gemini Flash via OpenRouter) that answers in the visitor's language, **confess your prompt** (what face would *your* abstract prompt converge on?), and a hold-to-speak **voice ritual**. |

Around it: a 9-stem soundtrack that builds as you explore (touch mixer with votive candles, tilt control on phones, audio-reactive shader background), the **narrator** — the artist's cloned voice guiding each panel with karaoke subtitles — an auto **tour**, a **kiosk mode** with QR hand-off for exhibitions, a **testimony wall**, **co-signing of the open letter to Tilda Swinton**, dynamic OG cards, an embeddable widget, RSS and a press kit (`/press`).

## Languages

30 locales (`app/lib/i18n/config.ts`). English and Polish dictionaries are hand-written; the rest are machine-translated with `scripts/translate.mjs`. The Curator answers in the visitor's language. Narrator tracks are generated per language by `scripts/voiceover.mjs` (ElevenLabs v3, the artist's voice).

## Tech stack

- **Next.js 14** (App Router, TypeScript strict), **Tailwind**, **framer-motion**
- **Web Audio API** — decoded buffers on desktop, streamed `<audio>` elements routed through the graph on phones (`app/lib/audioEngine.ts`)
- **OpenRouter** (`~google/gemini-flash-latest`) for chat (SSE streaming), identification, confessions, heatmaps, translations
- **ElevenLabs v3** for the narrator
- JSON-lines store in `data/` for community features (no database)

## Getting started

```bash
npm install
cp .env.example .env.local        # add OPENROUTER_API_KEY
# put the master media in public/eon (see below), then derive web versions:
bash scripts/media.sh
npm run dev                        # http://localhost:3355
```

`npm run build && npm start` for production; `npm run typecheck` for `tsc --noEmit`. Deployment (nginx, systemd, env) is described in `DEPLOY.md`.

## Media

`public/eon` (not in git) holds the masters: `eon_*.mp4` (68 clips), `eon_scene_*.png`, `asset_*.png` (11), `STEAMS-music/*.wav` (9 stems), `stage*.json`. `scripts/media.sh` derives `audio/` (AAC), `thumbs/` (320 px webp), `web/` (1280 px webp) and `mobile/` (720p clips). Narrator tracks live in `public/voice/<lang>/` and are committed.

## Project layout

```
app/
  components/        core screens (Landing, Hub, Genesis, Incarnation, Exegesis), nav, narrator, mixer
  features/          feature packages plugged in through app/features/registry.ts slots
    curator/         noise-reveal streaming, confess-your-prompt, voice ritual, attractor tally
    guide/           auto-tour, tilt mixer, audio-reactive shader
    community/       testimonies, co-signatures, OG cards, share pages, press kit, embed, RSS
    archaeology/     latent map, emergence slider, attention heatmap, timeline, kiosk mode
  api/               route handlers (chat, identify, session, + one folder per feature)
  lib/               audio engine, i18n, LLM client, security gate, rate limiting, store
  locales/           UI dictionaries (en, pl hand-written; others generated)
scripts/             media.sh, translate.mjs, voiceover.mjs
```

## Security

LLM endpoints are same-origin only, require a short-lived HMAC session token, cap message/history sizes, and are rate-limited per IP with daily ceilings. Image identification accepts only an allow-listed asset key. CSP, HSTS and the other headers are set in `next.config.js`. See `DEPLOY.md` for the nginx side (forwarded IP headers).

## Color palette

| Name | Hex | Usage |
|------|-----|-------|
| Bone White | `#F2F0E4` | Primary text |
| Void Black | `#050505` | Background |
| Bunker Concrete | `#8C929D` | Secondary |
| Stratosphere Blue | `#1C3F94` | Genesis / interactive |
| Solar Flare Amber | `#D96C2C` | Incarnation / glitch |
| Prismatic Cyan | `#E0FFFF` | Exegesis / light |

## Credits

- **Concept, prompt, voice**: Paweł Łaźniak (P.Lazniak)
- **Visual generation**: scene_gen (github.com/lazniak/scene_gen)
- **Audio**: original composition, AI-assisted stems
- Support the project: https://buymeacoffee.com/eyb8tkx3to

## License

An art project exploring AI ethics and image generation. The likeness depicted is discussed in the context of algorithmic emergence, not commercial use.

---

*"She exists not as a person, but as the mathematical convergence of concepts like 'transformation' and 'timelessness'."* — The Latent Space Curator
