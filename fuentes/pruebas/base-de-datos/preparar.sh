#!/bin/bash
# Prepara los archivos que usan las pruebas: web y herramienta apuntando al servidor de prueba, y la función de WhatsApp.
D=$(cd "$(dirname "$0")" && pwd); E=$(cd "$D/../../../entregables" && pwd)
sed 's#const BASE = {url: "", key: ""}#const BASE = {url: "http://127.0.0.1:54321", key: "anon-test-key"}#' "$E/web/Vivaldi-web-final.html" > "$D/web_db.html"
grep -q '127.0.0.1:54321' "$D/web_db.html" || { echo "no se pudo conectar la web de prueba"; exit 1; }
cp "$E/software/planicie-herramienta-final.html" "$D/tool_db.html"
cp "$E/base-de-datos/funciones/enviar-whatsapp/index.ts" "$D/fn.mts"
echo "archivos de prueba listos"
