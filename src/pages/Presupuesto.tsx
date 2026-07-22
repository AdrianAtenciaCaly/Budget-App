// src/pages/Presupuesto.tsx
import { useMemo, useState, useEffect } from 'react'
import { useBudgetMonth, monthKey } from '../lib/useBudgetMonth'
import MonthSelector from '../components/MonthSelector'
import HealthBar from '../components/HealthBar'
import CategoryGroup from '../components/CategoryGroup'
import { supabase } from '../lib/supabaseClient'
import { UserCategoryPref } from '../types'
import { Currency } from '../lib/currencies'
import Swal from 'sweetalert2'
import { DownloadIcon } from '../components/ui/Icons'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'


const MESES_LARGOS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export default function Presupuesto({ userId, currency }: { userId: string; currency: Currency }) {
  const [mesDate, setMesDate] = useState(new Date())
  const mes = monthKey(mesDate)
  const { budget, items, categories, loading, updateBudget, addItem, updateItem, deleteItem, copyFromMonth } =
    useBudgetMonth(userId, mes)

  const [showCopy, setShowCopy] = useState(false)
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
  }, [userId]) // recarga cuando se monta

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
    let basicos = 0, noEsenciales = 0, ahorro = 0, gastado = 0
    for (const it of items) {
      const cat = categories.find((c) => c.id === it.category_id)
      if (!cat) continue
      if (cat.tipo === 'basico') basicos += it.valor_presupuestado || 0
      else if (cat.tipo === 'no_esencial') noEsenciales += it.valor_presupuestado || 0
      else ahorro += it.valor_presupuestado || 0
      // Consolidado de lo realmente gastado: ítems marcados como pagados
      if (it.pagado) gastado += it.valor_presupuestado || 0
    }
    return { basicos, noEsenciales, ahorro, gastado }
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

  const escapeCSV = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return ''
    const str = String(val)
    if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const exportToExcel = () => {
    const nombreMes = `${MESES_LARGOS[mesDate.getMonth()]} ${mesDate.getFullYear()}`
    const rows: string[] = []

    rows.push(`PRESUPUESTO PERSONAL;${escapeCSV(nombreMes)}`)
    rows.push('')

    rows.push('RESUMEN DE INGRESOS')
    rows.push('Concepto;Monto')
    rows.push(`Ingreso Principal 1;${budget?.ingreso_1 || 0}`)
    rows.push(`Ingreso Principal 2;${budget?.ingreso_2 || 0}`)
    rows.push(`Ingresos Adicionales;${budget?.ingresos_adicionales || 0}`)
    rows.push(`Total Ingresos;${ingresos}`)
    rows.push('')

    rows.push('RESUMEN POR TIPO DE GASTO')
    rows.push('Tipo de Gasto;Monto Presupuestado')
    rows.push(`Gastos Básicos;${totales.basicos}`)
    rows.push(`Gastos No Esenciales;${totales.noEsenciales}`)
    rows.push(`Ahorro;${totales.ahorro}`)
    rows.push(`Total Gastado Real (Pagado);${totales.gastado}`)
    rows.push('')

    rows.push('DETALLE DE GASTOS')
    rows.push('Categoría;Concepto;Presupuestado;Real;Pagado')
    sortedCategories.forEach(cat => {
      const catItems = items.filter(i => i.category_id === cat.id)
      catItems.forEach(item => {
        rows.push([
          escapeCSV(cat.label),
          escapeCSV(item.concepto || '(Sin concepto)'),
          item.valor_presupuestado || 0,
          item.valor_real || 0,
          item.pagado ? 'Sí' : 'No'
        ].join(';'))
      })
    })

    if (budget?.nota) {
      rows.push('')
      rows.push('NOTAS')
      rows.push(escapeCSV(budget.nota))
    }

    const csvContent = '\uFEFF' + rows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `presupuesto_${mes}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToPDF = () => {
    const doc = new jsPDF()
    const nombreMes = `${MESES_LARGOS[mesDate.getMonth()]} ${mesDate.getFullYear()}`

    doc.setFont("helvetica", "bold")
    doc.setFontSize(18)
    doc.setTextColor(27, 94, 32)
    doc.text(`PRESUPUESTO PERSONAL`, 14, 20)
    
    doc.setFont("helvetica", "normal")
    doc.setFontSize(12)
    doc.setTextColor(80, 80, 80)
    doc.text(`Mes: ${nombreMes}`, 14, 27)

    const formatMoney = (val: number) => {
      return `${currency.symbol} ${val.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`
    }

    doc.setFont("helvetica", "bold")
    doc.setFontSize(13)
    doc.setTextColor(27, 94, 32)
    doc.text("Resumen de Ingresos", 14, 38)

    const incomeData = [
      ["Ingreso Principal 1", formatMoney(budget?.ingreso_1 || 0)],
      ["Ingreso Principal 2", formatMoney(budget?.ingreso_2 || 0)],
      ["Ingresos Adicionales", formatMoney(budget?.ingresos_adicionales || 0)],
      ["Total Ingresos", formatMoney(ingresos)]
    ]

    autoTable(doc, {
      startY: 43,
      head: [["Concepto", "Monto"]],
      body: incomeData,
      theme: 'striped',
      headStyles: { fillColor: [27, 94, 32] },
      styles: { font: 'helvetica', fontSize: 10 },
      columnStyles: {
        1: { halign: 'right' }
      }
    })

    let currentY = (doc as any).lastAutoTable.finalY + 10
    doc.setFont("helvetica", "bold")
    doc.setFontSize(13)
    doc.setTextColor(27, 94, 32)
    doc.text("Resumen por Tipo de Gasto", 14, currentY)

    const summaryData = [
      ["Gastos Básicos", formatMoney(totales.basicos)],
      ["Gastos No Esenciales", formatMoney(totales.noEsenciales)],
      ["Ahorro", formatMoney(totales.ahorro)],
      ["Total Gastado Real (Pagado)", formatMoney(totales.gastado)]
    ]

    autoTable(doc, {
      startY: currentY + 5,
      head: [["Tipo de Gasto", "Monto Presupuestado"]],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillColor: [27, 94, 32] },
      styles: { font: 'helvetica', fontSize: 10 },
      columnStyles: {
        1: { halign: 'right' }
      }
    })

    currentY = (doc as any).lastAutoTable.finalY + 10
    if (currentY > 230) {
      doc.addPage()
      currentY = 20
    }
    
    doc.setFont("helvetica", "bold")
    doc.setFontSize(13)
    doc.setTextColor(27, 94, 32)
    doc.text("Detalle de Gastos", 14, currentY)

    const expenseRows: any[] = []
    sortedCategories.forEach(cat => {
      const catItems = items.filter(i => i.category_id === cat.id)
      catItems.forEach(item => {
        expenseRows.push([
          cat.label,
          item.concepto || '(Sin concepto)',
          formatMoney(item.valor_presupuestado || 0),
          formatMoney(item.valor_real || 0),
          item.pagado ? 'Sí' : 'No'
        ])
      })
    })

    if (expenseRows.length === 0) {
      expenseRows.push(["No hay gastos registrados en este mes.", "", "", "", ""])
    }

    autoTable(doc, {
      startY: currentY + 5,
      head: [["Categoría", "Concepto", "Presupuestado", "Real", "Pagado"]],
      body: expenseRows,
      theme: 'striped',
      headStyles: { fillColor: [27, 94, 32] },
      styles: { font: 'helvetica', fontSize: 9 },
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'center' }
      }
    })

    if (budget?.nota) {
      currentY = (doc as any).lastAutoTable.finalY + 10
      if (currentY > 240) {
        doc.addPage()
        currentY = 20
      }
      doc.setFont("helvetica", "bold")
      doc.setFontSize(12)
      doc.setTextColor(27, 94, 32)
      doc.text("Notas:", 14, currentY)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
      doc.setTextColor(80, 80, 80)
      
      const splitNote = doc.splitTextToSize(budget.nota, 180)
      doc.text(splitNote, 14, currentY + 6)
    }

    doc.save(`presupuesto_${mes}.pdf`)
  }

  const handleExportClick = async () => {
    const nombreMes = `${MESES_LARGOS[mesDate.getMonth()]} ${mesDate.getFullYear()}`
    
    const result = await Swal.fire({
      title: 'Exportar Presupuesto',
      text: `Elige el formato de descarga para el mes de ${nombreMes}:`,
      icon: 'question',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Excel (CSV)',
      denyButtonText: 'PDF',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2d6a4f',
      denyButtonColor: '#7a3b3b',
      cancelButtonColor: '#9fb3a5',
      reverseButtons: false
    })

    if (result.isDismissed) {
      return
    }

    Swal.fire({
      title: 'Generando documento...',
      text: 'El presupuesto se está preparando y se descargará automáticamente.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading()
      }
    })

    setTimeout(() => {
      try {
        if (result.isConfirmed) {
          exportToExcel()
        } else if (result.isDenied) {
          exportToPDF()
        }
        Swal.close()
      } catch (error) {
        console.error(error)
        Swal.fire({
          title: 'Error',
          text: 'Hubo un problema al generar el documento.',
          icon: 'error',
          confirmButtonColor: '#7a3b3b'
        })
      }
    }, 1200)
  }

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
            onClick={() => setShowCopy((v) => !v)}
            className="text-sm border border-moss-100 hover:bg-moss-50 rounded-full px-4 py-2 transition text-ink/70"
          >
            Copiar de otro mes
          </button>
          <button
            onClick={handleExportClick}
            className="text-sm border border-moss-100 hover:bg-moss-50 rounded-full px-4 py-2 transition text-moss-700 flex items-center gap-1.5 font-medium cursor-pointer"
          >
            <DownloadIcon size={14} className="text-moss-600" />
            Exportar
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

      <HealthBar
        ingresos={ingresos}
        basicos={totales.basicos}
        noEsenciales={totales.noEsenciales}
        ahorro={totales.ahorro}
        gastado={totales.gastado}
        currency={currency}
      />


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
              currency={currency}
            />
          ))}
        </div>
      </div>

    </div>

  )
}