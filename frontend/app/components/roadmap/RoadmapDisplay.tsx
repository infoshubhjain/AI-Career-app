"use client";

import { Domain, Roadmap, Subdomain } from "../../roadmap/page";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Layers,
  Sparkles,
} from "lucide-react";

interface RoadmapDisplayProps {
  roadmap: Roadmap;
  compact?: boolean;
  completedSteps?: Set<string>;
  onToggleStep?: (stepId: string) => void;
}

/* ─── colour palette per-domain (cycles through 6 themes) ─── */
const domainThemes = [
  {
    gradient: "from-blue-500 to-cyan-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    text: "text-blue-400",
    ring: "ring-blue-500/40",
    line: "bg-blue-500/30",
    dot: "bg-blue-500",
    glow: "shadow-blue-500/20",
  },
  {
    gradient: "from-purple-500 to-pink-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    text: "text-purple-400",
    ring: "ring-purple-500/40",
    line: "bg-purple-500/30",
    dot: "bg-purple-500",
    glow: "shadow-purple-500/20",
  },
  {
    gradient: "from-amber-500 to-orange-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-400",
    ring: "ring-amber-500/40",
    line: "bg-amber-500/30",
    dot: "bg-amber-500",
    glow: "shadow-amber-500/20",
  },
  {
    gradient: "from-emerald-500 to-teal-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    ring: "ring-emerald-500/40",
    line: "bg-emerald-500/30",
    dot: "bg-emerald-500",
    glow: "shadow-emerald-500/20",
  },
  {
    gradient: "from-rose-500 to-red-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    text: "text-rose-400",
    ring: "ring-rose-500/40",
    line: "bg-rose-500/30",
    dot: "bg-rose-500",
    glow: "shadow-rose-500/20",
  },
  {
    gradient: "from-indigo-500 to-violet-400",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/30",
    text: "text-indigo-400",
    ring: "ring-indigo-500/40",
    line: "bg-indigo-500/30",
    dot: "bg-indigo-500",
    glow: "shadow-indigo-500/20",
  },
];

