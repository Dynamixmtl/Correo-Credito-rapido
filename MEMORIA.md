# Memoria del proyecto — Approbations de Factures (Deyby / CSDM)

> Fuente de verdad del contexto del proyecto. Se mantiene viva: cada decisión y
> aprendizaje importante se registra aquí en el momento.
> Creada el 2026-07-19 a partir del código, `GUIA_DESPLIEGUE.md` y el historial de git.

## Objetivo

Sistema web de **aprobación de facturas** para la CSDM (Centre de services scolaire de
Montréal). Una factura entra (manualmente o por correo), se le asignan hasta 6 niveles de
aprobadores (CP, Régisseur, Coordo, Direction adjointe, Direction générale, COO) y cada uno
aprueba/rechaza hasta cerrar el circuito. UI en **francés**; código/comentarios en español.

## Stack

Excepción al stack estándar: **este proyecto va sobre Azure, no Railway**.

- **App**: Next.js 15.1.3 (App Router) + React 19 + TypeScript + Tailwind + Radix UI (shadcn).
- **Datos**: PostgreSQL **en Railway** (`acela.proxy.rlwy.net:27865`, db `railway`) + Prisma 5.
  ⚠️ **No es Azure Postgres**: `GUIA_DESPLIEGUE.md` y `.azure/provision.sh` describen un
  Flexible Server que en la práctica no se usa. Verificado en los app settings el 2026-07-19.
- **Auth**: **NextAuth v5 beta** con provider **Microsoft Entra ID** (no JWT propio `jose`).
  Estrategia `jwt`, **sin PrismaAdapter** (ver Lecciones).
- **Deploy**: Azure App Service Linux `cr-dynamixmtl`, en el resource group **`rg-creditrapide`**
  (recurso **reutilizado de otro proyecto**, "Credit Rapide" — no existe
  `rg-approbations-factures` pese a lo que dice la guía). CI en GitHub Actions con **OIDC**
  (sin secrets en GitHub). Node 22.
- **Documentos**: guardados como `Bytes` **en Postgres** (`src/lib/db-storage.ts`), no en Blob.
- **Integraciones**: Microsoft Graph (buscar usuarios, enviar correo, webhook de inbox), SGDI
  (intranet CSDM, solo alcanzable desde el servidor).
- **Data layer cliente**: TanStack Query + TanStack Table; formularios con react-hook-form + zod.

## Estado actual (2026-07-19)

- Funcionalidad núcleo **implementada**: alta/edición de facturas, galería + filtros +
  paginación, detalle, subida y descarga de documentos, circuito de aprobación con historial,
  composición de correos, ingesta de facturas por correo vía webhook de Graph.
- El trabajo reciente (últimos 4 commits) fue **depurar el login en Azure**, no features.
  El repo quedó en `144fd89 fix: ajouter AUTH_SECRET explicite`.
- **Nunca verificado en esta memoria si el login ya funciona en producción** — es lo primero
  que hay que comprobar al retomar.
- Working tree: solo ruido de fin de línea en `next-env.d.ts` / `tsconfig.json` (CRLF↔LF), más
  `deploy_pkg/` y `deploy_pkg.zip` sin trackear (artefactos de un deploy manual del 2026-07-08).

## Arquitectura y módulos

```
src/app/api/          facturas (CRUD), aprobar, documentos, adjuntos-temporal,
                      escuelas, proveedores, usuarios/buscar, correo,
                      webhook/correo (ingesta), webhook/suscripcion (crear/renovar)
src/lib/              auth.ts, api-helpers.ts (requireAuth), prisma.ts, db-storage.ts,
                      graph.ts (usuario), graph-app.ts (app-only), email-parser.ts,
                      azure-blob.ts (NO USADO), utils.ts (calcularEstatusGeneral)
src/components/       facturas/ (Form, Detalle, Galeria, FiltrosBarra, EmailComposer),
                      shared/ (UserSearchCombo, FileUpload, EstadoBadge, AprobadorChip)
prisma/schema.prisma  Factura, Fournisseur, Ecole, Documento, AdjuntoTemporal,
                      HistorialAprobacion, Bureau, Version + tablas NextAuth (huérfanas)
```

Docs relacionados: [`GUIA_DESPLIEGUE.md`](GUIA_DESPLIEGUE.md) (aprovisionamiento Azure paso a
paso, costos ~$133 CAD/mes), `.azure/provision.sh`.

## Decisiones y reglas de negocio

- **6 niveles de aprobación** por factura (`etatCP`, `etatRegisseur`, `etatCoordo`,
  `etatDirAdj`, `etatDirGen` + `cooEmail`), cada uno con email + nombre. Estado global de la
  factura se deriva con `calcularEstatusGeneral()` en `src/lib/utils.ts`.
- Estados factura: `OUVERT / EN_COURS / APPROUVE / REFUSE / PAYE`.
  Estados aprobador: `VACIO / EN_COURS / APPROUVE / REFUSE`.
- **Documentos en la base de datos**, no en Blob Storage. Decisión tomada durante el
  desarrollo (existe `azure-blob.ts` del diseño original, quedó sin uso).
