"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { LogIn, LogOut } from "lucide-react";

export default function Home() {
  const [futureGoal, setFutureGoal] = useState("");
  const router = useRouter();
  const { user, signInWithGoogle, signOut, loading } = useAuth();

  /**
   * Handles form submission
   * Navigates to chat page with the goal
   */
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (futureGoal.trim()) {
      // Store goal in session storage to be picked up by the chat page
      sessionStorage.setItem("career_goal", futureGoal);
      router.push("/chat");
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-8 relative">
      {/* Auth UI */}
      <div className="absolute top-8 right-8">
        {loading ? (
          <div className="w-8 h-8 animate-pulse bg-neutral-200 dark:bg-neutral-800 rounded-full" />
        ) : user ? (
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium hidden sm:inline">{user.email}</span>
            <button
              onClick={() => signOut()}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => signInWithGoogle()}
            className="flex items-center space-x-2 px-6 py-3 text-sm font-semibold rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:opacity-90 transition-all shadow-lg"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In with Google</span>
          </button>
        )}
      </div>

      {/* Main centered container */}
      <div className="w-full max-w-2xl flex flex-col items-center text-center space-y-8 mt-12">

        {/* Headline section */}
        <div className="space-y-3">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-balance">
            What do you want to become?
          </h1>
          <p className="text-lg sm:text-xl text-neutral-600 dark:text-neutral-400 text-balance">
            Choose your path and start your learning journey tonight
          </p>
        </div>

        {/* Input form section */}
        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">

          {/* Text input field */}
          <input
            type="text"
            value={futureGoal}
            onChange={(e) => setFutureGoal(e.target.value)}
            placeholder="e.g., Data Analyst, Programmer, Product Designer"
            className="w-full px-6 py-4 text-base sm:text-lg rounded-lg border-2 border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-foreground placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 focus:border-transparent transition-all duration-200 hover:border-neutral-400 dark:hover:border-neutral-600"
            aria-label="Enter your future goal or skill"
          />

          {/* Submit button */}
          <button
            type="submit"
            className="w-full px-6 py-4 text-base sm:text-lg font-semibold rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!futureGoal.trim()}
          >
            Continue
          </button>
        </form>

        {/* Optional helper text */}
        <p className="text-sm text-neutral-500 dark:text-neutral-500 max-w-md">
          {user ? "Ready to level up your career?" : "Sign in to save your roadmap and track progress"}
        </p>
      </div>
    </main>
  );
}
