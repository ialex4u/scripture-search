import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isAccountsEnabled, supabase } from './supabase'

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  /** Returns an error message, or null when the link was sent. */
  sendMagicLink: (email: string) => Promise<string | null>
  signInWithGoogle: () => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: false,
  sendMagicLink: async () => 'Accounts are not configured on this build.',
  signInWithGoogle: async () => 'Accounts are not configured on this build.',
  signOut: async () => undefined,
})

/** Where a sign-in link should land once it is clicked. */
function redirectTo() {
  return `${window.location.origin}${window.location.pathname}#/account`
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isAccountsEnabled)

  useEffect(() => {
    if (!supabase) return
    let alive = true

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setLoading(false)
    })

    return () => {
      alive = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const sendMagicLink = useCallback(async (email: string) => {
    if (!supabase) return 'Accounts are not configured on this build.'
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo() },
    })
    return error ? error.message : null
  }, [])

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return 'Accounts are not configured on this build.'
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectTo() },
    })
    return error ? error.message : null
  }, [])

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut()
  }, [])

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      sendMagicLink,
      signInWithGoogle,
      signOut,
    }),
    [session, loading, sendMagicLink, signInWithGoogle, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
