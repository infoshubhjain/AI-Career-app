"use client";

import { useState, useEffect, useCallback } from "react";
import { RoadmapForm } from "../components/roadmap/RoadmapForm";
import { RoadmapDisplay } from "../components/roadmap/RoadmapDisplay";
import { api } from "../lib/api";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Map,
  Sparkles,
  Loader2,
} from "lucide-react";

export interface Subdomain {
  id: string;
  title: string;
  description: string;
  order: number;
}

export interface Domain {
  id: string;
  title: string;
  description: string;
  order: number;
  subdomains?: Subdomain[];
}

export interface Roadmap {
  query: string;
  domains: Domain[];
  timestamp?: string;
  filename?: string;
  existing?: boolean;
}

interface RoadmapGenerateApiResponse {
  roadmap: Roadmap;
  existing: boolean;
}

/* ─── skeleton loader ─── */
function RoadmapSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-6">
          <div className="flex flex-col items-center flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-800" />
            {i < 3 && <div className="w-0.5 flex-1 mt-2 bg-neutral-200 dark:bg-neutral-800 rounded-full" />}
          </div>
          <div className="flex-1 mb-8">
            <div className="rounded-2xl border border-neutral-200/60 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/30 p-5">
              <div className="h-4 w-2/3 bg-neutral-200 dark:bg-neutral-800 rounded-lg mb-3" />
              <div className="h-3 w-full bg-neutral-100 dark:bg-neutral-800/50 rounded-lg mb-2" />
              <div className="h-3 w-4/5 bg-neutral-100 dark:bg-neutral-800/50 rounded-lg mb-4" />
              <div className="h-1 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── localStorage helper for step completion ─── */
const STORAGE_KEY = "roadmap_completed_steps";

function loadCompletedSteps(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveCompletedSteps(steps: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...steps]));
}

export default function RoadmapPage() {
  const [latestRoadmap, setLatestRoadmap] = useState<Roadmap | null>(null);
  const [allRoadmaps, setAllRoadmaps] = useState<Roadmap[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  // Load completed steps from localStorage
  useEffect(() => {
    setCompletedSteps(loadCompletedSteps());
  }, []);

  const handleToggleStep = useCallback((stepId: string) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      saveCompletedSteps(next);
      return next;
    });
  }, []);

  // Fetch all roadmaps on page load
  useEffect(() => {
    fetchAllRoadmaps();
  }, []);

  const fetchAllRoadmaps = async () => {
    try {
      const { data, error } = await api.get<{ roadmaps: Roadmap[] }>(
        "/api/roadmap/list",
        { requireAuth: false }
      );

      if (error) {
        console.error("Failed to fetch roadmaps:", error);
        return;
      }

      if (data) {
        setAllRoadmaps(data.roadmaps);
      }
    } catch (err) {
      console.error("Error fetching roadmaps:", err);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleGenerateRoadmap = async (query: string) => {
    setLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      const { data, error } = await api.post<RoadmapGenerateApiResponse>(
        "/api/roadmap/generate",
        { query },
        { requireAuth: false }
      );

      if (error) {
        setError(error);
        return;
      }

      if (data) {
        const roadmap = { ...data.roadmap, existing: data.existing };
        setLatestRoadmap(roadmap);
        if (data.existing) {
          setInfoMessage("Roadmap already exists.");
        }
        await fetchAllRoadmaps();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const previousRoadmaps = latestRoadmap
    ? allRoadmaps.filter(
      (roadmap) => roadmap.filename !== latestRoadmap.filename
    )
    : allRoadmaps;

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-blue-50/20 to-purple-50/10 dark:from-neutral-950 dark:via-blue-950/10 dark:to-purple-950/5">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[40%] bg-gradient-to-br from-blue-500/10 to-purple-500/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[35%] h-[35%] bg-gradient-to-tl from-purple-500/10 to-blue-500/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative max-w-4xl mx-auto py-8 sm:py-12 px-4 sm:px-6">
        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white smooth-transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Chat
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 text-xs font-bold uppercase tracking-widest mb-4">
            <Map className="w-3.5 h-3.5" />
            Career Roadmap
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white mb-3">
            AI Career Roadmap Generator
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
            Generate personalized learning paths powered by AI. Track your progress step-by-step.
          </p>
        </motion.div>

        {/* Form */}
        <div className="mb-10">
          <RoadmapForm onSubmit={handleGenerateRoadmap} loading={loading} />
        </div>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="mb-8 p-4 rounded-xl bg-red-500/5 dark:bg-red-500/10 border border-red-500/20"
            >
              <p className="text-red-700 dark:text-red-400 text-sm">
                <strong>Error:</strong> {error}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info Display */}
        <AnimatePresence>
          {infoMessage && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="mb-8 p-4 rounded-xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20"
            >
              <p className="text-blue-700 dark:text-blue-400 text-sm">
                {infoMessage}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading Skeleton */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-10"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-6">
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating your roadmap...
            </div>
            <RoadmapSkeleton />
          </motion.div>
        )}

        {/* Latest Roadmap */}
        <AnimatePresence>
          {latestRoadmap && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-12"
            >
              <div className="flex items-center gap-2 mb-5">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                  Latest Roadmap
                </h2>
              </div>
              <RoadmapDisplay
                roadmap={latestRoadmap}
                completedSteps={completedSteps}
                onToggleStep={handleToggleStep}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Previous Roadmaps */}
        {previousRoadmaps.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-5">
              Previous Roadmaps
            </h2>
            <div className="space-y-6">
              {previousRoadmaps.map((roadmap, index) => (
                <RoadmapDisplay
                  key={roadmap.filename || index}
                  roadmap={roadmap}
                  compact
                  completedSteps={completedSteps}
                  onToggleStep={handleToggleStep}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!latestRoadmap &&
          allRoadmaps.length === 0 &&
          !loading &&
          !initialLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 mb-4">
                <Map className="w-8 h-8 text-neutral-400 dark:text-neutral-500" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                No roadmaps yet
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400">
                Enter a query above to generate your first AI-powered career
                roadmap.
              </p>
            </motion.div>
          )}

        {/* Initial Loading */}
        {initialLoading && !loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
          </div>
        )}
      </div>
    </div>
  );
}
