import { useState, useCallback } from 'react'

/**
 * useLocalStorage
 *
 * Hook genérico y reutilizable que sincroniza el estado de React con
 * localStorage. Sigue el principio DRY y OCP — no necesitas modificarlo
 * para soportar nuevas claves o tipos.
 *
 * @param key   - Clave de localStorage.
 * @param defaultValue - Valor inicial si no hay entrada guardada.
 */
export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw !== null ? (JSON.parse(raw) as T) : defaultValue
    } catch {
      return defaultValue
    }
  })

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState(prev => {
        const next = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value
        try {
          localStorage.setItem(key, JSON.stringify(next))
        } catch {
          // localStorage puede fallar en modo privado o cuota llena — ignoramos silenciosamente
        }
        return next
      })
    },
    [key]
  )

  return [state, setValue]
}
