/**
 * budgetHealth.ts
 *
 * Módulo de dominio puro que encapsula las reglas de negocio para evaluar
 * la salud financiera de un mes presupuestado.
 *
 * SOLID: SRP — Solo calcula y clasifica el estado del mes. No sabe nada de React.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BudgetSnapshot {
  ingresos: number
  basicos: number
  noEsenciales: number
  ahorro: number
}

export type HealthStatus = 'sin_datos' | 'sin_ingresos' | 'deficit' | 'sin_ahorro' | 'basicos_altos' | 'saludable'

export interface HealthResult {
  status: HealthStatus
  label: string
  /** Tailwind class para el punto de color */
  dotColor: string
  sobrante: number
  /** Porcentaje 0–100 de cada rubro respecto a los ingresos */
  porcentajes: {
    basico: number
    noEsencial: number
    ahorro: number
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const UMBRAL_BASICOS = 0.5

const STATUS_CONFIG: Record<HealthStatus, { label: string; dotColor: string }> = {
  sin_datos:     { dotColor: 'bg-ink/20',    label: 'Aún sin datos — empieza registrando tus ingresos' },
  sin_ingresos:  { dotColor: 'bg-ink/20',    label: 'Faltan los ingresos — agrégalos arriba para ver tu balance' },
  deficit:       { dotColor: 'bg-clay',      label: 'Gastos por encima del ingreso — revisa tus números' },
  sin_ahorro:    { dotColor: 'bg-amber-400', label: 'Sin ahorro planificado — considera reservar algo' },
  basicos_altos: { dotColor: 'bg-amber-400', label: 'Básicos sobre el 50% — pero tienes ahorro, bien' },
  saludable:     { dotColor: 'bg-moss-500',  label: 'En buen rumbo — ingresos, gastos y ahorro balanceados' },
}

// ─── Logic ────────────────────────────────────────────────────────────────────

function resolveStatus(snapshot: BudgetSnapshot): HealthStatus {
  const { ingresos, basicos, noEsenciales, ahorro } = snapshot
  const total = basicos + noEsenciales + ahorro

  if (ingresos === 0 && total === 0)  return 'sin_datos'
  if (ingresos === 0)                 return 'sin_ingresos'
  if (total > ingresos)               return 'deficit'
  if (ahorro === 0)                   return 'sin_ahorro'
  if (basicos / ingresos > UMBRAL_BASICOS) return 'basicos_altos'
  return 'saludable'
}

function calcPorcentaje(valor: number, ingresos: number): number {
  const base = ingresos > 0 ? ingresos : 1
  return Math.min((valor / base) * 100, 100)
}

/**
 * Calcula el resultado completo de salud financiera para un mes.
 * Función pura: mismo input → mismo output, sin efectos secundarios.
 */
export function calculateBudgetHealth(snapshot: BudgetSnapshot): HealthResult {
  const { ingresos, basicos, noEsenciales, ahorro } = snapshot
  const status = resolveStatus(snapshot)
  const { label, dotColor } = STATUS_CONFIG[status]
  const sobrante = ingresos - (basicos + noEsenciales + ahorro)

  return {
    status,
    label,
    dotColor,
    sobrante,
    porcentajes: {
      basico:     calcPorcentaje(basicos, ingresos),
      noEsencial: calcPorcentaje(noEsenciales, ingresos),
      ahorro:     calcPorcentaje(ahorro, ingresos),
    },
  }
}
