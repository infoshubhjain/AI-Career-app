"use client";

import { useState, FormEvent } from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";

interface RoadmapFormProps {
  onSubmit: (query: string) => Promise<void>;
  loading: boolean;
}

export function RoadmapForm({ onSubmit, loading }: RoadmapFormProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      await onSubmit(query.trim());
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-neutral-200/60 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/50 backdrop-blur-xl shadow-lg p-5 sm:p-6"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="query"
            className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2"
          >
            <Sparkles className="w-4 h-4 text-purple-500" />
            What do you want to learn?
          </label>
          <input
            id="query"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., How to become a data scientist, Master machine learning..."
            disabled={loading}
            className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/80 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-sm font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating Roadmap...
            </>
          ) : (
            <>
              Generate Roadmap
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {loading && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 rounded-xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20"
        >
          <p className="text-blue-700 dark:text-blue-400 text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span>
              <strong>Processing:</strong> Our AI agents are analyzing your
              query and generating a personalized roadmap. This may take 30-60
              seconds...
            </span>
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
