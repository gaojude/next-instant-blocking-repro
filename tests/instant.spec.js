import { test } from '@playwright/test'
import { instant } from '@next/playwright'

async function setCookie(page) {
  await page.context().addCookies([
    { name: 'testCookie', value: 'LEAKED', domain: 'localhost', path: '/' },
  ])
}

test('A2 -> BLOCKING leaf under fallback [scope]: leak?', async ({ page }) => {
  await setCookie(page)
  await page.goto('/en/s1')
  await page.locator('[data-testid="scope-home-title"]').waitFor()

  let leaked = false
  let text = ''
  await instant(page, async () => {
    await page.click('#link-to-scope-blocking')
    await page.waitForTimeout(2500)
    const loc = page.locator('[data-testid="scope-blocking-value"]')
    leaked = (await loc.count()) > 0
    if (leaked) text = (await loc.first().textContent()) || ''
  })
  console.log(
    `RESULT [canary.34 BLOCKING] leaked=${leaked} text=${JSON.stringify(text)}`
  )
})

test('A2 -> SEALED leaf under fallback [scope]: leak?', async ({ page }) => {
  await setCookie(page)
  await page.goto('/en/s1')
  await page.locator('[data-testid="scope-home-title"]').waitFor()

  let leaked = false
  let titleCommitted = false
  await instant(page, async () => {
    await page.click('#link-to-scope-cookies')
    try {
      await page
        .locator('[data-testid="scope-cookies-title"]')
        .waitFor({ timeout: 10000 })
      titleCommitted = true
    } catch {
      titleCommitted = false
    }
    await page.waitForTimeout(800)
    leaked =
      (await page.locator('[data-testid="scope-cookie-value"]').count()) > 0
  })
  console.log(
    `RESULT [canary.34 SEALED] titleCommitted=${titleCommitted} leaked=${leaked}`
  )
})
