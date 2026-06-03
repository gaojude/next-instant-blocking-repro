# next-instant-blocking-repro

Minimal repro: the Next.js **`instant()`** navigation-testing lock (from `@next/playwright`)
**leaks dynamic data into the locked static shell** when a **root param is read with `await`
outside `<Suspense>`** and the navigation target is a **fallback route**.

Stack: `next@16.3.0-canary.39` (latest published canary; also reproduces on `canary.34`, the
version v0 ships), `cacheComponents: true` (PPR), React 19, `@next/playwright`.

## The critical learning — two necessary conditions

The leak happens **if and only if both** of these hold (proven by ablation, see below):

```
①  an ancestor layout reads a ROOT PARAM with `await` OUTSIDE any <Suspense>
       app/[lang]/layout.js →  const currentLang = await lang()   // next/root-params, top-level
       └─ read it INSIDE <Suspense>, or don't read it      →  NO leak

                              AND

②  the navigation target is a FALLBACK route
       a segment in its path has NO generateStaticParams, so it renders on demand
       app/[lang]/[scope]/billing  →  [scope] has no generateStaticParams
       └─ a fully-generated / direct route                 →  NO leak
```

Either one alone is harmless. Together they leak — even though the leaf's dynamic read is
correctly behind `<Suspense>`.

### Why (mechanism)

A **fallback** route is served from one shell shared across all param values, so **every param
— including the root param — is handed in as a request-time promise (deferred)**. So
`await lang()` at the top of the layout is a *runtime* read sitting in the static shell:

```
fallback render → root param is deferred
  → `await lang()` outside <Suspense> = runtime data in the shell
     → NEXT_STATIC_GEN_BAILOUT
        → the instant() lock commits a FULL runtime render of the subtree
           → every dynamic value below leaks in — even ones correctly behind <Suspense>
```

For a *generated* route (`/en`) the same `await lang()` resolves statically, so there is no
bailout and no leak. The fallback context is what turns the root-param read toxic.

## Run it

```bash
pnpm install
pnpm exec playwright test          # auto-starts `next dev` on :3340
```

Expected: the test **FAILS** — and that failure is the repro:

```
leaked under lock: "testCookie: super-secret"
✘ instant() lock must not leak the cookie value into the static shell
  Error: cookie value leaked into the instant shell
```

The test navigates `/en` (generated) → `/en/s1/billing` (fallback) inside `instant()` and asserts
the sealed cookie value is **not** in the locked shell. It is, so it fails.

### By hand

```
1. pnpm exec next dev -p 3340
2. open  http://localhost:3340/en
3. Next devtools (bottom-left) → Instant Nav panel → Start Capturing   (acquires the lock)
4. click "Go to billing (fallback route)"
5. under the lock you should see ONLY the "Loading…" skeleton;
   instead the resolved "testCookie: …" value leaks in.
```

## The fix

Read the root param **inside `<Suspense>`** (keep static chrome outside), so the deferred read
no longer sits in the shell. This matches Next's own
[`test/e2e/app-dir/ppr-root-param-fallback`](https://github.com/vercel/next.js/tree/canary/test/e2e/app-dir/ppr-root-param-fallback)
pattern.

```diff
  export default async function RootLayout({ children }) {
-   const currentLang = await lang()
-   return (
-     <html lang={currentLang}>
-       <body>
-         <p>lang: {currentLang}</p>
-         {children}
-       </body>
-     </html>
-   )
+   return (
+     <html>
+       <body>
+         <Suspense fallback={null}>
+           <LangLine />
+         </Suspense>
+         {children}
+       </body>
+     </html>
+   )
  }
+
+ async function LangLine() {
+   const currentLang = await lang()
+   return <p>lang: {currentLang}</p>
+ }
```

## Ablation (proof of necessity)

`next dev`, client nav A→B under `instant()`, **sealed leaf** as the unambiguous probe, 4/4 per
cell:

| target          | ① read OUTSIDE `<Suspense>` | ① read INSIDE `<Suspense>` | ① not read |
| --------------- | --------------------------- | -------------------------- | ---------- |
| direct (¬②)     | no leak                     | no leak                    | no leak    |
| **fallback (②)**| **LEAK**                    | no leak                    | no leak    |

## Routes

```
app/[lang]/layout.js            root layout — CONDITION ① (await lang() outside <Suspense>), generateStaticParams → ['en']
app/[lang]/page.js              A — /en, a generated route (link to billing)
app/[lang]/[scope]/billing/...  B — /en/s1/billing, a FALLBACK route (CONDITION ②); cookie read sealed in <Suspense>
```

## v0 mapping

```
[variants]  generateStaticParams ✓                  ≈  [lang]   (generated root param)
[scope]     NO generateStaticParams (fallback)       ≈  [scope]  (condition ②: billing is a fallback route)
→ whichever ancestor reads the variants/locale root param with `await` outside <Suspense> = condition ①
```

## Version note

Reproduces on every published canary tested — `16.3.0-canary.34` (v0) and `16.3.0-canary.39`
(latest). On the unreleased `canary` HEAD the behavior changes from *leak* to *bail/stall*
(no shell commits), so the dynamic no longer leaks — but the navigation hangs instead. Requires
`cacheComponents: true`; `experimental.exposeTestingApiInProductionBuild` lets the `instant()`
probe also work against a production build.
