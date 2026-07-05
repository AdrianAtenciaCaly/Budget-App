/**
 * HealthBar.tsx
 *
 * Componente de presentación que muestra el "Estado del mes".
 * Puede expandirse o recogerse; el estado persiste en localStorage.
 *
 * SOLID:
 *   - SRP: Solo renderiza — toda lógica de cálculo vive en `budgetHealth.ts`
 *          y la persistencia en `useLocalStorage`.
 *   - OCP: Para cambiar reglas de estado, solo se modifica `budgetHealth.ts`.
 *   - DIP: Depende de abstracciones (BudgetSnapshot, Currency),
 *          no de implementaciones concretas.
 */

import { useLocalStorage } from '../lib/useLocalStorage'
import { calculateBudgetHealth } from '../lib/budgetHealth'
import type { Currency } from '../lib/currencies'

// ─── Types ────────────────────────────────────────────────────────────────────

interface HealthBarProps {
  ingresos: number
  basicos: number
  noEsenciales: number
  ahorro: number
  gastado: number
  currency: Currency
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface LegendItemProps {
  dot: string
  label: string
  value: string
}

function LegendItem({ dot, label, value }: LegendItemProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      <span className="text-ink/50">{label}</span>
      <span className="font-mono text-ink/80">{value}</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

interface ChevronProps {
  expanded: boolean
}

function Chevron({ expanded }: ChevronProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`text-ink/30 transition-transform duration-200 group-hover:text-ink/50 ${expanded ? '' : '-rotate-180'
        }`}
      aria-hidden="true"
    >
      <polyline points="18 15 12 9 6 15" />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

interface ProgressBarProps {
  pBasico: number
  pNoEsencial: number
  pAhorro: number
}

function ProgressBar({ pBasico, pNoEsencial, pAhorro }: ProgressBarProps) {
  return (
    <div className="h-3 w-full bg-moss-50 rounded-full overflow-hidden flex">
      <div className="h-full bg-moss-600 transition-all duration-500" style={{ width: `${pBasico}%` }} />
      <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${pNoEsencial}%` }} />
      <div className="h-full bg-moss-300 transition-all duration-500" style={{ width: `${pAhorro}%` }} />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

const STORAGE_KEY = 'healthbar-expanded'

export default function HealthBar({ ingresos, basicos, noEsenciales, ahorro, gastado, currency }: HealthBarProps) {
  const [expanded, setExpanded] = useLocalStorage<boolean>(STORAGE_KEY, true)

  const health = calculateBudgetHealth({ ingresos, basicos, noEsenciales, ahorro })

  const fmt = (n: number) =>
    n.toLocaleString(currency.locale, {
      style: 'currency',
      currency: currency.code,
      maximumFractionDigits: 0,
    })

  const sobraLabel = health.sobrante >= 0 ? 'Disponible' : 'Déficit'
  const sobraClass = health.sobrante >= 0 ? 'text-moss-700' : 'text-clay'

  // Consolidado de lo realmente gastado (ítems marcados como "pagado")
  const saldoLibre = ingresos - gastado
  const saldoLibreLabel = saldoLibre >= 0 ? 'Saldo libre' : 'Saldo negativo'
  const saldoLibreClass = saldoLibre >= 0 ? 'text-moss-700' : 'text-clay'

  return (
    <section
      className="bg-white/70 border border-moss-100 rounded-2xl p-6"
      aria-label="Estado del mes"
    >
      {/* ── Header (clickable) — se mantiene compacto, sin el consolidado ── */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(v => !v)}
        onKeyDown={e => e.key === 'Enter' && setExpanded(v => !v)}
        className="flex items-start justify-between cursor-pointer select-none group outline-none focus-visible:ring-2 focus-visible:ring-moss-400 rounded-lg"
        aria-expanded={expanded}
      >
        {/* Left: Status label */}
        <div className="flex-1 pr-4">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs uppercase tracking-wide text-ink/40">Estado del mes</p>
            <Chevron expanded={expanded} />
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${health.dotColor}`} />
            <span className="font-display text-lg text-ink leading-tight">{health.label}</span>
          </div>
        </div>

        {/* Right: Surplus / Deficit */}
        <div className="text-right shrink-0">
          <p className="text-xs uppercase tracking-wide text-ink/40 mb-1">{sobraLabel}</p>
          <p className={`font-mono text-lg font-medium leading-none ${sobraClass}`}>
            {fmt(Math.abs(health.sobrante))}
          </p>
        </div>
      </div>

      {/* ── Collapsible body ── */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${expanded ? 'max-h-64 opacity-100 mt-5' : 'max-h-0 opacity-0'
          }`}
        aria-hidden={!expanded}
      >
        <ProgressBar
          pBasico={health.porcentajes.basico}
          pNoEsencial={health.porcentajes.noEsencial}
          pAhorro={health.porcentajes.ahorro}
        />

        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 text-xs">
          <LegendItem dot="bg-moss-600" label="Básicos" value={fmt(basicos)} />
          <LegendItem dot="bg-amber-500" label="No esenciales" value={fmt(noEsenciales)} />
          <LegendItem dot="bg-moss-300" label="Ahorro / inversión" value={fmt(ahorro)} />
          <LegendItem dot="bg-ink/20" label="Ingresos totales" value={fmt(ingresos)} />
        </div>

        {/* Consolidado de lo gastado y el saldo libre — más abajo, sin dejar hueco en el header */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-4 pt-4 border-t border-moss-100 text-xs">
          <span className="text-ink/40">
            Gastado <span className="text-ink/30">(pagado)</span>:{' '}
            <span className="font-mono text-ink/70">{fmt(gastado)}</span>
          </span>
          <span>
            <span className="text-ink/40">{saldoLibreLabel}: </span>
            <span className={`font-mono font-medium ${saldoLibreClass}`}>
              {fmt(Math.abs(saldoLibre))}
            </span>
          </span>
        </div>
      </div>
    </section>
  )
}