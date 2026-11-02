# Arma el video del simulador a 30 fps desde timeline.json: cursor animado, clic con onda y giros de cámara dentro de la página.
import json, os, shutil, subprocess, math
from PIL import Image, ImageDraw
D = os.path.dirname(os.path.abspath(__file__)); OUT = D + '/sv'; shutil.rmtree(OUT, ignore_errors=True); os.makedirs(OUT)
TL = json.load(open(D + '/timeline.json')); FPS = 30; W, H = 1600, 900; S = W / 1280
def cursor_img():
    s = 4; im = Image.new('RGBA', (28 * s, 28 * s), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    pts = [(3, 2), (10, 21), (12.6, 13.6), (20, 11)]; P = [(x * s * 28 / 24, y * s * 28 / 24) for x, y in pts]
    d.polygon(P, fill=(255, 255, 255, 255)); d.line(P + [P[0]], fill=(255, 255, 255, 255), width=int(3.2 * s))
    Q = [((x - 3) * .82 + 3, (y - 2) * .82 + 2) for x, y in pts]; d.polygon([(x * s * 28 / 24 + 2, y * s * 28 / 24 + 3) for x, y in Q], fill=(17, 17, 17, 255))
    return im.resize((int(28 * S * 1.15), int(28 * S * 1.15)), Image.LANCZOS)
CUR = cursor_img(); n = 0; cur = [900, 420]; last = None
def emit(base, c, ripple=None):
    global n
    im = base.copy()
    if ripple is not None:
        k, (rx, ry) = ripple; r = (8 + 26 * k) * S; a = int(255 * (1 - k)); ov = Image.new('RGBA', im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
        d.ellipse([rx * S - r, ry * S - r, rx * S + r, ry * S + r], outline=(232, 169, 58, a), width=int(4 * S), fill=(232, 169, 58, int(a * .25))); im = Image.alpha_composite(im, ov)
    im.alpha_composite(CUR, (int(c[0] * S - 3 * S), int(c[1] * S - 2 * S)))
    im.convert('RGB').save(f'{OUT}/f{n:05d}.jpg', quality=90); n += 1
def load(p): return Image.open(p).convert('RGBA').resize((W, H), Image.LANCZOS)
for st in TL:
    if st['t'] == 'still':
        last = load(st['img']); c = st.get('cur') or cur; cur = list(c)
        for _ in range(max(1, round(st['dur'] * FPS))): emit(last, cur)
    elif st['t'] == 'move' and last is not None:
        x0, y0 = cur; x1, y1 = st['to']; N = 16
        for i in range(1, N + 1):
            t = i / N; e = 2 * t * t if t < .5 else 1 - (-2 * t + 2) ** 2 / 2; emit(last, [x0 + (x1 - x0) * e, y0 + (y1 - y0) * e])
        cur = [x1, y1]
    elif st['t'] == 'click' and last is not None:
        for i in range(10): emit(last, cur, (i / 9, st['at']))
    elif st['t'] == 'orbit':
        base = load(st['base']); x, y, w, h = st['rect']; cur = st.get('cur') or cur
        for f in st['imgs']:
            fr = Image.open(f).convert('RGBA').resize((round(w * S), round(h * S)), Image.LANCZOS); b2 = base.copy(); b2.alpha_composite(fr, (round(x * S), round(y * S))); emit(b2, cur); last = b2
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', OUT + '/f%05d.jpg', '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-profile:v', 'high', '-level', '4.1', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', D + '/sim.mp4'], check=True)
print('cuadros', n, 'segundos', round(n / FPS, 1))
