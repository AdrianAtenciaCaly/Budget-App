// src/components/SettingsPanel.tsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Budget, Category, UserCategoryPref } from '../types'

interface CatWithPref extends Category {
  visible: boolean
  prefOrden: number
}

type Tab = 'ingresos' | 'categorias'

interface Props {
  userId: string
  budget: Budget | null
  onUpdateBudget: (patch: Partial<Budget>) => void
  onClose: () => void
  initialTab?: Tab
}

export default function SettingsPanel({ userId, budget, onUpdateBudget, onClose, initialTab = 'ingresos' }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-paper border border-moss-100 rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-1">
          <div>
            <h2 className="font-display text-lg text-ink">Configuración</h2>
            <p className="text-xs text-ink/40 mt-0.5">Ajusta ingresos, categorías y más, todo en un solo lugar.</p>
          </div>
          <button onClick={onClose} className="text-ink/30 hover:text-ink/70 transition text-xl leading-none">×</button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-3">
          <div className="flex gap-1 rounded-full p-1 bg-moss-100/30 border border-moss-100/40 w-fit">
            <TabButton active={tab === 'ingresos'} onClick={() => setTab('ingresos')}>
              <IconDollar /> Ingresos
            </TabButton>
            <TabButton active={tab === 'categorias'} onClick={() => setTab('categorias')}>
              <IconGrid /> Categorías
            </TabButton>
            {/* Futuras pestañas de configuración se agregan aquí, por ejemplo:
            <TabButton active={tab === 'notificaciones'} onClick={() => setTab('notificaciones')}>
              <IconBell /> Notificaciones
            </TabButton> */}
          </div>
        </div>

        <div className="mt-3 border-t border-moss-100" />

        {/* Contenido */}
        <div className="overflow-y-auto flex-1">
          {tab === 'ingresos' && <IngresosTab budget={budget} onUpdateBudget={onUpdateBudget} />}
          {tab === 'categorias' && <CategoriasTab userId={userId} onClose={onClose} />}
        </div>
      </div>
    </div>
  )
}

/* ────────────────────────── Tab: Ingresos ────────────────────────── */

function IngresosTab({
  budget,
  onUpdateBudget,
}: {
  budget: Budget | null
  onUpdateBudget: (patch: Partial<Budget>) => void
}) {
  const total = (budget?.ingreso_1 || 0) + (budget?.ingreso_2 || 0) + (budget?.ingresos_adicionales || 0)
  const fmt = (n: number) => n.toLocaleString('es-CO')

  return (
    <div className="px-6 py-5 space-y-5">
      <p className="text-xs uppercase tracking-wide text-ink/40">Ingresos del mes</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <IncomeField label="Ingreso 1" value={budget?.ingreso_1 || 0} onChange={(v) => onUpdateBudget({ ingreso_1: v })} />
        <IncomeField label="Ingreso 2" value={budget?.ingreso_2 || 0} onChange={(v) => onUpdateBudget({ ingreso_2: v })} />
        <IncomeField
          label="Ingresos adicionales"
          value={budget?.ingresos_adicionales || 0}
          onChange={(v) => onUpdateBudget({ ingresos_adicionales: v })}
        />
      </div>
      <p className="font-mono text-sm text-ink/70 pt-1">
        Total: <span className="text-moss-700 font-medium">${fmt(total)}</span>
      </p>
      <p className="text-xs text-ink/30">Los cambios se guardan automáticamente.</p>
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

/* ────────────────────────── Tab: Categorías ────────────────────────── */

function CategoriasTab({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [cats, setCats] = useState<CatWithPref[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [{ data: categories }, { data: prefs }] = await Promise.all([
      supabase.from('categories').select('*').order('orden'),
      supabase.from('user_category_prefs').select('*').eq('user_id', userId),
    ])

    const prefsMap = new Map<string, UserCategoryPref>(
      (prefs ?? []).map((p: UserCategoryPref) => [p.category_id, p])
    )

    const merged: CatWithPref[] = (categories ?? []).map((c: Category, idx: number) => {
      const pref = prefsMap.get(c.id)
      return {
        ...c,
        visible: pref ? pref.visible : true,
        prefOrden: pref ? pref.orden : idx,
      }
    })

    merged.sort((a, b) => a.prefOrden - b.prefOrden)
    setCats(merged)
    setLoading(false)
  }

  function moveUp(idx: number) {
    if (idx === 0) return
    setCats((prev) => {
      const next = [...prev]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      return next
    })
  }

  function moveDown(idx: number) {
    setCats((prev) => {
      if (idx === prev.length - 1) return prev
      const next = [...prev]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      return next
    })
  }

  function toggleVisible(id: string) {
    setCats((prev) => prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c)))
  }

  async function save() {
    setSaving(true)
    const upserts = cats.map((c, idx) => ({
      user_id: userId,
      category_id: c.id,
      orden: idx,
      visible: c.visible,
    }))
    await supabase.from('user_category_prefs').upsert(upserts, { onConflict: 'user_id,category_id' })
    setSaving(false)
    onClose()
  }

  return (
    <div className="flex flex-col">
      <div className="px-6 pt-4 pb-1">
        <p className="text-xs uppercase tracking-wide text-ink/40">Ordena y muestra u oculta tus categorías</p>
      </div>
      <div className="px-4 py-3 space-y-1.5">
        {loading ? (
          <p className="text-center text-ink/40 text-sm py-8">Cargando…</p>
        ) : (
          cats.map((cat, idx) => (
            <div
              key={cat.id}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border transition ${
                cat.visible ? 'bg-white/60 border-moss-100' : 'bg-ink/5 border-transparent opacity-50'
              }`}
            >
              {/* Orden */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => moveUp(idx)}
                  disabled={idx === 0}
                  className="text-ink/30 hover:text-ink/70 disabled:opacity-20 transition leading-none"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                </button>
                <button
                  onClick={() => moveDown(idx)}
                  disabled={idx === cats.length - 1}
                  className="text-ink/30 hover:text-ink/70 disabled:opacity-20 transition leading-none"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </div>

              {/* Nombre y tipo */}
              <div className="flex-1 min-w-0">
                <span className="font-display text-sm text-ink">{cat.label}</span>
                <span className="ml-2 text-[10px] uppercase tracking-wide text-ink/40 px-1.5 py-0.5 border border-moss-200 rounded-full">
                  {cat.tipo === 'basico' ? 'Básico' : cat.tipo === 'ahorro' ? 'Ahorro' : 'No esencial'}
                </span>
              </div>

              {/* Toggle visible */}
              <button
                onClick={() => toggleVisible(cat.id)}
                title={cat.visible ? 'Ocultar' : 'Mostrar'}
                className={`flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center transition ${
                  cat.visible
                    ? 'border-moss-200 text-moss-600 hover:bg-moss-50'
                    : 'border-ink/10 text-ink/30 hover:text-ink/60'
                }`}
              >
                {cat.visible ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                )}
              </button>
            </div>
          ))
        )}
      </div>

      <div className="px-6 py-4 border-t border-moss-100 flex gap-3 mt-2">
        <button
          onClick={save}
          disabled={saving}
          className="flex-1 bg-moss-600 hover:bg-moss-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2.5 transition"
        >
          {saving ? 'Guardando…' : 'Guardar preferencias'}
        </button>
      </div>
    </div>
  )
}

/* ────────────────────────── UI helpers ────────────────────────── */

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-full transition ${
        active ? 'bg-white text-moss-700 shadow-sm font-medium' : 'text-ink/50 hover:text-ink/80'
      }`}
    >
      {children}
    </button>
  )
}

function IconDollar() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

function IconGrid() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}