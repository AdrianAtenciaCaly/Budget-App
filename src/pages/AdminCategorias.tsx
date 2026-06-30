import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Category, CategoriaTipo } from '../types'

interface CategoryWithUsage extends Category {
  enUso: boolean
  editing: boolean
  draft: { label: string; tipo: CategoriaTipo }
}

const TIPOS: { value: CategoriaTipo; label: string }[] = [
  { value: 'basico', label: 'Básico' },
  { value: 'no_esencial', label: 'No esencial' },
  { value: 'ahorro', label: 'Ahorro' },
]

export default function AdminCategorias() {
  const [cats, setCats] = useState<CategoryWithUsage[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newCat, setNewCat] = useState({ label: '', tipo: 'basico' as CategoriaTipo })
  const [addingNew, setAddingNew] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: categorias }, { data: usage }] = await Promise.all([
      supabase.from('categories').select('*').order('orden'),
      supabase.rpc('category_usage_count'),
    ])
    const usageMap = new Map<string, number>(
      (usage ?? []).map((u: { category_id: string; total: number }) => [u.category_id, u.total])
    )
    setCats(
      (categorias ?? []).map((c: Category) => ({
        ...c,
        enUso: (usageMap.get(c.id) ?? 0) > 0,
        editing: false,
        draft: { label: c.label, tipo: c.tipo },
      }))
    )
    setLoading(false)
  }

  function toggleEdit(id: string) {
    setCats((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, editing: !c.editing, draft: { label: c.label, tipo: c.tipo } }
          : { ...c, editing: false }
      )
    )
    setError(null)
  }

  function updateDraft(id: string, patch: Partial<{ label: string; tipo: CategoriaTipo }>) {
    setCats((prev) => prev.map((c) => (c.id === id ? { ...c, draft: { ...c.draft, ...patch } } : c)))
  }

  async function saveEdit(id: string) {
    const cat = cats.find((c) => c.id === id)
    if (!cat || !cat.draft.label.trim()) return
    setSaving(id)
    const { error: err } = await supabase
      .from('categories')
      .update({ label: cat.draft.label.trim(), tipo: cat.draft.tipo })
      .eq('id', id)
    if (err) {
      setError(err.message)
    } else {
      setCats((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, label: c.draft.label.trim(), tipo: c.draft.tipo, editing: false } : c
        )
      )
    }
    setSaving(null)
  }

  async function addCategory() {
    if (!newCat.label.trim()) return
    setSaving('new')
    const maxOrden = Math.max(...cats.map((c) => c.orden), 0)
    const id = newCat.label.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    const { error: err } = await supabase.from('categories').insert({
      id,
      label: newCat.label.trim(),
      tipo: newCat.tipo,
      orden: maxOrden + 1,
    })
    if (err) {
      setError(err.message)
    } else {
      setNewCat({ label: '', tipo: 'basico' })
      setAddingNew(false)
      await load()
    }
    setSaving(null)
  }

  if (loading) return <div className="py-20 text-center text-ink/40 text-sm">Cargando categorías…</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-ink">Categorías</h1>
        <p className="text-sm text-ink/50 mt-1">
          Las categorías con datos no pueden editarse para proteger la integridad de los presupuestos existentes.
        </p>
      </div>

      {error && <p className="text-sm text-wine bg-wine/10 rounded-lg px-4 py-3">{error}</p>}

      <div className="bg-white/70 border border-moss-100 rounded-2xl overflow-hidden divide-y divide-moss-100/70">
        {cats.map((cat) => (
          <div key={cat.id} className={`px-5 py-4 ${cat.editing ? 'bg-moss-50/50' : ''}`}>
            {cat.editing ? (
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-xs text-ink/40 mb-1">Nombre</label>
                  <input
                    value={cat.draft.label}
                    onChange={(e) => updateDraft(cat.id, { label: e.target.value })}
                    className="w-full border border-moss-100 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-moss-300"
                  />
                </div>
                <div>
                  <label className="block text-xs text-ink/40 mb-1">Tipo</label>
                  <select
                    value={cat.draft.tipo}
                    onChange={(e) => updateDraft(cat.id, { tipo: e.target.value as CategoriaTipo })}
                    className="border border-moss-100 rounded-lg px-3 py-2 text-sm bg-white outline-none"
                  >
                    {TIPOS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(cat.id)}
                    disabled={saving === cat.id}
                    className="bg-moss-600 hover:bg-moss-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition"
                  >
                    {saving === cat.id ? 'Guardando…' : 'Guardar'}
                  </button>
                  <button
                    onClick={() => toggleEdit(cat.id)}
                    className="border border-moss-100 rounded-lg px-4 py-2 text-sm text-ink/50 hover:text-ink/80 transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="font-display text-base text-ink">{cat.label}</span>
                  <span className="text-[10px] uppercase tracking-wide text-ink/40 px-1.5 py-0.5 border border-moss-200 rounded-full">
                    {TIPOS.find((t) => t.value === cat.tipo)?.label}
                  </span>
                  {cat.enUso && (
                    <span className="flex items-center gap-1 text-[10px] text-amber-500">
                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                      Con datos
                    </span>
                  )}
                </div>
                <button
                  onClick={() => !cat.enUso && toggleEdit(cat.id)}
                  disabled={cat.enUso}
                  title={cat.enUso ? 'Esta categoría ya tiene gastos registrados' : 'Editar categoría'}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                    cat.enUso
                      ? 'border-moss-100/50 text-ink/20 cursor-not-allowed'
                      : 'border-moss-100 text-ink/50 hover:text-moss-700 hover:border-moss-300'
                  }`}
                >
                  {cat.enUso ? 'Bloqueado' : 'Editar'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {addingNew ? (
        <div className="bg-white/70 border border-moss-300 rounded-2xl p-5 space-y-4">
          <p className="font-display text-base text-ink">Nueva categoría</p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs text-ink/40 mb-1">Nombre</label>
              <input
                value={newCat.label}
                onChange={(e) => setNewCat((v) => ({ ...v, label: e.target.value }))}
                placeholder="Ej: Mascotas"
                className="w-full border border-moss-100 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-moss-300"
              />
            </div>
            <div>
              <label className="block text-xs text-ink/40 mb-1">Tipo</label>
              <select
                value={newCat.tipo}
                onChange={(e) => setNewCat((v) => ({ ...v, tipo: e.target.value as CategoriaTipo }))}
                className="border border-moss-100 rounded-lg px-3 py-2 text-sm bg-white outline-none"
              >
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={addCategory}
                disabled={saving === 'new' || !newCat.label.trim()}
                className="bg-moss-600 hover:bg-moss-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition"
              >
                {saving === 'new' ? 'Creando…' : 'Crear'}
              </button>
              <button
                onClick={() => { setAddingNew(false); setError(null) }}
                className="border border-moss-100 rounded-lg px-4 py-2 text-sm text-ink/50 hover:text-ink/80 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddingNew(true)}
          className="w-full border border-dashed border-moss-200 rounded-2xl py-4 text-sm text-moss-600 hover:bg-moss-50 transition"
        >
          + Nueva categoría
        </button>
      )}
    </div>
  )
}