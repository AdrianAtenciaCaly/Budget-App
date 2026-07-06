-- ============================================================
-- Migración: estadísticas agregadas para el panel de administrador
-- Ejecuta en: Supabase Dashboard > SQL Editor
-- ============================================================

create or replace function public.admin_dashboard_stats()
returns json
language plpgsql
security definer
as $$
declare
  result json;
  is_caller_admin boolean;
begin
  select is_admin into is_caller_admin from public.profiles where id = auth.uid();
  if not coalesce(is_caller_admin, false) then
    raise exception 'No autorizado';
  end if;

  select json_build_object(
    'total_usuarios', (select count(*) from public.profiles),
    'total_admins', (select count(*) from public.profiles where is_admin = true),
    'total_categorias', (select count(*) from public.categories),
    'categorias_por_tipo', (
      select coalesce(json_object_agg(tipo, total), '{}'::json) from (
        select tipo, count(*) as total from public.categories group by tipo
      ) t
    ),
    'total_presupuestos', (select count(*) from public.budgets),
    'total_items_gasto', (select count(*) from public.expense_items),
    'usuarios_activos_mes_actual', (
      select count(distinct user_id) from public.budgets
      where mes = date_trunc('month', now())::date
    )
  ) into result;

  return result;
end;
$$;