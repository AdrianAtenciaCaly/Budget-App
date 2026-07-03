import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabaseClient'
import { monthKey } from '../lib/useBudgetMonth'

import { Currency } from '../lib/currencies'

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

interface Row {
  mes: string
  label: string
  ingresos: number
  gastos: number
  ahorro: number
  disponible: number
}

export default function Proyeccion({ userId, currency }: { userId: string; currency: Currency }) {
  const [rows, setRows] = useState<Row[]>([])
  const [horizonte, setHorizonte] = useState(6)
  const [loading, setLoading] = useState(true)

  const fmt = (n: number) =>
    n.toLocaleString(currency.locale, { style: 'currency', currency: currency.code, maximumFractionDigits: 0 })

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      const today = new Date()
      const out: Row[] = []

      for (let i = 0; i < horizonte; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() + i, 1)
        const mes = monthKey(d)

        const { data: b } = await supabase
          .from('budgets')
          .select('*, expense_items(*)')
          .eq('user_id', userId)
          .eq('mes', mes)
          .maybeSingle()

        const ingresos = b ? (b.ingreso_1 || 0) + (b.ingreso_2 || 0) + (b.ingresos_adicionales || 0) : 0
        let gastos = 0, ahorro = 0
        if (b?.expense_items) {
          const { data: cats } = await supabase.from('categories').select('id, tipo')
          for (const it of b.expense_items) {
            const cat = cats?.find((c) => c.id === it.category_id)
            if (cat?.tipo === 'ahorro') ahorro += it.valor_presupuestado || 0
            else gastos += it.valor_presupuestado || 0
          }
        }

        out.push({
          mes,
          label: `${MESES_CORTOS[d.getMonth()]} ${d.getFullYear()}`,
          ingresos,
          gastos,
          ahorro,
          disponible: ingresos - gastos - ahorro,
        })
      }
      if (!cancelled) {
        setRows(out)
        setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [userId, horizonte])

  const ahorroAcumulado = rows.reduce((s, r) => s + r.ahorro, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-ink">Proyección</h1>
          <p className="text-sm text-ink/50 mt-1">
            Solo se proyectan los meses que ya tienen presupuesto creado en "Presupuesto". Los meses futuros sin datos
            aparecen en cero — visítalos una vez para que Budget App copie tu plan hacia adelante.
          </p>
        </div>
        <select
          value={horizonte}
          onChange={(e) => setHorizonte(Number(e.target.value))}
          className="border border-moss-100 rounded-lg px-3 py-2 text-sm bg-white outline-none"
        >
          <option value={3}>3 meses</option>
          <option value={6}>6 meses</option>
          <option value={12}>12 meses</option>
        </select>
      </div>

      {loading ? (
        <div className="py-20 text-center text-ink/40 text-sm">Calculando tu proyección…</div>
      ) : (
        <>
          <div className="bg-white/70 border border-moss-100 rounded-2xl p-6">
            <p className="text-xs uppercase tracking-wide text-ink/40 mb-1">
              Ahorro proyectado en {horizonte} meses
            </p>
            <p className="font-mono text-2xl text-moss-700">{fmt(ahorroAcumulado)}</p>
          </div>

          <div className="bg-white/70 border border-moss-100 rounded-2xl p-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={rows} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d6e3d9" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#15231f99' }} />
                <YAxis tick={{ fontSize: 11, fill: '#15231f66' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Line type="monotone" dataKey="ingresos" stroke="#2f5440" strokeWidth={2} dot={false} name="Ingresos" />
                <Line type="monotone" dataKey="gastos" stroke="#c2812a" strokeWidth={2} dot={false} name="Gastos" />
                <Line type="monotone" dataKey="disponible" stroke="#b85c3e" strokeWidth={2} dot={false} name="Disponible" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white/70 border border-moss-100 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-moss-50/60 text-left text-xs uppercase tracking-wide text-ink/40">
                  <th className="px-4 py-3 font-medium">Mes</th>
                  <th className="px-4 py-3 font-medium text-right">Ingresos</th>
                  <th className="px-4 py-3 font-medium text-right">Gastos</th>
                  <th className="px-4 py-3 font-medium text-right">Ahorro</th>
                  <th className="px-4 py-3 font-medium text-right">Disponible</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-moss-100/70">
                {rows.map((r) => (
                  <tr key={r.mes}>
                    <td className="px-4 py-3 font-display">{r.label}</td>
                    <td className="px-4 py-3 text-right font-mono">{fmt(r.ingresos)}</td>
                    <td className="px-4 py-3 text-right font-mono">{fmt(r.gastos)}</td>
                    <td className="px-4 py-3 text-right font-mono">{fmt(r.ahorro)}</td>
                    <td className={`px-4 py-3 text-right font-mono ${r.disponible < 0 ? 'text-clay' : 'text-moss-700'}`}>
                      {fmt(r.disponible)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
