'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type User, type Session } from '@supabase/supabase-js'

const DEV_AUTH_STORAGE_KEY = 'dev_auth_enabled'
const DEV_AUTH_ENABLED = process.env.NEXT_PUBLIC_DEV_LOGIN === 'true'

type AuthContextType = {
    user: User | null
    session: Session | null
    loading: boolean
    isDevUser: boolean
    devAuthEnabled: boolean
    signIn: (email: string, password: string) => Promise<{ success: boolean; error: string | null }>
    signUp: (
        email: string,
        password: string
    ) => Promise<{ success: boolean; error: string | null; needsEmailVerification?: boolean }>
    signOut: () => Promise<void>
    signInWithGoogle: () => Promise<void>
    signInAsDev: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function buildDevUser(): User {
    return {
        id: '00000000-0000-4000-8000-000000000001',
        email: 'dev@local.test',
        app_metadata: { provider: 'development' },
        user_metadata: { display_name: 'Dev User' },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
    } as User
}

async function ensureProfileRow(user: User) {
    const supabase = createClient()
    if (!supabase) return

    const displayName =
        (user.user_metadata?.display_name as string | undefined) ||
        (user.user_metadata?.full_name as string | undefined) ||
        user.email?.split('@')[0] ||
        'Career Explorer'

    const profilePayload = {
        id: user.id,
        display_name: displayName,
        avatar_url: (user.user_metadata?.avatar_url as string | undefined) || null,
        xp: 0,
        streak_days: 0,
        current_level: 1,
    }

    const { error } = await supabase.from('profiles').upsert(profilePayload, { onConflict: 'id' })
    if (error) {
        console.error('[auth] failed to ensure profile row', error)
    }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)
    const [isDevUser, setIsDevUser] = useState(false)
    const supabaseRef = useRef(createClient())
    const supabase = supabaseRef.current

    useEffect(() => {
        const devModeActive = typeof window !== 'undefined' && sessionStorage.getItem(DEV_AUTH_STORAGE_KEY) === 'true'
        if (DEV_AUTH_ENABLED && devModeActive) {
            setUser(buildDevUser())
            setSession(null)
            setIsDevUser(true)
            setLoading(false)
            console.log('[auth] restored development login')
            return
        }

        if (!supabase) {
            setLoading(false)
            return
        }

        const getSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession()
                setSession(session)
                setUser(session?.user ?? null)
                setIsDevUser(false)
            } catch (error) {
                console.error('Error fetching session:', error)
            } finally {
                setLoading(false)
            }
        }

        getSession()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
            setSession(session)
            setUser(session?.user ?? null)
            setIsDevUser(false)
            setLoading(false)
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [])

    const signOut = async () => {
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem(DEV_AUTH_STORAGE_KEY)
        }
        setIsDevUser(false)

        if (!supabase) {
            setUser(null)
            setSession(null)
            return
        }
        await supabase.auth.signOut()
    }

    const signIn = async (email: string, password: string) => {
        if (!supabase) {
            return { success: false, error: 'Supabase auth is not configured.' }
        }

        const { data, error } = await supabase.auth.signInWithPassword({ email, password })

        if (error) {
            return { success: false, error: error.message }
        }

        if (data.user) {
            await ensureProfileRow(data.user)
        }

        return { success: true, error: null }
    }

    const signUp = async (email: string, password: string) => {
        if (!supabase) {
            return { success: false, error: 'Supabase auth is not configured.' }
        }

        const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: redirectTo },
        })

        if (error) {
            return { success: false, error: error.message }
        }

        if (data.user && data.session) {
            await ensureProfileRow(data.user)
        }

        return {
            success: true,
            error: null,
            needsEmailVerification: Boolean(data.user && !data.session),
        }
    }

    const signInWithGoogle = async () => {
        if (!supabase) return
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}/auth/callback` },
        })
    }

    const signInAsDev = () => {
        if (!DEV_AUTH_ENABLED || typeof window === 'undefined') return
        sessionStorage.setItem(DEV_AUTH_STORAGE_KEY, 'true')
        setUser(buildDevUser())
        setSession(null)
        setIsDevUser(true)
        setLoading(false)
        console.log('[auth] development login enabled')
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                session,
                loading,
                isDevUser,
                devAuthEnabled: DEV_AUTH_ENABLED,
                signIn,
                signUp,
                signOut,
                signInWithGoogle,
                signInAsDev,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
