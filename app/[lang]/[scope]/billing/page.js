import { Suspense } from 'react'
import { cookies } from 'next/headers'
import Link from 'next/link'

// CONDITION ② — `[scope]` has NO generateStaticParams, so /en/<scope>/billing
// is a FALLBACK route (rendered on demand; all params, including the root param
// `lang`, are deferred to request time). This is v0's `[scope]` + billing shape.
//
// B: the dynamic read here is CORRECTLY behind <Suspense>, so under the instant
// lock the cookie value must NOT appear — only the skeleton should. But because
// the root layout's `await lang()` (condition ①) bails for this fallback route,
// the lock commits a full runtime render and the cookie value leaks in.
export default function BillingPage() {
  return (
    <div>
      <h1 data-testid="billing-title">Billing</h1>
      <Suspense fallback={<div data-testid="skeleton">Loading…</div>}>
        <Secret />
      </Suspense>
      <p>
        <Link href="/en" id="back-home">
          ← Back home
        </Link>
      </p>
    </div>
  )
}

async function Secret() {
  const cookieStore = await cookies()
  const value = cookieStore.get('testCookie')?.value ?? 'not set'
  return <div data-testid="secret">testCookie: {value}</div>
}
