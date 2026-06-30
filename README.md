# Norte — Presupuesto personal mes a mes

App de finanzas personales: presupuesto mensual por categorías, proyección a varios meses
adelante, y datos guardados de forma permanente **por usuario** en la nube (gratis).

Stack: **React + Vite + TypeScript + Tailwind** (frontend) · **Supabase** (autenticación +
base de datos Postgres) · **Vercel** (hosting gratuito).

---

## 1) Crear el backend en Supabase (gratis)

1. Ve a https://supabase.com → crea una cuenta → **New Project** (plan gratuito).
2. Cuando el proyecto termine de crearse, entra a **SQL Editor** (menú izquierdo).
3. Abre el archivo `supabase/schema.sql` de este proyecto, copia todo su contenido,
   pégalo en el SQL Editor y dale **Run**. Esto crea las tablas, las categorías y la
   seguridad por usuario (nadie puede ver los datos de otro usuario).
4. Ve a **Project Settings → API**. Copia:
   - **Project URL**
   - **anon public key**

   Estos dos valores son los que necesita el frontend (no son secretos sensibles, están
   diseñados para usarse en el navegador; la seguridad real la da el paso 3, RLS).

5. (Opcional pero recomendado) En **Authentication → Providers**, confirma que
   "Email" esté habilitado. Por defecto Supabase pide confirmar el correo: si quieres
   que los usuarios puedan entrar inmediatamente sin confirmar correo (más simple para
   empezar), ve a **Authentication → Settings** y desactiva "Confirm email".

## 2) Configurar el proyecto localmente

```bash
npm install
cp .env.example .env
```

Edita `.env` y pega tus valores de Supabase:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

Pruébalo local:

```bash
npm run dev
```

Abre http://localhost:5173, crea una cuenta con tu correo y empieza a usar la app.

## 3) Desplegar gratis en Vercel

**Opción A — desde la web (más fácil, sin terminal):**

1. Sube esta carpeta a un repositorio de GitHub (puedes arrastrarla en
   https://github.com/new → "uploading an existing file").
2. Ve a https://vercel.com → **Add New → Project** → importa ese repositorio.
3. En "Environment Variables" agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
   con los mismos valores de tu `.env`.
4. Click **Deploy**. En ~1 minuto tendrás una URL pública (ej.
   `norte-tuusuario.vercel.app`) que puedes abrir desde el celular o compartir.

**Opción B — desde la terminal:**

```bash
npm install -g vercel
vercel login
vercel --prod
```

Cuando pregunte por variables de entorno, agrega las mismas dos de arriba.

## 4) Uso diario

- **Presupuesto**: cada mes tiene sus propios ingresos y gastos por categoría
  (Vivienda, Comida, Préstamos, Ahorros, etc. — las mismas de tu plantilla original).
  Cambia de mes con las flechas; si el mes no existe, Norte lo crea copiando los
  valores presupuestados del mes anterior como punto de partida editable.
- **Proyección**: muestra ingresos, gastos, ahorro y disponible para los próximos
  3, 6 o 12 meses, con gráfico de línea. Solo proyecta meses que ya visitaste al menos
  una vez en "Presupuesto" (así Norte sabe qué copiar hacia adelante).
- Todo se guarda automáticamente en Supabase apenas escribes — no hay botón de
  "Guardar". Puedes cerrar el navegador y tu información seguirá ahí, en cualquier
  dispositivo donde inicies sesión con el mismo correo.

## Estructura del proyecto

```
src/
  pages/Login.tsx          → inicio de sesión y registro
  pages/Presupuesto.tsx    → presupuesto del mes activo
  pages/Proyeccion.tsx     → proyección a varios meses
  components/              → piezas de UI reutilizables
  lib/supabaseClient.ts    → conexión a Supabase
  lib/useBudgetMonth.ts    → lógica de carga/edición de un mes
supabase/schema.sql        → esquema de base de datos + seguridad por usuario
```

## Costos

Con uso personal (1 usuario o unos pocos), te quedas cómodamente dentro de los planes
gratuitos de Supabase y Vercel indefinidamente. Si en algún momento creces mucho,
ambos tienen planes pagos, pero no es necesario para este caso de uso.
