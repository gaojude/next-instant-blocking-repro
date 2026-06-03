import { lang } from 'next/root-params'

// Root param IS statically generated. Two modes via READ_ROOT_PARAM:
//  - unset (v0-faithful): layout does NOT await the root param; any bail is at
//    the leaf.
//  - "1": layout `await lang()` OUTSIDE <Suspense> (the canary.39 stall case).
export async function generateStaticParams() {
  return [{ lang: 'en' }]
}

export default async function RootLayout({ children }) {
  if (process.env.READ_ROOT_PARAM === '1') {
    const currentLang = await lang()
    return (
      <html lang={currentLang}>
        <body>
          <p data-testid="lang-value">lang: {currentLang}</p>
          {children}
        </body>
      </html>
    )
  }
  return (
    <html lang="en">
      <body>
        <p data-testid="lang-value">lang: (unread)</p>
        {children}
      </body>
    </html>
  )
}
