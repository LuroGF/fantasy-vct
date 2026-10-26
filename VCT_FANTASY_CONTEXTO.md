# VCT Fantasy / Draftant — continuidad

Actualizado: 22 de octubre de 2026. Proyecto real: `C:/www/fantasy/fantasy-vct`.

## Alcance de lo recuperado

El usuario pidió conservar lo hablado en «Retomar migración Rostermania» (chat `6a993b10-b468-83eb-80db-f1b60e634777`). La herramienta solo expuso seis turnos recientes, del 19–20 de octubre; indicó que no había más páginas. Este documento conserva ese contexto disponible, no una copia completa del historial anterior. No inventar acuerdos anteriores ni considerar las propuestas como cambios ya aplicados.

## Proyecto y preferencias

- Fantasy de Valorant/VCT; se ha usado el nombre Draftant en las propuestas.
- Código real inspeccionado: Next.js 16, React 19, TypeScript/TSX, Tailwind 4, Supabase; despliegue Vercel. Aunque las instrucciones generales del proyecto mencionan Angular, esta tarea continúa la aplicación Next.js existente; no iniciar una migración sin petición concreta.
- Identidad elegida por el usuario: fondo negro y dorado, inspirado en VCT Champions, aspecto profesional. Propuesta de dorado #D6B25E, brillante #F0D58A; rojo para LIVE/errores/peligro.
- Se entregó un globals.css con alias v-red → dorado y v-navy → negro para compatibilidad. El usuario confirmó después en este chat que el tema de los colores ya está solucionado; no seguir tratándolo como pendiente.
- Eliminar misiones/Challenges y tienda. Revisar dashboard, sidebar y notificaciones.
- Posibles accesos Google/Riot/Reddit y vídeo de fondo del login: asuntos para evaluar, no implementados ni compromiso de compatibilidad. Verificar requisitos vigentes antes de desarrollarlos.

## Alcance confirmado para VCT 2027 (21/10/2026)

- El Fantasy cubrirá las cuatro regiones: EMEA, Americas, Pacific y China, únicamente con equipos franquiciados/participantes oficiales de VCT 2027.
- No modificar equipos ni plantillas por filtraciones. Esperar la confirmación oficial de Riot; las listas filtradas solo pueden conservarse como borrador sin efecto en producción.
- Continuar con la aplicación actual Next.js/React/TypeScript/Supabase. No iniciar por ahora la migración a Angular.
- Masters y Champions tendrán más adelante ligas especiales de evento, con mayor capacidad y subasta de jugadores clasificados. No bloquear esta evolución en el modelo, pero no forma parte del primer bloque de V1.
- Para V1 se retiran de la interfaz y se dejan en pausa: tienda, misiones, casters, powerups, inventario, leyendas y bonificaciones asociadas. No borrar todavía tablas ni históricos.
- Mantener la tipografía de inspiración Valorant, pero retirar textos artificiales como «Centro de mando», «Terminal» o «Agente operativo».
- V1 usará email y contraseña. Ocultar Google, Riot y Reddit hasta una fase futura. El login conservará la idea de vídeo ligero con poster/fallback móvil.
- Notificaciones internas y web push para móvil/escritorio: fichajes/cláusulas, pujas/ofertas y recordatorios de jornada, entre otras.
- MVP y clutches no contarán en la puntuación de V1 porque la fuente actual no los ofrece de forma fiable.
- Jugadores profesionales suplentes/benched permanecen en el mercado; jugadores sin equipo no son elegibles ni aparecen en el mercado. Falta confirmar si la frase «no puntuarán» afecta siempre al estado profesional o solo refleja que no disputan mapas.
- Mantener próximos partidos VCT en el dashboard y acceso a la agenda completa; no se ha acordado añadir nuevas entradas principales de navegación.

## Estado comunicado en el chat anterior

