-- ============================================================
-- 02) Migración: perfiles de usuario + detección de uso de categorías
-- Ejecuta DESPUÉS de 01_schema.sql, en: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1) Tabla de perfiles (is_admin = false por defecto)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  is_admin boolean not null default false
);

alter table public.profiles enable row level security;

create policy "profiles: cada usuario lee el suyo" on public.profiles
  for select using (auth.uid() = id);

-- Se crea automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2) Función que devuelve cuántos items usa cada categoría (sin restricción RLS)
--    Solo accesible por el admin desde el frontend vía rpc()
create or replace function public.category_usage_count()
returns table(category_id text, total bigint)
language sql security definer as $$
  select category_id, count(*) as total
  from public.expense_items
  group by category_id;
$$;

-- 3) Para hacer admin a un usuario, corre:
-- update public.profiles set is_admin = true where id = 'UUID-DEL-USUARIO';
-- (El UUID lo ves en Supabase > Authentication > Users)
