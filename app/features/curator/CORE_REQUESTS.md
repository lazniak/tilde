# CORE_REQUESTS — feature package `curator`

One request. The package works fully without it; this only upgrades the look of the
streaming bubble in Panel III.

---

## REQUEST 1 — use `NoiseReveal` for the streaming Curator bubble

**File:** `app/components/screens/Exegesis.tsx`
**Why:** the Curator's answer currently appears as plain growing text. `NoiseReveal`
renders the growing edge as shimmering latent glyphs that condense into the real
characters — the same "the face emerged from noise" gesture the whole site is about.
It is a drop-in replacement for `{streaming}`; it respects `reducedMotion` (plain text),
renders RTL as-is, and costs one 45 ms interval plus two string slices per tick.

### Diff

```diff
--- a/app/components/screens/Exegesis.tsx
+++ b/app/components/screens/Exegesis.tsx
@@
 import { CuratorError, streamCurator, type ChatMessage } from '@/app/lib/curatorClient'
 import { AmbientBackground } from '../AmbientBackground'
 import { Slot } from '../Slot'
+import { NoiseReveal } from '@/app/features/curator'

 const MODEL_LABEL = 'google/gemini-flash-latest'
@@
                 {streaming ? (
                   <p className="font-mono text-[13px] sm:text-sm text-bone/90 whitespace-pre-wrap leading-relaxed">
-                    {streaming}
+                    <NoiseReveal text={streaming} done={false} />
                     <span className="inline-block w-2 h-3.5 bg-prismatic/70 align-middle ml-0.5 animate-pulse" />
                   </p>
                 ) : (
```

That is the whole change: one import, one line swapped.

### Note on `done`

`done={false}` is correct here, because this bubble is unmounted the moment the stream
finishes (the finished text is re-rendered by `<Bubble>`). If you ever keep the same
element mounted after the stream ends, pass `done={!isTyping}` instead — the remaining
noise then resolves to the end within ~120 ms rather than being cut off.

### Contract

```tsx
<NoiseReveal text={string} done={boolean} className?={string} />
```

- `text` — the text as it has arrived so far. May grow or reset to `''`.
- `done` — true once the stream is complete; the noisy tail then drains to the end.
- Exported from both `@/app/features/curator` (named) and
  `@/app/features/curator/NoiseReveal` (named + default).
- Registered in **no** slot — it is a component core opts into, not an injection.
