-- Activar el conector con el CRM o la base de datos de Vivaldi (ejecutar UNA vez)
-- Diseño y desarrollo: Pedrojose Andrade Paredes
-- Antes:
--   1. Database → Extensions → activar "pg_cron" y "pg_net".
--   2. Publicar la función: supabase functions deploy conector --no-verify-jwt   (la función valida ella misma la clave o el usuario de jefatura)
--   3. Edge Functions → Secrets: CONECTOR_CLAVE (una clave larga inventada) y la clave de la fuente, por ejemplo HUBSPOT_TOKEN o BD_VIVALDI.
-- Reemplazar los 3 valores entre < > y ejecutar en SQL Editor. Luego, en la herramienta (usuario de jefatura): Conectar datos → CRM o base de datos.

select cron.schedule('vivaldi-conector', '*/5 * * * *', $$
  select net.http_post(
    url := 'https://<ID-DEL-PROYECTO>.supabase.co/functions/v1/conector',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer <ANON-KEY>', 'x-conector-clave', '<CONECTOR_CLAVE>'),
    body := '{}'::jsonb, timeout_milliseconds := 55000);
$$);
-- La tarea corre cada 5 minutos; cada conector se lee según su propia frecuencia (15 minutos por defecto).

-- Para pausar todos los conectores:   select cron.unschedule('vivaldi-conector');
-- Para ver el estado de cada uno:     select id, nombre, tipo, coleccion, activo, ultimo, resultado, error from public.conectores order by id;
