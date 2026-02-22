"use client"

import * as React from "react"
import { Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"
import { motion } from "framer-motion"

export function ThemeToggle() {
    const { setTheme, resolvedTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    // Avoid hydration mismatch
    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <div className="w-10 h-10 rounded-full glass-premium dark:glass-premium-dark flex items-center justify-center animate-pulse shadow-lg" />
        )
    }

    const isDark = resolvedTheme === "dark"

    return (
        <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="w-10 h-10 rounded-full flex items-center justify-center glass-premium dark:bg-neutral-900/40 dark:backdrop-blur-2xl dark:border dark:border-purple-500/20 shadow-lg hover-lift smooth-transition text-neutral-700 dark:text-purple-200 hover:text-blue-600 dark:hover:text-purple-400"
            aria-label="Toggle theme"
        >
            {isDark ? (
                <Sun className="w-5 h-5" />
            ) : (
                <Moon className="w-5 h-5" />
            )}
        </motion.button>
    )
}
