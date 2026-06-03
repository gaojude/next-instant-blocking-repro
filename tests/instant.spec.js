import { test, expect } from '@playwright/test'
import { instant } from '@next/playwright'

// Under instant(), a client navigation must stay parked on the prefetched static
// shell — the destination must NOT commit while the lock is held. Here the
// destination (/en/s1/billing) is a fallback route whose layout reads a
// generateStaticParams-covered param (`lang`) with `await` outside <Suspense>.
//
// Expected: the navigation stays blocked (only the layout's Suspense shell shows).
// Actual (next dev): after ~5s the navigation COMPLETES — the destination renders
// and commits under the lock. This test asserts the correct behavior, so it FAILS
// on the affected version — that failure is the repro.
test('instant() must keep the navigation blocked (it must not complete)', async ({
  page,
}) => {
  test.setTimeout(30000)
  await page.context().addCookies([
    { name: 'testCookie', value: 'super-secret', domain: 'localhost', path: '/' },
  ])

  await page.goto('/en')
  await page.locator('[data-testid="home-title"]').waitFor()

  await instant(page, async () => {
    await page.click('#to-billing')

    // Wait well past the point where the navigation wrongly completes (~5s).
    await page.waitForTimeout(10000)

    const secret = page.locator('[data-testid="secret"]')
    const secretText = (await secret.count()) ? await secret.textContent() : ''
    console.log(
      `after 10s under lock: url=${page.url()} secret=${JSON.stringify(secretText)}`
    )

    // The destination must not have committed while the lock is held.
    expect(
      await page.locator('[data-testid="billing-title"]').count(),
      'navigation to the blocking destination completed under instant()'
    ).toBe(0)
  })
})
