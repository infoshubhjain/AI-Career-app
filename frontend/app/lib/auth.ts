/**
 * Authentication Service
 * 
 * Provides authentication functions using Supabase Auth.
 * All auth operations happen on the frontend only.
 */

import { supabase } from "./supabase";
import type { User, Session, AuthError } from "@supabase/supabase-js";

export interface AuthResult {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

export interface AuthErrorResult {
  error: string;
  code?: string;
}

/**
 * Parse Supabase auth errors into user-friendly messages
 */
function parseAuthError(error: AuthError): AuthErrorResult {
  const errorMessages: Record<string, string> = {
    "Invalid login credentials": "Invalid email or password. Please try again.",
    "Email not confirmed": "Please verify your email address before signing in.",
    "User already registered": "An account with this email already exists.",
    "Password should be at least 6 characters": "Password must be at least 6 characters long.",
    "Unable to validate email address: invalid format": "Please enter a valid email address.",
    "Signup requires a valid password": "Please enter a valid password.",
  };

  const message = errorMessages[error.message] || error.message;
  return { error: message, code: error.code };
}

/**
 * Get the base URL for redirects
 */
function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

/**
 * Sign up a new user with email and password
 */
export async function signUp(
  email: string,
  password: string
): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getBaseUrl()}/auth/callback`,
    },
  });

  if (error) {
    return {
      user: null,
      session: null,
      error,
    };
  }

  return {
    user: data.user,
    session: data.session,
    error: null,
  };
}

/**
 * Sign in an existing user with email and password
 */
export async function signIn(
  email: string,
  password: string
): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      user: null,
      session: null,
      error,
    };
  }

  return {
    user: data.user,
    session: data.session,
    error: null,
  };
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Get the current session
 */
export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * Get the current user
 */
export async function getUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

/**
 * Get the JWT access token from the current session.
 * This token can be sent to FastAPI as Authorization: Bearer <token>
 */
export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  return session?.access_token ?? null;
}

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function.
 */
export function onAuthStateChange(
  callback: (user: User | null, session: Session | null) => void
) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      callback(session?.user ?? null, session);
    }
  );

  return () => subscription.unsubscribe();
}

export { parseAuthError };

