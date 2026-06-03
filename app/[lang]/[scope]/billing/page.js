import { Suspense } from 'react'
import { cookies } from 'next/headers'
import Link from 'next/link'

// CONDITION ② — `[scope]` has NO generateStaticParams, so /en/<scope>/billing is
// a FALLBACK route (rendered on demand; every param is deferred to request time).
// This is v0's `[scope]` + billing shape.
//
// The cookie read here is CORRECTLY behind <Suspense>, so under the instant lock
// the value must NOT appear — only the skeleton should. But because an ancestor
// reads a generateStaticParams-covered param with `await` outside <Suspense>
// (condition ①), the bail makes the lock commit a full render and the value leaks.
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
