#!/bin/bash
# Reconstruye la base de prueba "vv" desde cero: roles de Supabase simulados, esquema completo y cuatro usuarios.
# Uso: bash reiniciar.sh   (PostgreSQL 16 en /var/tmp/vvpg, puerto 5544)
set -e
D=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$D/../../.." && pwd)
PSQL="psql -h /var/tmp/vvpg -p 5544 -U postgres -X -q -v ON_ERROR_STOP=1"
$PSQL -d postgres -c "drop database if exists vv with (force)" -c "create database vv"
$PSQL -d vv -c "do \$\$ begin create role anon nologin; exception when duplicate_object then null; end \$\$" \
            -c "do \$\$ begin create role authenticated nologin; exception when duplicate_object then null; end \$\$"
grep -v "^create role" "$D/stub.sql" | $PSQL -d vv
$PSQL -d vv -f "$ROOT/entregables/base-de-datos/esquema-supabase.sql" > /dev/null
$PSQL -d vv <<'SQL'
insert into auth.users values ('00000000-0000-0000-0000-00000000000a', 'ana@vivaldi.pe'), ('00000000-0000-0000-0000-00000000000b', 'beto@vivaldi.pe'),
  ('00000000-0000-0000-0000-00000000000c', 'jefa@vivaldi.pe'), ('00000000-0000-0000-0000-00000000000d', 'baja@vivaldi.pe');
insert into public.perfiles (id, nombre, rol, activo) values ('00000000-0000-0000-0000-00000000000a', 'Ana Flores', 'asesor', true),
  ('00000000-0000-0000-0000-00000000000b', 'Beto Ruiz', 'asesor', true), ('00000000-0000-0000-0000-00000000000c', 'Jefa Comercial', 'jefatura', true),
  ('00000000-0000-0000-0000-00000000000d', 'Baja', 'asesor', false);
SQL
echo "base de prueba lista"
