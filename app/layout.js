// CONDITION ① — the root param is read with `await` OUTSIDE any <Suspense>.
// For a *generated* route (/en) this resolves statically and is fine. For a
// *fallback* route (see app/[lang]/[scope]/billing) the root param is deferred
// to request time, so this read becomes a runtime read in the shell → it bails.
export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