- El usuario confirmó `success: true` en sync-vlr-matches y sync-vlr-stats y deploy en Vercel. Es una confirmación histórica; no equivale a verificar hoy producción.
- Se había trabajado en fechas y recuperación de match_date desde Supabase para resultados sin fecha.
- Pendiente robustecer identificación de jugadores mediante VLR ID: nickname + equipo falla ante cambios de nombre y duplicados.
- Revisar equipos admitidos para próxima temporada; no hay lista definitiva verificada aquí. No interpretar el año de una maqueta como una temporada acordada. Propuesta: desactivar/excluir equipos preservando históricos, en lugar de borrarlos.

## Decisiones y propuestas pendientes

1. Partidos: solo circuito principal VCT relevante al Fantasy, excluir Game Changers. No confundir el nombre de una organización con la competición de su partido.
2. Dashboard: quitar Challenges y revisar métricas globales. Propuestas aún no implementadas: jornada, posición de liga, puntos, saldo, titulares, próximos partidos, pujas y actividad.
3. Sidebar: revisar si sigue pendiente quitar tienda. El usuario confirmó que «Cerrar sesión» ya existe dentro de «Más». La captura muestra Perfil, Comunidad, Notificaciones, Invitar amigos, Reglas y puntuación, Soporte y Cerrar sesión. No duplicar logout ni eliminar «Más» basándose en la propuesta anterior; no hay petición actual de reorganizarlo.
4. Notificaciones: auditar lógica actual antes de implementar ofertas, pujas, cláusulas, jornadas y cambios de valor.
5. Login: evaluar proveedores y coste de vídeo con fallback estático/móvil.

## Diagnóstico confirmado con los archivos locales

- `components/DashboardMatchList.tsx` llama directamente a `getVlrMatches()`. Filtra estado/fechas; acepta todos los LIVE. No filtra competición ni consulta equipos del Fantasy.
- `lib/vlr.ts` recibe `match_event`, `tournament_name`, `match_series`, pero los descartaba al transformar los datos. Consultaba upcoming, live_score y results sin filtro de torneo.
- Había un bucle results anidado accidentalmente dentro de otro results; el Map final ocultaba los duplicados.
- `app/api/admin/sync-vlr-matches/route.ts` sí comprueba ambos equipos con `pro_teams` por VLR ID/nombre antes de upsert. Esto no afecta a los datos VLR directos del dashboard.
- `app/schedule/page.tsx` ya consulta matches de Supabase por jornada activa, no el listado VLR directo. Cambiar el adaptador no limpia partidos históricos ya guardados.
- VLR_API_URL configura el servicio externo. No guardar secretos en este documento.

## Trabajo de esta sesión

Se prepara una versión corregida en `vct-fix/vlr.ts`, con filtro conservador por nombres de competiciones principales, aplicado a próximos/directos/resultados, metadatos de torneo y un único bucle de resultados. Los eventos sin nombre reconocible se excluyen. Es un filtro por etiquetas de la API, no todavía un catálogo por ID de torneo/temporada habilitado en Supabase.

Aplicado con permiso de sistema el 20/10/2026 a `C:/www/fantasy/fantasy-vct/lib/vlr.ts`. También se guardó una copia de este contexto en la raíz del proyecto real, antes de registrar este resultado final. Pruebas: 24 casos de clasificación y pruebas con fetch simulado de próximos/directos/resultados, prioridades, marcadores, fechas y metadatos; TypeScript del proyecto completo pasó tras aplicar el archivo (`tsc --noEmit --incremental false`). No se ejecutó build de producción, no se consultó la API real ni se desplegó. No se cambiaron dashboard/agenda ni datos históricos de Supabase.

El 21/10/2026 se preparó en el espejo seguro `vct-fix/20261021_vct_2027_season_model.sql`: crea una temporada 2027 en estado `draft` y tablas de participación estacional de equipos/jugadores. No carga la filtración, no activa elegibilidad y no elimina datos. También se preparó `vct-fix/VCT_2027_ROLLOUT.md`. El usuario confirmó después que aplicó el SQL en Supabase sin errores.

