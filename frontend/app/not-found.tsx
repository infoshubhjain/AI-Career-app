import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6 animate-fade-in-up">
        {/* 404 illustration */}
        <div className="space-y-2">
          <p className="text-8xl font-bold text-gradient">404</p>
          <div className="w-24 h-1 mx-auto bg-gradient-to-r from-transparent via-neutral-400 to-transparent" />
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Page not found
          </h1>
          <p className="text-muted">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        {/* Action button */}
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
        >
          <svg
            className="w-4 h-4 mr-2"
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
      </div>
    </div>
  );
}

