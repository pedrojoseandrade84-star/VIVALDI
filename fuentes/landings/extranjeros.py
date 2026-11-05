# Landing para clientes del extranjero (peruanos que viven fuera y extranjeros), en inglés y español.
# Diseño y desarrollo: Pedrojose Andrade Paredes
import json

T = {  # clave: (español, inglés)
 'eb': ('Para peruanos en el extranjero y extranjeros', 'For Peruvians abroad and international buyers'),
 'h1': ('Tu lote de playa en el Perú, <em>comprado desde donde estés</em>', 'Your beach lot in Peru, <em>bought from wherever you are</em>'),
 'sub': ('Lotes con título en Asia y Cerro Azul, al sur de Lima. Visita por videollamada, separa con una transferencia y paga en cuotas sin intereses.', 'Titled lots in Asia and Cerro Azul, south of Lima. Tour by video call, reserve with a bank transfer and pay in interest-free installments.'),
 'cta1': ('Agendar videollamada', 'Book a video call'), 'cta2': ('Escribir por WhatsApp', 'Message us on WhatsApp'),
 'w_eb': ('Por qué invertir aquí', 'Why invest here'), 'w_h': ('Precio de entrada bajo en un <em>corredor que crece</em>', 'A low entry price in a <em>growing corridor</em>'),
 'w1': ('Desde S/ 25,000', 'From S/ 25,000'), 'w1s': ('Aprox. US$ {usd} al tipo de cambio referencial de {tc}.', 'About US$ {usd} at a reference exchange rate of {tc}.'),
 'w2': ('0% de interés', '0% interest'), 'w2s': ('Financiamiento directo con Vivaldi, sin evaluación bancaria.', 'Direct financing with Vivaldi, no bank approval needed.'),
 'w3': ('Título independizado', 'Independent title'), 'w3s': ('En los proyectos que lo indican, cada lote tiene su partida en SUNARP.', 'In the projects that state it, each lot has its own record at SUNARP (public registry).'),
 'w4': ('Proyectos entregados', 'Delivered projects'), 'w4s': ('Zafiro de Asia ya fue entregado a sus propietarios.', 'Zafiro de Asia has already been delivered to its owners.'),
 'p_eb': ('Proyectos disponibles', 'Available projects'), 'p_h': ('Elige tu <em>proyecto</em>', 'Choose your <em>project</em>'),
 'p_note': ('Precios en soles; el monto en dólares es solo referencial y cambia con el tipo de cambio.', 'Prices in soles (PEN); the US dollar amount is only a reference and changes with the exchange rate.'),
 'from': ('desde', 'from'), 'see': ('Ver proyecto', 'See project'), 'consult': ('Consultar', 'Ask us'),
 's_eb': ('Cómo comprar a distancia', 'How to buy remotely'), 's_h': ('Cinco pasos, <em>sin viajar</em>', 'Five steps, <em>no travel required</em>'),
 's1': ('Recorrido por videollamada', 'Video call tour'), 's1s': ('Un asesor te muestra el proyecto y el lote en vivo, en tu horario.', 'An advisor shows you the project and the lot live, at a time that suits you.'),
 's2': ('Proforma y elección del lote', 'Quote and lot selection'), 's2s': ('Recibes tu proforma con el cronograma de cuotas por WhatsApp o correo.', 'You receive your quote and installment schedule by WhatsApp or email.'),
 's3': ('Separación por transferencia', 'Reserve by bank transfer'), 's3s': ('Separas tu lote con una transferencia a la cuenta de la empresa que te indica Vivaldi.', 'You reserve your lot with a transfer to the company account Vivaldi provides.'),
 's4': ('Firma del contrato', 'Contract signing'), 's4s': ('Si no puedes viajar, la firma puede hacerse mediante un apoderado en el Perú u otra vía que el área legal de Vivaldi te indique según tu caso.', 'If you cannot travel, signing can be done through a legal representative in Peru or another way Vivaldi’s legal team explains for your case.'),
 's5': ('Cuotas desde el extranjero', 'Installments from abroad'), 's5s': ('Pagas tus cuotas en soles por transferencia y recibes un recordatorio antes de cada vencimiento.', 'You pay your installments in soles by transfer and get a reminder before each due date.'),
 'f_eb': ('Preguntas frecuentes', 'Frequently asked questions'), 'f_h': ('Lo que más nos <em>preguntan</em>', 'What people <em>ask us most</em>'),
 'q1': ('¿Un extranjero puede comprar un lote en el Perú?', 'Can a foreigner buy land in Peru?'),
 'a1': ('Sí. La Constitución del Perú (art. 71) da a los extranjeros los mismos derechos que a los peruanos para adquirir propiedad, salvo dentro de los 50 km de las fronteras. Los proyectos de Vivaldi están en la costa al sur de Lima, lejos de las fronteras.', 'Yes. Peru’s Constitution (art. 71) gives foreigners the same rights as Peruvians to own property, except within 50 km of the borders. Vivaldi’s projects are on the coast south of Lima, far from any border.'),
 'q2': ('¿En qué moneda pago?', 'Which currency do I pay in?'), 'a2': ('En soles. Los montos en dólares de esta página son referenciales.', 'In Peruvian soles (PEN). The US dollar amounts on this page are references only.'),
 'q3': ('¿Necesito viajar para firmar?', 'Do I need to travel to sign?'), 'a3': ('No necesariamente. Vivaldi te explica las opciones según tu país y tu caso antes de separar.', 'Not necessarily. Vivaldi explains the options for your country and situation before you reserve.'),
 'q4': ('¿Cómo verifico a la empresa?', 'How can I verify the company?'), 'a4': ('Inmobiliaria & Constructora Vivaldi S.A.C., RUC 20604145458. Puedes consultar el RUC en SUNAT y la partida de cada lote en SUNARP antes de firmar.', 'Inmobiliaria & Constructora Vivaldi S.A.C., tax ID (RUC) 20604145458. You can check it at SUNAT and each lot’s record at SUNARP before signing.'),
 'c_eb': ('Hablemos', 'Let’s talk'), 'c_h': ('Agenda tu <em>videollamada</em>', 'Book your <em>video call</em>'),
 'c_sub': ('Déjanos tus datos y te escribimos por WhatsApp para coordinar la hora. Atendemos según tu zona horaria.', 'Leave your details and we will message you on WhatsApp to set a time. We work around your time zone.'),
 'l_name': ('Nombre completo', 'Full name'), 'l_country': ('País donde vives', 'Country of residence'), 'l_phone': ('WhatsApp con código de país', 'WhatsApp number with country code'),
 'l_proj': ('Proyecto de interés', 'Project of interest'), 'l_any': ('Aún no sé', 'Not sure yet'), 'l_time': ('Mejor horario para la videollamada', 'Best time for the video call'),
 'l_ok': ('Acepto el tratamiento de mis datos para atender mi solicitud (Ley 29733).', 'I agree to the processing of my data to handle my request (Peruvian Law 29733).'),
 'btn': ('Agendar por WhatsApp', 'Book on WhatsApp'), 'okmsg': ('Listo. Abrimos WhatsApp con tu mensaje; te respondemos para coordinar la hora.', 'Done. We opened WhatsApp with your message; we will reply to set a time.'),
 'ph_phone': ('+1 415 555 0123', '+1 415 555 0123'), 'tm': ('Mañana (hora de tu país)', 'Morning (your local time)'), 'ta': ('Tarde (hora de tu país)', 'Afternoon (your local time)'), 'tn': ('Noche (hora de tu país)', 'Evening (your local time)'),
 'err_phone': ('Escribe tu número con el código de país, por ejemplo +1 415 555 0123', 'Enter your number with the country code, for example +1 415 555 0123'),
}
PAISES = ['Estados Unidos', 'España', 'Italia', 'Argentina', 'Chile', 'Japón', 'Canadá', 'Alemania', 'Reino Unido', 'Francia', 'Australia', 'Otro']

