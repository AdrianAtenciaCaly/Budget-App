/**
 * constants.ts
 *
 * Constantes de dominio compartidas por toda la aplicación.
 * Centraliza valores que antes estaban duplicados en múltiples archivos.
 */

import type { CategoriaTipo } from '../types'

// ─── Meses ────────────────────────────────────────────────────────────────────

export const MESES_LARGOS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
] as const

export const MESES_CORTOS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
] as const

// ─── Tipos de categoría ──────────────────────────────────────────────────────

export const CATEGORY_TYPES: { value: CategoriaTipo; label: string }[] = [
  { value: 'basico', label: 'Básico' },
  { value: 'no_esencial', label: 'No esencial' },
  { value: 'ahorro', label: 'Ahorro' },
]

const CATEGORY_LABEL_MAP: Record<CategoriaTipo, string> = {
  basico: 'Básico',
  no_esencial: 'No esencial',
  ahorro: 'Ahorro',
}

/** Devuelve la etiqueta legible del tipo de categoría. */
export function getCategoryTypeLabel(tipo: CategoriaTipo): string {
  return CATEGORY_LABEL_MAP[tipo]
}
