import Link from 'next/link'

export default function HomePage() {
  return (
    <div>
      <h1 data-testid="home-title">Home</h1>
      <Link href="/en/s1/billing" id="to-billing">
        Go to billing
      </Link>
    </div>
  )
}
