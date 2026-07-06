import { useOnlineStatus } from '../lib/useOnlineStatus'

interface Props {
  active: 'presupuesto' | 'proyeccion' | 'configuracion'
  onChange: (tab: 'presupuesto' | 'proyeccion' | 'configuracion') => void
  email: string
  isAdmin: boolean
  dark: boolean
  onToggleDark: () => void
  onSignOut: () => void
}

export default function Navbar({ active, onChange, email, isAdmin, dark, onToggleDark, onSignOut }: Props) {
  const { online, pending, syncing } = useOnlineStatus()

  return (
    <header className="border-b border-moss-100/20 bg-paper/80 backdrop-blur-xl sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

        {/* LOGO SECCIÓN */}
        <div className="flex items-center gap-2.5">
          <img
            src="/icon.png"
            alt="Logo Budget App"
            className="w-6 h-6 object-contain"
          />
          <svg width="18" height="18" viewBox="0 0 28 28" fill="none" className="hidden">
            <path d="M14 2 L14 26 M14 2 L22 10 M14 2 L6 10" stroke="#2f5440" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-display text-lg text-moss-900 font-semibold">Budget App</span>

          {/* Indicador de conexión */}
          {!online && (
            <span
              className="hidden sm:flex items-center gap-1 text-[11px] text-amber-500 bg-amber-400/10 rounded-full px-2.5 py-1"
              title={pending > 0 ? `${pending} cambio(s) esperando conexión` : 'Sin conexión — viendo datos guardados'}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Sin conexión{pending > 0 ? ` · ${pending} pendiente${pending > 1 ? 's' : ''}` : ''}
            </span>
          )}
          {online && syncing && (
            <span className="hidden sm:flex items-center gap-1 text-[11px] text-moss-600">
              Sincronizando…
            </span>
          )}
        </div>

        <nav className="hidden sm:flex items-center gap-1 rounded-full p-1 bg-moss-100/20 border border-moss-100/10 backdrop-blur">
          <TabButton active={active === 'presupuesto'} onClick={() => onChange('presupuesto')}>
            Presupuesto
          </TabButton>
          <TabButton active={active === 'proyeccion'} onClick={() => onChange('proyeccion')}>
            Proyección
          </TabButton>
          <TabButton active={active === 'configuracion'} onClick={() => onChange('configuracion')}>
            Configuración
          </TabButton>
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleDark}
            aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="w-8 h-8 rounded-full flex items-center justify-center text-ink/40 hover:text-ink/70 hover:bg-moss-50 transition"
          >
            {dark ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          <span className="hidden sm:block text-xs text-ink/40 truncate max-w-[140px]">{email}</span>
          <button
            onClick={onSignOut}
            className="text-xs text-ink/50 hover:text-clay border border-moss-100 rounded-full px-3 py-1.5 transition"
          >
            Salir
          </button>
        </div>
      </div>

      {/* Indicador de conexión en móvil (debajo del header, antes de las tabs) */}
      {!online && (
        <div className="sm:hidden flex items-center justify-center gap-1 text-[11px] text-amber-500 bg-amber-400/10 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Sin conexión{pending > 0 ? ` · ${pending} pendiente${pending > 1 ? 's' : ''}` : ''}
        </div>
      )}

      <nav className="flex sm:hidden items-center gap-1 px-4 pb-3 -mt-1">
        <TabButton active={active === 'presupuesto'} onClick={() => onChange('presupuesto')}>
          Presupuesto
        </TabButton>
        <TabButton active={active === 'proyeccion'} onClick={() => onChange('proyeccion')}>
          Proyección
        </TabButton>
        <TabButton active={active === 'configuracion'} onClick={() => onChange('configuracion')}>
          Configuración
        </TabButton>
      </nav>
    </header>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`text-sm px-4 py-1.5 rounded-full transition ${active ? 'bg-white text-moss-700 shadow-sm font-medium' : 'text-ink/50 hover:text-ink/80'
        }`}
    >
      {children}
    </button>
  )
}