interface Props {
  active: 'presupuesto' | 'proyeccion' | 'admin'
  onChange: (tab: 'presupuesto' | 'proyeccion' | 'admin') => void
  email: string
  isAdmin: boolean
  onSignOut: () => void
}

export default function Navbar({ active, onChange, email, isAdmin, onSignOut }: Props) {
  return (
    <header className="border-b border-moss-100 bg-paper/90 backdrop-blur sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
            <path d="M14 2 L14 26 M14 2 L22 10 M14 2 L6 10" stroke="#2f5440" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="font-display text-lg text-moss-900">Budget App</span>
        </div>

        <nav className="hidden sm:flex items-center gap-1 bg-moss-50/70 rounded-full p-1">
          <TabButton active={active === 'presupuesto'} onClick={() => onChange('presupuesto')}>
            Presupuesto
          </TabButton>
          <TabButton active={active === 'proyeccion'} onClick={() => onChange('proyeccion')}>
            Proyección
          </TabButton>
          {isAdmin && (
            <TabButton active={active === 'admin'} onClick={() => onChange('admin')}>
              ⚙ Categorías
            </TabButton>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-xs text-ink/40 truncate max-w-[140px]">{email}</span>
          <button
            onClick={onSignOut}
            className="text-xs text-ink/50 hover:text-clay border border-moss-100 rounded-full px-3 py-1.5 transition"
          >
            Salir
          </button>
        </div>
      </div>

      <nav className="flex sm:hidden items-center gap-1 px-4 pb-3 -mt-1">
        <TabButton active={active === 'presupuesto'} onClick={() => onChange('presupuesto')}>
          Presupuesto
        </TabButton>
        <TabButton active={active === 'proyeccion'} onClick={() => onChange('proyeccion')}>
          Proyección
        </TabButton>
        {isAdmin && (
          <TabButton active={active === 'admin'} onClick={() => onChange('admin')}>
            ⚙ Categorías
          </TabButton>
        )}
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
      className={`text-sm px-4 py-1.5 rounded-full transition ${
        active ? 'bg-white text-moss-700 shadow-sm font-medium' : 'text-ink/50 hover:text-ink/80'
      }`}
    >
      {children}
    </button>
  )
}