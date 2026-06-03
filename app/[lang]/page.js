import Link from 'next/link'

export default function HomePage() {
  return (
    <div>
      <h1 data-testid="home-title">Home (root param, unread)</h1>
      <Link href="/en/s1" id="link-to-scope-home">
        Go to scope home
      </Link>
    </div>
  )
}
