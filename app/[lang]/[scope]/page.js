import Link from 'next/link'

// [scope] has NO generateStaticParams -> fallback / on-demand route, like v0's
// [scope] under the [variants] root param.
export default function ScopeHome() {
  return (
    <div>
      <h1 data-testid="scope-home-title">Scope Home</h1>
      <Link href="/en/s1/blocking" id="link-to-scope-blocking">
        Go to scope blocking page
      </Link>
      <Link href="/en/s1/cookies" id="link-to-scope-cookies">
        Go to scope cookies page
      </Link>
    </div>
  )
}
