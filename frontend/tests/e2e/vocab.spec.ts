/**
 * End-to-End Tests for Visual Vocabulary Platform
 * Tests /vocab category selection and /vocab/[kategori] gesture + result pages
 */
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
    await expect(page.locator('h1')).toContainText('Hewan')
  })

  test('shows gesture area (video element) on /vocab/benda', async ({ page }) => {
    await page.goto('/vocab/benda')

    await expect(page.locator('video')).toBeVisible()
  })

  test('shows idle state initially on /vocab/hewan', async ({ page }) => {
    await page.goto('/vocab/hewan')

    await expect(page.locator('p')).toContainText(/Gesturkan kata/)
  })
})
