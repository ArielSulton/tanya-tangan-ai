import { test, expect } from '@playwright/test'

test.describe('Vocab Platform', () => {
  test('shows 5 category cards on /vocab', async ({ page }) => {
    await page.goto('/vocab')

    const categoryLinks = page.locator('a[href^="/vocab/"]')
    await expect(categoryLinks).toHaveCount(5)
  })

  test('navigates to /vocab/hewan on card click', async ({ page }) => {
    await page.goto('/vocab')

    await page.locator('a[href="/vocab/hewan"]').click()

    await expect(page).toHaveURL(/\/vocab\/hewan/)
    await expect(page.getByText('Hewan')).toBeVisible()
  })

  test('shows gesture area (video element) on /vocab/benda', async ({ page }) => {
    await page.goto('/vocab/benda')

    await expect(page.locator('video')).toBeAttached()
  })

  test('shows idle state initially on /vocab/hewan', async ({ page }) => {
    await page.goto('/vocab/hewan')

    await expect(page.getByText('Gesturkan kata untuk melihat artinya')).toBeVisible()
  })
})
