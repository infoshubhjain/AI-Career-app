"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SignupForm } from "@/app/components/auth";
import { useAuth } from "@/contexts/auth-context";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      router.push("/");
    }
  }, [user, loading, router]);

  // Show loading while checking auth state
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-neutral-200 dark:border-neutral-800 border-t-neutral-900 dark:border-t-neutral-100 rounded-full" />
      </main>
    );
  }

  // Don't render form if authenticated (will redirect)
  if (user) {
    return null;
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Back to home link */}
        <Link
          href="/"
          className="inline-flex items-center text-sm text-muted hover:text-foreground transition-colors"
        >
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to home
        </Link>

        <SignupForm onSuccess={() => router.push("/")} />
      </div>
    </main>
  );
}

