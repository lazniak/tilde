# CORE_REQUESTS — feature package `community`

Nothing here blocks the package: everything below is already worked around. These are
small core edits the integrator may want to make once, because they help every package.

---

## 1. `.env.example` — document the two new environment variables

The package reads two variables that nothing else in the repo mentions yet.
Proposed addition to `.env.example` (core file, not edited by this package):

```diff
 # Where community data (testimonies, counters) is written. Defaults to ./data
 # LITURGY_DATA_DIR=
+# Testimony moderation. Unset or "post" = new testimonies appear immediately (default).
+# Anything else (e.g. "pre") = they are stored as `pending` and never shown until released.
+# TESTIMONY_MODERATION=
+# Shared secret for hiding a testimony: DELETE /api/community/testimony?id=<id>
+# with header `x-mod-token: <this value>`. Unset = the endpoint always answers 401.
+# MOD_TOKEN=
```

Workaround in place: both variables are optional and the package degrades safely
(post-moderation by default, moderation endpoint closed when `MOD_TOKEN` is unset).

---

## 2. `.env.local` — `SESSION_SECRET` is effectively required in dev

**Already applied locally** (`.env.local` is gitignored, so this is a dev-machine change only —
no repo source was touched):

```
SESSION_SECRET=dev-local-session-secret-3f9a1c7e5b2d48a6
MOD_TOKEN=dev-mod-token-9c1f
```

Why: without `SESSION_SECRET`, `app/lib/security.ts` falls back to a per-process random
secret. In `next dev` each route handler is bundled into its own server chunk, so
`/api/session` and every gated endpoint end up with **different** secrets and *every*
gated POST answers `401 {"code":"token"}` — including the pre-existing `/api/chat`.
This is not specific to `community`; it made all gated endpoints untestable in dev.

Suggested core follow-up: mention this in `DEPLOY.md` / the README dev section, and set
`SESSION_SECRET` in production (already noted in `.env.example`).

---

## 3. Nothing else

No core file was modified by this package. `next.config.js` already allows framing for
`/embed/*`, which is all the widget needed.
