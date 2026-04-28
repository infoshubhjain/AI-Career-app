import type { ReactNode } from 'react'

/**
 * Locks /chat2 to the viewport: no page-level scroll; inner regions (e.g. message list) scroll instead.
 */
export default function Chat2Layout({ children }: { children: ReactNode }) {
    return (
        <div className="h-dvh max-h-dvh w-full max-w-[100vw] overflow-x-hidden overflow-y-hidden overscroll-none">
            {children}
        </div>
    )
}
