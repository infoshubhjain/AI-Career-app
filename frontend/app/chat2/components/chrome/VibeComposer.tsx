'use client'

import { Loader2, SendHorizontal } from 'lucide-react'

interface VibeComposerProps {
    value: string
    onChange: (v: string) => void
    onSubmit: (e: React.FormEvent) => void
    placeholder: string
    disabled: boolean
    busy: boolean
}

export function VibeComposer({ value, onChange, onSubmit, placeholder, disabled, busy }: VibeComposerProps) {
    return (
        <form onSubmit={onSubmit} className="min-w-0 max-w-full shrink-0 overflow-x-hidden border-t border-white/[0.06] bg-zinc-950/40 p-4">
            <div className="flex min-w-0 max-w-full items-end gap-2 rounded-2xl border border-white/[0.08] bg-zinc-900/50 p-1.5 pl-3 shadow-inner backdrop-blur-sm focus-within:border-teal-500/25 focus-within:ring-1 focus-within:ring-teal-500/20">
                <textarea
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    disabled={disabled || busy}
                    rows={1}
                    className="max-h-32 min-h-[44px] min-w-0 flex-1 resize-none bg-transparent py-2.5 text-[15px] leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:outline-none disabled:opacity-50"
                    onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            if (!disabled && !busy && value.trim()) onSubmit(e as unknown as React.FormEvent)
                        }
                    }}
                />
                <button
                    type="submit"
                    disabled={disabled || busy || !value.trim()}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Send"
                >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
                </button>
            </div>
        </form>
    )
}
