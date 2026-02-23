"use client";

import { useState, FormEvent } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

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
    <div className="bg-white rounded-xl shadow-lg p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="query"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            What do you want to learn?
          </label>
          <Input
            id="query"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., How to become a data scientist, Learn full-stack development, Master machine learning"
            disabled={loading}
            className="w-full"
          />
        </div>

        <Button type="submit" disabled={loading || !query.trim()} className="w-full">
          {loading ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Generating Roadmap...
            </span>
          ) : (
            "Generate Roadmap"
          )}
        </Button>
      </form>

      {loading && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 text-sm">
            <strong>Processing:</strong> Our AI agents are analyzing your query
            and generating a personalized roadmap. This may take 30-60 seconds...
          </p>
        </div>
      )}
    </div>
  );
}
