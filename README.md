# next-instant-blocking-repro

Minimal repro: the Next.js **`instant()`** navigation-testing lock (from `@next/playwright`)
**leaks dynamic data into the committed shell** when an **SSG bailout** happens at a **root
param read** in a route that has a **fallback descendant segment**.

Stack: `next@16.3.0-canary.34` (the version v0 ships), `cacheComponents: true` (PPR), React 19,
`@next/playwright`.

## TL;DR

```
root param [lang]  (generateStaticParams → ['en'])
  └─ read with `await lang()` OUTSIDE <Suspense> in the root layout
     + a descendant segment [scope] with NO generateStaticParams (fallback / on-demand)
        + navigate A → B under instant() in `next dev`
           → NEXT_STATIC_GEN_BAILOUT fires at the root-param read
              → on canary.34 the lock commits a full runtime render → dynamic data LEAKS
```

`instant(page, fn)` is supposed to lock a client navigation to its prerendered **static shell**:
under the lock you should only see static content + `<Suspense>` fallbacks; genuinely dynamic data
is sealed until the lock releases. Here the dynamic value shows up **inside the lock**, which it
must not.

## The mechanism

A descendant segment without `generateStaticParams` (`[scope]`) makes the route render **on
demand** as a *fallback shell*. In a fallback shell the route params — **including root params** —
are deferred to request time. So `await lang()` at the top of the root layout (outside any
`<Suspense>`) is a runtime read in the shell → it triggers `NEXT_STATIC_GEN_BAILOUT`.

- On **canary.34**: the bailout falls back to a full runtime render, and the `instant()` lock
  commits *that* → every dynamic value on the page (even ones correctly behind `<Suspense>` in the
  leaf) **leaks** into the locked shell.
- On **canary.39**: the same bailout no longer commits a full render under the lock — the
  navigation **bails/stalls** instead (no shell to commit). No leak, but the nav hangs.

The intended pattern (see Next's own `test/e2e/app-dir/ppr-root-param-fallback`) is to read root
params / `params` **inside `<Suspense>`** when a route can be a fallback, keeping the static chrome
outside.

## Version behavior

| `next` version           | A → B under `instant()` (dev) | Outcome     |
| ------------------------ | ----------------------------- | ----------- |
| `16.3.0-canary.34` (v0)  | dynamic value commits under lock | **LEAK**    |
| `16.3.0-canary.39`       | bails at `await lang()`, no shell | stall / bail |

## Routes

```
/en              home (A)                                          — static
/en/s1           scope home (A2)   [scope]=s1, no generateStaticParams (fallback)
/en/s1/cookies   SEALED leaf  — cookies() INSIDE <Suspense>        — leaks on .34
/en/s1/blocking  BLOCKING leaf — cookies() OUTSIDE <Suspense>
```

## The toggle

`app/[lang]/layout.js` reads the root param only when `READ_ROOT_PARAM=1`:

- `READ_ROOT_PARAM=1` → `await lang()` outside `<Suspense>` → **the leak** (on .34).
- unset → root param not read in the layout → clean bail at the leaf, **no leak**.

This isolates the root-param read as the trigger.

## Run it

```bash
pnpm install

# automated probe (dev): prints leaked=true|false for the sealed + blocking leaves
READ_ROOT_PARAM=1 pnpm exec next dev -p 3340 &      # start the leak variant
pnpm exec playwright test --workers=1
#   RESULT [canary.34 SEALED]   titleCommitted=true leaked=true   ← the leak
#   RESULT [canary.34 BLOCKING] leaked=false

# compare: canary.39 instead bails/stalls (no leak)
#   bump next + @next/playwright to 16.3.0-canary.39, reinstall, repeat
```

### By hand

```
1. READ_ROOT_PARAM=1 pnpm exec next dev -p 3340
2. open  http://localhost:3340/en/s1
3. Next devtools (bottom-left) → Instant Nav panel → Start Capturing   (acquires the lock)
4. click "Go to scope cookies page"  (→ /en/s1/cookies)
5. under the lock you should see ONLY  "Loading cookies..."  (the <Suspense> fallback);
   on .34 the resolved  "testCookie: …"  value LEAKS in instead.
```

> Requires `experimental.exposeTestingApiInProductionBuild` (set in `next.config.mjs`) for the
> testing API, and `cacheComponents: true` for PPR / instant navigation. The `instant()` runtime
> probe is only meaningful in `next dev` or against a build with the testing API exposed.
