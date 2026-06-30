interface Props {
  ingresos: number
  basicos: number
  noEsenciales: number
  ahorro: number
}

const fmt = (n: number) =>
  n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

export default function HealthBar({ ingresos, basicos, noEsenciales, ahorro }: Props) {
  const total = basicos + noEsenciales + ahorro
  const sobrante = ingresos - total
  const safe = ingresos > 0 ? ingresos : 1

  const pBasico = Math.min((basicos / safe) * 100, 100)
  const pNoEsencial = Math.min((noEsenciales / safe) * 100, 100)
  const pAhorro = Math.min((ahorro / safe) * 100, 100)

  const pctBasico = ingresos > 0 ? basicos / ingresos : 0
  const sinDatos = ingresos === 0 && basicos === 0 && noEsenciales === 0 && ahorro === 0
  let estado: { color: string; label: string }
  if (sinDatos) {
    estado = { color: 'bg-ink/20', label: 'Aún sin datos — empieza registrando tus ingresos' }
  } else if (ingresos === 0) {
    estado = { color: 'bg-ink/20', label: 'Faltan los ingresos — agrégalos arriba para ver tu balance' }
  } else if (total > ingresos) {
    estado = { color: 'bg-clay', label: 'Gastos por encima del ingreso — revisa tus números' }
  } else if (ahorro === 0) {
    estado = { color: 'bg-amber-400', label: 'Sin ahorro planificado — considera reservar algo' }
  } else if (pctBasico > 0.5) {
    estado = { color: 'bg-amber-400', label: 'Básicos sobre el 50% — pero tienes ahorro, bien' }
  } else {
    estado = { color: 'bg-moss-500', label: 'En buen rumbo — ingresos, gastos y ahorro balanceados' }
  }

  return (
    <div className="bg-white/70 border border-moss-100 rounded-2xl p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink/40 mb-1">Estado del mes</p>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${estado.color}`} />
            <span className="font-display text-lg text-ink">{estado.label}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-ink/40 mb-1">
            {sobrante >= 0 ? 'Disponible' : 'Déficit'}
          </p>
          <p className={`font-mono text-lg font-medium ${sobrante >= 0 ? 'text-moss-700' : 'text-clay'}`}>
            {fmt(Math.abs(sobrante))}
          </p>
        </div>
      </div>

      <div className="h-3 w-full bg-moss-50 rounded-full overflow-hidden flex">
        <div className="h-full bg-moss-600 transition-all" style={{ width: `${pBasico}%` }} />
        <div className="h-full bg-amber-500 transition-all" style={{ width: `${pNoEsencial}%` }} />
        <div className="h-full bg-moss-300 transition-all" style={{ width: `${pAhorro}%` }} />
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 text-xs">
        <Legend dot="bg-moss-600" label="Básicos" value={fmt(basicos)} />
        <Legend dot="bg-amber-500" label="No esenciales" value={fmt(noEsenciales)} />
        <Legend dot="bg-moss-300" label="Ahorro / inversión" value={fmt(ahorro)} />
        <Legend dot="bg-ink/20" label="Ingresos totales" value={fmt(ingresos)} />
      </div>
    </div>
  )
}

function Legend({ dot, label, value }: { dot: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      <span className="text-ink/50">{label}</span>
      <span className="font-mono text-ink/80">{value}</span>
    </div>
  )
}