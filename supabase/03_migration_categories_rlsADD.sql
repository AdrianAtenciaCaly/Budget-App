-- ============================================================
-- 03) Migración: políticas RLS para que el admin pueda
-- insertar, actualizar y eliminar categorías
-- Ejecuta DESPUÉS de 02_migration_admin.sql, en: Supabase Dashboard > SQL Editor
-- ============================================================

create policy "categories: admin - insert" on public.categories
  for insert with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

create policy "categories: admin - update" on public.categories
  for update using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

create policy "categories: admin - delete" on public.categories
  for delete using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );
