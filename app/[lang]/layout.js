// `[lang]` is covered by generateStaticParams, so `en` is prebuilt (its value is known).
export async function generateStaticParams() {
  return [{ lang: 'en' }]
}

// CONDITION ① — a generateStaticParams-covered param is read with `await` OUTSIDE
// any <Suspense>. On a generated route (/en) it resolves statically and is fine.
// On a fallback route (app/[lang]/[scope]/billing) every param is deferred to
// request time, so this known value becomes a runtime read in the shell → bail.
export default async function RootLayout({ children, params }) {
  const { lang } = await params
  return (
    <>
      <p data-testid="lang-value">lang: {lang}</p>
      {children}
    </>
  )
}