- **Ingesta por correo**: solo se procesan mensajes del remitente autorizado
  `acostasalcedo.d@csdm.qc.ca` (hardcodeado en `src/app/api/webhook/correo/route.ts:14`).
  El webhook valida con `clientState === WEBHOOK_SECRET` y responde 202 en <30s como exige Graph.
- **Toda la UI en francés**; los identificadores del código en español/francés mezclados
  (`nombreFactura`, `noProjet`, `dateSaisie`). Es intencional, no unificar sin avisar.
- El tenant Azure actualmente configurado en CI es **dynamixmtl** (el de desarrollo/Deyby),
  no el de CSDM. Ver Pendientes.

## Lecciones técnicas

- **`trustHost: true` es obligatorio en App Service.** Sin él, NextAuth v5 lanza
  `UntrustedHost` y **todos** los endpoints `/api/auth/*` devuelven 500 con un mensaje genérico
  de "server configuration" que no dice nada. Confirmado en el log el 2026-07-19; fue la causa
  real del login roto y los 4 commits de julio atacaron la causa equivocada.
  **Lección de método:** ante ese mensaje genérico, ir directo al log del servidor
  (`az webapp log tail` mientras se golpea `/api/auth/csrf`) en vez de iterar a ciegas.
  `/api/auth/csrf` es el mejor canario: no toca Entra ID, así que si falla el problema es de
  configuración base, no de identidad.
- **NextAuth v5 no lee `NEXTAUTH_SECRET`** — hay que pasar `AUTH_SECRET` explícito. En
  `auth.ts` se resuelve con `process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET`; en
  producción solo existe `NEXTAUTH_SECRET`, así que **el fallback es lo que lo mantiene vivo**
  (no quitarlo).
- **PrismaAdapter rompía el login** con error genérico `Configuration`. Se eliminó y se pasó a
  sesión `jwt` pura. Las tablas `User/Account/Session/VerificationToken` siguen en el schema
  pero **ya no se usan**.
- En el workflow de Azure OIDC, declarar `environment: production` **rompe el OIDC subject**
  (el subject del token cambia y la federated credential no matchea). Se quitó.
- Scopes de Entra ID reducidos a `openid profile email User.Read`; pedir más provocaba
  fallos de consentimiento.
- `prisma/migrations/` está en `.gitignore` → el esquema se aplica con `db push`, no con
  `migrate deploy`, y el CI **no corre migraciones**.

## Pendientes / preguntas abiertas

Prioridad alta:
1. **Login en producción: causa raíz encontrada y corregida en local, FALTA DESPLEGAR.**
   (2026-07-19) Estaba roto: `UntrustedHost`. Fix = `trustHost: true` en `src/lib/auth.ts`,
   typecheck en verde, **sin commitear ni desplegar todavía**. Ver
   [`Aprendizaje.md`](Aprendizaje.md) para el diagnóstico completo. Tras desplegar hay que
   revalidar `/api/auth/csrf` → 200 y hacer el login real en navegador, **que nunca se ha
   ejercido** (el flujo OIDC contra Entra ID sigue sin probarse de punta a punta).
   Riesgo siguiente: el redirect URI registrado en Entra ID puede apuntar al nombre viejo
   `app-approbations-factures` en vez de `cr-dynamixmtl` → daría `AADSTS50011`.
2. **Migrar del tenant `dynamixmtl` al tenant real de CSDM**: nuevo registro de app, redirect
   URI, consentimiento de admin, y actualizar `tenant-id`/`client-id` en
   `.github/workflows/azure-deploy.yml` (hoy apunta a `0f0db576-…` = dynamixmtl).
3. **Renovación automática de la suscripción de Graph**: las suscripciones a correo expiran en
   ~3 días. Existe `PATCH /api/webhook/suscripcion` pero **nadie lo llama**. Falta un
   cron/timer (Azure Function o GitHub Action programada) o la ingesta se apagará sola.
4. **Datos semilla ficticios**: `prisma/seed.ts` tiene écoles y fournisseurs inventados. Hay
   que cargar el catálogo real de CSDM antes de producción.

Prioridad media:
5. Limpiar el schema: quitar `User/Account/Session/VerificationToken` (huérfanas tras eliminar
   PrismaAdapter) y decidir si se borra `src/lib/azure-blob.ts` o se migra a Blob.
6. Estrategia de migraciones: hoy `prisma/migrations/` está gitignoreado. Decidir si se versiona
   y se añade `migrate deploy` al CI, o se documenta `db push` como el método oficial.
7. Sacar del repo `deploy_pkg/` y `deploy_pkg.zip` (24 MB, artefactos de deploy manual) —
   añadirlos al `.gitignore`.
8. `src/app/api/webhook/correo/route.ts` no valida firma más allá de `clientState`; revisar si
   basta para el criterio de seguridad del cliente.

Preguntas abiertas para el cliente/Deyby:
- ¿El sistema arranca en el tenant de CSDM o se queda en dynamixmtl como piloto?
- ¿Quién administra la cuenta que recibe los correos (`WEBHOOK_ADMIN_EMAIL`) en producción?
- ¿Se mantiene el remitente único autorizado o habrá varios usuarios enviando facturas?
