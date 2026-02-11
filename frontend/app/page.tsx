"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { LogIn, LogOut, Rocket, Brain, Target, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  const [futureGoal, setFutureGoal] = useState("");
  const router = useRouter();
  const { user, signInWithGoogle, signOut, loading } = useAuth();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (futureGoal.trim()) {
      sessionStorage.setItem("career_goal", futureGoal);
      router.push("/chat");
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden bg-gradient-to-br from-neutral-50 via-blue-50/30 to-purple-50/20 dark:from-neutral-950 dark:via-blue-950/20 dark:to-purple-950/10">
      {/* Enhanced Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-[120px] rounded-full animate-float" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-tl from-purple-500/20 to-blue-500/20 blur-[120px] rounded-full animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] h-[40%] bg-gradient-to-br from-blue-400/10 to-purple-400/10 blur-[100px] rounded-full" />
      </div>

      {/* Auth UI */}
      <div className="absolute top-6 sm:top-8 right-4 sm:right-8 z-20">
        {loading ? (
          <div className="w-10 h-10 animate-pulse bg-neutral-200/80 dark:bg-neutral-800/80 rounded-full backdrop-blur-sm" />
        ) : user ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center space-x-3 glass-premium dark:glass-premium-dark p-2 pr-4 rounded-full shadow-lg hover-lift"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold shadow-md">
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center space-x-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white smooth-transition"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </motion.div>
        ) : (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => signInWithGoogle()}
            className="flex items-center space-x-2 px-5 py-2.5 sm:px-6 sm:py-3 text-sm font-semibold rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xl hover:shadow-2xl smooth-transition"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In</span>
          </motion.button>
        )}
      </div>

      {/* Main centered container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-4xl flex flex-col items-center text-center space-y-10 sm:space-y-12 z-10"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 border border-blue-500/20 backdrop-blur-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-bold tracking-widest uppercase bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
            Next-Gen Career AI
          </span>
        </motion.div>

        {/* Headline section */}
        <div className="space-y-6">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-neutral-900 dark:text-white leading-[1.05]"
          >
            Architect Your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-500 to-blue-600 animate-gradient bg-[length:200%_auto]">
              Future Mastery
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-lg sm:text-xl md:text-2xl text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto leading-relaxed font-medium"
          >
            Personalized 100-step roadmaps, interactive skill assessments, and AI-driven career coaching.
          </motion.p>
        </div>

        {/* Input form section */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          onSubmit={handleSubmit}
          className="w-full max-w-2xl"
        >
          <div className="glass-premium dark:glass-premium-dark p-2 rounded-2xl shadow-premium dark:shadow-premium-dark">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={futureGoal}
                onChange={(e) => setFutureGoal(e.target.value)}
                placeholder="Your dream career... (e.g., AI Engineer)"
                className="flex-1 px-6 py-4 text-base sm:text-lg rounded-xl bg-white/50 dark:bg-neutral-900/50 text-neutral-900 dark:text-white placeholder:text-neutral-500 dark:placeholder:text-neutral-400 border-2 border-transparent focus:border-blue-500/50 focus:bg-white dark:focus:bg-neutral-900 focus-glow smooth-transition font-medium"
                aria-label="Enter your future goal"
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="px-8 py-4 text-base sm:text-lg font-bold rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-purple-500 text-white smooth-transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40"
                disabled={!futureGoal.trim()}
              >
                Initialize Path
              </motion.button>
            </div>
          </div>
        </motion.form>

        {/* Features Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 w-full max-w-3xl pt-4"
        >
          {[
            { icon: Brain, title: "AI Guided", desc: "Predictive learning paths", color: "from-blue-500 to-cyan-500" },
            { icon: Target, title: "100 Steps", desc: "Micro-milestone tracking", color: "from-purple-500 to-pink-500" },
            { icon: Rocket, title: "Fast-Track", desc: "XP-based gamification", color: "from-orange-500 to-red-500" }
          ].map((feat, idx) => (
            <motion.div
              key={idx}
              whileHover={{ scale: 1.05, y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="group flex flex-col items-center space-y-3 p-6 rounded-2xl glass-premium dark:glass-premium-dark border border-white/20 dark:border-white/5 hover:border-white/40 dark:hover:border-white/10 smooth-transition cursor-pointer"
            >
              <div className={`p-3 rounded-xl bg-gradient-to-br ${feat.color} shadow-lg group-hover:shadow-xl smooth-transition`}>
                <feat.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-base text-neutral-900 dark:text-white">{feat.title}</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">{feat.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </main>
  );
}
