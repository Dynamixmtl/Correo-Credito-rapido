# Aprendizaje — Verificar y dejar funcionando el login en producción

> Documento vivo de la skill `/aprendizaje`. Acumula todas las preguntas técnicas y sus
> respuestas hasta dominar el problema y resolverlo sin fallos.
>
> **Estados de pregunta:** ❓ Abierta · 🔎 Investigando · ✅ Resuelta · ⏸ Bloqueada (espera al usuario)

## Objetivo / necesidad

Verificar que el login con Microsoft Entra ID funcione en producción
(`https://cr-dynamixmtl.azurewebsites.net`) y, si no funciona, dejarlo funcionando.
Declarado el 2026-07-19.

## Rol asumido

**Ingeniero de identidad Azure / NextAuth v5** — el problema es de configuración OIDC entre
Entra ID, NextAuth v5 y App Service Linux, no de lógica de negocio.

## Progreso

- **% de información para el objetivo:** 95%
- **Resumen del estado actual:** **Causa raíz confirmada con el log del servidor:
  `UntrustedHost`.** NextAuth v5 rechaza el host porque App Service sirve detrás de un proxy y
  nunca se declaró `trustHost`. Hipótesis H1 confirmada, H2 refutada (todas las variables
  necesarias existen). Fix aplicado en `src/lib/auth.ts` (`trustHost: true`), typecheck en
  verde. **Falta desplegarlo y revalidar** — y después probar el flujo OIDC real, que aún no se
  ha ejercido nunca (P7 sigue abierta).

## Fuentes recibidas / consultadas

- Sondeo HTTP directo a producción (2026-07-19) — evidencia primaria del fallo.
- `gh run list` (2026-07-19) — historial de despliegues; el último éxito es del 2026-07-08.
- `src/lib/auth.ts`, `.github/workflows/azure-deploy.yml`, `deploy_pkg/server.js` (build real).
- `az account list` — la suscripción de este proyecto NO está en la sesión actual del CLI.

## Preguntas y respuestas

### P1 — ¿El login funciona hoy en producción? · ✅ Resuelta
- **Por qué importa:** es el objetivo; todo lo demás depende de la respuesta.
- **Respuesta:** **NO funciona.** Sondeo del 2026-07-19:
  - `GET /` → **200** (la app arranca y sirve).
  - `GET /auth/signin` → **200** (la página de login renderiza).
  - `GET /api/auth/providers` → **500** `{"message":"There was a problem with the server
    configuration..."}`
  - `GET /api/auth/csrf` → **500** (mismo error)
  - `GET /api/auth/session` → **500** (mismo error)
  - `GET /api/auth/signin` → 302
  Que `/api/auth/csrf` falle es determinante: ese endpoint no toca Entra ID, solo necesita la
  configuración base de NextAuth. El fallo es **anterior a cualquier interacción con Azure AD**.

### P2 — ¿El código con el fix de `AUTH_SECRET` llegó realmente a producción? · ✅ Resuelta
- **Por qué importa:** si el último commit nunca se desplegó, el diagnóstico sería trivial.
- **Respuesta:** Sí llegó. `gh run list` muestra el run del commit `144fd89`
  ("ajouter AUTH_SECRET explicite") **completado con éxito** el 2026-07-08T23:25Z. Por tanto el
  código desplegado ya lee `AUTH_SECRET ?? NEXTAUTH_SECRET` y **sigue fallando** → el problema
  es que la variable no existe en runtime, o hay una segunda causa.

### P3 — ¿Está `trustHost` configurado? · ✅ Resuelta (y es sospechoso principal)
- **Por qué importa:** NextAuth v5 fuera de Vercel exige confiar explícitamente en el host.
  Detrás del proxy de App Service, sin esto lanza `UntrustedHost`, que se presenta al cliente
  con **exactamente** el mensaje genérico de "server configuration" que estamos viendo.
- **Respuesta:** **No está.** `grep` de `trustHost` / `AUTH_TRUST_HOST` / `AUTH_URL` sobre
  `src/` y `.github/` no devuelve ninguna coincidencia. `auth.ts` no pasa `trustHost: true` y
  el workflow no define `AUTH_TRUST_HOST`. → **Hipótesis H1**, fix de código.

### P4 — ¿El workflow inyecta las variables de entorno al App Service? · ✅ Resuelta
- **Por qué importa:** si el CI no las pone y nadie las puso a mano, NextAuth arranca sin
  secreto ni credenciales y falla exactamente así.
- **Respuesta:** **No las inyecta.** El workflow define `NEXTAUTH_URL` **solo en el step de
  build** (paso 5), lo cual afecta al build de Next pero **no persiste como app setting del
  App Service**. No hay ningún `az webapp config appsettings set` en el pipeline, y por diseño
  se eliminaron los secrets de GitHub ("aucun secret GitHub requis", commit `7b12d3a`).
  → Las variables **deben existir manualmente** en el App Service. **Hipótesis H2**.
  - Efecto colateral confirmado: `NEXTAUTH_URL` tampoco existe en runtime, así que
    `POST /api/webhook/suscripcion` devolvería "NEXTAUTH_URL non configurée" y los enlaces de
    los correos de aprobación (`aprobar/route.ts:90`) saldrían con URL vacía.