También el 21/10/2026 se comprobó la API real configurada. Los jugadores de `v2/match/details` no incluyen ID, pero `v2/team?id=...&q=roster` sí devuelve `id`, `alias` y grupos `active`, `benched` y `former`. Se añadió `getVlrTeamRoster()` a `C:/www/fantasy/fantasy-vct/lib/vlr.ts` y se modificó `sync-vlr-stats` para resolver primero por `pro_players.vlr_id`, enlazar IDs vacíos solo cuando roster + nickname + equipo ofrecen una coincidencia única, conservar un fallback medido y reportar conflictos. Los cambios se aplicaron al proyecto real. Verificación: prueba aislada del adaptador, `tsc --noEmit --incremental false` y `npm run build` pasaron. No se ejecutó el endpoint de sincronización ni se desplegó.

La validación real del filtro devolvió 18 próximos: 12 de Project Blender y 6 de VCT China Threshold. Se comprobó que Threshold es un torneo de acceso/cierre de China Nationals y se añadió a las exclusiones junto con Ascension. Tras el ajuste, los próximos aceptados fueron 0; de 50 resultados se aceptaron 34, todos de Champions 2026, y se excluyeron Game Changers y Monsters Reloaded. El ajuste se aplicó al proyecto real y TypeScript pasó.

Se retiraron Tienda de `Sidebar`/`Navbar` y Misiones del dashboard, manteniendo la ruta y código histórico de `/shop` sin acceso desde la navegación. La actividad reciente también excluye transacciones `buy_item`. La página de reglas ya no muestra bonus MVP y explica que MVP/clutches no puntúan en V1; `sync-vlr-stats` continúa enviando ambos como cero/falso. No se reemplazó la función SQL de puntuación porque el repositorio contiene varias fórmulas históricas incompatibles y hace falta consolidar la fórmula vigente antes de tocarla.

Se implementó un Dashboard V2: saludo, selección de liga, posición, puntos totales/de jornada, saldo, estado del quinteto, jornada activa, estados sin liga y actividad reciente. `DashboardMatchList` dejó de consultar VLR directamente y ahora lee próximos/directos desde Supabase, por lo que solo muestra partidos que hayan pasado por la admisión del Fantasy. TypeScript y `npm run build` pasaron; permanece únicamente el aviso no bloqueante de Next.js sobre migrar la convención `middleware` a `proxy`. No se desplegó.

Se sustituyó el prototipo de bonus diario por una recompensa segura de **500.000 € diarios por cada liga habilitada**. Se reclama manualmente desde la campana, no se acumula y se calcula por día natural de `Europe/Madrid`. El cobro usa `auth.uid()`, una RPC atómica y libros de auditoría por reclamo/por liga para impedir duplicados y cobros parciales. Se añadió `leagues.daily_reward_enabled` para poder excluir futuras ligas especiales. Código aplicado: `lib/actions/bonus.ts`, `components/TopBar.tsx`, `components/BonusManager.tsx` y `migrations/20261021_daily_reward.sql`. TypeScript y `npm run build` pasaron.

El usuario confirmó que ejecutó `20261021_daily_reward.sql` en Supabase. Se verificó por lectura que existen `daily_bonus_claims`, `daily_bonus_credits` y `leagues.daily_reward_enabled`.

Se implementó la infraestructura V1 de notificaciones internas y push. Incluye enlaces de acción, claves de deduplicación, categorías, preferencias por entrenador, alta/baja de dispositivos, limpieza de suscripciones caducadas y cierre del endpoint de envío con `CRON_SECRET` obligatorio. Se conectaron avisos para ofertas entre entrenadores, oferta aceptada/rechazada, cláusulas, intercambios y subastas ganadas. Se añadió un recordatorio de jornada dentro de las 24 horas y otro del bonus diario no reclamado. La página de avisos permite activar push y elegir Mercado/Jornadas/Social/Recompensa diaria. El service worker reutiliza una ventana abierta. El cron de avisos es independiente y corre a las 17:00 UTC; el motor existente continúa a las 02:00 UTC. Archivos principales: `migrations/20261021_notification_system.sql`, `lib/notifications/create.ts`, `lib/notifications/push.ts`, `components/NotificationSettings.tsx`, `/api/cron/notifications` y `vercel.json`. `npx tsc --noEmit` y `npm run build` pasaron. Pendiente: aplicar la nueva migración en Supabase y configurar las claves VAPID (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, opcional `VAPID_SUBJECT`) tanto localmente como en Vercel. Sin VAPID los avisos internos funcionan, pero push queda omitido de forma segura.

