/**
 * Cola de mutaciones pendientes para cuando la app está sin conexión.
 * Se guarda en localStorage y se reintenta automáticamente al volver la señal.
 */
import { supabase } from './supabaseClient'

export type QueuedMutation = {
    id: string
    table: string
    type: 'insert' | 'update' | 'delete'
    payload?: any
    match?: Record<string, any> // para update/delete: columnas por las que filtrar
    createdAt: number
}

const QUEUE_KEY = 'offline-mutation-queue'

function readQueue(): QueuedMutation[] {
    try {
        const raw = localStorage.getItem(QUEUE_KEY)
        return raw ? JSON.parse(raw) : []
    } catch {
        return []
    }
}

function writeQueue(queue: QueuedMutation[]) {
    try {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
    } catch {
        // localStorage lleno o no disponible: no es crítico
    }
}

export function enqueueMutation(m: Omit<QueuedMutation, 'id' | 'createdAt'>) {
    const queue = readQueue()
    queue.push({ ...m, id: crypto.randomUUID(), createdAt: Date.now() })
    writeQueue(queue)
}

/** Si ya existe un insert pendiente para ese registro, lo cancela (útil al borrar algo creado offline). */
export function cancelPendingInsert(table: string, recordId: string) {
    const queue = readQueue().filter(
        (m) => !(m.table === table && m.type === 'insert' && m.payload?.id === recordId)
    )
    writeQueue(queue)
}

export function hasPendingInsert(table: string, recordId: string): boolean {
    return readQueue().some((m) => m.table === table && m.type === 'insert' && m.payload?.id === recordId)
}

export function pendingCount(): number {
    return readQueue().length
}

/** Intenta ejecutar cada mutación pendiente contra Supabase, en orden. */
export async function flushQueue(): Promise<{ ok: number; failed: number }> {
    const queue = readQueue()
    if (queue.length === 0) return { ok: 0, failed: 0 }

    let ok = 0
    let failed = 0
    const stillPending: QueuedMutation[] = []

    for (const m of queue) {
        try {
            let error: any = null
            if (m.type === 'insert') {
                ; ({ error } = await supabase.from(m.table).insert(m.payload))
            } else if (m.type === 'update') {
                let q = supabase.from(m.table).update(m.payload)
                for (const [k, v] of Object.entries(m.match ?? {})) q = q.eq(k, v)
                    ; ({ error } = await q)
            } else if (m.type === 'delete') {
                let q = supabase.from(m.table).delete()
                for (const [k, v] of Object.entries(m.match ?? {})) q = q.eq(k, v)
                    ; ({ error } = await q)
            }
            if (error) throw error
            ok++
        } catch {
            failed++
            stillPending.push(m) // se reintenta la próxima vez que haya red
        }
    }

    writeQueue(stillPending)
    return { ok, failed }
}