import { useState } from 'react'
import { Category, ExpenseItem } from '../types'
import { Currency } from '../lib/currencies'
import { TrashIcon } from './ui/Icons'

interface ExpenseItemRowProps {
  item: ExpenseItem
  currency: Currency
  onUpdate: (id: string, patch: Partial<ExpenseItem>) => void
  onDelete: (id: string) => void
}

function ExpenseItemRow({ item, currency, onUpdate, onDelete }: ExpenseItemRowProps) {
  const [startX, setStartX] = useState(0)
  const [startY, setStartY] = useState(0)
  const [offsetX, setOffsetX] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX)
    setStartY(e.touches[0].clientY)
    setIsSwiping(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return
    const currentTouchX = e.touches[0].clientX
    const currentTouchY = e.touches[0].clientY

    const diffX = currentTouchX - startX
    const diffY = currentTouchY - startY

    // Si el movimiento vertical es mayor, asumimos que está haciendo scroll y cancelamos
    if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 10) {
      setIsSwiping(false)
      return
    }

    // Calcular el nuevo offset
    let newOffset = diffX + (isOpen ? -72 : 0)

    // Limitar el deslizamiento (solo hacia la izquierda, no a la derecha de 0)
    if (newOffset > 0) newOffset = 0
    if (newOffset < -110) {
      // Efecto resistencia
      newOffset = -110 + (newOffset + 110) * 0.2
    }

    setOffsetX(newOffset)
  }

  const handleTouchEnd = () => {
    setIsSwiping(false)
    if (offsetX < -36) {
      setIsOpen(true)
      setOffsetX(-72)
    } else {
      setIsOpen(false)
      setOffsetX(0)
    }
  }

  const handleRowClick = () => {
    if (isOpen) {
      setIsOpen(false)
      setOffsetX(0)
    }
  }

  return (
    <div className="relative overflow-hidden w-full select-none">
      {/* Botón rojo detrás para deslizar en móviles */}
      <button
        onClick={() => onDelete(item.id)}
        className="absolute right-0 top-0 bottom-0 w-[72px] bg-wine text-white flex flex-col items-center justify-center gap-0.5 hover:bg-wine/90 active:bg-wine/85 transition-colors z-0"
        style={{
          opacity: offsetX < -10 ? 1 : 0,
          transition: 'opacity 0.15s ease-out'
        }}
      >
        <TrashIcon size={16} className="text-white" />
        <span className="text-[10px] font-medium tracking-wide">Eliminar</span>
      </button>

      {/* Fila visible */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleRowClick}
        className={`group flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 px-4 py-2.5 bg-white transition-transform relative z-10 w-full ${
          item.pagado ? 'bg-moss-50/30' : ''
        }`}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Checkbox pagado */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onUpdate(item.id, { pagado: !item.pagado })
          }}
          title={item.pagado ? 'Marcar como pendiente' : 'Marcar como pagado'}
          className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
            item.pagado ? 'bg-moss-600 border-moss-600' : 'border-moss-200 hover:border-moss-400'
          }`}
        >
          {item.pagado && (
            <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Concepto */}
        <input
          value={item.concepto}
          onChange={(e) => onUpdate(item.id, { concepto: e.target.value })}
          placeholder="Concepto"
          className={`flex-1 w-full sm:w-auto bg-transparent text-sm outline-none placeholder:text-ink/30 transition ${
            item.pagado ? 'line-through text-ink/40' : ''
          }`}
        />

        {/* Badge estado */}
        <span
          className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium mb-1 sm:mb-0 ${
            item.pagado ? 'bg-moss-100 text-moss-700' : 'bg-amber-400/15 text-amber-500'
          }`}
        >
          {item.pagado ? 'Pagado' : 'Pendiente'}
        </span>

        {/* Valor */}
        <div className="flex items-center gap-0.5 w-full sm:w-auto">
          <span className="text-xs text-ink/30">{currency.symbol}</span>
          <input
            type="number"
            value={item.valor_presupuestado || ''}
            onChange={(e) => onUpdate(item.id, { valor_presupuestado: Number(e.target.value) || 0 })}
            placeholder="0"
            className="flex-1 w-full sm:max-w-[6rem] sm:w-auto bg-transparent text-sm font-mono text-right outline-none"
          />
        </div>

        {/* Eliminar (Escritorio - visible en hover) */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(item.id)
          }}
          className="flex text-ink/30 hover:text-wine transition p-1.5 rounded-lg hover:bg-wine/10 items-center justify-center flex-shrink-0 opacity-100"
          title="Eliminar gasto"
        >
          <TrashIcon size={14} />
        </button>
      </div>
    </div>
  )
}


interface Props {
  category: Category
  items: ExpenseItem[]
  onAdd: () => void
  onUpdate: (id: string, patch: Partial<ExpenseItem>) => void
  onDelete: (id: string) => void
  currency: Currency
}

export default function CategoryGroup({ category, items, onAdd, onUpdate, onDelete, currency }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const totalPresupuestado = items.reduce((s, i) => s + (i.valor_presupuestado || 0), 0)
  const pagados = items.filter((i) => i.pagado).length
  const fmt = (n: number) => n.toLocaleString(currency.locale)

  return (
    <div className="border border-moss-100 rounded-xl bg-white/60 overflow-hidden">
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-moss-50/60 hover:bg-moss-50 transition text-left"
      >
        <div className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
            className={`text-ink/30 transition-transform ${collapsed ? '-rotate-90' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          <span className="font-display text-base text-ink">{category.label}</span>
          <span className="text-[10px] uppercase tracking-wide text-ink/40 px-1.5 py-0.5 border border-moss-200 rounded-full">
            {category.tipo === 'basico' ? 'Básico' : category.tipo === 'ahorro' ? 'Ahorro' : 'No esencial'}
          </span>
          {items.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${pagados === items.length
                ? 'bg-moss-100 text-moss-700'
                : pagados > 0
                  ? 'bg-amber-400/20 text-amber-500'
                  : 'bg-ink/5 text-ink/40'
              }`}>
              {pagados}/{items.length}
            </span>
          )}
        </div>
        <div className="font-mono text-sm text-ink/70">{currency.symbol}{fmt(totalPresupuestado)}</div>
      </button>

      {!collapsed && (
        <>
          <div className="divide-y divide-moss-100/70">
            {items.map((item) => (
              <ExpenseItemRow
                key={item.id}
                item={item}
                currency={currency}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            ))}
            {items.length === 0 && (
              <p className="px-4 py-3 text-xs text-ink/30">Sin movimientos todavía.</p>
            )}
          </div>
          <button
            onClick={onAdd}
            className="w-full text-left px-4 py-2 text-xs text-moss-600 hover:bg-moss-50 transition"
          >
            + Añadir otro
          </button>
        </>
      )}
    </div>
  )
}