Al primer intento, Supabase devolvió `42P01 relation public.notifications does not exist`. Esto confirmó que la migración histórica de notificaciones no estaba aplicada en la base real. Se corrigió `20261021_notification_system.sql` para que sea autosuficiente: ahora crea `notifications` y `push_subscriptions` con sus RLS si faltan antes de ampliarlas.

El usuario confirmó después que la migración corregida se ejecutó. La verificación de solo lectura confirmó las tres tablas (`notifications`, `push_subscriptions`, `notification_preferences`), todas las columnas nuevas y las RPC `enqueue_gameweek_reminders`, `enqueue_daily_reward_reminders` y `enqueue_market_result_notifications`. No se ejecutaron las RPC para evitar crear avisos reales. El proyecto local no está vinculado a Vercel, no dispone de Vercel CLI y aún no tiene variables VAPID.

El usuario probó el bonus desde la campana: recibió 500.000 €, recargó y la tarjeta no volvió a aparecer, validando la idempotencia diaria. Después se generó un par VAPID local y se guardaron `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT` solo en `C:/www/fantasy/fantasy-vct/.env.local`, que está cubierto por `.gitignore`. El archivo temporal utilizado se eliminó. `npm run build` pasó con las claves. Sigue pendiente replicar las variables en Vercel cuando el proyecto se enlace/despliegue y realizar la prueba de permiso/suscripción desde el navegador autenticado del usuario.

Se añadió un botón autenticado `Enviar prueba` en `components/NotificationSettings.tsx`. La acción `sendTestNotification()` solo puede crear un aviso para `session.user.id`, guarda el aviso interno y devuelve el resultado real de Web Push. `npm run build` pasó. Pendiente que el usuario reinicie el servidor local, active push en Más > Notificaciones y pulse el botón para validar navegador + suscripción + VAPID + service worker.

El 21/10/2026 el usuario validó Web Push de extremo a extremo en Brave/Windows. Fue necesario activar en Brave «Usar los servicios de Google para mensajes push» y permitir las notificaciones de Brave en Windows. Supabase mostró una suscripción activa y la prueba con `push_status = sent`. `NotificationSettings` detecta ahora el error específico de Brave y muestra instrucciones accionables. Sigue pendiente configurar las tres variables VAPID en Vercel para producción.

Después se consolidó la puntuación V1. La primera preparación por rol se descartó antes de ejecutar SQL. La fórmula definitiva confirmada por el usuario es global: kill +2, muerte -1, asistencia +1, clutch +3, FB +2, FD -1, tramos ACS (-1/0/+1/+3/+5) y MVP +5. `migrations/20261021_v1_scoring.sql`, `lib/logic/scoring.ts` y la página Reglas reflejan esta fórmula. La migración no recalcula históricos. `lib/actions/scoring.ts` cuenta exclusivamente titulares y ya no aplica leyendas, capitanes/powerups, casters ni gasto de tienda. El sync actual envía clutches=0 y MVP=false mientras VLR no los ofrezca de forma fiable. TypeScript y `npm run build` pasaron. Pendiente que el usuario ejecute la migración SQL en Supabase.

El usuario confirmó que aplicó la migración de puntuación. Después aprobó la economía de jornada: 2.000.000 € al 1.º, 1.250.000 € al 2.º, 750.000 € al 3.º y 500.000 € al resto que participe con cinco titulares válidos. Los empates comparten las bolsas de las posiciones afectadas. Se eliminó la conversión histórica de 50.000 € por punto. `migrations/20261021_gameweek_rewards.sql` crea un libro idempotente, paga de forma atómica, actualiza `rewarded` por compatibilidad y genera una notificación; el cron de puntuaciones liquida jornadas finalizadas después del motor. TypeScript y `npm run build` pasaron. Pendiente que el usuario ejecute esta nueva migración en Supabase.

