import { lang } from 'next/root-params'

// `[lang]` is a root param WITH generateStaticParams, so `en` is prebuilt.
export async function generateStaticParams() {
  return [{ lang: 'en' }]
}

// CONDITION ① — the root param is read with `await` OUTSIDE any <Suspense>.
// For a *generated* route (/en) this resolves statically and is fine. For a
// *fallback* route (see app/[lang]/[scope]/billing) the root param is deferred
// to request time, so this read becomes a runtime read in the shell → it bails.
export default async function RootLayout({ children }) {
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
