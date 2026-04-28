'use client'

import { useState } from 'react'
import Prism from 'prismjs'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { CodePlayground } from './CodePlayground'

const PLAYGROUND_LANGS = new Set(['javascript', 'typescript', 'python', 'html', 'js', 'ts', 'py'])

import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-c'
import 'prismjs/components/prism-cpp'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-rust'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-yaml'

interface MarkdownRendererProps {
    content: string
    variant?: 'default' | 'compact'
    size?: 'sm' | 'md' | 'lg'
}

function CodeBlock({
    raw,
    html,
    language,
}: {
    raw: string
    html: string
    language: string
}) {
    const [copied, setCopied] = useState(false)
    const labelMap: Record<string, string> = {
        javascript: 'JavaScript',
        typescript: 'TypeScript',
        json: 'JSON',
        yaml: 'YAML',
        yml: 'YAML',
        bash: 'Bash',
        html: 'HTML',
        css: 'CSS',
        sql: 'SQL',
        c: 'C',
        cpp: 'C++',
    }
    const displayLanguage = labelMap[language] || (language ? language.charAt(0).toUpperCase() + language.slice(1) : 'Text')

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(raw)
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1400)
        } catch (error) {
            console.error('Failed to copy code block', error)
        }
    }

    return (
        <div className="mt-4 overflow-hidden rounded-2xl border border-[color:var(--line)] bg-[#0c0f14] text-[#e6e1d6]">
            <div className="flex items-center justify-between border-b border-[color:var(--line)] px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
                <span>{displayLanguage}</span>
                <button
                    type="button"
                    onClick={handleCopy}
                    className="rounded-full border border-[color:var(--line)] px-3 py-1 text-[10px] font-semibold tracking-[0.16em] text-[color:var(--ink-soft)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--ink)]"
                >
                    {copied ? 'Copied' : 'Copy'}
                </button>
            </div>
            <pre className="overflow-x-auto p-4 text-[13px]">
                <code className={`language-${language}`} dangerouslySetInnerHTML={{ __html: html }} />
            </pre>
        </div>
    )
}

function P5Simulation({ code }: { code: string }) {
    const srcDoc = `
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.js"></script>
  <style> body { margin: 0; display: flex; justify-content: center; align-items: center; background: #0c0f14; overflow: hidden; } canvas { border-radius: 8px; max-width: 100%; height: auto; } </style>
</head>
<body>
  <script>
    try {
      ${code}
    } catch (e) {
      console.error(e);
      document.body.innerHTML = '<div style="color: red; font-family: sans-serif; padding: 20px;">Error running p5.js sketch. Check console or code.</div>';
    }
  </script>
</body>
</html>
    `
    return (
        <div className="mt-4 flex flex-col overflow-hidden rounded-2xl border border-[color:var(--line)] bg-[#0c0f14]">
            <div className="flex items-center justify-between border-b border-[color:var(--line)] px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
                <span>p5.js Simulation</span>
            </div>
            <div className="p-4 flex justify-center">
                <iframe
                    title="p5.js simulation"
                    srcDoc={srcDoc}
                    sandbox="allow-scripts"
                    scrolling="no"
                    className="h-[400px] w-full border-none bg-transparent"
                />
            </div>
        </div>
    )
}

function preprocessLaTeX(content: string) {
    // Replace block math \[ ... \] with $$ ... $$
    const blockMathRegex = /\\\[([\s\S]*?)\\\]/g
    let processed = content.replace(blockMathRegex, (_, match) => `$$${match}$$`)

    // Replace inline math \( ... \) with $ ... $
    const inlineMathRegex = /\\\(([\s\S]*?)\\\)/g
    processed = processed.replace(inlineMathRegex, (_, match) => `$${match}$`)

    return processed
}

