-- Activar el envío automático de WhatsApp (ejecutar UNA vez, cuando la cuenta de WhatsApp Business y las plantillas estén aprobadas)
-- Diseño y desarrollo: Pedrojose Andrade Paredes
-- Antes: Database → Extensions → activar "pg_cron" y "pg_net".
-- Reemplazar los 3 valores entre < > y ejecutar en SQL Editor.

select cron.schedule('vivaldi-enviar-whatsapp', '*/5 * * * *', $$
  select net.http_post(
    url := 'https://<ID-DEL-PROYECTO>.supabase.co/functions/v1/enviar-whatsapp',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer <ANON-KEY>', 'x-envios-clave', '<ENVIOS_CLAVE>'),
    body := '{}'::jsonb, timeout_milliseconds := 55000);
$$);

-- Para pausar todos los envíos:      select cron.unschedule('vivaldi-enviar-whatsapp');
-- Para ver los últimos resultados:   select * from cron.job_run_details order by start_time desc limit 20;
-- Para ver la cola:                  select estado, count(*) from public.mensajes group by estado;
