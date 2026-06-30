import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Budget, Category, ExpenseItem } from '../types'

export function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export function useBudgetMonth(userId: string | undefined, mes: string) {
  const [budget, setBudget] = useState<Budget | null>(null)
  const [items, setItems] = useState<ExpenseItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)

    const { data: cats } = await supabase.from('categories').select('*').order('orden')
    setCategories(cats ?? [])

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

    if (b) {
      const { data: its } = await supabase
        .from('expense_items')
        .select('*')
        .eq('budget_id', b.id)
        .order('created_at')
      setItems(its ?? [])
    }

    setLoading(false)
  }, [userId, mes])

  useEffect(() => {
    load()
  }, [load])

  async function updateBudget(patch: Partial<Budget>) {
    if (!budget) return
    const { data } = await supabase
      .from('budgets')
      .update(patch)
      .eq('id', budget.id)
      .select()
      .single()
    if (data) setBudget(data)
  }

  async function addItem(category_id: string) {
    if (!budget || !userId) return
    const { data } = await supabase
      .from('expense_items')
      .insert({ budget_id: budget.id, user_id: userId, category_id, concepto: '', valor_presupuestado: 0 })
      .select()
      .single()
    if (data) setItems((prev) => [...prev, data])
  }

  async function updateItem(id: string, patch: Partial<ExpenseItem>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
    await supabase.from('expense_items').update(patch).eq('id', id)
  }

  async function deleteItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id))
    await supabase.from('expense_items').delete().eq('id', id)
  }

  /**
   * Copia ingresos y todas las líneas de gasto desde otro mes (sourceMes, 'YYYY-MM-01')
   * hacia el mes actualmente cargado, reemplazando lo que haya en el mes actual.
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

    // 1) Copiar ingresos
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

    // 2) Borrar las líneas actuales del mes destino
    await supabase.from('expense_items').delete().eq('budget_id', budget.id)

    // 3) Insertar copia de las líneas del mes origen
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
    updateBudget,
    addItem,
    updateItem,
    deleteItem,
    copyFromMonth,
    reload: load,
  }
}