El 22/10/2026 se verificó que la migración de premios está aplicada en Supabase: existen `gameweek_rewards`, `settle_gameweek_rewards` y `settle_finished_gameweek_rewards`. La página Reglas muestra tanto la fórmula como los premios y el bono diario. Estadísticas muestra el historial auditable de premios y sustituyó el marcador ficticio de ranking global por la posición real dentro de la liga seleccionada. TypeScript y `npm run build` pasaron; solo permanece el aviso no bloqueante de Next.js sobre `middleware`/`proxy`.

La antigua `/stats` se convirtió en «Rendimiento» para que sea accionable. Permite seleccionar liga y una de las ocho jornadas recientes; muestra puntos y posición de jornada, media de liga, clasificación acumulada, tendencia, evolución histórica, aportación individual del quinteto capturado al cierre, mejor jugador, jugador a revisar e historial de premios. Se eliminó el gráfico circular de roles. «Rendimiento» está accesible desde Más y se retiró el texto artificial «Ajustes de Terminal». El diseño conserva el tema negro/dorado y es responsive. TypeScript y `npm run build` pasaron.

El 22/10/2026 se cerró de forma reversible el acceso a las funciones heredadas fuera de V1. Un archivo central `lib/features.ts` mantiene apagados tienda, powerups, casters, leyendas y misiones; `/shop` redirige a Más, las lecturas de inventario/casters no exponen datos y las mutaciones de compra, activación y contratación rechazan la operación. No se eliminó código ni información histórica. La migración `migrations/20261022_pause_v1_legacy_features.sql` revoca además el RPC antiguo `handle_buy_powerup` y las escrituras directas sobre inventario, powerups activos y casters activos para que la pausa no dependa solo de la interfaz. `npm run build` pasó; solo permanece el aviso no bloqueante de Next.js sobre `middleware`/`proxy`.

El usuario confirmó que aplicó la migración de pausa. El primer intento falló porque la base real no contenía `handle_buy_powerup`; se hizo tolerante a RPC y tablas opcionales y después se ejecutó correctamente.

Se preparó la elegibilidad de jugadores sin activar prematuramente la plantilla filtrada de 2027. La comprobación real mostró la temporada 2027 en `draft`, cero filas en `vct_season_players`, cero leyendas y los 240 jugadores actuales todavía asociados a un equipo. `lib/player-eligibility.ts` usa por ahora el catálogo compatible (equipo asignado y no leyenda); cuando exista una temporada `active`, cambia automáticamente a equipos `confirmed + fantasy_eligible` y jugadores `market_eligible` con estado `active`, `substitute` o `benched`, excluyendo `free_agent`, `inactive` y `retired`. Este filtro se aplica a scouting, subastas, pujas y secciones adquiribles del mercado. Además, el cálculo TypeScript auxiliar dejó de leer la plantilla actual y usa `gameweek_lineups`, evitando que un cambio posterior reescriba una jornada; los empates conservan la misma posición. El motor principal continúa siendo el RPC `run_gameweek_engine`, que ya dispone de las funciones de snapshot en Supabase. `npx tsc --noEmit --incremental false` y `npm run build` pasaron; solo permanece el aviso de `middleware`/`proxy`.

El 22/10/2026 se publicó la lista definitiva de las 32 organizaciones asociadas para el ciclo 2027-2028: ocho por Americas, EMEA, Pacific y China. La preparación inicial limitada a EMEA fue sustituida, antes de ejecutarse, por `migrations/20261022_confirm_vct_2027_partner_teams.sql`. La migración completa valida las 29 filas canónicas ya existentes y crea Crazy Raccoon, GAM Esports y Weibo Gaming, que faltaban en `pro_teams`; confirma exactamente ocho por región, marca cualquier otro borrador 2027 como retirado y carga como candidatos inactivos los jugadores actualmente asociados. El usuario la ejecutó y la verificación posterior confirmó 32 equipos, ocho por región, temporada en `draft`, 145 candidatos inactivos y cero jugadores elegibles. No ejecutar la migración previa limitada a EMEA.

