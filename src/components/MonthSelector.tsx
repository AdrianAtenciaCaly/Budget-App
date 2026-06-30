interface Props {
  mesDate: Date
  onChange: (d: Date) => void
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export default function MonthSelector({ mesDate, onChange }: Props) {
  function shift(delta: number) {
    const d = new Date(mesDate)
    d.setMonth(d.getMonth() + delta)
    onChange(d)
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => shift(-1)}
        className="w-8 h-8 rounded-full border border-moss-100 hover:bg-moss-50 flex items-center justify-center transition text-ink/60"
        aria-label="Mes anterior"
      >
        ‹
      </button>
      <div className="font-display text-lg w-44 text-center text-ink">
        {MESES[mesDate.getMonth()]} {mesDate.getFullYear()}
      </div>
      <button
        onClick={() => shift(1)}
        className="w-8 h-8 rounded-full border border-moss-100 hover:bg-moss-50 flex items-center justify-center transition text-ink/60"
        aria-label="Mes siguiente"
      >
        ›
      </button>
    </div>
  )
}
