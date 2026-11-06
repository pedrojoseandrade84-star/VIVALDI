#!/bin/bash
# Corre todas las pruebas con base de datos, cada una sobre una base limpia.
# Requiere PostgreSQL de prueba (/var/tmp/vvpg, puerto 5544) y el servidor de prueba: node base-de-datos/mock.js
D=$(cd "$(dirname "$0")" && pwd); H=$(cd "$D/../../entregables/software" && pwd)/planicie-herramienta-final.html
cd "$D"; bash base-de-datos/preparar.sh || exit 1; total=0; malas=0
for t in base-de-datos/tsync.js base-de-datos/tlead.js base-de-datos/tasesor.js base-de-datos/tgestion.js base-de-datos/tcrm.js base-de-datos/tborrar.js base-de-datos/twhatsapp.mjs base-de-datos/tportal.js base-de-datos/texplorador.js landings/tform.js landings/tlive.js; do
  bash base-de-datos/reiniciar.sh > /dev/null 2>&1
  out=$(timeout 900 node --experimental-strip-types --no-warnings "$t" "$H" 2>&1); ok=$(grep -c "^OK" <<< "$out"); bad=$(grep -c "^FAIL" <<< "$out")
  if [ "$ok" = "0" ] && [ "$bad" = "0" ]; then bad=1; fi
  printf "%-28s %3s OK  %s FAIL\n" "$t" "$ok" "$bad"; grep "^FAIL" <<< "$out" | cut -c1-160; [ "$ok" = "0" ] && tail -3 <<< "$out"
  total=$((total + ok)); malas=$((malas + bad))
done
echo "TOTAL: $total OK, $malas FAIL"
