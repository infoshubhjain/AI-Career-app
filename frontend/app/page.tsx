"use client";

import { useState, FormEvent } from "react";

export default function Home() {
  const [futureGoal, setFutureGoal] = useState("");

  /**
   * Handles form submission
   * Logs the user's input - extend this to navigate or process data
   */
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (futureGoal.trim()) {
      console.log("User wants to become:", futureGoal);
      // TODO: Add navigation or API call here
    }
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center px-4 py-8">
      {/* Main centered container */}
      <div className="w-full max-w-2xl flex flex-col items-center text-center space-y-8">

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
          Tell us what you want to learn, and we'll help you get there
        </p>
      </div>
    </main>
  );
}