export function MarkdownRenderer({ content, variant = 'default', size = 'md' }: MarkdownRendererProps) {
    if (!content) return null
    const compact = variant === 'compact'
    const baseText = size === 'lg' ? 'text-lg' : size === 'sm' ? 'text-sm' : 'text-[15px]'
    const compactText = size === 'lg' ? 'text-base' : size === 'sm' ? 'text-[13px]' : 'text-sm'
    const paragraphText = compact ? compactText : baseText
    const processedContent = preprocessLaTeX(content)

    return (
        <div className="markdown-body">
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                h1: ({ children }) => (
                    <h1
                        className={`${compact ? 'mt-2 text-2xl' : size === 'lg' ? 'mt-6 text-4xl' : 'mt-6 text-3xl'} font-semibold tracking-tight text-[color:var(--ink)]`}
                    >
                        {children}
                    </h1>
                ),
                h2: ({ children }) => (
                    <h2
                        className={`${compact ? 'mt-2 text-xl' : size === 'lg' ? 'mt-6 text-3xl' : 'mt-6 text-2xl'} font-semibold tracking-tight text-[color:var(--ink)]`}
                    >
                        {children}
                    </h2>
                ),
                h3: ({ children }) => (
                    <h3
                        className={`${compact ? 'mt-2 text-lg' : size === 'lg' ? 'mt-5 text-2xl' : 'mt-5 text-xl'} font-semibold tracking-tight text-[color:var(--ink)]`}
                    >
                        {children}
                    </h3>
                ),
                h4: ({ children }) => (
                    <h4 className={`${compact ? 'mt-2 text-base' : 'mt-4 text-lg'} font-semibold text-[color:var(--ink)]`}>
                        {children}
                    </h4>
                ),
                h5: ({ children }) => (
                    <h5 className={`${compact ? 'mt-2 text-sm' : 'mt-4 text-base'} font-semibold text-[color:var(--ink)]`}>
                        {children}
                    </h5>
                ),
                h6: ({ children }) => (
                    <h6 className={`${compact ? 'mt-2 text-[11px]' : 'mt-4 text-sm'} font-semibold uppercase tracking-[0.18em] text-[color:var(--ink-faint)]`}>
                        {children}
                    </h6>
                ),
                p: ({ children }) => <p className={`${compact ? 'mt-1' : 'mt-3'} ${paragraphText} leading-relaxed text-[color:var(--ink)]`}>{children}</p>,
                ul: ({ children }) => (
                    <ul className={`${compact ? 'mt-1' : 'mt-3'} ${paragraphText} list-disc space-y-1 pl-6 text-[color:var(--ink)]`}>
                        {children}
                    </ul>
                ),
                ol: ({ children }) => (
                    <ol className={`${compact ? 'mt-1' : 'mt-3'} ${paragraphText} list-decimal space-y-1 pl-6 text-[color:var(--ink)]`}>
                        {children}
                    </ol>
                ),
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                blockquote: ({ children }) => (
                    <blockquote className={`${compact ? 'mt-2' : 'mt-4'} ${paragraphText} border-l-2 border-[color:var(--accent)] bg-[color:var(--surface-2)] px-4 py-3 italic text-[color:var(--ink-soft)]`}>
                        {children}
                    </blockquote>
                ),
                hr: () => <hr className={`${compact ? 'my-4' : 'my-6'} border-[color:var(--line)]`} />,
                table: ({ children }) => (
                    <div className={`${compact ? 'mt-2' : 'mt-4'} overflow-x-auto rounded-2xl border border-[color:var(--line)]`}>
                        <table className={`min-w-full divide-y divide-[color:var(--line)] ${compact ? paragraphText : baseText}`}>{children}</table>
                    </div>
                ),
                thead: ({ children }) => <thead className="bg-[color:var(--surface-2)]">{children}</thead>,
                tbody: ({ children }) => <tbody className="divide-y divide-[color:var(--line)]">{children}</tbody>,
                tr: ({ children }) => <tr className="text-left">{children}</tr>,
                th: ({ children }) => (
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
                        {children}
                    </th>
                ),
                td: ({ children }) => <td className={`px-4 py-3 ${baseText} text-[color:var(--ink)]`}>{children}</td>,
                a: ({ children, href }) => (
                    <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-[color:var(--accent)] underline decoration-[color:var(--accent)] underline-offset-4 transition hover:text-[color:var(--accent-2)]"
                    >
                        {children}
                    </a>
                ),
                img: ({ src, alt }) => (
                    <img
                        src={src || ''}
                        alt={alt || ''}
                        loading="lazy"
                        className="mt-4 w-full rounded-2xl border border-[color:var(--line)] object-cover"
                    />
                ),
                strong: ({ children }) => <strong className="font-semibold text-[color:var(--ink)]">{children}</strong>,
                em: ({ children }) => <em className="text-[color:var(--ink-soft)]">{children}</em>,
                code: ({ className, children, node }) => {
                    const raw = String(children ?? '').replace(/\n$/, '')
                    const isInline = !className
                    if (isInline) {
                        return (
                            <code className="rounded-md border border-[color:var(--line)] bg-[color:var(--surface-2)] px-1.5 py-0.5 text-xs font-semibold text-[color:var(--accent-2)]">
                                {raw}
                            </code>
                        )
                    }
                    const nodeLanguage = typeof (node as { lang?: string } | undefined)?.lang === 'string'
                        ? (node as { lang?: string }).lang
                        : undefined
                    const match = /language-(\w+)/.exec(className || '')
                    const rawLanguage = nodeLanguage || match?.[1] || 'text'
                    if (process.env.NODE_ENV !== 'production') {
                        console.debug('[MarkdownRenderer] code block', {
                            nodeLanguage,
                            className,
                            rawLanguage,
                            preview: raw.slice(0, 80),
                        })
                    }
                    const aliasMap: Record<string, string> = {
                        py: 'python',
                        js: 'javascript',
                        ts: 'typescript',
                        yml: 'yaml',
                        sh: 'bash',
                    }
                    let language = aliasMap[rawLanguage] ?? rawLanguage
                    if (language === 'p5') {
                        return <P5Simulation code={raw} />
                    }
                    // For runnable languages, show the interactive playground
                    if (PLAYGROUND_LANGS.has(rawLanguage) || PLAYGROUND_LANGS.has(language)) {
                        return <CodePlayground initialCode={raw} language={language} />
                    }
                    const grammar = Prism.languages[language] ?? Prism.languages.markup
                    const html = Prism.highlight(raw, grammar, language)
                    return <CodeBlock raw={raw} html={html} language={language} />
                },
                }}
            >
                {processedContent}
            </ReactMarkdown>
        </div>
    )
}
