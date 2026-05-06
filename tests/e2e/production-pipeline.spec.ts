import { test, expect } from '@playwright/test';

test.describe('Production Pipeline', () => {
  test('Complete flow to decision state', async ({ page }) => {
    // Inject localstorage mock settings so it skips settings screen
    await page.addInitScript(() => {
      window.localStorage.setItem('astromedia_settings', JSON.stringify({
        apiKey: 'test-key',
        blotatoApiKey: 'test-blotato',
        textModel: 'o3-mini',
        imageModel: 'flux',
        videoModel: 'kling',
        orchestratorPersona: 'Orchestrator',
        marketerPersona: 'Marketer',
        directorPersona: 'Director'
      }));
    });

    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));

    await page.goto('/');

    // Check we are on the main prompt screen
    await expect(page.locator('text=AI CAMPAIGN STUDIO')).toBeVisible();

    // Fill the prompt
    await page.fill('textarea', 'An epic test prompt');

    // Mocker les appels fetch dans le navigateur pour pas faire de vraies requetes
    await page.route('https://openrouter.ai/api/v1/chat/completions', async route => {
      // Mock different responses depending on the stage, for simplicity we just return a valid dummy JSON for all
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          choices: [{
            message: {
              content: JSON.stringify({
                // Mixed keys to satisfy orchestrator, marketer, director and validator
                enhancedPrompt: "E2E prompt", strategy: "E2E strat",
                advertisingCopy: "Buy E2E", hook: "Hook E2E",
                templateId: "tpl_123", format: "video",
                variables: { headline: "H1", cta: "Click", visual_style: "Dark", scene_description: "A scene" },
                visual_quality: 10, message_alignment: 10, cta_present: true, brand_consistency: 10, passed: true
              })
            }
          }]
        })
      });
    });

    // Mock blotato request
    await page.route('https://api.blotato.com/v1/generate', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test_generation_id',
          status: 'completed',
          media_url: 'http://test.url/media.mp4'
        })
      });
    });

    // Start production
    await page.click('button:has-text("Lancer la production")');

    // Wait for the decision panel (it might take a bit since we have artificial delays in blotatoService)
    await expect(page.locator('text=Campaign Ready for Review')).toBeVisible({ timeout: 20000 });

    // Verify QA pass
    await expect(page.locator('text=PASSED QA')).toBeVisible();

    // Click Publish
    await page.click('button:has-text("Publish Now")');

    // Check completed state
    await expect(page.locator('text=CAMPAIGN DEPLOYED')).toBeVisible();
  });

  test('Complete flow with QA failure and reject', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('astromedia_settings', JSON.stringify({
        apiKey: 'test-key', blotatoApiKey: 'test-blotato', textModel: 'o3-mini'
      }));
    });

    await page.goto('/');
    await expect(page.locator('text=AI CAMPAIGN STUDIO')).toBeVisible();
    await page.fill('textarea', 'A failing prompt');

    // Mocker les appels fetch pour renvoyer une erreur QA
    await page.route('https://openrouter.ai/api/v1/chat/completions', async route => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          choices: [{
            message: {
              content: JSON.stringify({
                enhancedPrompt: "E2E fail", strategy: "E2E strat",
                templateId: "tpl_fail", format: "video",
                variables: { headline: "H1" },
                // Low scores to trigger QA Fail
                visual_quality: 4, message_alignment: 4, cta_present: false, brand_consistency: 4, passed: false
              })
            }
          }]
        })
      });
    });

    await page.route('https://api.blotato.com/v1/generate', async route => {
      await route.fulfill({ status: 200, body: JSON.stringify({ status: 'completed', media_url: 'http://url' }) });
    });

    // Start production
    await page.click('button:has-text("Lancer la production")');

    // Wait for the decision panel
    await expect(page.locator('text=Campaign Ready for Review')).toBeVisible({ timeout: 20000 });

    // Verify QA fail
    await expect(page.locator('text=FAILED QA')).toBeVisible();

    // Click Reject
    await page.click('button:has-text("Reject")');

    // Verify return to IDLE (form is visible again)
    await expect(page.locator('text=Lancer la production')).toBeVisible();
  });
});
