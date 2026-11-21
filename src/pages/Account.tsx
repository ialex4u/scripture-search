import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { loadBookmarks } from '../lib/storage'
import { isAccountsEnabled } from '../lib/supabase'
import { loadSubscription, syncBookmarks, type SubscriptionStatus } from '../lib/sync'

function SetupNotice() {
  return (
    <div className="card mt-5 p-5">
      <p className="font-medium">Accounts are not switched on yet</p>
      <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
        This build has no account service connected, so everything still works the way it always
        has: reading, searching and bookmarks saved on this device. Nothing is broken.
      </p>
      <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
        To turn sign-in on, the project needs a database URL and a public key from Supabase, and the
        schema in <code className="rounded bg-stone-200/70 px-1 py-0.5 text-xs dark:bg-stone-700">supabase/schema.sql</code>{' '}
        run once in its SQL editor.
      </p>
    </div>
  )
}

export default function Account() {
  const { user, loading, sendMagicLink, signInWithGoogle, signOut } = useAuth()
  const [email, setEmail] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(0)
  const [plan, setPlan] = useState<SubscriptionStatus | null>(null)

  useEffect(() => {
    setSaved(loadBookmarks().length)
  }, [user])

  useEffect(() => {
    if (!user) {
      setPlan(null)
      return
    }
    let alive = true
    void loadSubscription(user.id).then((next) => alive && setPlan(next))
    return () => {
      alive = false
    }
  }, [user])

  const submitEmail = async (event: FormEvent) => {
    event.preventDefault()
    if (!email.trim()) return
    setBusy(true)
    setError('')
    setNotice('')
    const message = await sendMagicLink(email)
    setBusy(false)
    if (message) setError(message)
    else setNotice(`Check ${email.trim()} for a sign-in link. It opens this page and signs you in.`)
  }

  const google = async () => {
    setBusy(true)
    setError('')
    const message = await signInWithGoogle()
    setBusy(false)
    if (message) setError(message)
  }

  const active = plan && ['active', 'trialing'].includes(plan.status)

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">Account</h1>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        An account keeps your saved verses in step between your phone and your computer. Reading and
        searching never need one.
      </p>

      {!isAccountsEnabled ? (
        <SetupNotice />
      ) : loading ? (
        <div className="mt-6 flex items-center text-sm text-stone-500">
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-accent" />
          Checking…
        </div>
      ) : !user ? (
        <form onSubmit={submitEmail} className="card mt-5 space-y-3 p-5">
          <label className="label block" htmlFor="account-email">
            Email address
          </label>
          <input
            id="account-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-stone-600 dark:bg-stone-800"
          />
          <button type="submit" className="btn w-full" disabled={busy}>
            {busy ? 'Sending…' : 'Email me a sign-in link'}
          </button>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            No password to remember or forget. The link is valid for one sign-in.
          </p>

          <div className="flex items-center gap-3 py-1">
            <span className="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
            <span className="text-xs uppercase tracking-wide text-stone-400">or</span>
            <span className="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
          </div>

          <button type="button" onClick={google} className="btn w-full" disabled={busy}>
            Continue with Google
          </button>

          {notice && (
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
              {notice}
            </p>
          )}
          {error && (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">
              {error}
            </p>
          )}
        </form>
      ) : (
        <div className="mt-5 space-y-3">
          <div className="card p-5">
            <p className="text-sm text-stone-500 dark:text-stone-400">Signed in as</p>
            <p className="mt-0.5 font-medium break-all">{user.email}</p>
            <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
              {saved} saved {saved === 1 ? 'verse' : 'verses'} synced to this account.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn"
                onClick={() => void syncBookmarks(user.id).then(() => setSaved(loadBookmarks().length))}
              >
                Sync now
              </button>
              <button type="button" className="chip" onClick={() => void signOut()}>
                Sign out
              </button>
            </div>
          </div>

          <div className="card p-5">
            <p className="text-sm font-semibold">Plan</p>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
              {active
                ? `Subscribed${plan?.currentPeriodEnd ? `, renews ${new Date(plan.currentPeriodEnd).toLocaleDateString()}` : ''}.`
                : 'Free — every feature in the app is included.'}
            </p>
            <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
              {active
                ? 'Manage or cancel any time; your verses stay readable either way.'
                : 'Payments are not connected yet, so nothing is charged and no upgrade is offered.'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
