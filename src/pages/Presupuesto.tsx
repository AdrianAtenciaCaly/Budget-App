import { useMemo, useState, useEffect } from 'react'
import { useBudgetMonth, monthKey } from '../lib/useBudgetMonth'
import MonthSelector from '../components/MonthSelector'
import HealthBar from '../components/HealthBar'
import CategoryGroup from '../components/CategoryGroup'
import CategorySettings from '../components/CategorySettings'
import { supabase } from '../lib/supabaseClient'
import { UserCategoryPref } from '../types'

const MESES_LARGOS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const fmt = (n: number) => n.toLocaleString('es-CO')

export default function Presupuesto({ userId }: { userId: string }) {
  const [mesDate, setMesDate] = useState(new Date())
  const mes = monthKey(mesDate)
  const { budget, items, categories, loading, updateBudget, addItem, updateItem, deleteItem, copyFromMonth } =
    useBudgetMonth(userId, mes)

  const [showCopy, setShowCopy] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [sourceMonth, setSourceMonth] = useState('')
  const [copying, setCopying] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)
  const [prefs, setPrefs] = useState<UserCategoryPref[]>([])

  // Cargar preferencias del usuario
  useEffect(() => {
    supabase
      .from('user_category_prefs')
      .select('*')
      .eq('user_id', userId)
      .then(({ data }) => setPrefs(data ?? []))
  }, [userId, showSettings]) // recarga cuando cierra el panel de settings

  const monthOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = []
    for (let i = -12; i <= 12; i++) {
      const d = new Date(mesDate.getFullYear(), mesDate.getMonth() + i, 1)
      const value = monthKey(d)
      if (value === mes) continue
      opts.push({ value, label: `${MESES_LARGOS[d.getMonth()]} ${d.getFullYear()}` })
    }
    return opts
  }, [mesDate, mes])

  async function handleCopy() {
    if (!sourceMonth) return
    setCopying(true)
    setCopyError(null)
    try {
      await copyFromMonth(sourceMonth)
      setShowCopy(false)
      setSourceMonth('')
    } catch (err: any) {
      setCopyError(err.message ?? 'No se pudo copiar ese mes.')
    } finally {
      setCopying(false)
    }
  }

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

  // Aplicar preferencias: orden + visibilidad
  const sortedCategories = useMemo(() => {
    const prefsMap = new Map(prefs.map((p) => [p.category_id, p]))
    return [...categories]
      .filter((c) => {
        const pref = prefsMap.get(c.id)
        return pref ? pref.visible : true
      })
      .sort((a, b) => {
        const oa = prefsMap.get(a.id)?.orden ?? a.orden
        const ob = prefsMap.get(b.id)?.orden ?? b.orden
        return oa - ob
      })
  }, [categories, prefs])

  if (loading) {
    return <div className="py-20 text-center text-ink/40 text-sm">Cargando tu presupuesto…</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthSelector mesDate={mesDate} onChange={setMesDate} />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="text-sm border border-moss-100 hover:bg-moss-50 rounded-full px-4 py-2 transition text-ink/70 flex items-center gap-1.5"
            title="Configurar categorías"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            Categorías
          </button>
          <button
            onClick={() => setShowCopy((v) => !v)}
            className="text-sm border border-moss-100 hover:bg-moss-50 rounded-full px-4 py-2 transition text-ink/70"
          >
            Copiar de otro mes
          </button>
        </div>
      </div>

      {/* Panel copiar */}
      {showCopy && (
        <div className="bg-white/70 border border-moss-100 rounded-2xl p-5 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-ink/50 mb-1.5">Copiar todo desde</label>
            <select
              value={sourceMonth}
              onChange={(e) => setSourceMonth(e.target.value)}
              className="w-full border border-moss-100 rounded-lg px-3 py-2 text-sm bg-white outline-none"
            >
              <option value="">Selecciona un mes…</option>
              {monthOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleCopy}
            disabled={!sourceMonth || copying}
            className="bg-moss-600 hover:bg-moss-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition"
          >
            {copying ? 'Copiando…' : `Copiar a ${MESES_LARGOS[mesDate.getMonth()]} ${mesDate.getFullYear()}`}
          </button>
          <button
            onClick={() => { setShowCopy(false); setCopyError(null) }}
            className="text-sm text-ink/40 hover:text-ink/70 px-2 py-2 transition"
          >
            Cancelar
          </button>
          {copyError && <p className="w-full text-sm text-wine bg-wine/10 rounded-lg px-3 py-2">{copyError}</p>}
          <p className="w-full text-xs text-ink/40">
            Reemplaza los ingresos y líneas de gasto de {MESES_LARGOS[mesDate.getMonth()]} {mesDate.getFullYear()}.
          </p>
        </div>
      )}

      {/* Ingresos */}
      <div className="bg-white/70 border border-moss-100 rounded-2xl p-6">
        <p className="text-xs uppercase tracking-wide text-ink/40 mb-4">Ingresos del mes</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <IncomeField label="Ingreso 1" value={budget?.ingreso_1 || 0} onChange={(v) => updateBudget({ ingreso_1: v })} />
          <IncomeField label="Ingreso 2" value={budget?.ingreso_2 || 0} onChange={(v) => updateBudget({ ingreso_2: v })} />
          <IncomeField label="Ingresos adicionales" value={budget?.ingresos_adicionales || 0} onChange={(v) => updateBudget({ ingresos_adicionales: v })} />
        </div>
        <p className="mt-4 font-mono text-sm text-ink/70">
          Total: <span className="text-moss-700 font-medium">${fmt(ingresos)}</span>
        </p>
      </div>

      <HealthBar ingresos={ingresos} basicos={totales.basicos} noEsenciales={totales.noEsenciales} ahorro={totales.ahorro} />

      {/* Categorías */}
      <div>
        <p className="text-xs uppercase tracking-wide text-ink/40 mb-3">Gastos por categoría</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sortedCategories.map((cat) => (
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

      {/* Panel de configuración de categorías */}
      {showSettings && (
        <CategorySettings userId={userId} onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}

function IncomeField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
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