/* ─── subdomain row with completion toggle ─── */
function SubdomainRow({
  subdomain,
  theme,
  isCompleted,
  onToggle,
}: {
  subdomain: Subdomain;
  theme: (typeof domainThemes)[0];
  isCompleted: boolean;
  onToggle?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className={`group flex items-start gap-3 p-3 rounded-xl transition-all duration-200 ${isCompleted
          ? "bg-emerald-500/5 dark:bg-emerald-500/5"
          : "hover:bg-white/50 dark:hover:bg-white/5"
        }`}
    >
      {/* Completion Toggle */}
      <button
        onClick={onToggle}
        className="flex-shrink-0 mt-0.5 transition-all duration-200 hover:scale-110"
        aria-label={isCompleted ? "Mark as incomplete" : "Mark as complete"}
      >
        {isCompleted ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        ) : (
          <Circle
            className={`w-5 h-5 text-neutral-400 dark:text-neutral-600 group-hover:${theme.text} transition-colors`}
          />
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4
          className={`text-sm font-semibold ${isCompleted
              ? "text-neutral-400 dark:text-neutral-500 line-through"
              : "text-neutral-800 dark:text-neutral-200"
            }`}
        >
          {subdomain.title}
        </h4>
        <p
          className={`text-xs mt-0.5 leading-relaxed ${isCompleted
              ? "text-neutral-400 dark:text-neutral-600"
              : "text-neutral-500 dark:text-neutral-400"
            }`}
        >
          {subdomain.description}
        </p>
      </div>

      {/* Order Pill */}
      <span
        className={`flex-shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${theme.bg} ${theme.text}`}
      >
        {subdomain.order + 1}
      </span>
    </motion.div>
  );
}

/* ─── domain timeline node ─── */
function DomainTimelineNode({
  domain,
  theme,
  isLast,
  completedSteps,
  onToggleStep,
}: {
  domain: Domain;
  theme: (typeof domainThemes)[0];
  isLast: boolean;
  completedSteps: Set<string>;
  onToggleStep?: (stepId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const sortedSubdomains = domain.subdomains
    ? [...domain.subdomains].sort((a, b) => a.order - b.order)
    : [];

  const completedCount = sortedSubdomains.filter((s) =>
    completedSteps.has(s.id)
  ).length;
  const totalCount = sortedSubdomains.length;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const isFullyComplete = completedCount === totalCount && totalCount > 0;

  return (
    <div className="relative flex gap-4 sm:gap-6">
      {/* Timeline Spine */}
      <div className="flex flex-col items-center flex-shrink-0">
        {/* Dot */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 12, stiffness: 200 }}
          className={`relative z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg ${theme.glow} bg-gradient-to-br ${theme.gradient} ${isFullyComplete ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-white dark:ring-offset-neutral-950" : ""
            }`}
        >
          {isFullyComplete ? (
            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
          ) : (
            domain.order + 1
          )}
        </motion.div>
        {/* Connector Line */}
        {!isLast && (
          <div className={`w-0.5 flex-1 mt-2 rounded-full ${theme.line}`} />
        )}
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: domain.order * 0.06 }}
        className="flex-1 mb-6 sm:mb-8"
      >
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className={`w-full text-left rounded-2xl border backdrop-blur-md transition-all duration-300 overflow-hidden ${expanded
              ? `${theme.border} ${theme.bg} shadow-lg ${theme.glow}`
              : "border-neutral-200/60 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/50 hover:shadow-md"
            }`}
        >
          <div className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3
                  className={`text-base sm:text-lg font-bold ${isFullyComplete
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-neutral-900 dark:text-white"
                    }`}
                >
                  {domain.title}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
                  {domain.description}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Progress Pill */}
                <span
                  className={`text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full ${isFullyComplete
                      ? "bg-emerald-500/15 text-emerald-500"
                      : `${theme.bg} ${theme.text}`
                    }`}
                >
                  {completedCount}/{totalCount}
                </span>
                {expanded ? (
                  <ChevronDown className="w-4 h-4 text-neutral-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                )}
              </div>
            </div>

            {/* Inline Progress Bar */}
            {totalCount > 0 && (
              <div className="mt-3 h-1 w-full bg-neutral-200/60 dark:bg-neutral-800 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-r ${isFullyComplete
                      ? "from-emerald-400 to-emerald-500"
                      : theme.gradient
                    }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            )}
          </div>
        </button>

        {/* Expanded Skills */}
        <AnimatePresence>
          {expanded && sortedSubdomains.length > 0 && (
            <motion.div
              key="skills"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div
                className={`mt-1 rounded-2xl border ${theme.border} bg-white/50 dark:bg-neutral-900/40 backdrop-blur-sm p-2 space-y-1`}
              >
                {sortedSubdomains.map((subdomain) => (
                  <SubdomainRow
                    key={subdomain.id}
                    subdomain={subdomain}
                    theme={theme}
                    isCompleted={completedSteps.has(subdomain.id)}
                    onToggle={() => onToggleStep?.(subdomain.id)}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

/* ─── main export ─── */
export function RoadmapDisplay({
  roadmap,
  compact = false,
  completedSteps = new Set<string>(),
  onToggleStep,
}: RoadmapDisplayProps) {
  const [open, setOpen] = useState(!compact);
  const sortedDomains = useMemo(
    () => [...roadmap.domains].sort((a, b) => a.order - b.order),
    [roadmap.domains]
  );
  const totalSkills = useMemo(
    () =>
      sortedDomains.reduce(
        (total, domain) => total + (domain.subdomains?.length || 0),
        0
      ),
    [sortedDomains]
  );
  const totalCompleted = useMemo(() => {
    let count = 0;
    for (const domain of sortedDomains) {
      for (const sub of domain.subdomains || []) {
        if (completedSteps.has(sub.id)) count++;
      }
    }
    return count;
  }, [sortedDomains, completedSteps]);

  const overallPct = totalSkills > 0 ? (totalCompleted / totalSkills) * 100 : 0;

  const formattedTimestamp = roadmap.timestamp
    ? new Date(roadmap.timestamp).toLocaleString()
    : null;

  return (
    <section className="overflow-hidden rounded-3xl border border-neutral-200/60 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/50 backdrop-blur-xl shadow-xl">
      {/* Header */}
      <header className="relative overflow-hidden p-5 sm:p-6 border-b border-neutral-200/60 dark:border-neutral-800">
        {/* Background Glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-transparent pointer-events-none" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-purple-500 dark:text-purple-400">
                AI-Generated Roadmap
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white">
              {roadmap.query}
            </h3>
          </div>
          {compact && (
            <button
              type="button"
              onClick={() => setOpen((prev) => !prev)}
              className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-750 smooth-transition"
            >
              {open ? "Collapse" : "Expand"}
            </button>
          )}
        </div>

        {/* Stats Row */}
        <div className="relative flex flex-wrap items-center gap-3 mt-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 dark:bg-white/10 px-3 py-1 text-xs font-semibold text-white">
            <Layers className="w-3 h-3" />
            {sortedDomains.length} domains
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 dark:bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-400">
            <BookOpen className="w-3 h-3" />
            {totalSkills} skills
          </span>
          {totalCompleted > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-3 h-3" />
              {totalCompleted} complete
            </span>
          )}
          {formattedTimestamp && (
            <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-3 py-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {formattedTimestamp}
            </span>
          )}
        </div>

        {/* Overall Progress */}
        {totalSkills > 0 && (
          <div className="relative mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Overall Progress
              </span>
              <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                {Math.round(overallPct)}%
              </span>
            </div>
            <div className="h-2 w-full bg-neutral-200/60 dark:bg-neutral-800 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${overallPct === 100
                    ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                    : "bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
                  }`}
                initial={{ width: 0 }}
                animate={{ width: `${overallPct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
        )}
      </header>

      {/* Timeline Body */}
      <div className={`${open ? "block" : "hidden"} p-4 sm:p-6`}>
        {sortedDomains.map((domain, idx) => (
          <DomainTimelineNode
            key={domain.id}
            domain={domain}
            theme={domainThemes[idx % domainThemes.length]}
            isLast={idx === sortedDomains.length - 1}
            completedSteps={completedSteps}
            onToggleStep={onToggleStep}
          />
        ))}
      </div>

      {/* Footer */}
      <footer className="border-t border-neutral-200/60 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 px-5 sm:px-6 py-3">
        <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
          <p className="font-medium flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            Generated by AI Career Tutor
          </p>
          {roadmap.filename && (
            <p className="font-mono text-[10px]">{roadmap.filename}</p>
          )}
        </div>
      </footer>
    </section>
  );
}
