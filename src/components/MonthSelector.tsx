import { useEffect, useRef, useState } from 'react'

interface Props {
  mesDate: Date
  onChange: (d: Date) => void
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

// Rango de años disponible en el selector rápido (5 años atrás / 5 adelante)
const YEAR_RANGE = 5

export default function MonthSelector({ mesDate, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [draftMonth, setDraftMonth] = useState(mesDate.getMonth())
  const [draftYear, setDraftYear] = useState(mesDate.getFullYear())
  const containerRef = useRef<HTMLDivElement>(null)

  // Sincroniza el draft cuando el mes activo cambia por otro medio (flechas, etc.)
  useEffect(() => {
    setDraftMonth(mesDate.getMonth())
    setDraftYear(mesDate.getFullYear())
  }, [mesDate])

  // Cierra el desplegable al hacer clic afuera
  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function shift(delta: number) {
    const d = new Date(mesDate)
    d.setMonth(d.getMonth() + delta)
    onChange(d)
  }

  function goToDraft() {
    onChange(new Date(draftYear, draftMonth, 1))
    setOpen(false)
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: YEAR_RANGE * 2 + 1 }, (_, i) => currentYear - YEAR_RANGE + i)

  return (
    <div className="relative flex items-center gap-3" ref={containerRef}>
      <button
        onClick={() => shift(-1)}
        className="w-8 h-8 rounded-full border border-moss-100 hover:bg-moss-50 flex items-center justify-center transition text-ink/60"
        aria-label="Mes anterior"
      >
        ‹
      </button>

      <button
        onClick={() => setOpen((v) => !v)}
        className="font-display text-lg w-44 text-center text-ink hover:text-moss-700 transition rounded-lg py-1"
        aria-expanded={open}
        aria-haspopup="true"
      >
        {MESES[mesDate.getMonth()]} {mesDate.getFullYear()}
      </button>

      <button
        onClick={() => shift(1)}
        className="w-8 h-8 rounded-full border border-moss-100 hover:bg-moss-50 flex items-center justify-center transition text-ink/60"
        aria-label="Mes siguiente"
      >
        ›
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-20 bg-paper border border-moss-100 rounded-xl shadow-lg p-4 w-64">
          <p className="text-xs uppercase tracking-wide text-ink/40 mb-3">Ir a un mes</p>
          <div className="flex gap-2 mb-3">
            <select
              value={draftMonth}
              onChange={(e) => setDraftMonth(Number(e.target.value))}
              className="flex-1 border border-moss-100 rounded-lg px-2 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-moss-300"
            >
              {MESES.map((m, idx) => (
                <option key={m} value={idx}>{m}</option>
              ))}
            </select>
            <select
              value={draftYear}
              onChange={(e) => setDraftYear(Number(e.target.value))}
              className="w-24 border border-moss-100 rounded-lg px-2 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-moss-300"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={goToDraft}
              className="flex-1 bg-moss-600 hover:bg-moss-700 text-white text-sm font-medium rounded-lg py-2 transition"
            >
              Ir
            </button>
            <button
              onClick={() => setOpen(false)}
              className="px-3 border border-moss-100 rounded-lg text-sm text-ink/50 hover:text-ink/80 transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}