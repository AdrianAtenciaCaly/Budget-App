import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Category, UserCategoryPref } from '../types'

interface CatWithPref extends Category {
  visible: boolean
  prefOrden: number
}

interface Props {
  userId: string
  onClose: () => void
}

export default function CategorySettings({ userId, onClose }: Props) {
  const [cats, setCats] = useState<CatWithPref[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

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
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-paper border border-moss-100 rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-moss-100">
          <div>
            <h2 className="font-display text-lg text-ink">Configurar categorías</h2>
            <p className="text-xs text-ink/40 mt-0.5">Ordena y muestra u oculta las categorías a tu gusto.</p>
          </div>
          <button onClick={onClose} className="text-ink/30 hover:text-ink/70 transition text-xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-1.5">
          {loading ? (
            <p className="text-center text-ink/40 text-sm py-8">Cargando…</p>
          ) : (
            cats.map((cat, idx) => (
              <div
                key={cat.id}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border transition ${
                  cat.visible
                    ? 'bg-white/60 border-moss-100'
                    : 'bg-ink/5 border-transparent opacity-50'
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
                      <polyline points="18 15 12 9 6 15"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => moveDown(idx)}
                    disabled={idx === cats.length - 1}
                    className="text-ink/30 hover:text-ink/70 disabled:opacity-20 transition leading-none"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"/>
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
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  )}
                </button>
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-4 border-t border-moss-100 flex gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 bg-moss-600 hover:bg-moss-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2.5 transition"
          >
            {saving ? 'Guardando…' : 'Guardar preferencias'}
          </button>
          <button
            onClick={onClose}
            className="px-4 border border-moss-100 rounded-lg text-sm text-ink/50 hover:text-ink/80 transition"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}