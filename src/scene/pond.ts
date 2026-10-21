/** Port of mockup/index.html pondScene. Character grids and fish/cast math are preserved.
 * Monochrome bank reeds, distant boat and canopy birds surround the unchanged Pepe sprite.
 */
import PEPE from './pepe.json';
export type CastState = 'idle' | 'windup' | 'fly' | 'splash' | 'sink' | 'wait' | 'bite' | 'reel' | 'cheer';
export const CAST_DURATIONS = { windup: 0.35, fly: 0.55, splash: 0.45, sink: 0.6, wait: 1.3, bite: 0.5, reel: 0.6, cheer: 0.9 } as const;
const NEXT_STATE: Record<Exclude<CastState, 'idle'>, CastState> = { windup: 'fly', fly: 'splash', splash: 'sink', sink: 'wait', wait: 'bite', bite: 'reel', reel: 'cheer', cheer: 'idle' };
type BigFish = { x: number; y: number; dir: number; L: number; speed: number; phase: number; wob: number };
type SmallFish = { x: number; y: number; vx: number; vy: number; panic: number };

export function pondScene(host: HTMLElement, canvas: HTMLCanvasElement, onTick?: (time: number) => void) {
  const ctx = canvas.getContext('2d')!;
  var CW = 9, CH = 15, cols = 0, rows = 0, W = 0, H = 0, dpr = 1;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var glyph = new Uint16Array(0), level = new Uint8Array(0), tone = new Uint8Array(0), N = 0;
  var INK = ['#15130f', '#5b5342', '#8a816a'], ALPHA = [0, 0.07, 0.15, 0.26];
  var t = 0, last = 0, raf = 0, visible = true, destroyed = false;
  const onVisibility = () => { last = performance.now(); };
  document.addEventListener('visibilitychange', onVisibility);
  var pointer = { x: -1e4, y: -1e4, on: false };
  function hash(x: number, y: number, z: number) { var h = (x | 0) * 73856093 ^ (y | 0) * 19349663 ^ (z | 0) * 83492791; h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; }
  function levelOf(ch: string) { if (ch === '8' || ch === '#' || ch === '%' || ch === '@') return 3; if (ch === 'S' || ch === '&' || ch === 'o') return 2; if (ch === 't' || ch === ':' || ch === ';') return 1; return 0; }
  function put(c: number, r: number, ch: string, tn: number) { if (c < 0 || r < 0 || c >= cols || r >= rows) return; var i = r * cols + c; glyph[i] = ch.charCodeAt(0); level[i] = levelOf(ch); tone[i] = tn || 0; }
  function text(c: number, r: number, s: string, tn: number) { for (var i = 0; i < s.length; i++) if (s[i] !== ' ') put(c + i, r, s[i], tn); }
  function clearCells() { glyph.fill(0); level.fill(0); tone.fill(0); }

  // ---- layout: surface row, boat and Pepe anchored to the right
  var sr = 0, pc = 0, pr = 0, boatL = 0, boatR = 0, hand = { c: 0, r: 0 };
  function layout() {
    var M = PEPE.meta; sr = Math.round(rows * 0.62); pc = cols - M.width - 4; pr = sr - 1 - M.feet;
    boatL = pc - 1; boatR = pc + M.width; hand.c = pc + M.hand[0] - 1; hand.r = pr + M.hand[1] - 4;
    idleTip.c = hand.c - 16; idleTip.r = hand.r - 11; idleHook.c = idleTip.c - 4; idleHook.r = sr + 5;
    if (state === 'idle') { tip.c = idleTip.c; tip.r = idleTip.r; hook.c = idleHook.c; hook.r = idleHook.r; }
  }
  function resize() {
    var rect = host.getBoundingClientRect(); if (rect.width < 1 || rect.height < 1) return;
    dpr = Math.min(devicePixelRatio || 1, 2); W = rect.width; H = rect.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    cols = Math.ceil(W / CW); rows = Math.ceil(H / CH); N = cols * rows;
    glyph = new Uint16Array(N); level = new Uint8Array(N); tone = new Uint8Array(N);
    layout(); if (!bigFish.length) seed();
    if (reduce) { draw(); }
  }

  // ---- fish: three drawn silhouettes and a school of small ones
  var bigFish: BigFish[] = [], small: SmallFish[] = [];
  function seed() {
    bigFish = []; small = [];
    for (var i = 0; i < 3; i++) bigFish.push({ x: Math.random() * W, y: (sr + 4 + Math.random() * Math.max(4, rows - sr - 10)) * CH, dir: Math.random() < 0.5 ? 1 : -1, L: 100 + i * 36, speed: 22 + Math.random() * 16, phase: Math.random() * 6.28, wob: Math.random() * 6.28 });
    for (var k = 0; k < 42; k++) small.push({ x: Math.random() * W, y: (sr + 2 + Math.random() * Math.max(3, rows - sr - 5)) * CH, vx: (Math.random() < 0.5 ? -1 : 1) * (14 + Math.random() * 10), vy: 0, panic: 0 });
  }
  function fishHalf(s: number) { // half-width of the body as a fraction of length, nose (0) to tail root (0.84)
    if (s < 0) return 0; if (s < 0.84) { var u = s / 0.84; return 0.03 + 0.13 * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.75)), 0.9); } return 0;
  }
  var hit = { flag: 0, shade: 0 };
  function sampleFish(f: BigFish, px: number, py: number) { // flag 1 body, 2 fin, 3 eye
    var L = f.L, s = (f.dir > 0 ? (f.x - px) : (px - f.x)) / L; if (s < -0.02 || s > 1.02) return false;
    var wave = L * 0.045 * (0.15 + 0.85 * Math.pow(Math.max(0, s), 1.6)) * Math.sin(f.phase - s * 5.5);
    var v = py - (f.y + wave); var a = Math.abs(v);
    var hw = fishHalf(s) * L;
    if (s >= 0 && a <= hw) { var across = a / (hw || 1); hit.flag = 1; hit.shade = 0.55 - across * across * 0.35 + (v < 0 ? 0.25 : -0.12); if (s > 0.07 && s < 0.14 && v < 0 && across > 0.3 && across < 0.75) hit.flag = 3; return true; }
    if (s > 0.84 && s <= 1.0) { var reach = L * (0.02 + 0.11 * (s - 0.84) / 0.16), notch = L * 0.07 * (s - 0.84) / 0.16 * (s > 0.92 ? 1 : 0); if (a <= reach && a >= notch) { hit.flag = 2; hit.shade = 0.35; return true; } }
    if (s > 0.32 && s < 0.56 && v < 0) { var top = hw + L * 0.085 * Math.sin(Math.PI * (s - 0.32) / 0.24); if (a <= top) { hit.flag = 2; hit.shade = 0.45; return true; } }
    if (s > 0.3 && s < 0.42 && v > 0) { var pec = hw + L * 0.05 * Math.sin(Math.PI * (s - 0.3) / 0.12); if (a <= pec) { hit.flag = 2; hit.shade = 0.3; return true; } }
    return false;
  }
  var SUB = [0.5, 0.5, 0.22, 0.28, 0.78, 0.28, 0.22, 0.72, 0.78, 0.72];
  var SKIN = ['#', '8', '%', 'S', 'S', 't', ':', ':'];
  function drawBigFish() {
    for (var k = 0; k < bigFish.length; k++) {
      var f = bigFish[k], L = f.L, x0 = f.dir > 0 ? f.x - L : f.x, x1 = x0 + L;
      var c0 = Math.max(0, Math.floor(x0 / CW) - 1), c1 = Math.min(cols - 1, Math.ceil(x1 / CW) + 1), r0 = Math.max(sr + 1, Math.floor((f.y - L * 0.2) / CH)), r1 = Math.min(rows - 1, Math.ceil((f.y + L * 0.2) / CH));
      for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) {
        var hits = 0, flag = 0, shade = 0;
        for (var j = 0; j < SUB.length; j += 2) if (sampleFish(f, c * CW + SUB[j] * CW, r * CH + SUB[j + 1] * CH)) { hits++; if (j === 0 || !flag) { flag = hit.flag; shade = hit.shade; } }
        if (!hits) continue;
        var key = hash(c, r, k + 11);
        if (hits >= 3) {
          if (flag === 3) put(c, r, 'o', 0);
          else if (flag === 2) put(c, r, key < 0.5 ? '%' : ';', 1);
          else { var ix = Math.max(0, Math.min(SKIN.length - 1, Math.floor((1 - shade) * SKIN.length) + (key < 0.33 ? -1 : key > 0.66 ? 1 : 0))); put(c, r, SKIN[ix], 0); }
        } else put(c, r, r * CH + CH / 2 < f.y ? "'" : '.', 1);
      }
    }
  }
  function stepBigFish(dt: number) {
    for (var k = 0; k < bigFish.length; k++) {
      var f = bigFish[k]; f.phase += dt * (2.2 + f.speed / 30); f.wob += dt * 0.35;
      f.x += f.dir * f.speed * dt; f.y += Math.sin(f.wob) * 4 * dt;
      var lo = (sr + 3) * CH, hi = (rows - 3) * CH; if (f.y < lo) f.y = lo; if (f.y > hi) f.y = hi;
      if (f.dir > 0 && f.x - f.L > W + 40) { f.dir = -1; f.x = W + 40 + f.L; f.y = lo + Math.random() * Math.max(10, hi - lo); }
      if (f.dir < 0 && f.x + f.L < -40) { f.dir = 1; f.x = -40 - f.L; f.y = lo + Math.random() * Math.max(10, hi - lo); }
    }
  }
  function stepSmall(dt: number) {
    var lo = (sr + 1.5) * CH, hi = (rows - 1.5) * CH, n = small.length;
    for (var i = 0; i < n; i++) {
      var f = small[i], ax = 0, ay = 0, cx = 0, cy = 0, vxs = 0, vys = 0, cnt = 0;
      for (var j = 0; j < n; j++) { if (i === j) continue; var g = small[j], dx = g.x - f.x, dy = g.y - f.y, d2 = dx * dx + dy * dy; if (d2 > 90 * 90) continue; cnt++; cx += g.x; cy += g.y; vxs += g.vx; vys += g.vy; if (d2 < 22 * 22) { ax -= dx * 2.5; ay -= dy * 2.5; } }
      if (cnt) { ax += ((cx / cnt - f.x) * 0.4) + (vxs / cnt - f.vx) * 1.2; ay += ((cy / cnt - f.y) * 0.4) + (vys / cnt - f.vy) * 1.2; }
      var px = pointer.x - f.x, py = pointer.y - f.y, pd = px * px + py * py; if (pointer.on && pd < 110 * 110) { var k = 2600 / (Math.sqrt(pd) + 10); ax -= px * k; ay -= py * k; f.panic = 1; }
      if (splash.t > 0) { var sx = splash.x - f.x, sy = splash.y - f.y, sd = sx * sx + sy * sy; if (sd < 150 * 150) { var k2 = 3200 / (Math.sqrt(sd) + 10); ax -= sx * k2; ay -= sy * k2; f.panic = 1; } }
      if (lure.on) { var lx = lure.x - f.x, ly = lure.y - f.y, ld = lx * lx + ly * ly; if (ld < 160 * 160 && ld > 14 * 14) { ax += lx * 0.9; ay += ly * 0.9; } }
      ax += (hash(i, Math.floor(t * 2), 3) - 0.5) * 60; ay += (hash(i, Math.floor(t * 2), 5) - 0.5) * 30;
      f.vx += ax * dt; f.vy += ay * dt; f.vy *= 0.96;
      var sp = Math.hypot(f.vx, f.vy), max = f.panic > 0 ? 95 : 34, min = 12;
      if (sp > max) { f.vx *= max / sp; f.vy *= max / sp; } else if (sp < min) { f.vx *= min / (sp || 1); f.vy *= min / (sp || 1); }
      f.panic = Math.max(0, f.panic - dt * 0.8);
      f.x += f.vx * dt; f.y += f.vy * dt;
      if (f.y < lo) { f.y = lo; f.vy = Math.abs(f.vy) * 0.5; } if (f.y > hi) { f.y = hi; f.vy = -Math.abs(f.vy) * 0.5; }
      if (f.x < -20) f.x = W + 20; if (f.x > W + 20) f.x = -20;
    }
  }
  function drawSmall() { for (var i = 0; i < small.length; i++) { var f = small[i], c = Math.floor(f.x / CW), r = Math.floor(f.y / CH); if (r <= sr) continue; var j = r * cols + c; if (c < 0 || c >= cols || r >= rows || glyph[j]) continue; put(c, r, Math.abs(f.vy) > Math.abs(f.vx) * 0.9 ? (f.vy < 0 ? "'" : ',') : '-', f.panic > 0 ? 0 : 1); } }

  // ---- water, boat, Pepe, rod, line, hook
  function drawWater() {
    var drift = Math.floor(t * 1.6);
    for (var c = 0; c < cols; c++) { if (c >= boatL - 1 && c <= boatR + 1) continue; var h = hash(c, drift, 1); if (h < 0.3) put(c, sr, h < 0.12 ? '.' : '-', 1); }
    for (var r = sr + 1; r < rows; r++) { var depth = (r - sr) / Math.max(1, rows - sr); for (var c2 = 0; c2 < cols; c2++) { var h2 = hash(c2, r, 7 + Math.floor(t * 0.5)); if (h2 < 0.012 + 0.05 * depth) put(c2, r, h2 < 0.01 ? ',' : '.', 2); } }
  }
  function drawBoat() {
    var w = boatR - boatL;
    put(boatL - 1, sr - 2, '\\', 0); put(boatR + 1, sr - 2, '/', 0);
    for (var c = boatL; c <= boatR; c++) put(c, sr - 1, c === boatL ? '\\' : c === boatR ? '/' : '8', 0);
    for (var c2 = boatL + 1; c2 < boatR; c2++) put(c2, sr, c2 === boatL + 1 ? '\\' : c2 === boatR - 1 ? '/' : '#', 0);
    for (var c3 = boatL + 3; c3 < boatR - 2; c3++) put(c3, sr + 1, c3 === boatL + 3 ? "'" : c3 === boatR - 3 ? "'" : '-', 1);
  }
  function drawPepe() { var fr = PEPE[pepeFrame]; for (var r = 0; r < fr.length; r++) { var line = fr[r]; for (var c = 0; c < line.length; c++) if (line[c] !== ' ') put(pc + c, pr + r, line[c], 0); } }
  function drawBanks() {
    // Sparse canopy at the edges leaves the landing copy and fishing line clear.
    for (var side = 0; side < 2; side++) {
      for (var r = 1; r < 5; r++) for (var c = 0; c < Math.min(15, Math.floor(cols * .18)); c++) {
        if (hash(c, r, side + 51) < .58 - r * .08) put(side ? cols - c - 1 : c, r, r < 3 ? 'S' : ':', 2);
      }
      for (var k = 0; k < 5; k++) {
        var stem = side ? cols - 2 - k : 1 + k, height = 2 + k % 3;
        for (var j = 0; j < height; j++) put(stem, sr - 1 - j, j === height - 1 && k % 2 ? 'S' : '|', 1);
        put(stem + (side ? -1 : 1), sr - height + 1, side ? '/' : '\\', 1);
      }
      text(side ? cols - 7 : 0, sr, '.:;SS;:', 1);
    }
    // A small, distant rowboat on the far bank, well above the main water line.
    var distant = Math.round(cols * .14);
    text(distant, sr - 5, ' .|.', 2);
    text(distant - 1, sr - 4, '\\SSSS/', 1);
    text(distant, sr - 3, "'--'", 2);
    // One or two additional birds above the canopy, using only untiled strokes.
    var birdC = cols - 15 + Math.round(Math.sin(t * .12) * 2), flap = Math.floor(t * 2) % 2 ? '\\v/' : '_v_';
    text(birdC, 1, flap, 1);
    if (cols > 60) text(birdC - 7, 2, flap, 2);
  }
  function lineCells(c0: number, r0: number, c1: number, r1: number, fn: (c: number, r: number, dc: number, dr: number) => void) { var dc = c1 - c0, dr = r1 - r0, n = Math.max(Math.abs(dc), Math.abs(dr)) || 1; for (var i = 0; i <= n; i++) fn(Math.round(c0 + dc * i / n), Math.round(r0 + dr * i / n), dc, dr); }
  function strokeGlyph(dc: number, dr: number) { var ad = Math.abs(dc), ar = Math.abs(dr); if (ar < ad * 0.45) return '_'; if (ad < ar * 0.45) return '|'; return (dc < 0) === (dr < 0) ? '\\' : '/'; }
  function drawRod() { var dc = tip.c - hand.c, dr = tip.r - hand.r, n = Math.abs(dc) || 1, prev: number | null = null; if (Math.abs(dr) > Math.abs(dc)) { lineCells(hand.c, hand.r, tip.c, tip.r, function (c, r) { put(c, r, '|', 0); }); return; }
    for (var i = 0; i <= n; i++) { var c = hand.c + Math.sign(dc) * i, r = Math.round(hand.r + dr * i / n); put(c, r, prev !== null && r !== prev ? ((dc < 0) === (dr < 0) ? '\\' : '/') : '_', 0); prev = r; } }
  function drawLine() {
    if (state === 'fly') { // an arc from the tip to the hook
      var n = 14, k = fly.k; for (var i = 0; i <= n; i++) { var u = i / n; if (u > k) break; var c = tip.c + (fly.toC - tip.c) * u, r = tip.r + (fly.toR - tip.r) * u - 7 * Math.sin(Math.PI * u); put(Math.round(c), Math.round(r), '.', 1); }
      return;
    }
    lineCells(tip.c, tip.r, hook.c, Math.min(hook.r - 1, sr - 1), function (c, r, dc, dr) { put(c, r, strokeGlyph(dc, dr) === '_' ? '-' : strokeGlyph(dc, dr), 1); });
    if (hook.r > sr) for (var r2 = sr; r2 < hook.r - 1; r2++) put(hook.c, r2, '|', 1);
  }
  function drawHook() { put(hook.c, hook.r - 1, '|', 0); put(hook.c, hook.r, 'J', 0); if (state === 'bite' || state === 'reel' || state === 'cheer') { text(hook.c - 2, hook.r + (state === 'cheer' ? -1 : 0), '><>', 0); } }
  var splash = { x: 0, y: 0, t: 0 }, splashes: { x: number; t: number }[] = [];
  function splashAt(x: number) { if (reduce) return; splash.x = x; splash.y = sr * CH; splash.t = 1; splashes.push({ x: x, t: 1 }); }
  function drawSplash() {
    for (var i = splashes.length - 1; i >= 0; i--) { var s = splashes[i]; if (s.t <= 0) { splashes.splice(i, 1); continue; }
      var c = Math.round(s.x / CW), r = sr, age = 1 - s.t;
      if (age < 0.25) { put(c, r - 1, '*', 0); text(c - 1, r, '(.)', 0); }
      else if (age < 0.5) { text(c - 2, r, '( o )', 0); put(c, r - 1, "'", 1); }
      else if (age < 0.8) { text(c - 3, r, '(  .  )', 1); }
      else text(c - 4, r, '.       .', 2); }
  }

  // ---- life on the left: a fish that jumps now and then, bubbles, birds, a frog on a pad
  var jump = { on: false, x: 0, dir: 1, t: 0, next: 3.5 }, bubbles: { x: number; y: number; t: number }[] = [], birds = { on: false, x: 0, next: 9 }, frog = { blink: 0, next: 4 };
  function stepLife(dt: number) {
    jump.next -= dt; if (!jump.on && jump.next <= 0) { jump.on = true; jump.t = 0; jump.dir = Math.random() < 0.5 ? 1 : -1; jump.x = W * (0.08 + Math.random() * 0.5); splashAt(jump.x); }
    if (jump.on) { jump.t += dt / 1.1; if (jump.t >= 1) { jump.on = false; jump.next = 6 + Math.random() * 8; splashAt(jump.x + jump.dir * 7 * CW); } }
    for (var k = 0; k < bigFish.length; k++) { var f = bigFish[k]; if (hash(k, Math.floor(t * 2), 21) < 0.08 && bubbles.length < 24) bubbles.push({ x: f.x + f.dir * 2, y: f.y - 4, t: 0 }); }
    for (var i = bubbles.length - 1; i >= 0; i--) { var b = bubbles[i]; b.t += dt; b.y -= 11 * dt; b.x += Math.sin(b.t * 5 + i) * 6 * dt; if (b.y < (sr + 1) * CH || b.t > 4) bubbles.splice(i, 1); }
    birds.next -= dt; if (!birds.on && birds.next <= 0) { birds.on = true; birds.x = -60; } if (birds.on) { birds.x += 28 * dt; if (birds.x > W * 0.7) { birds.on = false; birds.next = 18 + Math.random() * 14; } }
    frog.next -= dt; if (frog.next <= 0) { frog.blink = 0.25; frog.next = 3 + Math.random() * 4; } frog.blink = Math.max(0, frog.blink - dt);
  }
  function drawLife() {
    if (jump.on) { var u = jump.t, jx = jump.x + jump.dir * 7 * CW * u, jy = sr * CH - 5.5 * CH * Math.sin(Math.PI * u); text(Math.round(jx / CW) - 1, Math.round(jy / CH), jump.dir > 0 ? '><>' : '<><', 0); }
    for (var i = 0; i < bubbles.length; i++) { var b = bubbles[i]; put(Math.round(b.x / CW), Math.round(b.y / CH), b.t < 1.2 ? '.' : b.t < 2.4 ? ':' : "'", 2); }
    if (birds.on) { var flap = Math.floor(t * 3) % 2 ? '\\v/' : '_v_', bc = Math.round(birds.x / CW); text(bc, 3, flap, 1); text(bc + 5, 4, flap, 1); text(bc + 9, 2, flap, 1); }
    var fc = Math.round(cols * 0.06), fr2 = sr; text(fc, fr2, '.:SSSS:.', 1); text(fc + 1, fr2 - 1, frog.blink > 0 ? '(-)(-)' : '(o)(o)', 0);
  }

  // ---- the cast: a state machine driven by time
  var state: CastState = 'idle', st = 0, pepeFrame: 'idle' | 'windup' | 'cheer' = 'idle', queue = 0;
  var idleTip = { c: 0, r: 0 }, idleHook = { c: 0, r: 0 }, tip = { c: 0, r: 0 }, hook = { c: 0, r: 0 }, fly = { toC: 0, toR: 0, k: 0 }, lure = { x: 0, y: 0, on: false };
  const DUR = CAST_DURATIONS;
  function cast() { if (destroyed || reduce) return; if (state !== 'idle') { if (queue < 3) queue++; return; } enter('windup'); }
  function enter(s: CastState) { state = s; st = 0; canvas.dataset.state = s;
    host.dispatchEvent(new CustomEvent('pond:state', { detail: { state: s, time: t } }));
    if (s === 'windup') { pepeFrame = 'windup'; tip.c = hand.c - 10; tip.r = hand.r - 8; hook.c = tip.c - 1; hook.r = tip.r + 3; }
    if (s === 'fly') { pepeFrame = 'idle'; tip.c = hand.c - 18; tip.r = hand.r - 6; fly.toC = hand.c - 36 - Math.floor(Math.random() * 12); fly.toR = sr; fly.k = 0; hook.c = tip.c; hook.r = tip.r; }
    if (s === 'splash') { hook.c = fly.toC; hook.r = sr; splashAt(hook.c * CW); }
    if (s === 'sink') { tip.c = idleTip.c; tip.r = idleTip.r; }
    if (s === 'wait') { lure.on = true; lure.x = hook.c * CW; lure.y = hook.r * CH; }
    if (s === 'bite') { lure.on = false; }
    if (s === 'cheer') { pepeFrame = 'cheer'; hook.c = idleHook.c; hook.r = sr - 2; }
    if (s === 'idle') { pepeFrame = 'idle'; tip.c = idleTip.c; tip.r = idleTip.r; hook.c = idleHook.c; hook.r = idleHook.r; if (queue > 0) { queue--; enter('windup'); } }
  }
  function stepCast(dt: number) {
    st += dt; if (splash.t > 0) splash.t -= dt * 1.4; for (var si = 0; si < splashes.length; si++) splashes[si].t -= dt * 1.4;
    if (state === 'idle') { hook.r = idleHook.r + (Math.sin(t * 1.3) > 0.6 ? 1 : 0); return; }
    var u = Math.min(1, st / DUR[state]);
    if (state === 'windup') { tip.c = hand.c - 10 - Math.round(2 * u); tip.r = hand.r - 8 - Math.round(4 * u); hook.c = tip.c - 1; hook.r = tip.r + 3; }
    if (state === 'fly') { fly.k = u; hook.c = Math.round(tip.c + (fly.toC - tip.c) * u); hook.r = Math.round(tip.r + (fly.toR - tip.r) * u - 7 * Math.sin(Math.PI * u)); }
    if (state === 'sink') { hook.r = sr + Math.round(6 * u); }
    if (state === 'bite') { hook.r += (Math.floor(st * 12) % 2) ? 1 : -1; hook.r = Math.max(sr + 3, Math.min(sr + 8, hook.r)); }
    if (state === 'reel') { hook.r = Math.round((sr + 6) - (sr + 6 - (sr - 2)) * u); hook.c = Math.round(fly.toC + (idleHook.c - fly.toC) * u); }
    if (u >= 1) { var next = NEXT_STATE[state]; enter(next); }
  }

  // ---- frame
  function step(dt: number) { t += dt; stepBigFish(dt); stepSmall(dt); stepCast(dt); stepLife(dt); if (onTick) onTick(t); }
  function draw() {
    if (!N) return;
    clearCells(); drawWater(); drawBanks(); drawBigFish(); drawSmall(); drawLife(); drawPepe(); drawBoat(); drawRod(); drawLine(); drawHook(); drawSplash();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.font = '13px VT323, "Courier New", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (var lv = 1; lv <= 3; lv++) { ctx.fillStyle = 'rgba(21,19,15,' + ALPHA[lv] + ')'; for (var i = 0; i < N; i++) if (level[i] === lv) ctx.fillRect((i % cols) * CW, Math.floor(i / cols) * CH, CW, CH); }
    for (var tn = 0; tn < 3; tn++) { ctx.fillStyle = INK[tn]; for (var j = 0; j < N; j++) if (glyph[j] && tone[j] === tn) ctx.fillText(String.fromCharCode(glyph[j]), (j % cols) * CW + CW / 2, Math.floor(j / cols) * CH + CH / 2 + 1); }
  }
  var frames = 0;
  function tick() { if (destroyed || !visible || document.hidden) { last = performance.now(); return; } frames++; canvas.dataset.frames = String(frames); var now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now; step(dt); draw(); }
  function start() { if (reduce || destroyed || raf) return; last = performance.now(); raf = window.setInterval(tick, 33); }
  function animateAnyway() { reduce = false; start(); }

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const onMotion = (event: MediaQueryListEvent) => {
    if (event.matches) { reduce = true; window.clearInterval(raf); raf = 0; queue = 0; enter('idle'); draw(); }
    else if (!paused) { reduce = false; start(); }
    onMotionChange?.(reduce);
  };
  let paused = false;
  let onMotionChange: ((reduced: boolean) => void) | undefined;
  motion.addEventListener('change', onMotion);
  var ro = new ResizeObserver(resize); ro.observe(host);
  var io = new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); }); io.observe(host);
  const onPointerMove = (e: PointerEvent) => { var b = canvas.getBoundingClientRect(); pointer.x = e.clientX - b.left; pointer.y = e.clientY - b.top; pointer.on = e.pointerType !== 'touch'; };
  const onPointerLeave = () => { pointer.on = false; };
  host.addEventListener('pointermove', onPointerMove, { passive: true });
  host.addEventListener('pointerleave', onPointerLeave);
  canvas.dataset.state = 'idle'; canvas.dataset.frames = '0';
  resize(); draw();
  document.fonts?.load('13px VT323').then(() => { if (!destroyed && reduce) draw(); });
  start();
  return {
    cast, splashAt,
    reduced: () => reduce,
    animateAnyway: () => { paused = false; animateAnyway(); onMotionChange?.(false); },
    pause: () => { paused = true; reduce = true; window.clearInterval(raf); raf = 0; onMotionChange?.(true); },
    onMotionChange: (callback: (reduced: boolean) => void) => { onMotionChange = callback; },
    snapshot: () => ({ state, time: t, frames, queue, visible, reduced: reduce, cols, rows, surface: sr, pointer: { ...pointer }, smallFish: small.map(f => ({ ...f })), bigFish: bigFish.map(f => ({ ...f })), hook: { ...hook }, splash: { ...splash } }),
    destroy: () => {
      destroyed = true; window.clearInterval(raf); ro.disconnect(); io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      motion.removeEventListener('change', onMotion);
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerleave', onPointerLeave);
    },
  };
}