El usuario facilitó después las primeras plantillas parciales de EMEA 2027: Team Heretics (5), FNATIC (4, falta uno), Gentle Mates (5), Team Vitality (5) y Team Liquid (3, faltan dos). Se preparó y el usuario ejecutó `migrations/20261022_confirm_partial_emea_2027_rosters.sql`, que reutiliza 17 jugadores existentes, crea Jamelinho213, kozzy, MAGNUM, Kachoww y GSR con sus identificadores VLR, actualiza los cambios de club, cambia Jamppi a Flex y mantiene a Sayonara como Iniciador. La verificación real confirmó exactamente 22 filas `active + market_eligible`, distribuidas 5/4/5/5/3, sin jugadores adicionales activados en esos clubes. La temporada continúa en `draft` y los huecos pendientes no se han rellenado.

El usuario indicó que Karmine Corp, FUT Esports y BBL Esports mantienen por ahora sus plantillas anteriores. La consulta real mostró exactamente cinco jugadores asociados a cada club. Se preparó y el usuario ejecutó `migrations/20261022_retain_kc_fut_bbl_2027_rosters.sql`, que promovió únicamente esos quince registros a `active + market_eligible`, sin crear jugadores ni cambiar clubes o roles y manteniendo la temporada en `draft`. El resultado SQL confirmó BBL Esports 5, FUT Esports 5 y Karmine Corp 5.

Al retomar el cierre de V1 se hizo una auditoría de restos visibles. Login y registro todavía mostraban botones inoperativos de Riot y Google, pese a que V1 usa solo email/contraseña; se retiraron sin tocar el vídeo ni el formulario. También se sustituyeron textos artificiales: «Terminal de Scouting» por «Jugadores VCT», «agente» por «jugador» en esa vista, «Centro de Mando» por «inicio», los textos de soporte tipo terminal por lenguaje normal y «Leyenda de la Terminal» por «Referente del Fantasy». Tienda sigue protegida por redirección y las funciones antiguas permanecen apagadas. `npm run build` pasó; solo continúa el aviso no bloqueante de Next.js sobre `middleware`/`proxy`.

El 24/10/2026 el usuario completó el primer tramo de la prueba end-to-end creando el entrenador `Luro3`. Registro, inicio de sesión, perfil y estado de dashboard sin liga funcionaron. La captura reveló dos residuos: una etiqueta `S3 // 2026` y partidos antiguos/no elegibles, incluido un directo 0-0 obsoleto. `DashboardMatchList` consulta ahora los equipos `confirmed + fantasy_eligible` de VCT 2027 y solo muestra un partido si ambos clubes pertenecen a esa lista; además descarta estados `live` con más de 12 horas. La agenda aplica el mismo filtro sin borrar históricos. Sidebar, Más, Ligas y Agenda usan ya etiquetas VCT 2027. `npm run build` pasó; solo continúa el aviso no bloqueante de Next.js sobre `middleware`/`proxy`.

Luro3 creó correctamente `LURO3 LIGA` con 50 millones de presupuesto inicial. La captura mostró aún `Créditos`, `VP` y un `Rank #--` ficticio. Se unificó la moneda visible a `Presupuesto`/euros en Ligas, Equipo, fichas de jugador, ranking y actividad reciente; los mensajes de venta también hablan de euros. `getUserLeagues` obtiene en una sola consulta los participantes de las ligas del usuario y calcula la posición real, respetando empates; una liga con un único participante muestra `Rank #1`. `npm run build` pasó; solo continúa el aviso no bloqueante de Next.js sobre `middleware`/`proxy`.

## Cómo retomar

Leer este archivo y el código actual antes de trabajar. Las decisiones nuevas del usuario prevalecen. No editar `sources/` ni archivos sincronizados de este espejo. Mantener este documento actualizado con resultados comprobados y pendientes.
