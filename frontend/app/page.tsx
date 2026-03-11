"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, LogOut, Loader2, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import RuixenMoonChat from "@/components/ui/ruixen-moon-chat";

type LearningStyle = "text" | "video" | "both";

export default function Home() {
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigatingGoal, setNavigatingGoal] = useState("");
  const [navigatingStyle, setNavigatingStyle] = useState<LearningStyle | null>(null);
  const router = useRouter();
  const { user, signOut, loading } = useAuth();

  const handleStart = (goal: string, learningStyle: LearningStyle) => {
    setNavigatingGoal(goal);
    setNavigatingStyle(learningStyle);
    setIsNavigating(true);
    sessionStorage.setItem("career_goal", goal);
    sessionStorage.setItem("learning_style", learningStyle);
    router.push("/chat");
  };

  return (
    <main className="relative w-full min-h-screen overflow-hidden">
      {/* Navigation Loading Overlay */}
      <AnimatePresence>
        {isNavigating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-neutral-950/95 via-blue-950/90 to-purple-950/95 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className="flex flex-col items-center gap-6 text-center max-w-md px-6"
            >
              <div className="relative">
                <div className="w-20 h-20 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                </div>
                <div className="absolute inset-0 rounded-full bg-blue-500/10 blur-xl animate-pulse" />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-300/90">
                Preparing Your Journey
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                Building your personalized roadmap for{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                  {navigatingGoal}
                </span>
              </h2>
              <p className="text-sm text-white/60">
                {navigatingStyle === "text" && "Optimizing for text-based learning…"}
                {navigatingStyle === "video" && "Optimizing for video-based learning…"}
                {navigatingStyle === "both" && "Optimizing for mixed text & video learning…"}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top-right nav controls */}
      <div className="absolute top-6 right-4 sm:right-8 z-20 flex items-center gap-3">
        <ThemeToggle />
        {loading ? (
          <div className="w-10 h-10 animate-pulse bg-white/10 rounded-full" />
        ) : user ? (
          <div className="flex items-center space-x-2 bg-black/40 backdrop-blur-md border border-white/15 px-3 py-2 rounded-full shadow-lg">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-1.5 text-sm font-medium text-neutral-300 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        ) : (
          <Link
            href="/auth/login"
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-semibold hover:bg-white/15 transition-colors"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In</span>
          </Link>
        )}
      </div>

      {/* Logo top-left */}
      <div className="absolute top-6 left-4 sm:left-8 z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-white drop-shadow-lg">Career AI</span>
        </div>
      </div>

      {/* Main chat UI */}
      <RuixenMoonChat onStart={handleStart} isNavigating={isNavigating} />
    </main>
  );
}
