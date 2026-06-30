-- ============================================================
-- Budget App — Esquema de base de datos (Supabase / Postgres)
-- Ejecuta este archivo completo en: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1) Categorías fijas de gasto (basadas en tu plantilla original)
create table if not exists public.categories (
  id text primary key,
  label text not null,
  tipo text not null check (tipo in ('basico', 'no_esencial', 'ahorro')),
  orden int not null
);

insert into public.categories (id, label, tipo, orden) values
  ('vivienda', 'Vivienda', 'basico', 1),
  ('comida', 'Comida', 'basico', 2),
  ('transporte', 'Transporte', 'basico', 3),
  ('seguro', 'Seguro', 'basico', 4),
  ('impuestos', 'Impuestos', 'basico', 5),
  ('prestamos', 'Préstamos', 'basico', 6),
  ('cuidado_personal', 'Cuidado personal', 'no_esencial', 7),
  ('entretenimiento', 'Entretenimiento', 'no_esencial', 8),
  ('ninos', 'Niños', 'no_esencial', 9),
  ('regalos', 'Regalos', 'no_esencial', 10),
  ('otros', 'Otros', 'no_esencial', 11),
  ('ahorros', 'Ahorros', 'ahorro', 12)
on conflict (id) do nothing;

-- 2) Un presupuesto = un mes para un usuario (ej. 2026-07-01)
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mes date not null,                -- siempre día 1 del mes, ej 2026-07-01
  ingreso_1 numeric not null default 0,
  ingreso_2 numeric not null default 0,
  ingresos_adicionales numeric not null default 0,
  nota text,
  created_at timestamptz not null default now(),
  unique (user_id, mes)
);

-- 3) Líneas de gasto dentro de cada presupuesto mensual
create table if not exists public.expense_items (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id text not null references public.categories(id),
  concepto text not null default '',
  valor_presupuestado numeric not null default 0,
  valor_real numeric,
  created_at timestamptz not null default now()
);

create index if not exists idx_budgets_user_mes on public.budgets(user_id, mes);
create index if not exists idx_items_budget on public.expense_items(budget_id);
create index if not exists idx_items_user on public.expense_items(user_id);

-- ============================================================
-- 4) Seguridad: cada usuario solo ve y edita SU PROPIA información
-- ============================================================
alter table public.budgets enable row level security;
alter table public.expense_items enable row level security;
alter table public.categories enable row level security;

create policy "categories: lectura pública" on public.categories
  for select using (true);

create policy "budgets: propio usuario - select" on public.budgets
  for select using (auth.uid() = user_id);
create policy "budgets: propio usuario - insert" on public.budgets
  for insert with check (auth.uid() = user_id);
create policy "budgets: propio usuario - update" on public.budgets
  for update using (auth.uid() = user_id);
create policy "budgets: propio usuario - delete" on public.budgets
  for delete using (auth.uid() = user_id);

create policy "items: propio usuario - select" on public.expense_items
  for select using (auth.uid() = user_id);
create policy "items: propio usuario - insert" on public.expense_items
  for insert with check (auth.uid() = user_id);
create policy "items: propio usuario - update" on public.expense_items
  for update using (auth.uid() = user_id);
create policy "items: propio usuario - delete" on public.expense_items
  for delete using (auth.uid() = user_id);

-- Listo. auth.users ya lo gestiona Supabase Auth automáticamente.
