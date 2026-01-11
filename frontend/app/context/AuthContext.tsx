"use client";

/**
 * Authentication Context
 * 
 * Provides authentication state and methods to the entire application.
 * Handles session persistence and automatic token refresh via Supabase.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import {
  signUp as authSignUp,
  signIn as authSignIn,
  signOut as authSignOut,
  getSession,
  onAuthStateChange,
  parseAuthError,
  type AuthResult,
} from "../lib/auth";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, password: string) => Promise<AuthContextResult>;
  signIn: (email: string, password: string) => Promise<AuthContextResult>;
  signOut: () => Promise<{ error: string | null }>;
}

interface AuthContextResult {
  success: boolean;
  error: string | null;
  needsEmailVerification?: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state on mount
  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        const currentSession = await getSession();
        if (mounted) {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initializeAuth();

    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChange((newUser, newSession) => {
      if (mounted) {
        setUser(newUser);
        setSession(newSession);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const signUp = useCallback(
    async (email: string, password: string): Promise<AuthContextResult> => {
      const result: AuthResult = await authSignUp(email, password);

      if (result.error) {
        const { error } = parseAuthError(result.error);
        return { success: false, error };
      }

      // Check if email confirmation is required
      // Supabase returns user but no session if email confirmation is enabled
      if (result.user && !result.session) {
        return {
          success: true,
          error: null,
          needsEmailVerification: true,
        };
      }

      return { success: true, error: null };
    },
    []
  );

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthContextResult> => {
      const result: AuthResult = await authSignIn(email, password);

      if (result.error) {
        const { error } = parseAuthError(result.error);
        return { success: false, error };
      }

      return { success: true, error: null };
    },
    []
  );

  const signOut = useCallback(async (): Promise<{ error: string | null }> => {
    const result = await authSignOut();

    if (result.error) {
      const { error } = parseAuthError(result.error);
      return { error };
    }

    return { error: null };
  }, []);

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    isAuthenticated: !!user && !!session,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access authentication context.
 * Must be used within an AuthProvider.
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

