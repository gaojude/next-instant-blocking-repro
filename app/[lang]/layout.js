import { Suspense } from 'react'

export async function generateStaticParams() {
  return [{ lang: 'en' }]
}

// The trigger: the destination's layout reads a generateStaticParams-covered
// param (`lang`; value 'en' IS generated/known) with `await` OUTSIDE <Suspense>.
// For a fallback route the param is deferred to request time, so this known read
// bails — and that is what lets the instant navigation COMPLETE instead of
// staying blocked. (Remove this `await params` and the nav stays correctly
// blocked; a merely-blocking page — dynamic I/O outside <Suspense> — is fine.)
export default async function RootLayout({ children, params }) {
  const { lang } = await params
  return (
    <>
      <p data-testid="lang-value">lang: {lang}</p>
      <Suspense fallback={<p data-testid="shell">Shell (Suspense fallback)</p>}>
        {children}
      </Suspense>
    </>
  )
}
