export type AppTab = 'presupuesto' | 'proyeccion' | 'configuracion'

export type CategoriaTipo = 'basico' | 'no_esencial' | 'ahorro'

export interface Category {
  id: string
  label: string
  tipo: CategoriaTipo
  orden: number
}

export interface Budget {
  id: string
  user_id: string
  mes: string
  ingreso_1: number
  ingreso_2: number
  ingresos_adicionales: number
  nota: string | null
}

export interface ExpenseItem {
  id: string
  budget_id: string
  user_id: string
  category_id: string
  concepto: string
  valor_presupuestado: number
  valor_real: number | null
  pagado: boolean
}

export interface UserCategoryPref {
  id: string
  user_id: string
  category_id: string
  orden: number
  visible: boolean
}