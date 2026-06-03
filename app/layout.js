// Root layout (html/body). The dynamic params (`[lang]`, `[scope]`) live below.
export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  )
}
