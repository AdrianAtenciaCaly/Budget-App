import { useEffect, useState, useMemo } from 'react'
import Swal from 'sweetalert2'
import { supabase } from '../lib/supabaseClient'
import { Category, CategoriaTipo, UserCategoryPref } from '../types'
import { useBudgetMonth, monthKey } from '../lib/useBudgetMonth'
import MonthSelector from '../components/MonthSelector'
import { Currency, CURRENCIES, setStoredCurrency } from '../lib/currencies'

// Helper compartido: reemplaza el confirm() nativo por un modal de SweetAlert2
// con los colores de la app (wine para peligro, moss para confirmar).
async function confirmAction(
    title: string,
    text: string,
    confirmText = 'Eliminar'
): Promise<boolean> {
    const result = await Swal.fire({
        title,
        text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#7a3b3b',
        cancelButtonColor: '#9fb3a5',
        reverseButtons: true,
        focusCancel: true,
    })
    return result.isConfirmed
}

interface CatWithPref extends Category {
    visible: boolean
    prefOrden: number
}

interface CategoryWithUsage extends Category {
    inUse: boolean
    editing: boolean
    draft: { label: string; tipo: CategoriaTipo }
}

const CATEGORY_TYPES: { value: CategoriaTipo; label: string }[] = [
    { value: 'basico', label: 'Básico' },
    { value: 'no_esencial', label: 'No esencial' },
    { value: 'ahorro', label: 'Ahorro' },
]

interface Props {
    userId: string
    isAdmin: boolean
    currency: Currency
    onCurrencyChange: (c: Currency) => void
}

type TabType = 'ingresos' | 'preferencias' | 'admin_categorias'

export default function Configuracion({ userId, isAdmin, currency, onCurrencyChange }: Props) {
    const [activeTab, setActiveTab] = useState<TabType>('ingresos')

    return (
        <div className="space-y-6">
            {/* Header page */}
            <div>
                <h1 className="font-display text-2xl text-ink font-semibold">Configuración</h1>
                <p className="text-sm text-ink/50 mt-1">
                    Ajusta ingresos del mes, maneja tus preferencias de categorías, o administra las categorías generales del sistema.
                </p>
            </div>

            {/* Selector de pestañas */}
            <div className="flex gap-1.5 rounded-full p-1 bg-moss-100/20 border border-moss-100/10 backdrop-blur w-fit">
                <TabButton active={activeTab === 'ingresos'} onClick={() => setActiveTab('ingresos')}>
                    <IconDollar /> Ingresos
                </TabButton>
                <TabButton active={activeTab === 'preferencias'} onClick={() => setActiveTab('preferencias')}>
                    <IconGrid /> Preferencias de categorías
                </TabButton>
                {isAdmin && (
                    <TabButton active={activeTab === 'admin_categorias'} onClick={() => setActiveTab('admin_categorias')}>
                        <IconKey /> Categorías (Administrador)
                    </TabButton>
                )}
            </div>

            {/* Contenedor central de contenido */}
            <div className="bg-white/70 border border-moss-100 rounded-2xl p-6 shadow-sm">
                {activeTab === 'ingresos' && <IngresosTab userId={userId} currency={currency} />}
                {activeTab === 'preferencias' && (
                    <PreferenciasTab
                        userId={userId}
                        currency={currency}
                        onCurrencyChange={onCurrencyChange}
                    />
                )}
                {activeTab === 'admin_categorias' && isAdmin && <AdminCategoriasTab />}
            </div>
        </div>
    )
}

/* ────────────────────────── Tab: Ingresos ────────────────────────── */

