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

    // Wait deterministically for the idle-state UI to render — this confirms
    // hydration completed and the hook's initialize effect had a chance to run.
    // Avoids fixed-timeout flakiness on slow CI.
    await page.getByText('Ayo, tunjukkan isyaratmu!').waitFor({ state: 'visible' })

    // Drain any incidental post-mount async activity before asserting.
    await page.waitForLoadState('networkidle')

    // Note: this test covers mount-time only. A separate spec is needed if we
    // also want to verify that start()/captureAndRecognize never hit YOLO once
    // the user actively engages the camera (out of scope for Phase 1 smoke).
    expect(yoloCalls, 'browser engine should not call YOLO on page mount').toEqual([])
  })
})
