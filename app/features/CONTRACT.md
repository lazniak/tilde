# Feature package contract — The Latent Liturgy

Repo: `D:\code\tilde` (Next.js 14 App Router, TypeScript strict, Tailwind, framer-motion). Dev server already running at `http://localhost:3355` with hot reload — **do not** start another one and **do not** run `next build` (it clobbers `.next/` for everyone). Verify with `npx tsc --noEmit` (must stay green) and `curl` against the running server.

## Read these first (do not modify)
- `app/features/registry.ts` — the slot contract you plug into.
- `app/lib/LiturgyContext.tsx` — `useLiturgy()`: screen, goToSection, audio state, stem volumes, consentGiven, narratorOn, isTouch, reducedMotion, bgImages.
- `app/lib/i18n/I18nProvider.tsx` + `config.ts` — `useI18n()` → `t`, `tOptional`, `tList`, `lang`, `rtl`; `RichText` for `<p>/<f>/<s>/<b>/<m>` markup.
- `app/lib/store.ts` — JSON-lines persistence (`appendRecord`, `readRecords`, `rewriteRecords`, `bumpCounter`, `readCounters`).
- `app/lib/llm.ts` — OpenRouter `complete()` / `streamCompletion()`; `LlmError`. Key may be **absent** in dev → endpoints must fail gracefully (5xx JSON `{error}`), UI must show a calm error, never crash.
- `app/lib/security.ts` — `gate(request)` (same-origin + session token), `cleanText`, `LIMITS`. `app/lib/rateLimit.ts` — `checkRateLimit(ip, {maxRequests, windowMs, dailyMax, identifier})`, `getClientIP`, `getRateLimitHeaders`.
- `app/lib/curatorClient.ts` — client side: `gatedFetch(url, init)` (adds token, retries on 401), `streamCurator(...)`.
- `app/lib/audioEngine.ts` — `getAudioEngine()`: `getAnalyser()`, `duck(level)`, `setStemVolume`, `getCurrentTime`, `getMode()`.
- `app/components/Narrator.tsx` — `narrator.play(lang, segment)`, `narrator.stop()`, `narrator.isPlaying()`; window events `liturgy:narrate-started` / `liturgy:narrate-ended`.
- `app/components/screens/*.tsx`, `app/components/Offering.tsx`, `app/components/StemMixer.tsx` — **the visual language**. Match it.
- `app/locales/en.json` — tone of voice.
- `app/lib/constants.ts` — VIDEO_CLIPS, VIDEO_PROMPTS, NARRATIVE_EXCERPT, PAUL_PROMPT, KEYWORDS, DRAMATURGY, STEMS, AVATAR_IMAGE, SITE_URL, SUPPORT_URL.

## Ownership (hard rule)
You may create/edit files **only** under:
- `app/features/<pkg>/**` (components, hooks, data, `i18n/en.json`, `i18n/pl.json`)
- `app/api/<pkg>/**` (route handlers)
- any extra page routes explicitly listed in your brief.

`app/features/<pkg>/index.tsx` must `export default` a `FeatureSlots` object. Everything else in the repo is off limits. If you truly need a core change, write the exact proposed diff into `app/features/<pkg>/CORE_REQUESTS.md` and design around its absence. Never run `git commit`/`git add`; the integrator commits.

## i18n
Every user-visible string goes through `t('<pkg>.some.key')`. Put keys (without the `<pkg>.` prefix — the loader nests the file under the package name) in `app/features/<pkg>/i18n/en.json` and a Polish translation in `i18n/pl.json`. Other 28 languages are generated later by a script — keep strings translation-friendly (no string concatenation, use `{var}` placeholders, arrays for lists). Anything sent to the LLM must ask it to answer in the visitor's language: `getLocale(lang).llm` from `app/lib/i18n/config.ts` gives the language name; validate `lang` against `LOCALE_CODES`.

## Style
- Palette classes: `bone`, `void`, `bunker`, `stratosphere`, `flare`, `prismatic` (text-/border-/bg- with `/NN` opacity). Backgrounds are `bg-void`/`bg-void/60`. 1px borders, **no rounded corners** (except tiny dots), no drop shadows except the existing flare glow, no new emoji.
- Labels: `font-mono text-[10px] tracking-[0.3em] uppercase` in an accent color; headings `font-display` (Cormorant). Body `font-mono text-xs/sm text-bone/80`.
- Blocks look like the existing ones: `p-4 border border-<accent>/30 bg-<accent>/5` or `bg-void/60`.
- **Mobile first**: must work at 375 px width, touch targets ≥ 36 px, no hover-only interactions (provide tap equivalents), no horizontal overflow. Use `100dvh`, respect `--nav-h` (fixed bottom nav) with `pb-[calc(var(--nav-h)+1rem)]` for full-screen overlays. Honour `useLiturgy().reducedMotion`.
- Animations: framer-motion, subtle, like the existing pulses/flickers.
- Keep the "liturgy" register: forensic, ritual, calm. Labels like `// FILE`, `⚡`, `◇ ◈ ◆` glyphs are the house style.

## Backend rules
- Any endpoint that calls the LLM or writes data: `const blocked = gate(request); if (blocked) return blocked;` then rate limit with a `dailyMax`, then `cleanText` all inputs with hard caps. `export const dynamic = 'force-dynamic'`.
- No new npm dependencies. (`next/og` `ImageResponse` is already available in Next 14.)
- Persist only through `app/lib/store.ts`. Never store IPs in plain text (hash with sha256 + a salt if you need dedupe).
- Never trust client-supplied roles/ids for privileged actions.

## Deliverable / report
When done: `npx tsc --noEmit` green, then report: files created, what each feature does in two lines, how to test it by hand (URL/steps), known limitations, and the contents of `CORE_REQUESTS.md` if any.
