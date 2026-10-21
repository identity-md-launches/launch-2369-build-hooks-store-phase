import { test, expect, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
type Snapshot = { state: string; time: number; frames: number; queue: number; visible: boolean; reduced: boolean; cols: number; rows: number; surface: number; smallFish: { x: number; y: number; panic: number }[]; bigFish: { L: number }[]; splash: { x: number; t: number } };
type PondHost = HTMLElement & { pondSnapshot: () => Snapshot };
type TraceWindow = Window & { pondTrace?: { state: string; time: number }[] };
const snapshot = (page: Page) => page.evaluate(() => (document.getElementById('landing') as PondHost).pondSnapshot());
async function start(page: Page, reduced = false) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await page.route('https://api.imd.fun/swarm', route => route.fulfill({ status: 503, body: 'Unavailable' }));
  await page.clock.install({ time: new Date('2026-10-21T08:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-21T08:00:01Z'));
  await page.goto('#store'); await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('canvas')).toHaveAttribute('data-state', 'idle');
}
async function waterClick(page: Page, x = 180, yRatio = .8) {
  const box = (await page.locator('#landing').boundingBox())!;
  await page.mouse.click(box.x + x, box.y + box.height * yRatio);
}
const pixels = (page: Page) => page.locator('canvas').evaluate(canvas => (canvas as HTMLCanvasElement).toDataURL());
test('water click draws every cast frame in order with specified timings, then returns through idle', async ({ page }) => {
  await start(page);
  await page.evaluate(() => {
    (window as TraceWindow).pondTrace = [];
    document.getElementById('landing')!.addEventListener('pond:state', event => (window as TraceWindow).pondTrace!.push((event as CustomEvent).detail));
  });
  await waterClick(page);
  const frames: { state: string; sha256: string; time: number }[] = [];
  const states = ['windup', 'fly', 'splash', 'sink', 'wait', 'bite', 'reel', 'cheer'];
  for (const state of states) {
    for (let i = 0; i < 60 && (await snapshot(page)).state !== state; i++) await page.clock.runFor(33);
    expect((await snapshot(page)).state).toBe(state);
    await page.clock.runFor(66); // Sample a drawn frame, not just a transition label.
    frames.push({ state, time: (await snapshot(page)).time, sha256: createHash('sha256').update(await pixels(page)).digest('hex') });
  }
  await page.clock.runFor(1000);
  const trace = (await page.evaluate(() => (window as TraceWindow).pondTrace!)).slice(0, 9);
  expect(trace.map(entry => entry.state)).toEqual([...states, 'idle']);
  const durations = [.35, .55, .45, .6, 1.3, .5, .6, .9];
  durations.forEach((duration, i) => expect(trace[i + 1].time - trace[i].time).toBeCloseTo(duration, 1));
  expect(new Set(frames.map(f => f.sha256)).size).toBe(8);
  mkdirSync('../artifacts', { recursive: true }); writeFileSync('../artifacts/cast-frames.json', JSON.stringify({ frames, transitions: trace, durations }, null, 2) + '\n');
});
test('reduced motion leaves one still frame and no cast; the pointer-accessible opt-in starts it', async ({ page }) => {
  await start(page, true);
  const original = await pixels(page); await page.clock.runFor(20_000); await waterClick(page); await page.clock.runFor(6000);
  expect(await pixels(page)).toBe(original); expect((await snapshot(page)).frames).toBe(0); expect((await snapshot(page)).state).toBe('idle');
  await expect(page.locator('.marquee-track')).toHaveCSS('animation-name', 'none');
  const animate = page.getByRole('button', { name: '▶ animate the pond', exact: true });
  await expect(animate).toHaveCSS('pointer-events', 'auto');
  const box = (await animate.boundingBox())!; await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.clock.runFor(1000); expect((await snapshot(page)).frames).toBeGreaterThan(0); expect(await pixels(page)).not.toBe(original);
  await expect(page.getByRole('button', { name: 'Pause pond' })).toBeVisible();
});
test('scene pauses outside viewport, resizes, seeds 3 silhouettes and 42 flocking fish, and flees the pointer', async ({ page }) => {
  await start(page); await page.clock.runFor(200);
  const initial = await snapshot(page); expect(initial.smallFish).toHaveLength(42); expect(initial.bigFish.map(f => f.L)).toEqual([100, 136, 172]);
  expect(initial.cols).toBe(Math.ceil(1440 / 9));
  const fish = initial.smallFish.find(f => f.x > 40 && f.x < 1300)!;
  const box = (await page.locator('#landing').boundingBox())!;
  await page.mouse.move(box.x + fish.x + 2, box.y + fish.y); await page.clock.runFor(200);
  expect((await snapshot(page)).smallFish.some(f => f.panic > 0)).toBe(true);
  await waterClick(page, 180); expect((await snapshot(page)).splash.x).toBe(180);
  await page.evaluate(() => { const host = document.getElementById('landing')!; scrollTo(0, host.offsetTop + host.offsetHeight + 200); }); await page.clock.runFor(200);
  await expect.poll(async () => (await snapshot(page)).visible).toBe(false);
  const paused = (await snapshot(page)).frames; await page.clock.runFor(3000); expect((await snapshot(page)).frames).toBe(paused);
  await page.evaluate(() => scrollTo(0, 0)); await page.clock.runFor(200);
  await expect.poll(async () => (await snapshot(page)).visible).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 }); await page.clock.runFor(200);
  expect((await snapshot(page)).cols).toBe(Math.ceil(390 / 9));
  expect(await page.locator('canvas').evaluate(c => (c as HTMLCanvasElement).width)).toBeLessThanOrEqual(780);
});
test('cast queue is capped at three and a keyboard press on the water also casts', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: 'Cast a line on the pond' }).focus();
  await page.keyboard.press('Enter');
  expect((await snapshot(page)).state).toBe('windup');
  for (let i = 0; i < 8; i++) await waterClick(page);
  expect((await snapshot(page)).queue).toBe(3);
});
