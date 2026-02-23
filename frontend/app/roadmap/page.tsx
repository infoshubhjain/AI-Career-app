"use client";

import { useState, useEffect } from "react";
import { RoadmapForm } from "../components/roadmap/RoadmapForm";
import { RoadmapDisplay } from "../components/roadmap/RoadmapDisplay";
import { api } from "../lib/api";

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
}

export default function RoadmapPage() {
  const [latestRoadmap, setLatestRoadmap] = useState<Roadmap | null>(null);
  const [allRoadmaps, setAllRoadmaps] = useState<Roadmap[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    }
  };

  const handleGenerateRoadmap = async (query: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await api.post<Roadmap>(
        "/api/roadmap/generate",
        { query },
        { requireAuth: false }
      );

      if (error) {
        setError(error);
        return;
      }

      if (data) {
        setLatestRoadmap(data);
        // Refresh all roadmaps to include the new one
        await fetchAllRoadmaps();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const previousRoadmaps = latestRoadmap
    ? allRoadmaps.filter((roadmap) => roadmap.filename !== latestRoadmap.filename)
    : allRoadmaps;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            AI Career Roadmap Generator
          </h1>
          <p className="text-lg text-gray-600">
            Generate personalized learning paths powered by AI
          </p>
        </div>

        {/* Form */}
        <RoadmapForm onSubmit={handleGenerateRoadmap} loading={loading} />

        {/* Error Display */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">
              <strong>Error:</strong> {error}
            </p>
          </div>
        )}

        {/* Latest Roadmap */}
        {latestRoadmap && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Latest Generated Roadmap
            </h2>
            <RoadmapDisplay roadmap={latestRoadmap} />
          </div>
        )}

        {/* All Previous Roadmaps */}
        {previousRoadmaps.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Previous Roadmaps
            </h2>
            <div className="space-y-8">
              {previousRoadmaps.map((roadmap, index) => (
                <RoadmapDisplay
                  key={roadmap.filename || index}
                  roadmap={roadmap}
                  compact
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!latestRoadmap && allRoadmaps.length === 0 && !loading && (
          <div className="mt-16 text-center">
            <p className="text-gray-500 text-lg">
              No roadmaps generated yet. Enter a query above to get started!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
