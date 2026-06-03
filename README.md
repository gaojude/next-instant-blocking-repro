# next-instant-blocking-repro

Under **`next dev`**, the `instant()` navigation-testing lock (`@next/playwright`) does not keep a
navigation blocked. Navigating to a **fallback route whose layout reads a
`generateStaticParams`-covered param with `await` outside `<Suspense>`** stays parked on the
prefetched shell for a few seconds, then **completes and commits the destination** under the lock.
A production build keeps it blocked — this is a dev-only bug.

`next@16.3.0-canary.39` (also reproduces on `canary.34`), `cacheComponents: true`, React 19.

## What instant() promises

Under the lock, a client navigation should commit only the prefetched **static shell**; the
destination's dynamic/deferred content must not render until the lock releases. That's what lets
you use `instant()` to assert a navigation is properly "instant".

## The bug

```
/en               generated route
/en/s1/billing    FALLBACK route ([scope] has no generateStaticParams)
                  layout: const { lang } = await params   // outside <Suspense>; `lang` IS generateStaticParams-covered
```

Navigate `/en` → `/en/s1/billing` under `instant()`:

```
expected:  stays blocked on the layout's <Suspense> shell      (url stays /en)
dev:       after ~5s the navigation COMPLETES — url → /en/s1/billing, dynamic data commits under the lock
prod:      stays blocked                                        (correct)
```

So in `next dev`, `instant()` can't be relied on to assert a navigation is blocked — even an
improperly-structured destination eventually "works".

## Why

For a fallback route every param — including ones whose values are statically known via
`generateStaticParams` — is deferred to request time. So `await params` in the layout (outside
`<Suspense>`) becomes a runtime read in the shell and bails (`NEXT_STATIC_GEN_BAILOUT`). In
`next dev` the shell is rendered on demand, and that bail lets the navigation complete under the
lock. Production prebuilds the fallback shell (`◐`), so the lock commits that and the nav stays
blocked.

The trigger is specifically the **known-param read outside `<Suspense>`**. A merely-blocking page
(genuinely dynamic I/O like `cookies()` outside `<Suspense>`) stays correctly blocked — remove the
layout's `await params` and the navigation no longer completes (it stays on `/en`).

## Run

```
pnpm install
pnpm exec playwright test                                # dev  → FAILS (nav completes)   ← the repro
pnpm exec playwright test -c playwright.prod.config.js   # prod → PASSES (stays blocked)
```

## Routes

```
app/layout.js                   root layout (html/body)
app/[lang]/layout.js            await params outside <Suspense> + top-level <Suspense> shell   (the trigger)
app/[lang]/page.js              /en — generated route
app/[lang]/[scope]/billing/...  /en/s1/billing — FALLBACK ([scope] has no generateStaticParams)
```

## v0 mapping

```
[variants]  generateStaticParams ✓        ≈  [lang]   (generated param, read in an ancestor layout)
[scope]     no generateStaticParams        ≈  [scope]  (fallback → makes the destination on-demand)
```
