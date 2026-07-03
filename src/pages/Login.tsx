import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

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
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error

        if (data.user && !data.session) {
          setInfo('Te enviamos un correo de confirmación. Revísalo para activar tu cuenta.')
        } else if (data.user && data.session) {
          setInfo('¡Cuenta creada con éxito!')
        }
      }
    } catch (err: any) {
      const msg: string = err.message ?? ''
      if (
        msg.toLowerCase().includes('already registered') ||
        msg.toLowerCase().includes('user already exists')
      ) {
        setError('Este correo ya está registrado. Intenta iniciar sesión.')
      } else {
        setError(msg || 'Ocurrió un error.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError(null)
    setGoogleLoading(true)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })

    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* HEADER */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path
                d="M14 2 L14 26 M14 2 L22 10 M14 2 L6 10"
                stroke="#2f5440"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="font-display text-2xl tracking-tight text-moss-900">
              Budget App
            </span>
          </div>
          <p className="text-sm text-ink/60">
            Tu presupuesto, mes a mes — donde sea que estés.
          </p>
        </div>

        {/* CARD */}
        <div className="bg-white/70 border border-moss-100 rounded-2xl p-7 shadow-sm space-y-5">

          <div>
            <h1 className="font-display text-xl mb-1 text-ink">
              {mode === 'signin' ? 'Inicia sesión' : 'Crea tu cuenta'}
            </h1>
            <p className="text-sm text-ink/50">
              {mode === 'signin'
                ? 'Tu información te espera, guardada en la nube.'
                : 'Toma 30 segundos. Tus datos quedan solo para ti.'}
            </p>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="block text-xs font-medium text-ink/60 mb-1.5">
                Correo
              </label>
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
              <label className="block text-xs font-medium text-ink/60 mb-1.5">
                Contraseña
              </label>

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
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30 hover:text-ink/60"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-wine bg-wine/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {info && (
              <p className="text-sm text-moss-700 bg-moss-50 rounded-lg px-3 py-2">
                {info}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-moss-600 hover:bg-moss-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg py-2.5 transition"
            >
              {loading ? 'Un momento…' : mode === 'signin' ? 'Entrar' : 'Crear cuenta'}
            </button>
          </form>

          {/* GOOGLE BUTTON (ABAJO + SOLO ICONO) */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full flex items-center justify-center border border-moss-100 hover:bg-moss-50 disabled:opacity-60 rounded-lg py-2.5 transition"
            aria-label="Continuar con Google"
          >
            {googleLoading ? (
              <span className="text-ink/40 text-sm">...</span>
            ) : (
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
            )}
          </button>

          {/* SWITCH MODE */}
          <button
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin')
              setError(null)
              setInfo(null)
            }}
            className="w-full text-center text-xs text-ink/50 hover:text-moss-600 transition"
          >
            {mode === 'signin'
              ? '¿No tienes cuenta? Crea una'
              : '¿Ya tienes cuenta? Inicia sesión'}
          </button>

        </div>
      </div>
    </div>
  )
}