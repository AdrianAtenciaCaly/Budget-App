import { useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabaseClient'
import Login from './pages/Login'
import Presupuesto from './pages/Presupuesto'
import Proyeccion from './pages/Proyeccion'
import AdminCategories from './pages/AdminCategorias'
import Navbar from './components/Navbar'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [checking, setChecking] = useState(true)
  const [tab, setTab] = useState<'presupuesto' | 'proyeccion' | 'admin'>('presupuesto')
  const [isAdmin, setIsAdmin] = useState(false)
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')

  // Aplica / quita la clase dark en el html
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

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

  useEffect(() => {
    if (!session?.user?.id) { setIsAdmin(false); return }
    supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setIsAdmin(data?.is_admin ?? false))
  }, [session?.user?.id])

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center text-ink/40 text-sm">Cargando…</div>
  }

  if (!session) return <Login />

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        active={tab}
        onChange={setTab}
        email={session.user.email ?? ''}
        isAdmin={isAdmin}
        dark={dark}
        onToggleDark={() => setDark((v) => !v)}
        onSignOut={() => supabase.auth.signOut()}
      />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        {tab === 'presupuesto' && <Presupuesto userId={session.user.id} />}
        {tab === 'proyeccion' && <Proyeccion userId={session.user.id} />}
        {tab === 'admin' && isAdmin && <AdminCategories />}
      </main>
      <footer className="border-t border-moss-100/20 mt-12 py-5 text-center bg-paper/40">
        <p className="text-xs text-ink/30">
          © {new Date().getFullYear()} Adrian — A3C. All rights reserved.
        </p>
      </footer>
    </div>
  )
}