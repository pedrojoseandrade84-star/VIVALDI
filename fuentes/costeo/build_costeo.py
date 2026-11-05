# Costeo del mantenimiento mensual del sistema Vivaldi (Excel con fórmulas). Diseño y desarrollo: Pedrojose Andrade Paredes
# Uso: python3 build_costeo.py RUTA_LOGO.png SALIDA.xlsx
import sys
from openpyxl import Workbook
from openpyxl.drawing.image import Image as XLImage
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation

LOGO, OUT = sys.argv[1], sys.argv[2]
NV, BL, MU, BG, IN, LN = "0A3856", "2A85C5", "6B7A86", "F3F7FA", "FFF4D6", "DCE5EC"
thin = Side(style="thin", color=LN); BOX = Border(top=thin, bottom=thin, left=thin, right=thin)
F = lambda **k: Font(name="Calibri", **k); fill = lambda c: PatternFill("solid", fgColor=c)
wb = Workbook()

def cabecera(ws, titulo, sub, ncol):
    ws.sheet_view.showGridLines = False
    ws.row_dimensions[2].height = 34
    img = XLImage(LOGO); r = img.height / img.width; img.width = 190; img.height = int(190 * r); ws.add_image(img, "A2")
    last = chr(64 + ncol); ws.merge_cells(f"C2:{last}2"); ws.merge_cells(f"C3:{last}3")
    ws["C2"] = titulo; ws["C2"].font = F(size=18, bold=True, color=NV); ws["C2"].alignment = Alignment(horizontal="right", vertical="center")
    ws["C3"] = sub; ws["C3"].font = F(size=10, color=MU); ws["C3"].alignment = Alignment(horizontal="right")
    for c in range(1, ncol + 1): ws.cell(5, c).fill = fill(NV if c <= (ncol + 1) // 2 else BL)
    ws.row_dimensions[5].height = 5
    ws.oddFooter.left.text = "Inmobiliaria & Constructora Vivaldi S.A.C. · RUC 20604145458"; ws.oddFooter.right.text = "Página &P de &N"
    ws.page_setup.orientation = "landscape"; ws.page_setup.fitToWidth = 1; ws.page_setup.fitToHeight = 0; ws.sheet_properties.pageSetUpPr.fitToPage = True

def hdr(ws, r, cols):
    for i, h in enumerate(cols, 1):
        c = ws.cell(r, i, h); c.font = F(bold=True, color="FFFFFF", size=10); c.fill = fill(NV); c.border = BOX; c.alignment = Alignment(vertical="center", wrap_text=True)
    ws.row_dimensions[r].height = 24

def celda(ws, r, c, v, fmt=None, bold=False, entrada=False, wrap=False, color="3C3C3A"):
    x = ws.cell(r, c, v); x.border = BOX; x.font = F(size=10, bold=bold, color=color); x.alignment = Alignment(vertical="center", wrap_text=wrap)
    if fmt: x.number_format = fmt
    if entrada: x.fill = fill(IN)
    return x

SOL, USD, USD4 = '"S/" #,##0.00', '"US$" #,##0.00', '"US$" #,##0.0000'

# ---------- Hoja 1: supuestos ----------
s = wb.active; s.title = "Supuestos"; cabecera(s, "COSTEO DEL MANTENIMIENTO", "Supuestos: las celdas amarillas se pueden cambiar", 4)
hdr(s, 7, ["Supuesto", "Valor", "Unidad", "Nota"])
SUP = [
 ("Tipo de cambio (S/ por US$)", 3.36, "S/", "Mismo valor que usa la herramienta; actualizar con el del día."),
 ("Clientes nuevos de la web y landings por mes", 80, "clientes", "Ejemplo: ajustar con el promedio real de Vivaldi."),
 ("Visitas agendadas por mes", 30, "visitas", "Ejemplo."),
 ("Ventas con cuotas activas", 40, "ventas", "Ejemplo: clientes pagando cuotas mensuales."),
 ("Asesores con celular registrado", 4, "asesores", "Reciben aviso de cada cliente y un resumen cada día hábil."),
 ("Días hábiles por mes", 22, "días", ""),
 ("Cuotas vencidas por mes (aviso amable)", 6, "avisos", "Ejemplo."),
 ("Alertas a la jefatura por mes", 10, "alertas", "Clientes sin atender en más de una hora."),
 ("Mensajes de marketing por mes (campañas)", 0, "mensajes", "Opcional: solo si Vivaldi hace campañas por WhatsApp."),
 ("Horas de soporte y mantenimiento por mes", 8, "horas", "Ver hoja 'Qué incluye'."),
 ("Tarifa por hora de soporte (S/)", None, "S/", "La define el proveedor; queda en blanco hasta acordarla."),
]
for i, (a, v, u, n) in enumerate(SUP):
    r = 8 + i; celda(s, r, 1, a, bold=True); celda(s, r, 2, v, fmt=('0.00' if i == 0 else SOL if i == 10 else '#,##0'), entrada=True); celda(s, r, 3, u); celda(s, r, 4, n, wrap=True, color=MU)
for col, w in zip("ABCD", (44, 14, 12, 62)): s.column_dimensions[col].width = w
N = {k: f"Supuestos!$B${8 + i}" for i, k in enumerate(["tc", "leads", "visitas", "cuotas", "asesores", "dias", "vencidas", "alertas", "mkt", "horas", "tarifa"])}

# ---------- Hoja 2: costeo mensual ----------
c = wb.create_sheet("Costeo mensual"); cabecera(c, "COSTEO MENSUAL", "Servicios de terceros + soporte. Montos referenciales: verificar en la web oficial de cada proveedor.", 6)
hdr(c, 7, ["Concepto", "Cantidad por mes", "Precio unitario (US$)", "Total US$", "Total S/", "Cómo se calcula"])
R = 8
def fila(nombre, cant, precio, como, sec=False):
    global R
    if sec:
        c.merge_cells(start_row=R, start_column=1, end_row=R, end_column=6); x = c.cell(R, 1, nombre); x.font = F(bold=True, color=BL, size=10); x.fill = fill("E3EEF8"); x.border = BOX; R += 1; return
    celda(c, R, 1, nombre, bold=True, wrap=True); celda(c, R, 2, cant, fmt='#,##0'); celda(c, R, 3, precio, fmt=USD4 if isinstance(precio, float) and precio < 1 else USD, entrada=isinstance(precio, (int, float)))
    celda(c, R, 4, f"=B{R}*C{R}", fmt=USD); celda(c, R, 5, f"=D{R}*{N['tc']}", fmt=SOL); celda(c, R, 6, como, wrap=True, color=MU); c.row_dimensions[R].height = 44 if len(como or "") > 70 else 30; R += 1
fila("Infraestructura", None, None, None, sec=True); r_inf = R
fila("Base de datos y funciones (Supabase, plan Pro)", 1, 25, "Plan Pro por organización: incluye US$ 10 de cómputo (una instancia Micro), copias de seguridad diarias y 8 GB de base de datos. El plan gratuito se pausa tras una semana sin uso.")
fila("Publicación de la web y las landings (Cloudflare Pages, plan gratuito)", 1, 0, "Sitio estático: el plan gratuito no cobra por visitas ni ancho de banda. Alternativa: el hosting que Vivaldi ya paga.")
fila("Dominio vivaldiinmobiliaria.com", 1, 0, "Vivaldi ya lo tiene: escribir aquí la renovación anual dividida entre 12.")
r_inf_end = R - 1
fila("WhatsApp automático (API oficial de Meta, Perú)", None, None, None, sec=True); r_wa = R
fila("Bienvenida al cliente nuevo (utilidad)", f"={N['leads']}", 0.03, "1 por cliente de la web o landing.")
fila("Aviso al asesor de su cliente nuevo (utilidad)", f"={N['leads']}", 0.03, "1 por cliente asignado.")
fila("Confirmación y recordatorio de visita (utilidad)", f"={N['visitas']}*2", 0.03, "2 por visita agendada.")
fila("Recordatorio de cuota (utilidad)", f"={N['cuotas']}", 0.03, "1 por venta con cuotas, 3 días antes del vencimiento.")
fila("Aviso de cuota vencida (utilidad)", f"={N['vencidas']}", 0.03, "1 por cuota vencida.")
fila("Resumen diario del asesor (utilidad)", f"={N['asesores']}*{N['dias']}", 0.03, "1 por asesor cada día hábil con pendientes.")
fila("Alerta a la jefatura (utilidad)", f"={N['alertas']}", 0.03, "Cliente sin atender en más de una hora.")
fila("Campañas de marketing (opcional)", f"={N['mkt']}", 0.07, "Solo si se envían promociones por WhatsApp.")
r_wa_end = R - 1
fila("Soporte y mantenimiento", None, None, None, sec=True); r_sop = R
celda(c, R, 1, "Horas de soporte y mantenimiento", bold=True); celda(c, R, 2, f"={N['horas']}", fmt='#,##0')
celda(c, R, 3, "Tarifa en S/ (hoja Supuestos)", color=MU); celda(c, R, 4, f'=IF({N["tarifa"]}="","",B{R}*{N["tarifa"]}/{N["tc"]})', fmt=USD); celda(c, R, 5, f'=IF({N["tarifa"]}="","Por definir",B{R}*{N["tarifa"]})', fmt=SOL)
celda(c, R, 6, "Horas × tarifa por hora. Ver hoja 'Qué incluye'.", wrap=True, color=MU); R += 1
R += 1
def total(nombre, f_usd, f_sol, fuerte=False):
    global R
    celda(c, R, 1, nombre, bold=True, color=NV); c.merge_cells(start_row=R, start_column=1, end_row=R, end_column=3)
    for col in (1, 2, 3): c.cell(R, col).fill = fill("E3EEF8"); c.cell(R, col).border = BOX
    a = celda(c, R, 4, f_usd, fmt=USD, bold=True, color=NV); b = celda(c, R, 5, f_sol, fmt=SOL, bold=True, color=NV); a.fill = b.fill = fill("E3EEF8")
    if fuerte: a.font = b.font = F(size=12, bold=True, color=NV)
    celda(c, R, 6, "", color=MU).fill = fill("E3EEF8"); R += 1
total("Infraestructura por mes", f"=SUM(D{r_inf}:D{r_inf_end})", f"=SUM(E{r_inf}:E{r_inf_end})")
total("WhatsApp automático por mes", f"=SUM(D{r_wa}:D{r_wa_end})", f"=SUM(E{r_wa}:E{r_wa_end})")
t_terc = R; total("Servicios de terceros por mes (lo paga Vivaldi a cada proveedor)", f"=D{R-2}+D{R-1}", f"=E{R-2}+E{R-1}", True)
total("Soporte por mes", f'=IF(D{r_sop}="",0,D{r_sop})', f'=IF(ISNUMBER(E{r_sop}),E{r_sop},0)')
total("TOTAL MENSUAL DEL SISTEMA", f"=D{t_terc}+D{R-1}", f"=E{t_terc}+E{R-1}", True)
total("TOTAL ANUAL", f"=D{R-1}*12", f"=E{R-1}*12", True)
R += 1
c.merge_cells(start_row=R, start_column=1, end_row=R + 2, end_column=6)
n = c.cell(R, 1, "Notas: (1) Los precios de terceros se tomaron de fuentes públicas de 2026 (ver hoja Fuentes) y cambian: confirmarlos en supabase.com/pricing y en la tabla de precios de WhatsApp de Meta antes de contratar. "
               "(2) Meta cobra por mensaje de plantilla entregado; las respuestas dentro de la ventana de atención de 24 horas no se cobran como plantilla. (3) El soporte queda en blanco hasta acordar la tarifa. (4) Montos sin IGV.")
n.font = F(size=9, italic=True, color=MU); n.alignment = Alignment(wrap_text=True, vertical="top")
for col, w in zip("ABCDEF", (46, 16, 20, 15, 17, 70)): c.column_dimensions[col].width = w
c.freeze_panes = "A8"

# ---------- Hoja 3: qué incluye ----------
q = wb.create_sheet("Qué incluye"); cabecera(q, "QUÉ INCLUYE EL MANTENIMIENTO", "Tareas mensuales y horas estimadas (editables)", 4)
hdr(q, 7, ["Tarea", "Frecuencia", "Horas al mes", "Detalle"])
T = [("Actualizar precios, estados y etapas de los proyectos", "Cuando cambien", 1, "Desde la herramienta o en la base de datos; la web y las landings se actualizan solas."),
     ("Revisar la cola de mensajes de WhatsApp y los errores", "Semanal", 1, "Mensajes con error, plantillas rechazadas, números que pidieron no recibir mensajes."),
     ("Altas y bajas de asesores y sus enlaces personales", "Cuando haya cambios", 0.5, "Usuario, código del enlace y celular."),
     ("Copias de seguridad y prueba de recuperación", "Mensual", 1, "Además de las copias diarias del plan Pro."),
     ("Soporte a asesores y jefatura", "Según pedidos", 2, "Dudas de uso, problemas de sincronización."),
     ("Mejoras pequeñas y ajustes de textos", "Mensual", 1.5, "Cambios menores pedidos por la gerencia."),
     ("Revisión de seguridad y actualizaciones", "Mensual", 1, "Reglas de acceso, claves, avisos de proveedores.")]
for i, (a, b, h, d) in enumerate(T):
    r = 8 + i; celda(q, r, 1, a, bold=True, wrap=True); celda(q, r, 2, b); celda(q, r, 3, h, fmt='0.0', entrada=True); celda(q, r, 4, d, wrap=True, color=MU); q.row_dimensions[r].height = 30
r = 8 + len(T); celda(q, r, 1, "Total de horas estimadas", bold=True, color=NV); celda(q, r, 3, f"=SUM(C8:C{r-1})", fmt='0.0', bold=True, color=NV)
celda(q, r + 1, 1, "Para usar este total en el costeo, copiarlo en Supuestos → Horas de soporte.", color=MU)
for col, w in zip("ABCD", (52, 20, 14, 64)): q.column_dimensions[col].width = w

# ---------- Hoja 4: fuentes ----------
fz = wb.create_sheet("Fuentes"); cabecera(fz, "FUENTES DE PRECIOS", "Consultadas en noviembre de 2026; verificar en la web oficial", 3)
hdr(fz, 7, ["Servicio", "Dato usado", "Fuente"])
FU = [("Supabase Pro", "US$ 25 al mes; incluye US$ 10 de cómputo; 8 GB de base; exceso US$ 0.125 por GB", "makerkit.dev/blog/saas/supabase-pricing · jetadmin.io (2026). Oficial: supabase.com/pricing"),
      ("Supabase gratuito", "Se pausa tras una semana sin uso; sin copias descargables", "LEEME de la base de datos de este proyecto; confirmar en supabase.com/pricing"),
      ("WhatsApp Perú · utilidad", "≈ US$ 0.03 por mensaje desde el 1 de octubre de 2026 (antes US$ 0.02); otra fuente indica US$ 0.0345", "flowcall.co/blog/whatsapp-business-api-pricing · help.sleekflow.io/en_US/whatsapp/pricing. Oficial: developers.facebook.com (precios de WhatsApp Business Platform)"),
      ("WhatsApp Perú · marketing", "≈ US$ 0.07 a 0.08 por mensaje", "flowcall.co · help.sleekflow.io"),
      ("Cloudflare Pages gratuito", "500 compilaciones al mes, 20,000 archivos por sitio, sin cobro por tráfico estático", "developers.cloudflare.com/pages/platform/limits")]
for i, (a, b, d) in enumerate(FU):
    r = 8 + i; celda(fz, r, 1, a, bold=True); celda(fz, r, 2, b, wrap=True); celda(fz, r, 3, d, wrap=True, color=MU); fz.row_dimensions[r].height = 42
for col, w in zip("ABC", (28, 60, 70)): fz.column_dimensions[col].width = w

dv = DataValidation(type="decimal", operator="greaterThanOrEqual", formula1="0", allow_blank=True); s.add_data_validation(dv); dv.add("B8:B18")
wb.properties.creator = "Pedrojose Andrade Paredes"; wb.properties.title = "Costeo del mantenimiento · Vivaldi"
wb.active = 1; wb.save(OUT); print("ok", OUT)
