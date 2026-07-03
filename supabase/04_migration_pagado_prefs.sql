-- ============================================================
-- 04) Migración: pagado por item + preferencias de categorías por usuario
-- Ejecuta DESPUÉS de 03_migration_categories_rlsADD.sql, en: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1) Campo pagado en cada línea de gasto
ALTER TABLE public.expense_items
  ADD COLUMN IF NOT EXISTS pagado boolean NOT NULL DEFAULT false;

-- 2) Preferencias de categorías por usuario (orden + visibilidad)
CREATE TABLE IF NOT EXISTS public.user_category_prefs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  category_id text not null references public.categories(id) on delete cascade,
  orden       int  not null default 0,
  visible     boolean not null default true,
  unique(user_id, category_id)
);

ALTER TABLE public.user_category_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prefs: usuario propio - all" ON public.user_category_prefs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_prefs_user ON public.user_category_prefs(user_id);
