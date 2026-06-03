# next-instant-blocking-repro

In **`next dev`**, the `instant()` navigation-testing lock (`@next/playwright`) leaks dynamic data
into the locked static shell when a **`generateStaticParams`-covered param is read with `await`
outside `<Suspense>`** and the navigation target is a **fallback route**. A production build does
**not** leak — this is a dev-only bug.

`next@16.3.0-canary.39` (also reproduces on `canary.34`), `cacheComponents: true`, React 19.

## The problem

Two conditions, both required:

```
①  an ancestor reads a param covered by generateStaticParams (so its value is KNOWN)
   with `await` outside <Suspense>
      app/[lang]/layout.js  →  const { lang } = await params      // [lang] is in generateStaticParams
②  the navigation target is a FALLBACK route
      app/[lang]/[scope]/billing  →  [scope] has no generateStaticParams
```

Navigating to such a route under `instant()` commits a full runtime render, so a cookie value that
is correctly sealed behind `<Suspense>` leaks into the static shell.

This is a Next.js bug, not an authoring mistake. The param value is statically known (it's the
generated URL prefix, enumerated by `generateStaticParams`). The same `await params` resolves
statically on a generated route but bails on a fallback route — even though the value is identical
and known:

```
/en             (generated)  →  await params resolves   →  no bail
/en/s1/billing  (fallback)   →  await params bails       →  leak (dev)   (lang is still 'en')
```

A fallback render defers *every* param — including ones whose values are known. The param you read
(`lang`) isn't even the unknown one; the deeper `[scope]` is. A deeper unknown param poisons a
known one.

## Dev only

```
next dev              →  leaks   (shell rendered on demand per request → bail → full render committed)
next build && start   →  sound   (the fallback shell is prebuilt as ◐; instant() commits the sealed shell)
```

## Run

```
pnpm install

# dev — the repro: the test FAILS (leak)
pnpm exec playwright test
#   leaked under lock: "testCookie: super-secret"  →  ✘

# prod — sound: the test PASSES (no leak)
pnpm exec playwright test -c playwright.prod.config.js
#   leaked under lock: ""                          →  ✓
```

By hand (dev): open `/en`, devtools → Instant Nav → Start Capturing, click "Go to billing".
Expected only the `Loading…` skeleton; actual: the `testCookie` value leaks in.

## Routes

```
app/layout.js                   root layout (html/body)
app/[lang]/layout.js            await params outside <Suspense>; [lang] in generateStaticParams → ['en']
app/[lang]/page.js              /en — generated route
app/[lang]/[scope]/billing/...  /en/s1/billing — FALLBACK ([scope] has no generateStaticParams); cookie sealed in <Suspense>
```

## v0 mapping

```
[variants]  generateStaticParams ✓        ≈  [lang]   (generated param, read in an ancestor)
[scope]     no generateStaticParams        ≈  [scope]  (fallback → condition ②)
```
