"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    async function handleCallback() {
      try {
        const supabase = createClient();
        if (!supabase) {
          setStatus("error");
          setMessage("Authentication service unavailable");
          return;
        }

        const code = searchParams.get("code");
        const tokenHash = searchParams.get("token_hash");
        const type = searchParams.get("type");

        if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "email",
          });

          if (error) {
            setStatus("error");
            setMessage(error.message);
            return;
          }
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            if (error.message.includes("PKCE code verifier not found")) {
              setStatus("success");
              setMessage("Your email was verified. Return to the app and sign in if needed.");
              setTimeout(() => {
                router.push("/auth/login?verified=true");
              }, 1500);
              return;
            }

            setStatus("error");
            setMessage(error.message);
            return;
          }
        }

        setStatus("success");
        setMessage("Email verified successfully!");

        const { data } = await supabase.auth.getSession();
        setTimeout(() => {
          router.push(data.session ? "/" : "/auth/login?verified=true");
        }, 1500);
      } catch (err) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "An error occurred");
      }
    }

    handleCallback();
  }, [router, searchParams]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-6">
        {status === "processing" && (
          <>
            <div className="animate-spin h-12 w-12 mx-auto border-4 border-neutral-200 dark:border-neutral-800 border-t-neutral-900 dark:border-t-neutral-100 rounded-full" />
            <p className="text-lg text-muted">{message}</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">{message}</h1>
              <p className="text-muted">Redirecting...</p>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">Verification Failed</h1>
              <p className="text-muted">{message}</p>
            </div>
            <button
              onClick={() => router.push("/auth/login")}
              className="px-6 py-3 text-base font-semibold rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
            >
              Go to Login
            </button>
          </>
        )}
      </div>
    </main>
  );
}
