# Solusof Técnicos

App interna para digitalizar la orden de servicio de instalación de GPS de
Solusof. Dos roles:

- **Admin**: crea la "tarjeta" de servicio (datos del cliente + del
  vehículo) y la asigna a un técnico.
- **Técnico**: recibe el servicio (con aviso en tiempo real), lo inicia al
  llegar al sitio, completa el checklist en pasos, sube evidencia
  fotográfica y firma digitalmente para cerrarlo.
- El admin revisa el resumen final y lo **aprueba o rechaza**.

## Stack

React + Vite (JavaScript) · [Supabase](https://supabase.com) (Postgres +
Auth + Storage + Realtime) · `react-router-dom` · `react-signature-canvas`.

No hay backend propio: toda la lógica de datos vive en Postgres (con Row
Level Security) y en una única Edge Function (`create-technician`, ver
abajo).

## Requisitos

- Node.js 18+
- Una cuenta y proyecto en [supabase.com](https://supabase.com) (el plan
  gratuito alcanza para un equipo chico)
- [Supabase CLI](https://supabase.com/docs/guides/cli) para aplicar las
  migraciones y desplegar la Edge Function (`npm install -g supabase`, o
  `brew install supabase/tap/supabase`)

## Configurar el proyecto de Supabase (una sola vez)

1. Crea un proyecto nuevo en supabase.com.
2. Aplica el schema y las políticas de seguridad:
   ```bash
   supabase login
   supabase link --project-ref TU-PROJECT-REF
   supabase db push
   ```
   Esto corre, en orden, `supabase/migrations/0001_init.sql` (tablas +
   bucket de Storage) y `0002_rls.sql` (Row Level Security).
3. Despliega la Edge Function que crea cuentas de admin/técnico:
   ```bash
   supabase functions deploy create-technician
   ```
4. **Primer admin (manual, una sola vez)**: como crear cuentas requiere ya
   tener un admin logueado (ver "Seguridad" abajo), da de alta el primer
   admin a mano desde el dashboard de Supabase — Authentication → Add user
   (con email y contraseña), y luego en Table Editor → `profiles` inserta
   una fila con ese mismo `id`, `role = 'admin'` y su `nombre`. De ahí en
   adelante, ese admin ya puede crear el resto de las cuentas desde
   `/admin/usuarios` en la app.
5. **Habilitar Realtime**: en el dashboard, Database → Replication, activa
   las tablas `servicios`, `accesorios_instalados` y `fotos`. Sin esto los
   inserts se guardan bien, pero el aviso instantáneo al técnico no llega,
   y el admin no ve las fotos que el técnico va subiendo en vivo (se queda
   con las que había al cargar la página).

## Instalar y correr

```bash
npm install
cp .env.example .env   # completa con la URL y anon key de tu proyecto (Project Settings -> API)
npm run dev
```

Abre `http://localhost:5174`.

## Arquitectura

```
React (rutas /admin/* y /tecnico/*)
  │
  ├─ Auth: Supabase Auth (email + password) + tabla profiles (role: admin|tecnico)
  ├─ Datos: Postgres con RLS — admin ve/edita todo, técnico solo lo suyo
  ├─ Fotos y firma: Supabase Storage (bucket privado "evidencias")
  └─ Aviso de servicio nuevo: Supabase Realtime (canal filtrado por tecnico_id)
```

- `supabase/migrations/0001_init.sql` — todas las tablas (ver comentarios en
  el archivo: `servicios` es la orden de trabajo, hay una tabla hija 1:1 por
  sección del checklist, `accesorios_instalados` y `fotos` son las dos
  tablas de fila-por-ítem que alimentan el paso 3 y el paso 8 del wizard).
- `supabase/migrations/0002_rls.sql` — políticas de seguridad.
- `supabase/functions/create-technician/` — única forma de dar de alta una
  cuenta (usa la service role key, nunca expuesta al navegador).
- `src/wizard/` — el wizard de 9 pasos del técnico. `stepsConfig`/`fieldsConfig.js`,
  `accesoriosCatalog.js` y `fotosFijasCatalog.js` son la fuente única de
  verdad que evita que el paso 3 (accesorios) y el paso 8 (fotos) se
  desincronicen. `ServicioWizardContext.jsx` maneja el autoguardado
  (debounced) campo por campo y la sincronía en vivo.
- `src/components/ServicioResumen.jsx` — vista de solo lectura de un
  servicio completo, reusada tanto por la revisión del admin como por la
  vista del técnico una vez cerrado el servicio.

## Cosas a verificar en cuanto haya un proyecto de Supabase real conectado

Este código seguí al pie de la letra el diseño acordado, pero **no se pudo
probar contra un proyecto de Supabase real** (se escribió sin acceso a uno).
Antes de darlo por completamente probado, verifica:

1. **Embeds 1:1 de PostgREST**: `getServicioCompleto` (en
   `src/lib/servicios.js`) asume que Supabase devuelve las tablas hijas
   (`recepcion_verificacion`, `instalacion_gps`, etc., que tienen
   `servicio_id` como PK y FK a la vez) como **objeto único**, no como
   arreglo de un elemento. Es el comportamiento estándar de PostgREST para
   relaciones 1:1, pero si en la práctica llega como arreglo, hay que
   ajustar los accesos en `ServicioResumen.jsx` y `ServicioWizardContext.jsx`
   (agregar `?.[0]`).
2. **Realtime**: confirma que el paso 5 de "Configurar el proyecto" (activar
   replication en `servicios`, `accesorios_instalados` y `fotos`) quedó
   hecho — si no, el aviso instantáneo al técnico no va a llegar y el admin
   no verá las fotos en vivo (aunque todo se guarde bien en la base).
3. **Login/roles**: probar el flujo completo con un admin y un técnico real
   (creado desde `/admin/usuarios`) — incluyendo que un técnico no pueda ver
   ni editar servicios que no son suyos (protegido por RLS, pero vale la
   pena confirmarlo una vez con datos reales).
4. **Subida de fotos/firma**: confirma que el bucket `evidencias` haya
   quedado creado por la migración (`insert into storage.buckets...` en
   `0001_init.sql`) y que las políticas de Storage en `0002_rls.sql` dejen
   subir/leer correctamente.

## Seguridad

- El código nunca contiene la `service role key` de Supabase — solo vive
  como secreto de la Edge Function `create-technician`.
- `.env` (con la anon key) no se sube a git — ya está en `.gitignore`. La
  anon key es pública por diseño (Supabase la protege con RLS), pero aun así
  no se versiona.
- Todo el aislamiento entre técnicos (cada quien solo ve sus servicios) y
  entre roles (solo admin crea/asigna/aprueba) se aplica con Row Level
  Security en Postgres — no es solo una restricción de la interfaz.
