# next-instant-blocking-repro

The `instant()` navigation-testing lock (`@next/playwright`) leaks dynamic data into the locked
static shell when a **root param is read with `await` outside `<Suspense>`** and the navigation
target is a **fallback route**.

`next@16.3.0-canary.39` (also reproduces on `canary.34`), `cacheComponents: true`, React 19.

## The problem

Two conditions, both required:

```
①  an ancestor layout reads a ROOT PARAM with `await` outside <Suspense>
      app/[lang]/layout.js  →  const currentLang = await lang()   // next/root-params
②  the navigation target is a FALLBACK route
      app/[lang]/[scope]/billing  →  [scope] has no generateStaticParams
```

Under `instant()`, navigating to such a route commits a full runtime render, so a cookie value
that is correctly sealed behind `<Suspense>` leaks into the static shell.

This is a Next.js bug, not an authoring mistake. A root param is statically known for any
prerendered route (it's the URL prefix, enumerated by `generateStaticParams`). The same
`await lang()` resolves statically on a generated route but bails on a fallback route — even
though the root param value is identical and known:

```
/en             (generated)  →  await lang() resolves   →  no bail
/en/s1/billing  (fallback)   →  await lang() bails      →  leak     (lang is still 'en')
```

A descendant's unknown param (`scope`) shouldn't defer the known root param (`lang`).

## Run

```
pnpm install
pnpm exec playwright test          # auto-starts `next dev` on :3340
```

The test navigates `/en` → `/en/s1/billing` inside `instant()` and asserts the sealed cookie
value is not in the locked shell. It is, so the test **fails** — that failure is the repro:

```
leaked under lock: "testCookie: super-secret"
```

By hand: open `/en`, devtools → Instant Nav → Start Capturing, click "Go to billing". Expected
only the `Loading…` skeleton; actual: the `testCookie` value leaks in.

## Routes

```
app/[lang]/layout.js            root layout — await lang() outside <Suspense>, generateStaticParams → ['en']
app/[lang]/page.js              /en — generated route
app/[lang]/[scope]/billing/...  /en/s1/billing — FALLBACK ([scope] has no generateStaticParams); cookie sealed in <Suspense>
```

## v0 mapping

```
[variants]  generateStaticParams ✓        ≈  [lang]   (generated root param)
[scope]     no generateStaticParams        ≈  [scope]  (fallback → condition ②)
```

Reproduces on `canary.34` and `.39`; on the unreleased `canary` HEAD it changes from leak to
bail/stall.
