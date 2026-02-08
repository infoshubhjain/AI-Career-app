"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { LogIn, LogOut, Rocket, Brain, Target } from "lucide-react";
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
    <main className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden bg-neutral-50 dark:bg-neutral-950">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />

      {/* Auth UI */}
      <div className="absolute top-8 right-8 z-20">
        {loading ? (
          <div className="w-8 h-8 animate-pulse bg-neutral-200 dark:bg-neutral-800 rounded-full" />
        ) : user ? (
          <div className="flex items-center space-x-4 glass-dark dark:bg-white/5 p-2 pr-4 rounded-full border border-white/10">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center space-x-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Exit</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => signInWithGoogle()}
            className="flex items-center space-x-2 px-6 py-3 text-sm font-semibold rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:scale-105 transition-all shadow-xl"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In</span>
          </button>
        )}
      </div>

      {/* Main centered container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-4xl flex flex-col items-center text-center space-y-12 z-10"
      >
        {/* Badge */}
        <div className="px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold tracking-widest uppercase mb-4">
          Next-Gen Career AI
        </div>

        {/* Headline section */}
        <div className="space-y-6">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-neutral-900 dark:text-white leading-[1.1]">
            Architect Your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500 animate-gradient">Future Mastery.</span>
          </h1>
          <p className="text-xl sm:text-2xl text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            Personalized 100-step roadmaps, interactive skill assessments, and AI-driven career coaching.
          </p>
        </div>

        {/* Input form section */}
        <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-4 glass dark:bg-neutral-900/40 p-2 rounded-2xl border border-white/20 shadow-2xl">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={futureGoal}
              onChange={(e) => setFutureGoal(e.target.value)}
              placeholder="Your dream career... (e.g., AI Engineer)"
              className="flex-1 px-6 py-4 text-lg rounded-xl bg-transparent text-neutral-900 dark:text-white placeholder:text-neutral-500 outline-none"
              aria-label="Enter your future goal"
            />
            <button
              type="submit"
              className="px-8 py-4 text-lg font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-blue-500/20"
              disabled={!futureGoal.trim()}
            >
              Initialize Path
            </button>
          </div>
        </form>

        {/* Features Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-3xl pt-8">
          {[
            { icon: Brain, title: "AI Guided", desc: "Predictive learning paths" },
            { icon: Target, title: "100 Steps", desc: "Micro-milestone tracking" },
            { icon: Rocket, title: "Fast-Track", desc: "XP-based gamification" }
          ].map((feat, idx) => (
            <div key={idx} className="flex flex-col items-center space-y-2 p-4 rounded-2xl glass-dark border border-white/5">
              <feat.icon className="w-6 h-6 text-blue-500 mb-2" />
              <h3 className="font-bold text-sm text-white">{feat.title}</h3>
              <p className="text-xs text-neutral-500">{feat.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </main>
  );
}
