'use client'

import { type RefObject, useEffect, useLayoutEffect, useRef } from 'react'

const PREFIX = 'career_chat_scroll:v1:'

function storageKeyFor(userId: string, sessionId?: string | null, projectId?: string | null): string {
    if (sessionId) return `${userId}:s:${sessionId}`
    if (projectId) return `${userId}:p:${projectId}`
    return `${userId}:entry`
}

/** Stable localStorage key for the thread list; null if not logged in. */
export function getChatScrollStorageKey(params: {
    userId: string | undefined
    sessionId?: string | null
    projectId?: string | null
}): string | null {
    if (!params.userId) return null
    return storageKeyFor(params.userId, params.sessionId, params.projectId)
}

function readScrollTop(fullKey: string): number | null {
    if (typeof window === 'undefined') return null
    try {
        const raw = localStorage.getItem(PREFIX + fullKey)
        if (raw == null) return null
        const n = Number(raw)
        if (!Number.isFinite(n) || n < 0) return null
        return n
    } catch {
        return null
    }
}

function writeScrollTop(fullKey: string, top: number) {
    try {
        localStorage.setItem(PREFIX + fullKey, String(Math.round(top)))
    } catch {
        /* quota / private mode */
    }
}

/**
 * After leaving dungeon (or any time the thread should resume at the latest messages):
 * scroll the lecture container to the bottom and persist that position so the next load matches.
 */
export function snapLectureThreadToBottom(
    scrollRef: RefObject<HTMLElement | null>,
    storageKey: string | null
): void {
    const run = () => {
        const el = scrollRef.current
        if (!el) return
        const top = Math.max(0, el.scrollHeight - el.clientHeight)
        el.scrollTop = top
        if (storageKey) writeScrollTop(storageKey, top)
    }
    requestAnimationFrame(() => {
        requestAnimationFrame(run)
    })
}

function scrollToBottom(el: HTMLElement) {
    el.scrollTop = Math.max(0, el.scrollHeight - el.clientHeight)
}

function applyStoredOrBottom(el: HTMLElement, storageKey: string | null) {
    if (!storageKey) {
        scrollToBottom(el)
        return
    }
    const saved = readScrollTop(storageKey)
    if (saved == null) {
        scrollToBottom(el)
        return
    }
    const max = Math.max(0, el.scrollHeight - el.clientHeight)
    el.scrollTop = Math.min(saved, max)
}

export interface UseChatScrollPersistenceOptions {
    storageKey: string | null
    messagesLength: number
    busy?: boolean
    /**
     * When true: if messages are still empty and `busy`, skip restore until load finishes
     * (avoids applying scroll before the transcript is mounted).
     */
    sessionActive?: boolean
}

/**
 * Persists vertical scroll in localStorage (debounced). On load: restore saved position, or scroll to bottom if none.
 */
export function useChatScrollPersistence(
    scrollRef: RefObject<HTMLElement | null>,
    { storageKey, messagesLength, busy = false, sessionActive = false }: UseChatScrollPersistenceOptions
) {
    const storageKeyRef = useRef<string | null>(storageKey)
    const debounceTimerRef = useRef<number | null>(null)
    /** Prevents re-applying saved position on every new message for the same thread. */
    const hydratedForKeyRef = useRef<string | null>(null)

    useEffect(() => {
        storageKeyRef.current = storageKey
    }, [storageKey])

    useLayoutEffect(() => {
        hydratedForKeyRef.current = null
    }, [storageKey])

    // Restore once per storageKey after layout; default = bottom when nothing saved
    useLayoutEffect(() => {
        if (typeof window === 'undefined' || !storageKey) return

        const deferHydration = Boolean(sessionActive && messagesLength === 0 && busy)
        if (deferHydration) return

        if (hydratedForKeyRef.current === storageKey) return

        const run = () => {
            const node = scrollRef.current
            if (!node) return
            applyStoredOrBottom(node, storageKey)
            hydratedForKeyRef.current = storageKey
        }

        requestAnimationFrame(() => {
            requestAnimationFrame(run)
        })
    }, [scrollRef, storageKey, messagesLength, busy, sessionActive])

    // Debounced save on scroll
    useEffect(() => {
        const el = scrollRef.current
        const key = storageKey
        if (!el || !key) return

        const flush = () => {
            const k = storageKeyRef.current
            const node = scrollRef.current
            if (!k || !node) return
            writeScrollTop(k, node.scrollTop)
        }

        const onScroll = () => {
            if (debounceTimerRef.current != null) window.clearTimeout(debounceTimerRef.current)
            debounceTimerRef.current = window.setTimeout(flush, 200)
        }

        el.addEventListener('scroll', onScroll, { passive: true })
        const onPageHide = () => flush()
        window.addEventListener('pagehide', onPageHide)

        return () => {
            el.removeEventListener('scroll', onScroll)
            window.removeEventListener('pagehide', onPageHide)
            if (debounceTimerRef.current != null) window.clearTimeout(debounceTimerRef.current)
            flush()
        }
    }, [scrollRef, storageKey])
}
