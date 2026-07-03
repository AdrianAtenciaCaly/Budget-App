/**
 * TabButton.tsx
 *
 * Componente reutilizable de tab button con soporte para variantes de tamaño.
 * Unifica las implementaciones duplicadas de Navbar.tsx y Configuracion.tsx.
 */

interface TabButtonProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  /** 'sm' for compact tabs (Configuracion), 'md' for standard tabs (Navbar) */
  variant?: 'sm' | 'md'
}

export default function TabButton({ active, onClick, children, variant = 'md' }: TabButtonProps) {
  const sizeClasses = variant === 'sm'
    ? 'flex items-center gap-2 text-xs sm:text-sm px-4 py-2'
    : 'text-sm px-4 py-1.5'

  return (
    <button
      onClick={onClick}
      className={`${sizeClasses} rounded-full transition font-medium ${
        active
          ? 'bg-white text-moss-700 shadow-sm'
          : 'text-ink/50 hover:text-ink/80'
      }`}
    >
      {children}
    </button>
  )
}