function IngresosTab({ userId, currency }: { userId: string; currency: Currency }) {
    const [mesDate, setMesDate] = useState(new Date())
    const mes = monthKey(mesDate)
    const { budget, loading, updateBudget, reload } = useBudgetMonth(userId, mes)

    const [deleteMonth, setDeleteMonth] = useState('')
    const [deleting, setDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)
    const [deleteSuccess, setDeleteSuccess] = useState(false)

    const total = (budget?.ingreso_1 || 0) + (budget?.ingreso_2 || 0) + (budget?.ingresos_adicionales || 0)
    const fmt = (n: number) => n.toLocaleString(currency.locale)

    async function deleteMonthData() {
        if (!deleteMonth) return
        const label = new Date(`${deleteMonth}-01T00:00:00`).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
        const ok = await confirmAction(
            `¿Eliminar los datos de ${label}?`,
            'Se borrarán todos los ingresos y gastos guardados de ese mes. Esta acción no se puede deshacer.'
        )
        if (!ok) return

        setDeleting(true)
        setDeleteError(null)
        setDeleteSuccess(false)

        const targetMes = `${deleteMonth}-01`
        const { data: target, error: findErr } = await supabase
            .from('budgets')
            .select('id')
            .eq('user_id', userId)
            .eq('mes', targetMes)
            .maybeSingle()

        if (findErr) {
            setDeleteError(findErr.message)
            setDeleting(false)
            return
        }
        if (!target) {
            setDeleteError('Ese mes no tiene datos guardados.')
            setDeleting(false)
            return
        }

        // Borra el presupuesto del mes; expense_items se elimina en cascada automáticamente
        const { error: delErr } = await supabase.from('budgets').delete().eq('id', target.id)
        if (delErr) {
            setDeleteError(delErr.message)
        } else {
            setDeleteSuccess(true)
            setTimeout(() => setDeleteSuccess(false), 4000)
            // Si el mes eliminado es el que se está viendo en este momento, refresca los campos
            if (targetMes === mes) reload()
        }
        setDeleting(false)
    }

    if (loading) return <div className="py-8 text-center text-ink/40 text-sm">Cargando ingresos…</div>

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-moss-100 pb-4">
                <div>
                    <h2 className="font-display text-base font-medium text-ink">Ingresos Mensuales</h2>
                    <p className="text-xs text-ink/40 mt-0.5">Define los ingresos estimados para cada mes de presupuesto.</p>
                </div>
                <MonthSelector mesDate={mesDate} onChange={setMesDate} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <IncomeField label="Ingreso 1" value={budget?.ingreso_1 || 0} onChange={(v) => updateBudget({ ingreso_1: v })} currency={currency} />
                <IncomeField label="Ingreso 2" value={budget?.ingreso_2 || 0} onChange={(v) => updateBudget({ ingreso_2: v })} currency={currency} />
                <IncomeField
                    label="Ingresos adicionales"
                    value={budget?.ingresos_adicionales || 0}
                    onChange={(v) => updateBudget({ ingresos_adicionales: v })}
                    currency={currency}
                />
            </div>

            <div className="p-4 bg-moss-50/50 border border-moss-100/50 rounded-xl flex items-center justify-between">
                <span className="text-sm text-ink/60">Total Ingresos para este mes:</span>
                <span className="font-mono text-lg font-semibold text-moss-700">{currency.symbol}{fmt(total)}</span>
            </div>
            <p className="text-xs text-ink/30 italic">Los cambios se guardan de forma automática en tiempo real.</p>

            {/* Zona de peligro: eliminar datos de un mes específico */}
            <div className="border-t border-wine/20 pt-5 mt-2">
                <h3 className="font-display text-sm font-semibold text-wine mb-1">Zona de peligro</h3>
                <p className="text-xs text-ink/40 mb-3">
                    Elimina permanentemente los ingresos y gastos guardados de un mes específico — útil si un mes copió datos por error.
                </p>
                <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                    <label className="block flex-1 max-w-xs">
                        <span className="block text-xs text-ink/50 mb-1.5">Mes a eliminar</span>
                        <input
                            type="month"
                            value={deleteMonth}
                            onChange={(e) => { setDeleteMonth(e.target.value); setDeleteError(null) }}
                            className="w-full border border-moss-100 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-wine/30"
                        />
                    </label>
                    <button
                        onClick={deleteMonthData}
                        disabled={!deleteMonth || deleting}
                        className="bg-wine hover:bg-wine/90 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition"
                    >
                        {deleting ? 'Eliminando…' : 'Eliminar datos del mes'}
                    </button>
                </div>
                {deleteError && (
                    <p className="text-sm text-wine bg-wine/10 rounded-lg px-3 py-2 mt-3">{deleteError}</p>
                )}
                {deleteSuccess && (
                    <p className="text-xs text-moss-700 font-medium mt-3">✓ Datos del mes eliminados correctamente.</p>
                )}
            </div>
        </div>
    )
}

