import { useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { subscribeBookmarks, syncBookmarks, watchBookmarkChanges } from '../lib/sync'
import { isAccountsEnabled } from '../lib/supabase'

/** Runs entirely in the background: no markup, no visible effect. */
export default function AccountSync() {
  const { user } = useAuth()

  useEffect(() => {
    if (!isAccountsEnabled || !user) return
    void syncBookmarks(user.id)
    const stopWatching = watchBookmarkChanges(user.id)
    const stopRealtime = subscribeBookmarks(user.id)
    return () => {
      stopWatching()
      stopRealtime()
    }
  }, [user])

  return null
}
