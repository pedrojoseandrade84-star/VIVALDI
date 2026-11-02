// Video que avanza solo: cada diapositiva como imagen 1920x1080; en las de demostración, la grabación real a pantalla completa.
const {chromium} = require('playwright'); const fs = require('fs'); const {execSync} = require('child_process'); const D = __dirname + '/av'; fs.rmSync(D, {recursive: true, force: true}); fs.mkdirSync(D);
const R = __dirname + '/../rec';
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({viewport: {width: 1920, height: 1080}})).newPage();
  await p.goto('file://' + __dirname + '/tv_demo.html#1', {waitUntil: 'domcontentloaded', timeout: 300000}); await p.waitForTimeout(4000);
  await p.addStyleTag({content: '#prog,#hint,#nx,#pv,.nav,.ctl{display:none!important} .demo .vid video{display:none!important} .demo .vid img.pst{display:block!important}'});
  const n = await p.evaluate(() => document.querySelectorAll('.s').length); const segs = [];
  for (let i = 1; i <= n; i++) { await p.evaluate(i => { location.hash = '#' + i; dispatchEvent(new HashChangeEvent('hashchange')); }, i); await p.keyboard.type(String(i)); await p.keyboard.press('Enter'); await p.waitForTimeout(700);
    const demo = await p.evaluate(() => { const s = document.querySelector('.s.on'); if (!s || !s.classList.contains('demo')) return null; const v = s.querySelector('video'); return v ? v.getAttribute('data-name') : 'x'; });
    const f = `${D}/s${String(i).padStart(2, '0')}.png`; await p.screenshot({path: f}); segs.push({img: f, demo}); }
  await b.close();
  const names = {7: 'web', 9: 'tool', 11: 'db', 15: 'sim'}; // se corrige abajo según data-name
  let X = 0.6, parts = [], i = 0;
  for (const s of segs) { i++; const dur = s.demo ? 5 : 11; parts.push({kind: 'img', file: s.img, dur}); if (s.demo && fs.existsSync(`${R}/${s.demo}.mp4`)) parts.push({kind: 'vid', file: `${R}/${s.demo}.mp4`}); }
  const args = ['-y', '-loglevel', 'error']; parts.forEach(pt => { if (pt.kind === 'img') args.push('-loop', '1', '-t', String(pt.dur), '-i', pt.file); else args.push('-i', pt.file); });
  args.push('-f', 'lavfi', '-t', '9999', '-i', 'anullsrc=r=48000:cl=stereo');
  const dur = pt => pt.kind === 'img' ? pt.dur : parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${pt.file}"`).toString());
  const f = []; parts.forEach((pt, k) => f.push(`[${k}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=white,fps=30,settb=AVTB,format=yuv420p[v${k}]`));
  let prev = '[v0]', off = dur(parts[0]) - X; for (let k = 1; k < parts.length; k++) { const out = `[x${k}]`; f.push(`${prev}[v${k}]xfade=transition=fade:duration=${X}:offset=${off.toFixed(2)}${out}`); prev = out; off += dur(parts[k]) - X; }
  const total = off + X; f.push(`${prev}format=yuv420p[vo]`);
  args.push('-filter_complex', f.join(';'), '-map', '[vo]', '-map', `${parts.length}:a`, '-t', total.toFixed(2), '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.1', '-preset', 'medium', '-crf', '21', '-r', '30', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', __dirname + '/Presentacion-Vivaldi-video.mp4');
  execSync('ffmpeg ' + args.map(a => /[\s;\[\]()]/.test(a) ? `"${a}"` : a).join(' '), {maxBuffer: 1e8}); console.log('partes', parts.length, 'segundos', total.toFixed(0)); })();
