import { test, expect } from '@playwright/test'

test.describe('Browser gesture engine (Phase 1)', () => {
  test('vocab page loads and does not call YOLO backend on mount', async ({ page }) => {
    // Camera permission is already granted globally via playwright.config.ts:
    //   permissions: ['camera', 'microphone']
    // and --use-fake-ui-for-media-stream / --use-fake-device-for-media-stream
    // launch args on Chromium — no explicit context.grantPermissions needed.

    const yoloCalls: string[] = []
    page.on('request', (req) => {
      if (req.url().includes('/api/v1/gesture/recognize')) {
        yoloCalls.push(req.url())
      }
    })

    await page.goto('/vocab/hewan')

    // The page should mount and reach a steady state.
    // Camera init takes a moment; allow up to 3s for any incidental request.
    await page.waitForTimeout(3000)

    expect(yoloCalls, 'browser engine should not call YOLO on page mount').toEqual([])
  })
})
