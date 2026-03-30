'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Play, RotateCcw, ChevronDown, ChevronUp, Terminal, Loader2, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

// Lazy-load Monaco to avoid SSR issues and keep initial bundle small
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false, loading: () => (
    <div className="flex items-center justify-center h-full bg-[#0c0f14] text-neutral-500 text-sm gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading editor…
    </div>
) })

// ── Supported languages ──────────────────────────────────────────────────────

type SupportedLang = 'javascript' | 'typescript' | 'python' | 'html' | 'css'

const LANG_LABELS: Record<SupportedLang, string> = {
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    python: 'Python',
    html: 'HTML',
    css: 'CSS',
}

const RUNNABLE_LANGS: SupportedLang[] = ['javascript', 'typescript', 'python', 'html']

function isRunnable(lang: string): lang is SupportedLang {
    return RUNNABLE_LANGS.includes(lang as SupportedLang)
}

// ── JavaScript / TypeScript execution ────────────────────────────────────────

function runJavaScript(code: string): { output: string; error: string | null } {
    const logs: string[] = []
    const errors: string[] = []

    // Sandboxed console
    const fakeConsole = {
        log: (...args: unknown[]) => logs.push(args.map(a => formatValue(a)).join(' ')),
        error: (...args: unknown[]) => errors.push(args.map(a => formatValue(a)).join(' ')),
        warn: (...args: unknown[]) => logs.push('⚠ ' + args.map(a => formatValue(a)).join(' ')),
        info: (...args: unknown[]) => logs.push('ℹ ' + args.map(a => formatValue(a)).join(' ')),
        table: (data: unknown) => logs.push(formatValue(data)),
    }

    try {
        // eslint-disable-next-line no-new-func
        const fn = new Function('console', code)
        fn(fakeConsole)
    } catch (e) {
        return { output: logs.join('\n'), error: String(e) }
    }

    if (errors.length > 0) return { output: logs.join('\n'), error: errors.join('\n') }
    return { output: logs.join('\n') || '(no output)', error: null }
}

function formatValue(v: unknown): string {
    if (v === null) return 'null'
    if (v === undefined) return 'undefined'
    if (typeof v === 'string') return v
    if (typeof v === 'object') {
        try { return JSON.stringify(v, null, 2) } catch { return String(v) }
    }
    return String(v)
}

// ── Python via Pyodide ────────────────────────────────────────────────────────

declare global {
    interface Window {
        pyodide?: {
            runPythonAsync: (code: string) => Promise<unknown>
            loadPackagesFromImports: (code: string) => Promise<void>
        }
        loadPyodide?: (opts: { indexURL: string }) => Promise<Window['pyodide']>
        _pyodideLoading?: Promise<void>
    }
}

