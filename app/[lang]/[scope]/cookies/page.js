import { Suspense } from 'react'
import { cookies } from 'next/headers'
import Link from 'next/link'

// SEALED leaf (dynamic read inside <Suspense>) under a fallback [scope].
export default function ScopeCookiesPage() {
  return (
    <div>
      <h1 data-testid="scope-cookies-title">Scope Cookies Page</h1>
      <Suspense
        fallback={
          <div data-testid="scope-cookies-fallback">Loading cookies...</div>
        }
      >
        <CookieContent />
      </Suspense>
      <p>
        <Link href="/en/s1" id="link-back-to-scope-home">
          &larr; Back to scope home
        </Link>
      </p>
    </div>
  )
}

async function CookieContent() {
  const cookieStore = await cookies()
  const testCookie = cookieStore.get('testCookie')

  return (
    <div data-testid="scope-cookie-value">
      testCookie: {testCookie?.value ?? 'not set'}
    </div>
  )
}
