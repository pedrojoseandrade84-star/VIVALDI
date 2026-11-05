"""Arma el paquete de venta para Vivaldi (sin presentaciones ni documentos internos).
Uso: python3 build_paquete.py <carpeta_destino>"""
import os, shutil, subprocess, sys, zipfile
AQUI = os.path.dirname(os.path.abspath(__file__))
ENT = os.path.normpath(os.path.join(AQUI, '..', '..', 'entregables'))
NOMBRE = 'Vivaldi-Sistema-Comercial'
dest = os.path.abspath(sys.argv[1]); raiz = os.path.join(dest, NOMBRE)
shutil.rmtree(raiz, ignore_errors=True); os.makedirs(raiz)
CARPETAS = ['cotizacion', 'contrato', 'web', 'landings', 'software', 'base-de-datos', 'simulador', 'manual',
            'crecimiento', 'automatizacion', 'mantenimiento', 'rotulado', 'auditoria']
for c in CARPETAS:
    shutil.copytree(os.path.join(ENT, c), os.path.join(raiz, c))
os.makedirs(os.path.join(raiz, 'asesoria'))
shutil.copy2(os.path.join(ENT, 'propuesta', 'Asesoria-Comercial-Vivaldi.pdf'), os.path.join(raiz, 'asesoria'))
subprocess.run(['node', os.path.join(AQUI, 'indice_pdf.js'), os.path.join(raiz, '00-LEEME-Indice-de-entrega.pdf')], check=True)
PROHIBIDO = ('investigacion', 'presentacion', 'guion', 'propuesta-vivaldi-pv', 'fuente-editable', '.ds_store')
zpath = os.path.join(dest, NOMBRE + '.zip')
if os.path.exists(zpath): os.remove(zpath)
n = 0
with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for d, _, fs in os.walk(raiz):
        for f in sorted(fs):
            full = os.path.join(d, f); rel = os.path.relpath(full, dest)
            assert not any(x in rel.lower() for x in PROHIBIDO), rel
            z.write(full, rel); n += 1
print(zpath, n, 'archivos', round(os.path.getsize(zpath) / 1e6, 1), 'MB')
