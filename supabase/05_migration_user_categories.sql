-- ============================================================
-- 05) Migración: categorías personales por usuario
-- Ejecuta DESPUÉS de 04_migration_pagado_prefs.sql, en: Supabase Dashboard > SQL Editor
--
-- Objetivo: un usuario puede crear SUS PROPIAS categorías, visibles
-- y editables solo por él. Las categorías globales (user_id NULL),
-- creadas por el admin para todos, quedan intactas y protegidas.
-- ============================================================

-- 1) Cada categoría puede pertenecer a un usuario (personal) o ser
--    global (user_id = NULL → las que crea el admin, visibles para todos)
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2) Reemplaza la lectura pública: ahora cada usuario ve las globales + solo las suyas
DROP POLICY IF EXISTS "categories: lectura pública" ON public.categories;

CREATE POLICY "categories: lectura global o propia" ON public.categories
  FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

-- 3) Cualquier usuario autenticado puede crear SUS PROPIAS categorías (nunca globales)
CREATE POLICY "categories: usuario crea las suyas" ON public.categories
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 4) Un usuario puede editar / eliminar solo sus propias categorías
CREATE POLICY "categories: usuario edita las suyas" ON public.categories
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "categories: usuario elimina las suyas" ON public.categories
  FOR DELETE
  USING (auth.uid() = user_id);

-- 5) Restringe las políticas de admin (creadas en 03_migration_categories_rlsADD.sql)
--    para que SOLO puedan tocar categorías globales (user_id IS NULL),
--    y así el admin nunca altere categorías personales de un usuario.
ALTER POLICY "categories: admin - insert" ON public.categories
  WITH CHECK (
    user_id IS NULL AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

ALTER POLICY "categories: admin - update" ON public.categories
  USING (
    user_id IS NULL AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

ALTER POLICY "categories: admin - delete" ON public.categories
  USING (
    user_id IS NULL AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
    )
  );
