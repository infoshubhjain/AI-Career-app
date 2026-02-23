import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AuthCallbackPage(props: {
    searchParams: Promise<{ code: string }>
}) {
    const searchParams = await props.searchParams
    const code = searchParams.code

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            return redirect('/')
        }
    }

    // return the user to an error page with instructions
    return redirect('/auth/auth-code-error')
}
