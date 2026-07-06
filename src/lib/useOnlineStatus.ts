import { useEffect, useState } from 'react'
import { flushQueue, pendingCount } from './offlineQueue'

export function useOnlineStatus() {
    const [online, setOnline] = useState(navigator.onLine)
    const [pending, setPending] = useState(pendingCount())
    const [syncing, setSyncing] = useState(false)

    useEffect(() => {
        async function sync() {
            setSyncing(true)
            await flushQueue()
            setPending(pendingCount())
            setSyncing(false)
        }
        function handleOnline() {
            setOnline(true)
            sync()
        }
        function handleOffline() {
            setOnline(false)
        }
        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)
        if (navigator.onLine) sync() // reintenta lo que haya quedado pendiente de la sesión anterior

        // Revisa el contador cada vez que otra parte de la app encola algo
        const interval = setInterval(() => setPending(pendingCount()), 3000)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
            clearInterval(interval)
        }
    }, [])

    return { online, pending, syncing }
}