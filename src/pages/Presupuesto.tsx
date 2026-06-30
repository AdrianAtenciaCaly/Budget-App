import { useMemo, useState } from 'react'
import { useBudgetMonth, monthKey } from '../lib/useBudgetMonth'
import MonthSelector from '../components/MonthSelector'
import HealthBar from '../components/HealthBar'
import CategoryGroup from '../components/CategoryGroup'

const fmt = (n: number) => n.toLocaleString('es-CO')

export default function Presupuesto({ userId }: { userId: string }) {
  const [mesDate, setMesDate] = useState(new Date())
  const mes = monthKey(mesDate)
  const { budget, items, categories, loading, updateBudget, addItem, updateItem, deleteItem } =
    useBudgetMonth(userId, mes)

  const ingresos =
    (budget?.ingreso_1 || 0) + (budget?.ingreso_2 || 0) + (budget?.ingresos_adicionales || 0)

  const totales = useMemo(() => {
    let basicos = 0, noEsenciales = 0, ahorro = 0
    for (const it of items) {
      const cat = categories.find((c) => c.id === it.category_id)
      if (!cat) continue
      if (cat.tipo === 'basico') basicos += it.valor_presupuestado || 0
      else if (cat.tipo === 'no_esencial') noEsenciales += it.valor_presupuestado || 0
      else ahorro += it.valor_presupuestado || 0
    }
    return { basicos, noEsenciales, ahorro }
  }, [items, categories])

  if (loading) {
    return <div className="py-20 text-center text-ink/40 text-sm">Cargando tu presupuesto…</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <MonthSelector mesDate={mesDate} onChange={setMesDate} />
      </div>

      {/* Ingresos */}
      <div className="bg-white/70 border border-moss-100 rounded-2xl p-6">
        <p className="text-xs uppercase tracking-wide text-ink/40 mb-4">Ingresos del mes</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <IncomeField
            label="Ingreso 1"
            value={budget?.ingreso_1 || 0}
            onChange={(v) => updateBudget({ ingreso_1: v })}
          />
          <IncomeField
            label="Ingreso 2"
            value={budget?.ingreso_2 || 0}
            onChange={(v) => updateBudget({ ingreso_2: v })}
          />
          <IncomeField
            label="Ingresos adicionales"
            value={budget?.ingresos_adicionales || 0}
            onChange={(v) => updateBudget({ ingresos_adicionales: v })}
          />
        </div>
        <p className="mt-4 font-mono text-sm text-ink/70">
          Total: <span className="text-moss-700 font-medium">${fmt(ingresos)}</span>
        </p>
      </div>

      <HealthBar
        ingresos={ingresos}
        basicos={totales.basicos}
        noEsenciales={totales.noEsenciales}
        ahorro={totales.ahorro}
      />

      {/* Categorías */}
      <div>
        <p className="text-xs uppercase tracking-wide text-ink/40 mb-3">Gastos por categoría</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {categories.map((cat) => (
            <CategoryGroup
              key={cat.id}
              category={cat}
              items={items.filter((i) => i.category_id === cat.id)}
              onAdd={() => addItem(cat.id)}
              onUpdate={updateItem}
              onDelete={deleteItem}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function IncomeField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <label className="block">
      <span className="block text-xs text-ink/50 mb-1.5">{label}</span>
      <div className="flex items-center gap-1 border border-moss-100 rounded-lg px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-moss-300">
        <span className="text-xs text-ink/30">$</span>
        <input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          placeholder="0"
          className="w-full bg-transparent text-sm font-mono outline-none"
        />
      </div>
    </label>
  )
}