async function ensurePyodide(): Promise<void> {
    if (window.pyodide) return
    if (window._pyodideLoading) return window._pyodideLoading

    window._pyodideLoading = (async () => {
        if (!document.querySelector('script[src*="pyodide"]')) {
            await new Promise<void>((resolve, reject) => {
                const s = document.createElement('script')
                s.src = 'https://cdn.jsdelivr.net/pyodide/v0.27.3/full/pyodide.js'
                s.onload = () => resolve()
                s.onerror = () => reject(new Error('Failed to load Pyodide'))
                document.head.appendChild(s)
            })
        }
        window.pyodide = await window.loadPyodide!({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.3/full/' })
    })()

    return window._pyodideLoading
}

async function runPython(code: string): Promise<{ output: string; error: string | null }> {
    await ensurePyodide()
    const py = window.pyodide!

    // Redirect stdout/stderr
    const wrapper = `
import sys
from io import StringIO
_stdout = StringIO()
_stderr = StringIO()
sys.stdout = _stdout
sys.stderr = _stderr
try:
${code.split('\n').map(l => '    ' + l).join('\n')}
except Exception as _e:
    _stderr.write(str(_e))
finally:
    sys.stdout = sys.__stdout__
    sys.stderr = sys.__stderr__
_stdout_val = _stdout.getvalue()
_stderr_val = _stderr.getvalue()
`
    try {
        await py.loadPackagesFromImports(code)
        await py.runPythonAsync(wrapper)
        const out = await py.runPythonAsync('_stdout_val') as string
        const err = await py.runPythonAsync('_stderr_val') as string
        return { output: out || '(no output)', error: err || null }
    } catch (e) {
        return { output: '', error: String(e) }
    }
}

// ── HTML preview ─────────────────────────────────────────────────────────────

function HTMLPreview({ code }: { code: string }) {
    return (
        <iframe
            srcDoc={code}
            sandbox="allow-scripts"
            className="w-full bg-white rounded-b-xl"
            style={{ height: 200, border: 'none' }}
            title="HTML Preview"
        />
    )
}

// ── Main component ────────────────────────────────────────────────────────────

interface CodePlaygroundProps {
    initialCode: string
    language: string
}

export function CodePlayground({ initialCode, language }: CodePlaygroundProps) {
    const lang = language as SupportedLang
    const [code, setCode] = useState(initialCode.trim())
    const [output, setOutput] = useState<string | null>(null)
    const [runError, setRunError] = useState<string | null>(null)
    const [running, setRunning] = useState(false)
    const [pyodideLoading, setPyodideLoading] = useState(false)
    const [outputOpen, setOutputOpen] = useState(false)
    const [copied, setCopied] = useState(false)
    const abortRef = useRef(false)

    // Pre-warm Pyodide in the background when a Python block mounts
    useEffect(() => {
        if (lang === 'python') {
            setPyodideLoading(true)
            ensurePyodide().finally(() => setPyodideLoading(false))
        }
    }, [lang])

    async function handleRun() {
        if (running) return
        abortRef.current = false
        setRunning(true)
        setOutput(null)
        setRunError(null)
        setOutputOpen(true)

        try {
            let result: { output: string; error: string | null }

            if (lang === 'python') {
                result = await runPython(code)
            } else if (lang === 'javascript' || lang === 'typescript') {
                result = runJavaScript(code)
            } else {
                result = { output: '', error: null } // HTML handled via preview
            }

            if (!abortRef.current) {
                setOutput(result.output)
                setRunError(result.error)
            }
        } catch (e) {
            if (!abortRef.current) setRunError(String(e))
        } finally {
            if (!abortRef.current) setRunning(false)
        }
    }

    function handleReset() {
        abortRef.current = true
        setCode(initialCode.trim())
        setOutput(null)
        setRunError(null)
        setRunning(false)
        setOutputOpen(false)
    }

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(code)
            setCopied(true)
            setTimeout(() => setCopied(false), 1400)
        } catch { /* ignore */ }
    }

    const canRun = isRunnable(lang)
    const isHTML = lang === 'html'
    const label = LANG_LABELS[lang] ?? lang

    return (
        <div className="mt-4 overflow-hidden rounded-2xl border border-[color:var(--line)] bg-[#0c0f14] shadow-lg">
            {/* ── Toolbar ── */}
            <div className="flex items-center justify-between border-b border-[color:var(--line)] px-4 py-2">
                <div className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-neutral-500" />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                        {label} Playground
                    </span>
                    {lang === 'python' && pyodideLoading && (
                        <span className="flex items-center gap-1 text-[10px] text-neutral-500">
                            <Loader2 className="w-3 h-3 animate-spin" /> Loading Python…
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={handleCopy}
                        className="rounded-full border border-[color:var(--line)] px-2.5 py-1 text-[10px] font-semibold tracking-wide text-neutral-400 hover:text-neutral-200 hover:border-neutral-500 transition-colors flex items-center gap-1"
                    >
                        {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                    </button>
                    <button
                        onClick={handleReset}
                        className="rounded-full border border-[color:var(--line)] p-1.5 text-neutral-400 hover:text-neutral-200 hover:border-neutral-500 transition-colors"
                        title="Reset to original"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    {canRun && (
                        <button
                            onClick={handleRun}
                            disabled={running || (lang === 'python' && pyodideLoading)}
                            className={cn(
                                'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all',
                                running || (lang === 'python' && pyodideLoading)
                                    ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 shadow-sm shadow-emerald-900/40'
                            )}
                        >
                            {running
                                ? <><Loader2 className="w-3 h-3 animate-spin" /> Running…</>
                                : <><Play className="w-3 h-3 fill-current" /> Run</>
                            }
                        </button>
                    )}
                </div>
            </div>

            {/* ── Monaco Editor ── */}
            <div style={{ height: Math.min(Math.max(code.split('\n').length * 20 + 24, 80), 320) }}>
                <MonacoEditor
                    language={lang === 'typescript' ? 'typescript' : lang}
                    value={code}
                    onChange={v => setCode(v ?? '')}
                    theme="vs-dark"
                    options={{
                        fontSize: 13,
                        fontFamily: '"Fira Code", "Cascadia Code", monospace',
                        fontLigatures: true,
                        lineNumbers: 'on',
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        wordWrap: 'on',
                        padding: { top: 12, bottom: 12 },
                        renderLineHighlight: 'line',
                        overviewRulerLanes: 0,
                        hideCursorInOverviewRuler: true,
                        scrollbar: { vertical: 'hidden', horizontal: 'hidden' },
                        automaticLayout: true,
                        tabSize: 2,
                        bracketPairColorization: { enabled: true },
                    }}
                />
            </div>

            {/* ── HTML live preview (always shown for HTML) ── */}
            {isHTML && <HTMLPreview code={code} />}

            {/* ── Output panel ── */}
            {canRun && !isHTML && (output !== null || runError !== null) && (
                <div className="border-t border-[color:var(--line)]">
                    <button
                        onClick={() => setOutputOpen(v => !v)}
                        className="w-full flex items-center justify-between px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 hover:text-neutral-200 transition-colors"
                    >
                        <span className="flex items-center gap-1.5">
                            <Terminal className="w-3.5 h-3.5" />
                            Output
                            {runError && <span className="ml-1 text-red-400">· Error</span>}
                        </span>
                        {outputOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    {outputOpen && (
                        <div className="px-4 pb-4">
                            {runError && (
                                <pre className="mb-2 rounded-lg bg-red-950/40 border border-red-800/40 px-3 py-2 text-xs text-red-300 whitespace-pre-wrap font-mono">
                                    {runError}
                                </pre>
                            )}
                            {output && output !== '(no output)' && (
                                <pre className="rounded-lg bg-neutral-900 border border-neutral-800 px-3 py-2 text-xs text-emerald-300 whitespace-pre-wrap font-mono">
                                    {output}
                                </pre>
                            )}
                            {output === '(no output)' && !runError && (
                                <p className="text-[11px] text-neutral-500 italic">(no output)</p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