function IncomeField({ label, value, onChange, currency }: { label: string; value: number; onChange: (v: number) => void; currency: Currency }) {
    return (
        <label className="block">
            <span className="block text-xs text-ink/50 mb-1.5">{label}</span>
            <div className="flex items-center gap-1.5 border border-moss-100 rounded-lg px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-moss-300 transition">
                <span className="text-xs text-ink/30 font-medium">{currency.symbol}</span>
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

/* ────────────────────────── Tab: Preferencias (Orden/Visibilidad) ────────────────────────── */

function PreferenciasTab({
    userId,
    currency,
    onCurrencyChange,
}: {
    userId: string
    currency: Currency
    onCurrencyChange: (c: Currency) => void
}) {
    const [cats, setCats] = useState<CatWithPref[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [addingNew, setAddingNew] = useState(false)
    const [newCat, setNewCat] = useState({ label: '', tipo: 'basico' as CategoriaTipo })
    const [creating, setCreating] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)

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
        setSuccess(false)
        const upserts = cats.map((c, idx) => ({
            user_id: userId,
            category_id: c.id,
            orden: idx,
            visible: c.visible,
        }))
        const { error } = await supabase.from('user_category_prefs').upsert(upserts, { onConflict: 'user_id,category_id' })
        setSaving(false)
        if (!error) {
            setSuccess(true)
            setTimeout(() => setSuccess(false), 3000)
        }
    }

    async function createCategory() {
        if (!newCat.label.trim()) return
        setCreating(true)
        setError(null)

        const slug = newCat.label.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
        // Sufijo único por usuario para que dos personas puedan crear una categoría con el mismo nombre
        const id = `u_${slug}_${userId.slice(0, 8)}_${Date.now().toString(36)}`
        const maxOrder = Math.max(0, ...cats.map((c) => c.orden))

        const { error: err } = await supabase.from('categories').insert({
            id,
            label: newCat.label.trim(),
            tipo: newCat.tipo,
            orden: maxOrder + 1,
            user_id: userId,
        })

        if (err) {
            setError(err.message)
        } else {
            setNewCat({ label: '', tipo: 'basico' })
            setAddingNew(false)
            await load()
        }
        setCreating(false)
    }

    async function deleteOwnCategory(id: string) {
        const ok = await confirmAction(
            '¿Eliminar esta categoría?',
            'Si ya tiene gastos registrados no se podrá borrar.'
        )
        if (!ok) return
        setDeletingId(id)
        setError(null)
        const { error: err } = await supabase.from('categories').delete().eq('id', id)
        if (err) {
            setError('No se pudo eliminar: probablemente ya tiene gastos registrados.')
        } else {
            setCats((prev) => prev.filter((c) => c.id !== id))
        }
        setDeletingId(null)
    }

    if (loading) return <div className="py-8 text-center text-ink/40 text-sm">Cargando preferencias…</div>

    return (
        <div className="space-y-6">
            {/* Ajuste de Moneda */}
            <div className="border-b border-moss-100 pb-5 mb-2">
                <h3 className="font-display text-sm font-semibold text-ink mb-1">Moneda de la Cuenta</h3>
                <p className="text-xs text-ink/40 mb-3">Elige la moneda preferida para visualizar e ingresar montos en la aplicación.</p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <select
                        value={currency.code}
                        onChange={(e) => {
                            const found = CURRENCIES.find((c) => c.code === e.target.value)
                            if (found) {
                                setStoredCurrency(found.code)
                                onCurrencyChange(found)
                            }
                        }}
                        className="border border-moss-100 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-moss-300 w-full sm:w-64"
                    >
                        {CURRENCIES.map((curr) => (
                            <option key={curr.code} value={curr.code}>
                                {curr.label} ({curr.symbol})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div>
                <h2 className="font-display text-base font-medium text-ink">Preferencias de Categorías</h2>
                <p className="text-xs text-ink/40 mt-0.5">Ordena y decide cuáles de las categorías del presupuesto deseas ver o esconder.</p>
            </div>

            {error && <p className="text-sm text-wine bg-wine/10 border border-wine/20 rounded-lg px-4 py-3">{error}</p>}

            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {cats.map((cat, idx) => {
                    const isOwn = cat.user_id === userId
                    return (
                        <div
                            key={cat.id}
                            className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition ${cat.visible ? 'bg-white border-moss-100 hover:border-moss-200' : 'bg-ink/5 border-transparent opacity-50'
                                }`}
                        >
                            {/* Ordenadores */}
                            <div className="flex flex-col gap-0.5">
                                <button
                                    onClick={() => moveUp(idx)}
                                    disabled={idx === 0}
                                    className="text-ink/30 hover:text-ink/75 disabled:opacity-20 transition leading-none p-0.5"
                                    title="Subir orden"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="18 15 12 9 6 15" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => moveDown(idx)}
                                    disabled={idx === cats.length - 1}
                                    className="text-ink/30 hover:text-ink/75 disabled:opacity-20 transition leading-none p-0.5"
                                    title="Bajar orden"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                </button>
                            </div>

                            {/* Nombre y tipo */}
                            <div className="flex-1 min-w-0">
                                <span className="font-display text-sm font-medium text-ink block sm:inline">{cat.label}</span>
                                <span className="sm:ml-3 text-[10px] uppercase tracking-wide text-ink/40 px-1.5 py-0.5 border border-moss-200 rounded-full inline-block mt-1 sm:mt-0">
                                    {cat.tipo === 'basico' ? 'Básico' : cat.tipo === 'ahorro' ? 'Ahorro' : 'No esencial'}
                                </span>
                                {isOwn && (
                                    <span className="sm:ml-1.5 text-[10px] text-moss-600 inline-block mt-1 sm:mt-0">· Tuya</span>
                                )}
                            </div>

                            {/* Toggle visible */}
                            <button
                                onClick={() => toggleVisible(cat.id)}
                                title={cat.visible ? 'Ocultar' : 'Mostrar'}
                                className={`flex-shrink-0 w-9 h-9 rounded-full border flex items-center justify-center transition ${cat.visible
                                    ? 'border-moss-200 text-moss-600 hover:bg-moss-50'
                                    : 'border-ink/10 text-ink/30 hover:text-ink/65 hover:bg-ink/5'
                                    }`}
                            >
                                {cat.visible ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                                    </svg>
                                ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                                        <line x1="1" y1="1" x2="23" y2="23" />
                                    </svg>
                                )}
                            </button>

                            {/* Eliminar (solo si es propia) */}
                            {isOwn && (
                                <button
                                    onClick={() => deleteOwnCategory(cat.id)}
                                    disabled={deletingId === cat.id}
                                    title="Eliminar categoría propia"
                                    className="flex-shrink-0 text-ink/20 hover:text-clay transition px-1 text-sm"
                                >
                                    {deletingId === cat.id ? '…' : '×'}
                                </button>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Crear categoría propia */}
            {addingNew ? (
                <div className="border border-moss-300 rounded-xl p-4 space-y-3">
                    <p className="text-xs text-ink/50">Solo tú verás esta categoría.</p>
                    <input
                        value={newCat.label}
                        onChange={(e) => setNewCat((v) => ({ ...v, label: e.target.value }))}
                        placeholder="Ej: Suscripciones"
                        className="w-full border border-moss-100 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-moss-300"
                    />
                    <select
                        value={newCat.tipo}
                        onChange={(e) => setNewCat((v) => ({ ...v, tipo: e.target.value as CategoriaTipo }))}
                        className="w-full border border-moss-100 rounded-lg px-3 py-2 text-sm bg-white outline-none"
                    >
                        {CATEGORY_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>
                    <div className="flex gap-2">
                        <button
                            onClick={createCategory}
                            disabled={creating || !newCat.label.trim()}
                            className="flex-1 bg-moss-600 hover:bg-moss-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition"
                        >
                            {creating ? 'Creando…' : 'Crear'}
                        </button>
                        <button
                            onClick={() => { setAddingNew(false); setError(null) }}
                            className="px-4 border border-moss-100 rounded-lg text-sm text-ink/50 hover:text-ink/80 transition"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setAddingNew(true)}
                    className="w-full border border-dashed border-moss-200 rounded-xl py-3 text-sm text-moss-600 hover:bg-moss-50 transition"
                >
                    + Crear categoría propia
                </button>
            )}

            <div className="flex items-center gap-3 border-t border-moss-100 pt-4 mt-2">
                <button
                    onClick={save}
                    disabled={saving}
                    className="bg-moss-600 hover:bg-moss-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-6 py-2.5 transition shadow-sm"
                >
                    {saving ? 'Guardando…' : 'Guardar preferencias'}
                </button>
                {success && (
                    <span className="text-xs text-moss-700 font-medium animate-fadeIn">
                        ✓ Preferencias guardadas correctamente
                    </span>
                )}
            </div>
        </div>
    )
}

/* ────────────────────────── Tab: Administrar Categorías (Edición - Admin Only) ────────────────────────── */

function AdminCategoriasTab() {
    const [cats, setCats] = useState<CategoryWithUsage[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [newCat, setNewCat] = useState({ label: '', tipo: 'basico' as CategoriaTipo })
    const [addingNew, setAddingNew] = useState(false)

    useEffect(() => {
        load()
    }, [])

    async function load() {
        setLoading(true)
        const [{ data: categories }, { data: usage }] = await Promise.all([
            supabase.from('categories').select('*').order('orden'),
            supabase.rpc('category_usage_count'),
        ])
        const usageMap = new Map<string, number>(
            (usage ?? []).map((u: { category_id: string; total: number }) => [u.category_id, u.total])
        )
        setCats(
            (categories ?? []).map((c: Category) => ({
                ...c,
                inUse: (usageMap.get(c.id) ?? 0) > 0,
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
        setSuccess(null)
    }

    function updateDraft(id: string, patch: Partial<{ label: string; tipo: CategoriaTipo }>) {
        setCats((prev) => prev.map((c) => (c.id === id ? { ...c, draft: { ...c.draft, ...patch } } : c)))
    }

    async function saveEdit(id: string) {
        const cat = cats.find((c) => c.id === id)
        if (!cat || !cat.draft.label.trim()) return
        setSaving(id)
        setError(null)
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
            setSuccess('Categoría actualizada con éxito')
            setTimeout(() => setSuccess(null), 3000)
        }
        setSaving(null)
    }

    async function deleteCategory(id: string) {
        const ok = await confirmAction(
            '¿Eliminar esta categoría?',
            'Esta acción no se puede deshacer.'
        )
        if (!ok) return
        setSaving(id)
        setError(null)
        const { error: err } = await supabase.from('categories').delete().eq('id', id)
        if (err) {
            setError(err.message)
        } else {
            setCats((prev) => prev.filter((c) => c.id !== id))
            setSuccess('Categoría eliminada con éxito')
            setTimeout(() => setSuccess(null), 3000)
        }
        setSaving(null)
    }

    async function addCategory() {
        if (!newCat.label.trim()) return
        setSaving('new')
        setError(null)
        const maxOrder = Math.max(...cats.map((c) => c.orden), 0)
        const id = newCat.label.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
        const { error: err } = await supabase.from('categories').insert({
            id,
            label: newCat.label.trim(),
            tipo: newCat.tipo,
            orden: maxOrder + 1,
        })
        if (err) {
            setError(err.message)
        } else {
            setNewCat({ label: '', tipo: 'basico' })
            setAddingNew(false)
            setSuccess('Categoría creada con éxito')
            setTimeout(() => setSuccess(null), 3000)
            await load()
        }
        setSaving(null)
    }

    if (loading) return <div className="py-8 text-center text-ink/40 text-sm">Cargando administración de categorías…</div>

    return (
        <div className="space-y-4">
            <div>
                <h2 className="font-display text-base font-medium text-ink">Administración General de Categorías</h2>
                <p className="text-xs text-ink/40 mt-0.5">
                    Crea nuevas categorías generales, o edita y elimina aquellas que no tengan datos ya asignados por los usuarios.
                </p>
            </div>

            {error && <p className="text-sm text-wine bg-wine/10 border border-wine/20 rounded-lg px-4 py-3">{error}</p>}
            {success && <p className="text-sm text-moss-700 bg-moss-50 border border-moss-200 rounded-lg px-4 py-3 animate-fadeIn">{success}</p>}

            <div className="bg-moss-50/20 border border-moss-100 rounded-2xl overflow-hidden divide-y divide-moss-100/70 max-h-[50vh] overflow-y-auto">
                {cats.map((cat) => (
                    <div key={cat.id} className={`px-5 py-4 transition ${cat.editing ? 'bg-moss-50/60' : 'bg-white/40'}`}>
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
                                        {CATEGORY_TYPES.map((t) => (
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
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <span className="font-display text-sm font-medium text-ink">{cat.label}</span>
                                    <span className="text-[10px] uppercase tracking-wide text-ink/40 px-1.5 py-0.5 border border-moss-200 rounded-full bg-white">
                                        {CATEGORY_TYPES.find((t) => t.value === cat.tipo)?.label}
                                    </span>
                                    {cat.inUse && (
                                        <span className="flex items-center gap-1.5 text-[10px] text-amber-500 bg-amber-500/5 px-2 py-0.5 border border-amber-500/10 rounded-full">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                            </svg>
                                            Con datos asignados
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => !cat.inUse && toggleEdit(cat.id)}
                                        disabled={cat.inUse || saving === cat.id}
                                        title={cat.inUse ? 'Esta categoría ya tiene gastos registrados' : 'Editar categoría'}
                                        className={`text-xs px-3 py-1.5 rounded-lg border transition ${cat.inUse
                                            ? 'border-moss-100/50 text-ink/20 cursor-not-allowed bg-transparent'
                                            : 'border-moss-100 text-ink/50 hover:text-moss-700 hover:border-moss-300 bg-white hover:bg-moss-50/20'
                                            }`}
                                    >
                                        {cat.inUse ? 'Bloqueado' : 'Editar'}
                                    </button>
                                    <button
                                        onClick={() => !cat.inUse && deleteCategory(cat.id)}
                                        disabled={cat.inUse || saving === cat.id}
                                        title={cat.inUse ? 'No se puede eliminar una categoría con datos' : 'Eliminar categoría'}
                                        className={`text-xs px-3 py-1.5 rounded-lg border transition ${cat.inUse
                                            ? 'border-moss-100/50 text-ink/20 cursor-not-allowed bg-transparent'
                                            : 'border-clay/35 text-clay/55 hover:text-clay hover:border-clay/60 bg-white hover:bg-clay/5'
                                            }`}
                                    >
                                        {saving === cat.id ? '…' : 'Eliminar'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {addingNew ? (
                <div className="bg-white border border-moss-100 rounded-2xl p-5 space-y-4 animate-slideDown">
                    <p className="font-display text-sm font-semibold text-ink">Nueva categoría general</p>
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
                                {CATEGORY_TYPES.map((t) => (
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
                    className="w-full border border-dashed border-moss-200 rounded-2xl py-4 text-sm text-moss-600 hover:bg-moss-50 hover:border-moss-300 transition"
                >
                    + Nueva categoría general
                </button>
            )}
        </div>
    )
}

/* ────────────────────────── UI Helpers ────────────────────────── */

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 text-xs sm:text-sm px-4 py-2 rounded-full transition font-medium ${active
                ? 'bg-white text-moss-700 shadow-sm'
                : 'text-ink/50 hover:text-ink/80'
                }`}
        >
            {children}
        </button>
    )
}

function IconDollar() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
    )
}

function IconGrid() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
    )
}

function IconKey() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
        </svg>
    )
}