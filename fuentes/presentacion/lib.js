// Grabación cuadro a cuadro (CDP screencast) con cursor visible; arma MP4 con ffmpeg.
const fs = require('fs'), {execSync} = require('child_process');
const CURSOR = `(() => { if (window.__cur) return; window.__cur = 1; const mk = () => { const c = document.createElement('div'); c.id = '__cursor';
  c.style.cssText = 'position:fixed;left:0;top:0;width:28px;height:28px;z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px);transition:none';
  c.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M3 2l7 19 2.6-7.4L20 11z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  document.documentElement.appendChild(c);
  addEventListener('mousemove', e => { c.style.transform = 'translate(' + (e.clientX - 3) + 'px,' + (e.clientY - 2) + 'px)'; }, true);
  addEventListener('mousedown', e => { const r = document.createElement('div'); r.style.cssText = 'position:fixed;z-index:2147483646;pointer-events:none;left:' + (e.clientX - 22) + 'px;top:' + (e.clientY - 22) + 'px;width:44px;height:44px;border-radius:50%;border:3px solid #E8A93A;background:rgba(232,169,58,.25);transform:scale(.3);opacity:1;transition:transform .45s ease-out,opacity .5s ease-out';
    document.documentElement.appendChild(r); requestAnimationFrame(() => { r.style.transform = 'scale(1.4)'; r.style.opacity = '0'; }); setTimeout(() => r.remove(), 600); }, true); };
  if (document.documentElement) mk(); else addEventListener('DOMContentLoaded', mk); })();`;
async function recorder(page, dir) {
  fs.rmSync(dir, {recursive: true, force: true}); fs.mkdirSync(dir, {recursive: true});
  const cdp = await page.context().newCDPSession(page), frames = []; let n = 0, on = false;
  cdp.on('Page.screencastFrame', async f => { if (on) { const file = `${dir}/f${String(n++).padStart(5, '0')}.jpg`; fs.writeFileSync(file, Buffer.from(f.data, 'base64')); frames.push({file, t: Date.now() / 1000}); }
    try { await cdp.send('Page.screencastFrameAck', {sessionId: f.sessionId}); } catch (e) {} });
  return {
    async start() { on = true; await cdp.send('Page.startScreencast', {format: 'jpeg', quality: 88, everyNthFrame: 1}); },
    async stop() { const end = Date.now() / 1000; await cdp.send('Page.stopScreencast'); on = false; return {frames, end}; }
  };
}
function build(rec, out, {w = 1600, h = 900, t0, hold = 1.2} = {}) {
  const {frames, end} = rec; if (!frames.length) throw new Error('sin cuadros');
  const start = t0 || frames[0].t; let txt = '';
  frames.forEach((f, i) => { const next = i + 1 < frames.length ? frames[i + 1].t : end + hold; const d = Math.max(0.001, next - (i === 0 ? start : Math.max(f.t, start))); txt += `file '${f.file}'\nduration ${d.toFixed(3)}\n`; });
  txt += `file '${frames[frames.length - 1].file}'\n`;
  const lst = out + '.txt'; fs.writeFileSync(lst, txt);
  execSync(`ffmpeg -y -loglevel error -f concat -safe 0 -i ${lst} -vf "scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=white,fps=30,format=yuv420p" -c:v libx264 -preset slow -crf 24 -profile:v high -level 4.1 -movflags +faststart ${out}`);
  return out;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function moveTo(page, target, steps = 28) { const b = typeof target === 'string' ? await page.locator(target).first().boundingBox() : target; if (!b) return null;
  const x = b.x + (b.width || 0) / 2, y = b.y + (b.height || 0) / 2; await page.mouse.move(x, y, {steps}); return {x, y}; }
async function click(page, target, pause = 450) { const p = await moveTo(page, target); if (!p) throw new Error('no encontrado: ' + target); await sleep(180); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(pause); }
async function smoothScroll(page, toY, ms = 1400) { await page.evaluate(async ([toY, ms]) => { const y0 = scrollY, t0 = performance.now(); await new Promise(r => { const f = t => { const p = Math.min(1, (t - t0) / ms), e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; scrollTo(0, y0 + (toY - y0) * e); p < 1 ? requestAnimationFrame(f) : r(); }; requestAnimationFrame(f); }); }, [toY, ms]); }
async function scrollToEl(page, sel, off = 90, ms = 1400) { await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; document.body.style.scrollBehavior = 'auto'; });
  const pos = () => page.evaluate(([s, o]) => { const e = document.querySelector(s); return e ? e.getBoundingClientRect().top + scrollY - o : null; }, [sel, off]);
  let y = await pos(); if (y === null) return; await smoothScroll(page, y, ms); await sleep(250); y = await pos(); const cur = await page.evaluate(() => scrollY); if (Math.abs(y - cur) > 4) await smoothScroll(page, y, 500); }
async function type(page, sel, text, delay = 70) { await click(page, sel, 150); await page.keyboard.type(text, {delay}); }
async function preload(page) { await page.evaluate(async () => { document.documentElement.style.scrollBehavior = 'auto'; const H = document.documentElement.scrollHeight; for (let y = 0; y < H; y += 500) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } scrollTo(0, 0); }); await sleep(1200); }
module.exports = {preload, CURSOR, recorder, build, sleep, moveTo, click, smoothScroll, scrollToEl, type};
