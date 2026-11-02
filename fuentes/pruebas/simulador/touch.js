const {chromium, devices} = require("playwright");
const F = "file:///home/user/VIVALDI/entregables/simulador/Simulador-3D-Lotes-Vivaldi.html";
(async () => { const b = await chromium.launch({args: ["--use-gl=swiftshader"]}); const errs = [];
  const ctx = await b.newContext({...devices["iPhone 14"]}); const p = await ctx.newPage(); p.on("pageerror", e => errs.push(e.message));
  await p.goto(F); await p.waitForTimeout(7000);
  const cdp = await ctx.newCDPSession(p);
  const touch = async (type, pts) => cdp.send("Input.dispatchTouchEvent", {type, touchPoints: pts.map(([x, y], i) => ({x, y, id: i}))});
  const cam = () => p.evaluate(() => __sim.cam.position.toArray().map(v => +v.toFixed(1)).join(","));
  console.log("inicio", await cam());
  await touch("touchStart", [[200, 500]]); for (let i = 1; i <= 8; i++) { await touch("touchMove", [[200 + i * 15, 500]]); await p.waitForTimeout(60); } await touch("touchEnd", []); await p.waitForTimeout(1200);
  console.log("girar", await cam());
  await touch("touchStart", [[150, 450], [250, 550]]); for (let i = 1; i <= 8; i++) { await touch("touchMove", [[150 - i * 8, 450 - i * 8], [250 + i * 8, 550 + i * 8]]); await p.waitForTimeout(60); } await touch("touchEnd", []); await p.waitForTimeout(1200);
  console.log("pellizcar", await cam());
  for (const sel of ["#modes button[data-m=site]", "#modes button[data-m=walk]", "#modes button[data-m=cut]", "#timeSw button[data-t=tarde]", "#modes button[data-m=xray]", "#modes button[data-m=plan]", "#modes button[data-m=ext]", "#maqBtn"]) {
    await p.tap(sel); await p.waitForTimeout(700); }
  const im = await p.locator("#maqImg").boundingBox(); await p.touchscreen.tap(im.x + im.width * 0.5, im.y + im.height * 0.3); await p.waitForTimeout(300);
  console.log("marca", await p.evaluate(() => JSON.stringify(__sim.state.mark)));
  await p.tap("#maqDlg .btn:not(.ghost)"); await p.waitForTimeout(300);
  // recorrer con el dedo: mirar y joystick
  await p.tap("#modes button[data-m=walk]"); await p.waitForTimeout(600);
  const y0 = await p.evaluate(() => __sim.walk.yaw);
  await touch("touchStart", [[300, 400]]); for (let i = 1; i <= 6; i++) { await touch("touchMove", [[300 - i * 15, 400]]); await p.waitForTimeout(60); } await touch("touchEnd", []);
  console.log("mirar yaw", y0.toFixed(2), "->", (await p.evaluate(() => __sim.walk.yaw)).toFixed(2));
  const j = await p.locator("#joy").boundingBox(); const jx = j.x + j.width / 2, jy = j.y + j.height / 2;
  const z0 = await p.evaluate(() => __sim.walk.z);
  await touch("touchStart", [[jx, jy]]); await touch("touchMove", [[jx, jy - 35]]); await p.waitForTimeout(3000); await touch("touchEnd", []);
  console.log("joystick z", z0.toFixed(2), "->", (await p.evaluate(() => __sim.walk.z)).toFixed(2));
  // el panel de configuración se desplaza
  await p.tap(".tabs button[data-t=conf]"); await p.waitForTimeout(300);
  const sc = await p.evaluate(() => { const a = document.querySelector("aside.left, #left, aside"); a.scrollTop = 400; return a.scrollTop; });
  console.log("scroll config", sc);
  console.log("errors", errs); await b.close(); })();