### P5 — ¿Qué app settings tiene hoy el App Service `cr-dynamixmtl`? · ✅ Resuelta
- **Por qué importa:** distingue H1 de H2 y es la comprobación definitiva.
- **Respuesta:** (tras `az login` del usuario al tenant dynamixmtl, 2026-07-19). El recurso vive
  en el resource group **`rg-creditrapide`**, no en `rg-approbations-factures`: es un App
  Service **reutilizado de otro proyecto** (Credit Rapide). Estado de las variables:
  - `AUTH_SECRET` → **AUSENTE**, pero `NEXTAUTH_SECRET` presente (44 chars) y el código hace
    fallback → **el secreto sí llega**. H2 refutada en su parte principal.
  - `AZURE_AD_CLIENT_ID` (36), `AZURE_AD_CLIENT_SECRET` (40), `AZURE_AD_TENANT_ID`
    (`0f0db576-…`, coincide con el workflow), `WEBHOOK_SECRET` (40) → todas presentes.
  - `NEXTAUTH_URL` = `https://cr-dynamixmtl.azurewebsites.net` → **correcta**. (Es decir: sí
    existe en runtime, contra lo que supuse en P4; alguien la puso a mano.)
  - `DATABASE_URL` → apunta a **Railway** (`acela.proxy.rlwy.net:27865`, db `railway`), **no a
    Azure Postgres**. Contradice `GUIA_DESPLIEGUE.md`. Registrado en `MEMORIA.md`.

### P6 — ¿Qué dice el log del servidor? · ✅ Resuelta — CAUSA RAÍZ
- **Por qué importa:** el mensaje HTTP es deliberadamente genérico; el log del App Service trae
  el error real de NextAuth y cierra el diagnóstico sin adivinar.
- **Respuesta:** Capturado en vivo (`az webapp log tail` mientras se golpeaba `/api/auth/csrf`
  12 veces, 2026-07-19T21:30Z). El error, repetido en cada request:

  ```
  [auth][error] UntrustedHost: Host must be trusted. URL was:
  https://cr-dynamixmtl.azurewebsites.net/api/auth/csrf
  https://errors.authjs.dev#untrustedhost
      at /home/site/wwwroot/.next/server/chunks/842.js:404:54187
  ```

  **H1 confirmada al 100%.** No tenía nada que ver con el secreto ni con Entra ID: NextAuth v5
  fuera de Vercel exige declarar la confianza en el host, y detrás del proxy de App Service la
  cabecera `Host` no se acepta por defecto. Los 4 commits de julio atacaron la causa
  equivocada.
- **Fix aplicado:** `trustHost: true` en `src/lib/auth.ts` (2026-07-19). `tsc --noEmit` exit 0.
  **Pendiente de desplegar y revalidar.**

### P7 — ¿El redirect URI registrado en Entra ID coincide con el dominio real? · ❓ Abierta
- **Por qué importa:** aunque se arreglen H1/H2, si el registro de la app apunta al dominio de
  la guía (`app-approbations-factures`) y no a `cr-dynamixmtl`, el callback fallará con
  `AADSTS50011` en cuanto el flujo llegue a Entra ID.
- **Respuesta:** pendiente. `GUIA_DESPLIEGUE.md` documenta el redirect URI con el nombre viejo
  `app-approbations-factures.azurewebsites.net`, pero el App Service real se llama
  `cr-dynamixmtl`. **Discrepancia a verificar.**

## Decisiones de diseño / arquitectura

- El diagnóstico se hace **de fuera hacia dentro**: sondeo HTTP (hecho) → app settings → logs →
  flujo OIDC completo en navegador. No tocar código hasta confirmar la causa con el log.
- `AUTH_TRUST_HOST` / `trustHost: true` es necesario en App Service **independientemente** de
  cuál resulte ser la causa: es correctitud, no parche. Se aplicará igual.
- Las variables de entorno se gestionarán como **app settings del App Service**, no como
  secrets de GitHub, para no romper el diseño OIDC sin secretos ya adoptado.

## Plan de solución

1. **(Bloqueante)** `az login` contra el tenant `0f0db576-…` para recuperar acceso al recurso.
2. Leer `az webapp config appsettings list` → confirmar si faltan `AUTH_SECRET`,
   `AZURE_AD_*`, `NEXTAUTH_URL`, `DATABASE_URL`.
3. Leer el log real (`az webapp log tail`) mientras se golpea `/api/auth/csrf` → nombre exacto
   del error de NextAuth.
4. Aplicar el fix según el error: `trustHost: true` en `auth.ts` (H1) y/o poblar los app
   settings (H2).
5. Verificar el redirect URI en el registro de Entra ID contra `cr-dynamixmtl` (P7).
6. **Validación final end-to-end**: `/api/auth/csrf` → 200 con token, y login real en navegador
   hasta ver la sesión creada y la galería de facturas cargando.

## Riesgos y cómo se mitigan

- **Reiniciar el App Service tras cambiar app settings**: Azure lo hace solo, pero hay que
  esperar a que el contenedor levante antes de re-sondear, o se lee un falso negativo.
- **Arreglar solo H2 y no H1**: quedaría fallando por `UntrustedHost` y parecería que el fix no
  sirvió. Por eso se aplican ambos y luego se valida.
- **Secretos**: nunca copiar valores de app settings a este archivo ni a `MEMORIA.md`; solo se
  registra si la variable existe o no.
- **Tenant equivocado**: el proyecto vive en dynamixmtl, no en CSDM. No confundir credenciales
  entre ambos al hacer login.
