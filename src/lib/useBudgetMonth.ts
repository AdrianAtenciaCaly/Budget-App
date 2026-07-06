import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { Budget, Category, ExpenseItem } from '../types'
import { enqueueMutation, cancelPendingInsert, hasPendingInsert } from './offlineQueue'

export function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function cacheKey(userId: string, mes: string) {
  return `budget-cache:${userId}:${mes}`
}

function saveCache(userId: string, mes: string, data: { budget: Budget | null; items: ExpenseItem[]; categories: Category[] }) {
  try {
    localStorage.setItem(cacheKey(userId, mes), JSON.stringify(data))
  } catch {
    // localStorage lleno o no disponible: no es crítico, simplemente no habrá fallback
  }
}

function loadCache(userId: string, mes: string) {
  try {
    const raw = localStorage.getItem(cacheKey(userId, mes))
    return raw ? (JSON.parse(raw) as { budget: Budget | null; items: ExpenseItem[]; categories: Category[] }) : null
  } catch {
    return null
  }
}

export function useBudgetMonth(userId: string | undefined, mes: string) {
  const [budget, setBudget] = useState<Budget | null>(null)
  const [items, setItems] = useState<ExpenseItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [offlineData, setOfflineData] = useState(false) // true si lo mostrado viene de caché local, no del servidor

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)

    try {
      const { data: cats } = await supabase.from('categories').select('*').order('orden')

      let { data: b } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', userId)
        .eq('mes', mes)
        .maybeSingle()

      if (!b) {
        // Si no existe el mes, lo creamos. Si hay un mes anterior, copiamos sus valores presupuestados como punto de partida.
        const prevDate = new Date(mes)
        prevDate.setMonth(prevDate.getMonth() - 1)
        const prevMes = monthKey(prevDate)

        const { data: prevBudget } = await supabase
          .from('budgets')
          .select('*, expense_items(*)')
          .eq('user_id', userId)
          .eq('mes', prevMes)
          .maybeSingle()

        const { data: created } = await supabase
          .from('budgets')
          .insert({
            user_id: userId,
            mes,
            ingreso_1: prevBudget?.ingreso_1 ?? 0,
            ingreso_2: prevBudget?.ingreso_2 ?? 0,
            ingresos_adicionales: prevBudget?.ingresos_adicionales ?? 0,
          })
          .select()
          .single()

        b = created

        if (b && prevBudget?.expense_items?.length) {
          const newItems = prevBudget.expense_items.map((it: ExpenseItem) => ({
            budget_id: b!.id,
            user_id: userId,
            category_id: it.category_id,
            concepto: it.concepto,
            valor_presupuestado: it.valor_presupuestado,
            valor_real: null,
          }))
          await supabase.from('expense_items').insert(newItems)
        }
      }

      setBudget(b)
      setCategories(cats ?? [])

      let its: ExpenseItem[] = []
      if (b) {
        const { data } = await supabase
          .from('expense_items')
          .select('*')
          .eq('budget_id', b.id)
          .order('created_at')
        its = data ?? []
        setItems(its)
      }

      setOfflineData(false)
      saveCache(userId, mes, { budget: b, items: its, categories: cats ?? [] })
    } catch {
      // Sin red (o error de servidor): usar la última copia guardada localmente, si existe
      const cached = loadCache(userId, mes)
      if (cached) {
        setBudget(cached.budget)
        setItems(cached.items)
        setCategories(cached.categories)
        setOfflineData(true)
      }
    }

    setLoading(false)
  }, [userId, mes])

  useEffect(() => {
    load()
  }, [load])

  async function updateBudget(patch: Partial<Budget>) {
    if (!budget || !userId) return
    const optimistic = { ...budget, ...patch }
    setBudget(optimistic)
    saveCache(userId, mes, { budget: optimistic, items, categories })
    try {
      const { data, error } = await supabase.from('budgets').update(patch).eq('id', budget.id).select().single()
      if (error) throw error
      if (data) {
        setBudget(data)
        saveCache(userId, mes, { budget: data, items, categories })
      }
    } catch {
      enqueueMutation({ table: 'budgets', type: 'update', payload: patch, match: { id: budget.id } })
    }
  }

  async function addItem(category_id: string) {
    if (!budget || !userId) return
    const optimisticItem: ExpenseItem = {
      id: crypto.randomUUID(),
      budget_id: budget.id,
      user_id: userId,
      category_id,
      concepto: '',
      valor_presupuestado: 0,
      valor_real: null,
      pagado: false,
    }
    setItems((prev) => [...prev, optimisticItem])
    try {
      const { data, error } = await supabase.from('expense_items').insert(optimisticItem).select().single()
      if (error) throw error
      if (data) setItems((prev) => prev.map((it) => (it.id === optimisticItem.id ? data : it)))
    } catch {
      // Se encola con el mismo id ya generado, para que al sincronizar coincida con lo que ya está en pantalla
      enqueueMutation({ table: 'expense_items', type: 'insert', payload: optimisticItem })
    }
  }

  async function updateItem(id: string, patch: Partial<ExpenseItem>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
    try {
      const { error } = await supabase.from('expense_items').update(patch).eq('id', id)
      if (error) throw error
    } catch {
      enqueueMutation({ table: 'expense_items', type: 'update', payload: patch, match: { id } })
    }
  }

  async function deleteItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id))
    // Si el item nunca llegó a crearse en el servidor (insert todavía pendiente), simplemente cancelamos ese insert
    if (hasPendingInsert('expense_items', id)) {
      cancelPendingInsert('expense_items', id)
      return
    }
    try {
      const { error } = await supabase.from('expense_items').delete().eq('id', id)
      if (error) throw error
    } catch {
      enqueueMutation({ table: 'expense_items', type: 'delete', match: { id } })
    }
  }

  /**
   * Copia ingresos y todas las líneas de gasto desde otro mes (sourceMes, 'YYYY-MM-01')
   * hacia el mes actualmente cargado, reemplazando lo que haya en el mes actual.
   * Requiere conexión: no se encola offline porque depende de leer primero el mes origen.
   */
  async function copyFromMonth(sourceMes: string) {
    if (!budget || !userId) return
    if (sourceMes === mes) return

    const { data: source } = await supabase
      .from('budgets')
      .select('*, expense_items(*)')
      .eq('user_id', userId)
      .eq('mes', sourceMes)
      .maybeSingle()

    if (!source) {
      throw new Error('Ese mes no tiene presupuesto guardado todavía.')
    }

    const { data: updatedBudget } = await supabase
      .from('budgets')
      .update({
        ingreso_1: source.ingreso_1,
        ingreso_2: source.ingreso_2,
        ingresos_adicionales: source.ingresos_adicionales,
      })
      .eq('id', budget.id)
      .select()
      .single()
    if (updatedBudget) setBudget(updatedBudget)

    await supabase.from('expense_items').delete().eq('budget_id', budget.id)

    const sourceItems = source.expense_items ?? []
    if (sourceItems.length > 0) {
      const newItems = sourceItems.map((it: ExpenseItem) => ({
        budget_id: budget.id,
        user_id: userId,
        category_id: it.category_id,
        concepto: it.concepto,
        valor_presupuestado: it.valor_presupuestado,
        valor_real: null,
      }))
      const { data: inserted } = await supabase.from('expense_items').insert(newItems).select()
      setItems(inserted ?? [])
    } else {
      setItems([])
    }
  }

  return {
    budget,
    items,
    categories,
    loading,
    offlineData,
    updateBudget,
    addItem,
    updateItem,
    deleteItem,
    copyFromMonth,
    reload: load,
  }
}