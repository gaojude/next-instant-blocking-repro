import { test, expect } from '@playwright/test'
import { instant } from '@next/playwright'

// The bug: navigating to a FALLBACK route whose root layout reads a root param
// with `await` outside <Suspense> makes the instant() lock commit a full runtime
// render — so a cookie value that is correctly sealed behind <Suspense> leaks
// into the static shell.
//
// This test asserts the CORRECT behavior (no leak). On the affected canary it
// FAILS — that failure IS the repro.
test('instant() lock must not leak the cookie value into the static shell', async ({
  page,
}) => {
  await page.context().addCookies([
    { name: 'testCookie', value: 'super-secret', domain: 'localhost', path: '/' },
  ])

  // A: a generated route.
  await page.goto('/en')
  await page.locator('[data-testid="home-title"]').waitFor()

  await instant(page, async () => {
    // Navigate to B: /en/s1/billing (a fallback route).
    await page.click('#to-billing')

    // The static shell commits (the title is static).
    await page
      .locator('[data-testid="billing-title"]')
      .waitFor({ state: 'visible' })
    await page.waitForTimeout(1000)

    const secret = page.locator('[data-testid="secret"]')
    const leakedText = (await secret.count()) ? await secret.textContent() : ''
    console.log(`leaked under lock: ${JSON.stringify(leakedText)}`)

    // Under the lock the sealed cookie value must not be present.
    expect(
      await secret.count(),
      'cookie value leaked into the instant shell'
    ).toBe(0)
  })
})
