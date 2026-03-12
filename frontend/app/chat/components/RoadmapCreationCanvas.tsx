'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface RoadmapCreationCanvasProps {
    visible: boolean
    ambition: string
}

export function RoadmapCreationCanvas({ visible, ambition }: RoadmapCreationCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)

    useEffect(() => {
        if (!visible || !canvasRef.current) return
        const canvas = canvasRef.current
        const context = canvas.getContext('2d')
        if (!context) return

        const particles = Array.from({ length: 54 }, () => ({
            x: Math.random(),
            y: Math.random(),
            radius: 1 + Math.random() * 2.5,
            speed: 0.0008 + Math.random() * 0.0022,
            alpha: 0.25 + Math.random() * 0.55,
        }))

        let animationFrame = 0
        let start = performance.now()

        const resize = () => {
            const ratio = window.devicePixelRatio || 1
            const { width, height } = canvas.getBoundingClientRect()
            canvas.width = Math.max(1, Math.floor(width * ratio))
            canvas.height = Math.max(1, Math.floor(height * ratio))
            context.setTransform(ratio, 0, 0, ratio, 0, 0)
        }

        const draw = (time: number) => {
            const elapsed = (time - start) / 1000
            const width = canvas.clientWidth
            const height = canvas.clientHeight

            context.clearRect(0, 0, width, height)

            const gradient = context.createLinearGradient(0, 0, width, height)
            gradient.addColorStop(0, 'rgba(215, 182, 106, 0.22)')
            gradient.addColorStop(0.5, 'rgba(127, 209, 194, 0.16)')
            gradient.addColorStop(1, 'rgba(143, 180, 255, 0.18)')
            context.fillStyle = gradient
            context.fillRect(0, 0, width, height)

            for (let wave = 0; wave < 3; wave += 1) {
                context.beginPath()
                const baseline = height * (0.22 + wave * 0.18)
                for (let x = 0; x <= width; x += 10) {
                    const y = baseline + Math.sin((x / 120) + elapsed * (1.6 + wave * 0.5)) * (10 + wave * 6)
                    if (x === 0) context.moveTo(x, y)
                    else context.lineTo(x, y)
                }
                context.strokeStyle =
                    wave === 0 ? 'rgba(215, 182, 106, 0.55)' : wave === 1 ? 'rgba(127, 209, 194, 0.4)' : 'rgba(143, 180, 255, 0.3)'
                context.lineWidth = 1.5 + wave * 0.4
                context.stroke()
            }

            particles.forEach((particle, index) => {
                particle.y = (particle.y + particle.speed) % 1
                const offsetX = Math.sin(elapsed + index) * 14
                const x = particle.x * width + offsetX
                const y = particle.y * height
                context.beginPath()
                context.arc(x, y, particle.radius, 0, Math.PI * 2)
                context.fillStyle = `rgba(255,255,255,${particle.alpha})`
                context.fill()
            })

            context.beginPath()
            context.arc(width * 0.78, height * 0.28, 58 + Math.sin(elapsed * 1.2) * 8, 0, Math.PI * 2)
            context.fillStyle = 'rgba(215, 182, 106, 0.18)'
            context.fill()

            animationFrame = window.requestAnimationFrame(draw)
        }

        resize()
        draw(start)
        window.addEventListener('resize', resize)
        return () => {
            window.cancelAnimationFrame(animationFrame)
            window.removeEventListener('resize', resize)
        }
    }, [visible])

    return (
        <AnimatePresence>
            {visible ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 overflow-hidden"
                >
                    <canvas ref={canvasRef} className="h-full w-full" />
                    <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />
                    <div className="absolute inset-0 flex items-center justify-center px-6">
                        <div className="max-w-2xl text-center text-[color:var(--ink)]">
                            <motion.div
                                initial={{ scale: 0.92, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.4 }}
                                className="mx-auto mb-6 h-20 w-20 rounded-full border border-white/20 bg-white/10"
                            >
                                <div className="flex h-full items-center justify-center">
                                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                                </div>
                            </motion.div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
                                Building Your Roadmap
                            </p>
                            <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
                                Turning your ambition into a guided learning journey
                            </h2>
                            <p className="mt-4 text-sm text-[color:var(--ink-soft)] sm:text-base">
                                Analyzing: <span className="font-semibold text-[color:var(--ink)]">{ambition}</span>
                            </p>
                        </div>
                    </div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    )
}
