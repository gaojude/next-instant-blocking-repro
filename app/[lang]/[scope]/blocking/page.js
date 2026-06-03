import { cookies } from 'next/headers'

// BLOCKING leaf (dynamic read outside <Suspense>) under a fallback [scope].
// This is v0's no-fix billing shape.
export default async function ScopeBlockingPage() {
  const cookieStore = await cookies()
  const testCookie = cookieStore.get('testCookie')

  return (
    <div>
      <h1 data-testid="scope-blocking-title">Scope Blocking Page</h1>
      <div data-testid="scope-blocking-value">
        testCookie: {testCookie?.value ?? 'not set'}
      </div>
    </div>
  )
}
