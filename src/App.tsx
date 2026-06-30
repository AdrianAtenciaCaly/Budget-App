import { useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabaseClient'
import Login from './pages/Login'
import Presupuesto from './pages/Presupuesto'
import Proyeccion from './pages/Proyeccion'
import Navbar from './components/Navbar'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [checking, setChecking] = useState(true)
  const [tab, setTab] = useState<'presupuesto' | 'proyeccion'>('presupuesto')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChecking(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center text-ink/40 text-sm">Cargando…</div>
  }

  if (!session) {
    return <Login />
  }

  return (
    <div className="min-h-screen">
      <Navbar
        active={tab}
        onChange={setTab}
        email={session.user.email ?? ''}
        onSignOut={() => supabase.auth.signOut()}
      />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {tab === 'presupuesto' ? (
          <Presupuesto userId={session.user.id} />
        ) : (
          <Proyeccion userId={session.user.id} />
        )}
      </main>
    </div>
  )
}
