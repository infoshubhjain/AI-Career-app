export default function Loading() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        {/* Spinner */}
        <div className="relative">
          <div className="w-12 h-12 border-4 border-neutral-200 dark:border-neutral-800 rounded-full" />
          <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-neutral-900 dark:border-t-neutral-100 rounded-full animate-spin" />
        </div>
        
        {/* Loading text */}
        <p className="text-sm text-muted animate-pulse">
          Loading...
        </p>
      </div>
    </div>
  );
}

