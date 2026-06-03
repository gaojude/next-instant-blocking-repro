import { cookies } from 'next/headers'
import Link from 'next/link'

// BLOCKING destination: cookies() is read OUTSIDE any <Suspense>, so this page
// has no static shell. Navigating here under instant() should stay blocked (the
// layout's Suspense fallback should remain) — but if you wait long enough the
// navigation completes and the resolved page commits. That is the bug.
export default function BillingPage() {
  return (
    <div>
      <h1 data-testid="billing-title">Billing</h1>
      <Secret />
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
