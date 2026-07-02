import { useState } from 'react'
import { Category, ExpenseItem } from '../types'

interface Props {
  category: Category
  items: ExpenseItem[]
  onAdd: () => void
  onUpdate: (id: string, patch: Partial<ExpenseItem>) => void
  onDelete: (id: string) => void
}

const fmt = (n: number) => n.toLocaleString('es-CO')

export default function CategoryGroup({ category, items, onAdd, onUpdate, onDelete }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const totalPresupuestado = items.reduce((s, i) => s + (i.valor_presupuestado || 0), 0)
  const pagados = items.filter((i) => i.pagado).length

  return (
    <div className="border border-moss-100 rounded-xl bg-white/60 overflow-hidden">
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-moss-50/60 hover:bg-moss-50 transition text-left"
      >
        <div className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
            className={`text-ink/30 transition-transform ${collapsed ? '-rotate-90' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          <span className="font-display text-base text-ink">{category.label}</span>
          <span className="text-[10px] uppercase tracking-wide text-ink/40 px-1.5 py-0.5 border border-moss-200 rounded-full">
            {category.tipo === 'basico' ? 'Básico' : category.tipo === 'ahorro' ? 'Ahorro' : 'No esencial'}
          </span>
          {items.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
              pagados === items.length
                ? 'bg-moss-100 text-moss-700'
                : pagados > 0
                ? 'bg-amber-400/20 text-amber-500'
                : 'bg-ink/5 text-ink/40'
            }`}>
              {pagados}/{items.length}
            </span>
          )}
        </div>
        <div className="font-mono text-sm text-ink/70">${fmt(totalPresupuestado)}</div>
      </button>

      {!collapsed && (
        <>
          <div className="divide-y divide-moss-100/70">
            {items.map((item) => (
              <div key={item.id} className={`flex items-center gap-3 px-4 py-2.5 transition ${item.pagado ? 'bg-moss-50/30' : ''}`}>

                {/* Checkbox pagado */}
                <button
                  onClick={() => onUpdate(item.id, { pagado: !item.pagado })}
                  title={item.pagado ? 'Marcar como pendiente' : 'Marcar como pagado'}
                  className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                    item.pagado
                      ? 'bg-moss-600 border-moss-600'
                      : 'border-moss-200 hover:border-moss-400'
                  }`}
                >
                  {item.pagado && (
                    <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>

                {/* Concepto */}
                <input
                  value={item.concepto}
                  onChange={(e) => onUpdate(item.id, { concepto: e.target.value })}
                  placeholder="Concepto"
                  className={`flex-1 bg-transparent text-sm outline-none placeholder:text-ink/30 transition ${
                    item.pagado ? 'line-through text-ink/40' : ''
                  }`}
                />

                {/* Badge estado */}
                <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  item.pagado
                    ? 'bg-moss-100 text-moss-700'
                    : 'bg-amber-400/15 text-amber-500'
                }`}>
                  {item.pagado ? 'Pagado' : 'Pendiente'}
                </span>

                {/* Valor */}
                <div className="flex items-center gap-0.5">
                  <span className="text-xs text-ink/30">$</span>
                  <input
                    type="number"
                    value={item.valor_presupuestado || ''}
                    onChange={(e) => onUpdate(item.id, { valor_presupuestado: Number(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-24 bg-transparent text-sm font-mono text-right outline-none"
                  />
                </div>

                {/* Eliminar */}
                <button
                  onClick={() => onDelete(item.id)}
                  className="text-ink/20 hover:text-clay transition px-1 text-sm flex-shrink-0"
                >×</button>
              </div>
            ))}
            {items.length === 0 && (
              <p className="px-4 py-3 text-xs text-ink/30">Sin movimientos todavía.</p>
            )}
          </div>
          <button
            onClick={onAdd}
            className="w-full text-left px-4 py-2 text-xs text-moss-600 hover:bg-moss-50 transition"
          >
            + Añadir línea
          </button>
        </>
      )}
    </div>
  )
}