// Prueba de "Conectar datos": CSV de otro CRM, Excel de lotes con otros nombres de columna, duplicados, deshacer,
// sincronización con Google Sheets y conector para otros sistemas. Uso: node tconectar.js [ruta de la herramienta]
const {chromium} = require('playwright'); const {execSync} = require('child_process'); const fs = require('fs'); const path = require('path');
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const TMP = path.join(__dirname, '.tconectar'); fs.mkdirSync(TMP, {recursive: true});
// Excel de lotes con columnas en otro orden y con otros nombres
execSync(`python3 -c "
import openpyxl
wb=openpyxl.Workbook(); ws=wb.active; ws.title='Stock'
ws.append(['Reporte de stock noviembre']); ws.append([])
ws.append(['Proyecto','Mz','Lt','Metraje','Precio de lista','Disponibilidad','Vista'])
ws.append(['Planicie','C','1',200,'S/ 31,500','Libre','Frente al parque'])
ws.append(['La Planicie de Asia','C','2',200,29000,'Reservado','Interior'])
ws.append(['', 'C','3',200,29000,'Vendido',''])
ws.append(['Proyecto X','Z','9',100,1000,'Libre',''])
wb.save('${TMP}/stock.xlsx')"`);
// CSV exportado de otro CRM: separado por punto y coma, en Windows-1252, con columnas desordenadas
const csv = 'Fecha de registro;Nombres y apellidos;Teléfono;Status;Vendedor;Proyecto de interés;Observaciones\r\n' +
  '03/11/2026;María Pérez Quispe;+51 987 654 321;Interesado;Rosa Quispe;Planicie;Pidió precios\r\n' +
  '05/11/2026;Juan Ríos;912-345-678;Visita agendada;Carlos Medina;Terrazas de Cerro Azul;\r\n' +
  '06/11/2026;Lucía Gómez;955111222;Separó;Diana Ríos;Portada del Sol;Separó el lote B-4\r\n' +
  '07/11/2026;;;Nuevo;;;fila vacía\r\n' +
  '08/11/2026;María Pérez Q.;987654321;Contactado;;;Repetida\r\n';
fs.writeFileSync(path.join(TMP, 'leads.csv'), Buffer.from(csv, 'latin1'));
let sheet = 'Nombre,Celular,Estado,Proyecto\nPedro Salas,944000111,Nuevo,Lirios\n';

