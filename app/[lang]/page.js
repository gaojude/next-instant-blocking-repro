import Link from 'next/link'

// A: a fully generated route (lang=en is in generateStaticParams).
export default function HomePage() {
  return (
    <div>
      <h1 data-testid="home-title">Home</h1>
      <Link href="/en/s1/billing" id="to-billing">
        Go to billing (fallback route)
      </Link>
    </div>
  )
}