def page(g):
    E, img, soles, EMP, PRJ, head, foot, base_js, wa, LOGO, ASESOR, JS_COMMON = (g[k] for k in ('E', 'img', 'soles', 'EMP', 'PRJ', 'head', 'foot', 'base_js', 'wa', 'LOGO', 'ASESOR', 'JS_COMMON'))
    tc = EMP['tipo_cambio']; t = lambda k: f'<span data-i="{k}">{T[k][0]}</span>'
    usd = lambda n: f"{round(n / tc / 100) * 100:,}"
    disp = [p for p in PRJ if p['estado'] in ('Preventa', 'En construcción', 'Entrega inmediata')]
    cards = ''.join(f'''<a href="{p['id']}.html"><img src="{img(p['fotos'][0], 700, 70)}" alt="{E(p['nombre'])}" loading="lazy"><div><b>{E(p['nombre'])}</b><span>{E(p['estado'])} · {E(p['zona'])}{(' · Km ' + format(p['km'], 'g')) if p['km'] else ''}</span>
<span style="display:block;margin-top:6px;color:var(--ink);font-weight:800">{t('from')} {soles(p['precio']) if p['precio'] else ''} <small style="color:var(--mu);font-weight:600">(≈ US$ {usd(p['precio']) if p['precio'] else ''})</small></span></div></a>''' for p in disp)
    hero = img(PRJ[1]['fotos'][0], 1920, 72)
    steps = ''.join(f'<div class="st curso"><div class="dot">{k}</div><div><b data-i="s{k}">{T["s" + str(k)][0]}</b><p class="sd" data-i="s{k}s">{T["s" + str(k) + "s"][0]}</p></div></div>' for k in range(1, 6))
    faq = ''.join(f'<details style="background:#fff;border-radius:14px;padding:16px 18px;margin-top:10px"><summary style="font-weight:800;cursor:pointer;min-height:28px">{t("q" + str(k))}</summary><p style="color:var(--mu);margin:10px 0 0">{t("a" + str(k))}</p></details>' for k in range(1, 5))
    opts = ''.join(f'<option>{E(p["nombre"])}</option>' for p in disp)
    TT = dict(T); TT['w1s'] = tuple(x.format(usd=usd(25000), tc=tc) for x in T['w1s'])
    js = JS_COMMON + '''
const T = ''' + json.dumps(TT, ensure_ascii=False) + ''';
let L = "es"; const setL = l => { L = l; document.documentElement.lang = l === "es" ? "es-PE" : "en"; $$("[data-i]").forEach(el => { const v = T[el.dataset.i]; if (v) el.innerHTML = v[l === "es" ? 0 : 1]; });
  $("#fT").placeholder = T.ph_phone[0]; $$("#lang button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.l === l))); try { localStorage.setItem("vv-lang", l); } catch (e) {} };
$("#lang").addEventListener("click", e => { const b = e.target.closest("button"); if (b) setL(b.dataset.l); });
let pref = ""; try { pref = new URLSearchParams(location.search).get("lang") || localStorage.getItem("vv-lang") || ""; } catch (e) {}
setL(pref === "en" || pref === "es" ? pref : /^es/i.test(navigator.language || "") ? "es" : "en");
$$("[data-wa]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); openWa(L === "es" ? "Hola, vivo fuera del Perú y me interesa un lote de Vivaldi. ¿Podemos agendar una videollamada?" : "Hello, I live outside Peru and I am interested in a Vivaldi lot. Can we schedule a video call?"); }));
$("#lead").addEventListener("submit", e => { e.preventDefault(); const n = $("#fN").value.trim(), raw = $("#fT").value.trim(), d = raw.replace(/\\D/g, "");
  let tel = ""; if (/^9\\d{8}$/.test(d)) tel = d; else if (/^519\\d{8}$/.test(d)) tel = d.slice(2); else if (/^\\+/.test(raw) && /^[1-9]\\d{7,14}$/.test(d)) tel = "+" + d;
  if (n.length < 3) return $("#fN").focus(); if (!tel) { $("#fT").setCustomValidity(T.err_phone[L === "es" ? 0 : 1]); $("#fT").reportValidity(); $("#fT").setCustomValidity(""); return; }
  if (!$("#fOk").checked) return $("#fOk").reportValidity();
  const pais = $("#fC").value, pj = $("#fP").value, hr = $("#fH").selectedOptions[0].textContent, A = window.VV_ASESOR;
  send({nombre: n.slice(0, 120), celular: tel, pais: pais.slice(0, 60), proyecto: pj === "-" ? "" : pj.slice(0, 120), visita: ("Videollamada · " + hr).slice(0, 80), mensaje: "Cliente del extranjero (" + (L === "es" ? "español" : "inglés") + ")", acepta_promos: false, origen: "Landing extranjeros", campana: SRC.slice(0, 120), asesor_codigo: (A && A.codigo) || undefined});
  openWa(L === "es" ? `Hola, soy ${n} y vivo en ${pais}. Me interesa ${pj === "-" ? "un lote de Vivaldi" : pj}. Quisiera una videollamada (${hr.toLowerCase()}). Mi WhatsApp: ${tel}.` : `Hello, I am ${n} and I live in ${pais}. I am interested in ${pj === "-" ? "a Vivaldi lot" : pj}. I would like a video call (${hr.toLowerCase()}). My WhatsApp: ${tel}. (Please reply in English.)`);
  $("#okMsg").classList.add("on"); });
'''
    return f'''{head('Beach lots in Peru for international buyers | Lotes en Perú para clientes del extranjero · Vivaldi', 'Titled beach lots south of Lima from S/ 25,000. Video call tours, reservation by transfer and interest-free installments. In English and Spanish.', '#0E4C72')}{base_js()}
<style>.langsw{{display:flex;gap:4px;background:rgba(255,255,255,.14);border-radius:999px;padding:4px}}.langsw button{{min-height:36px;padding:0 14px;border-radius:999px;border:0;background:none;color:#fff;font:inherit;font-weight:800;cursor:pointer}}.langsw button[aria-pressed=true]{{background:#fff;color:#0A3856}}
.why{{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:28px}}.why div{{background:var(--bg);border-radius:18px;padding:22px}}.why b{{display:block;font-family:"Instrument Serif",Georgia,serif;font-weight:400;font-size:1.8rem;color:var(--nv);line-height:1.1}}.why span{{color:var(--mu)}}
.steps5{{display:grid;grid-template-columns:repeat(5,1fr);gap:16px;margin-top:30px}}.steps5 .st{{background:#fff;border-radius:18px;padding:20px;display:block}}.steps5 .st b{{margin-top:12px}}.steps5 .sd{{margin:6px 0 0;color:var(--mu);font-size:.95rem}}
@media (max-width:900px){{.why{{grid-template-columns:1fr 1fr}}.steps5{{grid-template-columns:1fr}}.steps5 .st{{display:grid;grid-template-columns:46px 1fr;gap:14px}}.steps5 .st b{{margin:0}}}}@media (max-width:520px){{.why{{grid-template-columns:1fr}}}}</style>
<header class="top"><div class="wrap"><img src="{LOGO}" alt="Vivaldi Inmobiliaria"><div class="langsw" id="lang" role="group" aria-label="Idioma / Language"><button type="button" data-l="es" aria-pressed="true">ES</button><button type="button" data-l="en" aria-pressed="false">EN</button></div></div></header>
<main><section class="hero"><img src="{hero}" alt="Las Terrazas de Cerro Azul"><span class="ref">Render referencial</span><div class="wrap"><span class="badge"><i></i>{t('eb')}</span><h1 data-i="h1">{T['h1'][0]}</h1><p class="sub">{t('sub')}</p>
<div class="cta"><a class="btn b-sun" href="#contacto">{t('cta1')}</a><a class="btn b-wa" href="{wa('Hola, vivo fuera del Perú y me interesa un lote de Vivaldi.')}" data-wa>{t('cta2')}</a></div></div></section>
<section class="sec"><div class="wrap reveal"><div class="eb">{t('w_eb')}</div><h2 data-i="w_h">{T['w_h'][0]}</h2>
<div class="why"><div><b>{t('w1')}</b><span data-i="w1s">{T['w1s'][0].format(usd=usd(25000), tc=tc)}</span></div><div><b>{t('w2')}</b><span>{t('w2s')}</span></div><div><b>{t('w3')}</b><span>{t('w3s')}</span></div><div><b>{t('w4')}</b><span>{t('w4s')}</span></div></div></div></section>
<section class="sec" style="background:var(--bg)"><div class="wrap reveal"><div class="eb">{t('p_eb')}</div><h2 data-i="p_h">{T['p_h'][0]}</h2><div class="others">{cards}</div><p style="font-size:.85rem;color:var(--mu);margin-top:14px">{t('p_note')}</p></div></section>
<section class="sec"><div class="wrap reveal"><div class="eb">{t('s_eb')}</div><h2 data-i="s_h">{T['s_h'][0]}</h2><div class="steps5">{steps}</div></div></section>
<section class="sec" style="background:var(--bg)"><div class="wrap reveal" style="max-width:860px"><div class="eb">{t('f_eb')}</div><h2 data-i="f_h">{T['f_h'][0]}</h2>{faq}</div></section>
<section class="sec contact" id="contacto"><div class="wrap g2"><div class="reveal"><div class="eb" style="color:var(--sun)">{t('c_eb')}</div><h2 data-i="c_h">{T['c_h'][0]}</h2><p class="lead">{t('c_sub')}</p><p style="margin-top:22px;font-weight:700">WhatsApp {E(EMP['telefono'])}</p></div>
<form class="card reveal" id="lead" novalidate><label><span data-i="l_name">{T['l_name'][0]}</span><input id="fN" autocomplete="name" required maxlength="120"></label>
<div class="two"><label><span data-i="l_country">{T['l_country'][0]}</span><select id="fC">{''.join(f'<option>{x}</option>' for x in PAISES)}</select></label><label><span data-i="l_phone">{T['l_phone'][0]}</span><input id="fT" inputmode="tel" autocomplete="tel" required placeholder="+1 415 555 0123"></label></div>
<div class="two"><label><span data-i="l_proj">{T['l_proj'][0]}</span><select id="fP"><option value="-" data-i="l_any">{T['l_any'][0]}</option>{opts}</select></label><label><span data-i="l_time">{T['l_time'][0]}</span><select id="fH"><option data-i="tm">{T['tm'][0]}</option><option data-i="ta">{T['ta'][0]}</option><option data-i="tn">{T['tn'][0]}</option></select></label></div>
<label class="chk"><input type="checkbox" id="fOk" required> <span data-i="l_ok">{T['l_ok'][0]}</span></label>
<button class="btn b-wa" type="submit"><span data-i="btn">{T['btn'][0]}</span></button><p class="ok-msg" id="okMsg" role="status" data-i="okmsg">{T['okmsg'][0]}</p></form></div></section></main>
{foot('<nav class="sticky" aria-label="Contacto rápido"><a class="btn b-wa" href="' + wa('Hola, vivo fuera del Perú y me interesa un lote de Vivaldi.') + '" data-wa>WhatsApp</a><a class="btn b-deep" href="#contacto">' + T['cta1'][0] + '</a></nav>')}
<script>const EMP = {json.dumps({'whatsapp': EMP['whatsapp']})};{js}</script>
{ASESOR}</body></html>'''