(async () => { const b = await chromium.launch(); const c = await b.newContext({viewport: {width: 1366, height: 900}}); const p = await c.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => { errs.push('dialogo: ' + d.message()); d.accept(); });
  await c.route(/^https?:/, r => { const u = r.request().url(); if (u.startsWith('https://docs.google.com/')) return r.fulfill({status: 200, contentType: 'text/csv', body: sheet}); r.abort(); });
  const F = process.argv[2] && process.argv[2].endsWith('.html') ? process.argv[2] : '/home/user/VIVALDI/entregables/software/planicie-herramienta-final.html';
  await p.goto('file://' + F); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  ok(await p.$('#conectar') !== null, 'la sección Conectar datos existe');
  ok(await p.evaluate(() => !!document.querySelector('#navMenu a[href="#conectar"]')), 'aparece en el menú');
  await p.evaluate(() => document.getElementById('conectar').scrollIntoView());
  await p.setInputFiles('#cnFile', path.join(TMP, 'leads.csv')); await p.waitForTimeout(800);
  const map = await p.$$eval('#cnPrev select[data-i]', s => s.map(x => x.value));
  ok(JSON.stringify(map) === JSON.stringify(['created', 'name', 'phone', 'stage', 'adv', 'proj', 'notes']), 'reconoce todas las columnas del CSV: ' + map.join(','));
  ok(await p.getAttribute('#cnPrev [data-ty="clientes"]', 'aria-pressed') === 'true', 'detecta que son clientes');
  const sum = await p.textContent('#cnPrev .cn-sum'); ok(/3 nuevos/.test(sum) && /2 se omiten/.test(sum), 'resumen: 3 nuevos y 2 omitidos (sin datos y repetido): ' + sum);
  ok(/María Pérez Quispe/.test(await p.textContent('#cnPrev table')), 'lee bien las tildes (Windows-1252)');
  await p.click('#cnGo'); await p.waitForTimeout(400);
  const cl = await p.evaluate(() => CLIENTS.map(c => [c.name, c.phone, c.stage, c.proj, c.adv, c.created]));
  ok(cl.length === 3, 'importa 3 clientes');
  const m = cl.find(x => x[0] === 'María Pérez Quispe') || [];
  ok(m[1] === '987654321' && m[2] === 'Nuevo' && m[3] === 'La Planicie de Asia' && m[4] === 'Rosa Quispe' && m[5] === '2026-11-03', 'normaliza celular, etapa, proyecto, asesor y fecha: ' + m.join(' | '));
  ok((cl.find(x => x[0] === 'Lucía Gómez') || [])[2] === 'Separado' && (cl.find(x => x[0] === 'Juan Ríos') || [])[2] === 'Visita agendada', 'traduce las etapas (Separó → Separado)');
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('vivaldi-clientes-v1')).length) === 3, 'quedan guardados');
  ok(await p.evaluate(() => document.querySelectorAll('#crmList .crm-item').length) >= 3, 'aparecen en Mis clientes');
  // segunda vez: no duplica
  await p.setInputFiles('#cnFile', path.join(TMP, 'leads.csv')); await p.waitForTimeout(600);
  ok(/0 nuevos/.test(await p.textContent("#cnPrev .cn-sum")), "al volver a importar no duplica a nadie");
  await p.click('#cnGo'); await p.waitForTimeout(300); ok(await p.evaluate(() => CLIENTS.length) === 3, 'sigue habiendo 3 clientes');
  await p.click('#cnUndo'); await p.waitForTimeout(300); ok(await p.evaluate(() => CLIENTS.length) === 3, 'deshacer la segunda importación deja los 3 originales');
  // lotes en Excel
  await p.setInputFiles('#cnFile', path.join(TMP, 'stock.xlsx')); await p.waitForTimeout(1200);
  ok(await p.getAttribute('#cnPrev [data-ty="lotes"]', 'aria-pressed') === 'true', 'detecta que el Excel son lotes (aunque tenga un título arriba)');
  ok(/3 nuevos/.test(await p.textContent('#cnPrev .cn-sum')) && /1 se omiten/.test(await p.textContent('#cnPrev .cn-sum')), 'lotes: 3 nuevos y 1 con proyecto desconocido');
  const n0 = await p.evaluate(() => INV.length); await p.click('#cnGo'); await p.waitForTimeout(400);
  const lots = await p.evaluate(() => INV.filter(l => l.mz === 'C').map(l => [l.proj, l.lt, l.st, l.price, l.loc]));
  ok(lots.length === 3 && (await p.evaluate(() => INV.length)) === n0 + 3, 'importa 3 lotes');
  ok(JSON.stringify(lots.find(l => l[1] === '1')) === JSON.stringify(['La Planicie de Asia', '1', 'Disponible', 31500, 'Frente al parque']), 'lote con precio en texto, estado «Libre» y proyecto abreviado: ' + JSON.stringify(lots.find(l => l[1] === '1')));
  ok((lots.find(l => l[1] === '2') || [])[2] === 'Separado', '«Reservado» se convierte en Separado');
  await p.click('#cnUndo'); await p.waitForTimeout(300); ok(await p.evaluate(() => INV.length) === n0, 'deshacer quita los lotes importados');
  // Google Sheets
  await p.click('#conectar [data-t="gs"]'); await p.fill('#cnGsUrl', 'https://docs.google.com/spreadsheets/d/abc123XYZ/edit#gid=0'); await p.click('#cnGsGo'); await p.waitForTimeout(800);
  ok(/1 nuevos/.test(await p.textContent('#cnPrev .cn-sum')), 'lee la hoja de Google Sheets');
  await p.click('#cnGo'); await p.click('#cnSaveConn'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('vivaldi-conexiones-v1')).length) === 1, 'guarda la conexión');
  sheet += 'Rosa Vela,933222111,Contactado,Esmeralda\n'; await p.click('#cnConns [data-sync="0"]'); await p.waitForTimeout(800);
  ok(await p.evaluate(() => CLIENTS.some(c => c.name === 'Rosa Vela' && c.proj === 'La Esmeralda de Cerro Azul')), 'al sincronizar trae la fila nueva de la hoja');
  ok(await p.evaluate(() => CLIENTS.filter(c => c.name === 'Pedro Salas').length) === 1, 'sin duplicar las anteriores');
  // otro sistema
  await p.click('#conectar [data-t="api"]'); await p.waitForTimeout(200);
  ok(/\/rest\/v1\/solicitudes/.test(await p.textContent('#cnApi')), 'muestra la dirección para conectar otros sistemas');
  const axeP = require('child_process').execSync('find / -name axe.min.js -path "*axe*" -not -path "/proc/*" 2>/dev/null | head -1').toString().trim();
  if (axeP) { await p.addScriptTag({path: axeP}); const v = await p.evaluate(async () => (await axe.run('#conectar')).violations.map(x => x.id)); ok(!v.length, 'accesibilidad de la sección: ' + JSON.stringify(v)); }
  ok(!errs.length, 'sin errores ' + JSON.stringify(errs));
  await b.close(); fs.rmSync(TMP, {recursive: true, force: true}); })();
