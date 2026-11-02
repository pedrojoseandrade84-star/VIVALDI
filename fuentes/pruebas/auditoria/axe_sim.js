const {chromium, devices} = require("playwright"); const fs = require("fs");
(async () => { const b = await chromium.launch({args:["--use-gl=swiftshader","--enable-webgl","--ignore-gpu-blocklist"]});
  for (const [dev, vp] of [["desktop", {viewport: {width: 1366, height: 900}}], ["Pixel 7", devices["Pixel 7"]]]) {
    const p = await (await b.newContext(vp)).newPage(); await p.route(/^https?:/, r => r.abort());
    await p.goto("file://" + process.argv[2], {waitUntil: "domcontentloaded", timeout: 90000}); await p.waitForTimeout(9000);
    if (process.argv[3] === "exit") await p.evaluate(() => { document.getElementById("gxExit").hidden = false; });
    await p.addScriptTag({content: fs.readFileSync(__dirname + "/../npmdl/axe/package/axe.min.js", "utf8")});
    const r = await p.evaluate(async () => (await axe.run(document, {resultTypes: ["violations"]})).violations.map(v => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.nodes[0].target.join(" ")}`));
    console.log(dev, r.length ? r : "sin violaciones"); }
  await b.close(); })();
