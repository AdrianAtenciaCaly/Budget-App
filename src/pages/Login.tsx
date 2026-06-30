import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setInfo('Cuenta creada. Revisa tu correo para confirmar (si tu proyecto lo exige) e inicia sesión.')
      }
    } catch (err: any) {
      setError(err.message ?? 'Ocurrió un error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 2 L14 26 M14 2 L22 10 M14 2 L6 10" stroke="#2f5440" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="font-display text-2xl tracking-tight text-moss-900">Budget App</span>
          </div>
          <p className="text-sm text-ink/60">Tu presupuesto, mes a mes — donde sea que estés.</p>
        </div>

        <div className="bg-white/70 border border-moss-100 rounded-2xl p-7 shadow-sm">
          <h1 className="font-display text-xl mb-1 text-ink">
            {mode === 'signin' ? 'Inicia sesión' : 'Crea tu cuenta'}
          </h1>
          <p className="text-sm text-ink/50 mb-6">
            {mode === 'signin' ? 'Tu información te espera, guardada en la nube.' : 'Toma 30 segundos. Tus datos quedan solo para ti.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink/60 mb-1.5">Correo</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-moss-100 bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-moss-300 transition"
                placeholder="tucorreo@ejemplo.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink/60 mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-moss-100 bg-white px-3.5 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-moss-300 transition"
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30 hover:text-ink/60 transition"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-wine bg-wine/10 rounded-lg px-3 py-2">{error}</p>
            )}
            {info && (
              <p className="text-sm text-moss-700 bg-moss-50 rounded-lg px-3 py-2">{info}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-moss-600 hover:bg-moss-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg py-2.5 transition"
            >
              {loading ? 'Un momento…' : mode === 'signin' ? 'Entrar' : 'Crear cuenta'}
            </button>
          </form>

          <button
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin')
              setError(null)
              setInfo(null)
            }}
            className="w-full text-center text-xs text-ink/50 hover:text-moss-600 mt-5 transition"
          >
            {mode === 'signin' ? '¿No tienes cuenta? Crea una' : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </div>
      </div>
    </div>
  )
}