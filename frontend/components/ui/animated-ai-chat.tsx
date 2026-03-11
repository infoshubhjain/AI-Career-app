'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UseAutoResizeTextareaProps {
    minHeight: number
    maxHeight?: number
}

function useAutoResizeTextarea({ minHeight, maxHeight }: UseAutoResizeTextareaProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const adjustHeight = useCallback(
        (reset?: boolean) => {
            const textarea = textareaRef.current
            if (!textarea) return
            if (reset) {
                textarea.style.height = `${minHeight}px`
                return
            }
            textarea.style.height = `${minHeight}px`
            const newHeight = maxHeight
                ? Math.min(textarea.scrollHeight, maxHeight)
                : textarea.scrollHeight
            textarea.style.height = `${newHeight}px`
        },
        [minHeight, maxHeight]
    )

    useEffect(() => {
        const textarea = textareaRef.current
        if (textarea) textarea.style.height = `${minHeight}px`
    }, [minHeight])

    useEffect(() => {
        const handleResize = () => adjustHeight()
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [adjustHeight])

    return { textareaRef, adjustHeight }
}

interface AnimatedAIChatInputProps {
    value: string
    onChange: (value: string) => void
    onSubmit: (e: React.FormEvent) => void
    placeholder?: string
    disabled?: boolean
    busy?: boolean
    className?: string
}

export function AnimatedAIChatInput({
    value,
    onChange,
    onSubmit,
    placeholder = 'Message your AI tutor…',
    disabled = false,
    busy = false,
    className,
}: AnimatedAIChatInputProps) {
    const [isFocused, setIsFocused] = useState(false)
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
    const containerRef = useRef<HTMLDivElement>(null)

    const { textareaRef, adjustHeight } = useAutoResizeTextarea({
        minHeight: 56,
        maxHeight: 200,
    })

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }, [])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            if (!value.trim() || disabled || busy) return
            onSubmit(e as unknown as React.FormEvent)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value)
        adjustHeight()
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!value.trim() || disabled || busy) return
        onSubmit(e)
        adjustHeight(true)
    }

    return (
        <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            className={cn('relative w-full', className)}
        >
            {/* Gradient glow that follows mouse when focused */}
            <AnimatePresence>
                {isFocused && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden z-0"
                    >
                        <div
                            className="absolute w-48 h-48 rounded-full bg-blue-500/20 blur-2xl transition-all duration-300 ease-out"
                            style={{
                                left: mousePosition.x - 96,
                                top: mousePosition.y - 96,
                            }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <form
                onSubmit={handleSubmit}
                className={cn(
                    'relative z-10 flex items-end gap-3 rounded-2xl border px-4 py-3 transition-all duration-200',
                    'bg-neutral-50 dark:bg-neutral-800/80',
                    isFocused
                        ? 'border-blue-500/60 ring-2 ring-blue-500/20 shadow-lg shadow-blue-500/10'
                        : 'border-neutral-200 dark:border-neutral-700 shadow-sm'
                )}
            >
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder={placeholder}
                    disabled={disabled || busy}
                    rows={1}
                    className={cn(
                        'flex-1 resize-none bg-transparent text-sm leading-relaxed',
                        'text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500',
                        'focus:outline-none disabled:opacity-50',
                        'min-h-[32px] max-h-[200px] overflow-y-auto'
                    )}
                />

                {/* Send button */}
                <motion.button
                    type="submit"
                    disabled={!value.trim() || disabled || busy}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                        'flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200',
                        value.trim() && !disabled && !busy
                            ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-md shadow-blue-500/25 hover:shadow-blue-500/40'
                            : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
                    )}
                >
                    <AnimatePresence mode="wait">
                        {busy ? (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0, scale: 0.7 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.7 }}
                            >
                                <Loader2 className="w-4 h-4 animate-spin" />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="send"
                                initial={{ opacity: 0, scale: 0.7 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.7 }}
                            >
                                <Send className="w-4 h-4" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.button>
            </form>
        </div>
    )
}
