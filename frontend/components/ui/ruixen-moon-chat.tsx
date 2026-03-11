"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpIcon,
  BookOpen,
  PlayCircle,
  Layers,
  Brain,
  Target,
  Rocket,
  Sparkles,
  ArrowLeft,
  Loader2,
} from "lucide-react";

type LearningStyle = "text" | "video" | "both";

interface AutoResizeProps {
  minHeight: number;
  maxHeight?: number;
}

function useAutoResizeTextarea({ minHeight, maxHeight }: AutoResizeProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }
      textarea.style.height = `${minHeight}px`;
      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Infinity)
      );
      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight]
  );

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.style.height = `${minHeight}px`;
  }, [minHeight]);

  return { textareaRef, adjustHeight };
}

const learningStyleOptions: {
  value: LearningStyle;
  icon: React.ReactNode;
  label: string;
  desc: string;
  color: string;
}[] = [
  {
    value: "text",
    icon: <BookOpen className="w-5 h-5 text-white" />,
    label: "Text-based",
    desc: "Written explanations & notes",
    color: "from-blue-500 to-cyan-500",
  },
  {
    value: "video",
    icon: <PlayCircle className="w-5 h-5 text-white" />,
    label: "Video-based",
    desc: "Visual walkthroughs",
    color: "from-purple-500 to-pink-500",
  },
  {
    value: "both",
    icon: <Layers className="w-5 h-5 text-white" />,
    label: "Both",
    desc: "Mix of text & video",
    color: "from-orange-500 to-red-500",
  },
];

const quickActions = [
  { icon: <Brain className="w-4 h-4" />, label: "AI Engineer" },
  { icon: <Target className="w-4 h-4" />, label: "Data Scientist" },
  { icon: <Rocket className="w-4 h-4" />, label: "Full-Stack Dev" },
  { icon: <BookOpen className="w-4 h-4" />, label: "UX Designer" },
  { icon: <Layers className="w-4 h-4" />, label: "Product Manager" },
  { icon: <Sparkles className="w-4 h-4" />, label: "ML Researcher" },
];

interface RuixenMoonChatProps {
  onStart: (goal: string, learningStyle: LearningStyle) => void;
  isNavigating?: boolean;
}

export default function RuixenMoonChat({ onStart, isNavigating = false }: RuixenMoonChatProps) {
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<"goal" | "style">("goal");

  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 56,
    maxHeight: 150,
  });

  const handleGoalSubmit = () => {
    if (!message.trim()) return;
    setStep("style");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGoalSubmit();
    }
  };

  const handleStyleSelect = (style: LearningStyle) => {
    onStart(message.trim(), style);
  };

  const handleQuickAction = (label: string) => {
    setMessage(label);
    adjustHeight();
  };

  return (
    <div
      className="relative w-full min-h-screen bg-cover bg-center flex flex-col items-center overflow-hidden"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920&q=80')",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-neutral-950/70 backdrop-blur-[2px]" />

      {/* Floating gradient orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-gradient-to-br from-blue-600/20 to-purple-600/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-tl from-purple-600/20 to-blue-600/20 blur-[120px] rounded-full" />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 w-full px-4 pt-24 pb-8">
        {/* Headline */}
        <AnimatePresence mode="wait">
          {step === "goal" ? (
            <motion.div
              key="headline-goal"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="text-center mb-12"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm mb-6"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-semibold uppercase tracking-widest text-blue-300">
                  Next-Gen Career AI
                </span>
              </motion.div>
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-white leading-[1.05] tracking-tight drop-shadow-2xl">
                Architect Your <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 animate-gradient bg-[length:200%_auto]">
                  Future Mastery
                </span>
              </h1>
              <p className="mt-5 text-lg text-neutral-300 max-w-xl mx-auto leading-relaxed">
                Personalized roadmaps, AI coaching, and skill assessments — all in one place.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="headline-style"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="text-center mb-10"
            >
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400 mb-3">
                One more thing
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white">
                How do you prefer to learn?
              </h2>
              <p className="mt-3 text-neutral-400 text-sm">
                We'll tailor your{" "}
                <span className="text-white font-semibold">{message}</span> roadmap to match your style.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input / Style selector */}
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {step === "goal" ? (
              <motion.div
                key="input-step"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3 }}
              >
                <div className="relative bg-black/50 backdrop-blur-xl rounded-2xl border border-white/15 shadow-2xl shadow-black/40">
                  <Textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      adjustHeight();
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Your dream career... (e.g., AI Engineer, UX Designer)"
                    className={cn(
                      "w-full px-5 py-4 resize-none border-none",
                      "bg-transparent text-white text-base",
                      "focus-visible:ring-0 focus-visible:ring-offset-0",
                      "placeholder:text-neutral-500 min-h-[56px]"
                    )}
                    style={{ overflow: "hidden" }}
                    autoFocus
                  />

                  <div className="flex items-center justify-between px-4 pb-3">
                    <p className="text-xs text-neutral-500">Press Enter or click → to continue</p>
                    <Button
                      onClick={handleGoalSubmit}
                      disabled={!message.trim() || isNavigating}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200",
                        message.trim()
                          ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
                          : "bg-neutral-700 text-neutral-400 cursor-not-allowed"
                      )}
                    >
                      <ArrowUpIcon className="w-4 h-4" />
                      <span className="text-sm font-semibold">Start Now</span>
                    </Button>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center justify-center flex-wrap gap-2.5 mt-6">
                  {quickActions.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => handleQuickAction(action.label)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-white/15 bg-black/40 backdrop-blur-sm text-neutral-300 hover:text-white hover:bg-white/10 hover:border-white/25 transition-all duration-200 text-xs font-medium"
                    >
                      {action.icon}
                      {action.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="style-step"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.35 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-3 gap-3">
                  {learningStyleOptions.map((option) => (
                    <motion.button
                      key={option.value}
                      whileHover={{ scale: 1.04, y: -4 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleStyleSelect(option.value)}
                      disabled={isNavigating}
                      className="group flex flex-col items-center gap-3 p-5 rounded-2xl border border-white/15 bg-black/40 backdrop-blur-md hover:bg-white/5 hover:border-white/30 transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${option.color} shadow-lg group-hover:shadow-xl transition-all duration-200`}>
                        {option.icon}
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-sm text-white">{option.label}</p>
                        <p className="text-xs text-neutral-400 mt-0.5">{option.desc}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>

                <button
                  onClick={() => setStep("goal")}
                  className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-200 transition-colors mx-auto"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
