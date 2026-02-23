"use client";

import { Domain, Roadmap, Subdomain } from "../../roadmap/page";
import { useMemo, useState } from "react";

interface RoadmapDisplayProps {
  roadmap: Roadmap;
  compact?: boolean;
}

function SubdomainCard({ subdomain }: { subdomain: Subdomain }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-semibold text-sky-700">
          {subdomain.order + 1}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="mb-1 font-semibold text-gray-900">
            {subdomain.title}
          </h4>
          <p className="text-sm leading-6 text-gray-600">{subdomain.description}</p>
        </div>
      </div>
    </div>
  );
}

function DomainCard({ domain }: { domain: Domain }) {
  const sortedSubdomains = domain.subdomains
    ? [...domain.subdomains].sort((a, b) => a.order - b.order)
    : [];
  const [expanded, setExpanded] = useState(true);

  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full bg-gradient-to-r from-gray-50 to-gray-100 p-5 text-left text-gray-900"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-black text-lg font-bold text-white">
            {domain.order + 1}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between gap-3">
              <h3 className="text-3xl font-extrabold text-black">{domain.title}</h3>
              <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-800">
                {sortedSubdomains.length} skills
              </span>
            </div>
            <p className="text-sm leading-6 text-gray-700">{domain.description}</p>
          </div>
        </div>
      </button>

      {sortedSubdomains.length > 0 && (
        <div className={`${expanded ? "block" : "hidden"} space-y-3 p-5`}>
          {sortedSubdomains.map((subdomain) => (
            <SubdomainCard key={subdomain.id} subdomain={subdomain} />
          ))}
        </div>
      )}
    </article>
  );
}

export function RoadmapDisplay({ roadmap, compact = false }: RoadmapDisplayProps) {
  const [open, setOpen] = useState(!compact);
  const sortedDomains = useMemo(
    () => [...roadmap.domains].sort((a, b) => a.order - b.order),
    [roadmap.domains]
  );
  const totalSkills = useMemo(
    () => sortedDomains.reduce((total, domain) => total + (domain.subdomains?.length || 0), 0),
    [sortedDomains]
  );
  const formattedTimestamp = roadmap.timestamp
    ? new Date(roadmap.timestamp).toLocaleString()
    : null;

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
      <header className="border-b border-gray-200 bg-gradient-to-r from-slate-50 to-amber-50 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h3 className="text-2xl font-bold text-gray-900">
            {roadmap.query}
          </h3>
          {compact && (
            <button
              type="button"
              onClick={() => setOpen((prev) => !prev)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              {open ? "Collapse" : "Expand"}
            </button>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-slate-800 px-3 py-1 font-semibold text-white">
            {sortedDomains.length} domains
          </span>
          <span className="rounded-full bg-sky-100 px-3 py-1 font-semibold text-sky-800">
            {totalSkills} skills
          </span>
          {formattedTimestamp && (
            <span className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-700">
              {formattedTimestamp}
            </span>
          )}
        </div>
      </header>

      <div className={`${open ? "block" : "hidden"} p-6`}>
        <div className="space-y-6">
          {sortedDomains.map((domain) => (
            <DomainCard key={domain.id} domain={domain} />
          ))}
        </div>
      </div>

      <footer className="border-t border-gray-200 bg-gray-50 px-6 py-4">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <p className="font-medium">
            Generated roadmap snapshot
          </p>
          {roadmap.filename && (
            <p className="font-mono text-xs">{roadmap.filename}</p>
          )}
        </div>
      </footer>
    </section>
  );
}
