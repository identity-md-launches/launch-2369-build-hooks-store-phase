import { expect, type Page } from '@playwright/test';
/** v2 findings quote a short faulty phrase, while the sheet retains exact request evidence. */
export async function expectFinding(page: Page, text: string) {
  const box = page.locator('#findings:not(.ok), .safety-notice');
  await expect(box).toHaveCount(1);
  const composed = page.locator('#composed');
  if (await page.locator('#findings').count() && (await composed.textContent())?.includes(text)) {
    await expect(page.locator('#findings .finding').first()).toBeVisible();
    await expect(composed).toContainText(text);
  } else await expect(box).toContainText(text);
}
/** Sideways shelf content may sit outside the viewport; its container must contain it. */
export async function expectReflow(page: Page, width: number) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  const outside = await page.locator('button, input, select, textarea').evaluateAll(nodes => nodes.filter(n => {
    if (n.closest('.shelf, .shelf-tabs, dialog:not([open])')) return false;
    const r = n.getBoundingClientRect(); return r.width > 0 && (r.left < -1 || r.right > innerWidth + 1);
  }).map(n => n.outerHTML.slice(0, 120)));
  expect(outside).toEqual([]);
}
