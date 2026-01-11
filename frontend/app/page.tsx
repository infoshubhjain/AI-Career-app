"use client";

import { useState, FormEvent } from "react";
import { useAuth } from "./context/AuthContext";
import Link from "next/link";

export default function Home() {
  const { user, isAuthenticated, isLoading, signOut } = useAuth();
  const [futureGoal, setFutureGoal] = useState("");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (futureGoal.trim()) {
      // TODO: Add navigation or API call here
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <main className="min-h-screen w-full flex flex-col">
      {/* Header with auth status */}
      <header className="w-full px-4 py-4 flex justify-end">
        {isLoading ? (
          <div className="h-10 w-24 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
        ) : isAuthenticated ? (
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted hidden sm:inline">
              {user?.email}
            </span>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm font-medium rounded-lg border-2 border-neutral-300 dark:border-neutral-700 text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="px-4 py-2 text-sm font-medium text-foreground hover:text-muted transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="px-4 py-2 text-sm font-medium rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
            >
              Sign up
            </Link>
          </div>
        )}
      </header>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl flex flex-col items-center text-center space-y-8">
          {/* Welcome message for authenticated users */}
          {isAuthenticated && (
            <div className="w-full p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-700 dark:text-green-400">
                Welcome back! You&apos;re signed in as{" "}
                <span className="font-medium">{user?.email}</span>
              </p>
            </div>
          )}

          {/* Headline section */}
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-balance">
              What do you want to become?
            </h1>
            <p className="text-lg sm:text-xl text-neutral-600 dark:text-neutral-400 text-balance">
              Choose your path and start your learning journey today
            </p>
          </div>

          {/* Input form section */}
          <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
            <input
              type="text"
              value={futureGoal}
              onChange={(e) => setFutureGoal(e.target.value)}
              placeholder="e.g., Data Analyst, Programmer, Product Designer"
              className="w-full px-6 py-4 text-base sm:text-lg rounded-lg border-2 border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-foreground placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 focus:border-transparent transition-all duration-200 hover:border-neutral-400 dark:hover:border-neutral-600"
              aria-label="Enter your future goal or skill"
            />

            <button
              type="submit"
              className="w-full px-6 py-4 text-base sm:text-lg font-semibold rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!futureGoal.trim()}
            >
              Continue
            </button>
          </form>

          <p className="text-sm text-neutral-500 dark:text-neutral-500 max-w-md">
            Tell us what you want to learn, and we&apos;ll help you get there
          </p>
        </div>
      </div>
    </main>
  );
}
