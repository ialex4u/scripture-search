import { supabase } from './supabase'
import { loadBookmarks, saveBookmarks } from './storage'
import type { Bookmark } from './types'

/** Set while a remote change is being written to localStorage, so that write
 *  does not bounce straight back to the server. */
let applyingRemote = false

interface BookmarkRow {
  verse_id: string
  book_id: string
  saved_at: string
  verse: Bookmark
}

function fromRow(row: BookmarkRow): Bookmark {
  return {
    ...row.verse,
    id: row.verse_id,
    bookId: row.book_id,
    savedAt: Date.parse(row.saved_at),
  }
}

function toRow(userId: string, bookmark: Bookmark) {
  return {
    user_id: userId,
    verse_id: bookmark.id,
    book_id: bookmark.bookId,
    saved_at: new Date(bookmark.savedAt).toISOString(),
    verse: bookmark,
  }
}

async function pull(userId: string): Promise<Bookmark[] | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('bookmarks')
    .select('verse_id, book_id, saved_at, verse')
    .eq('user_id', userId)
    .order('saved_at', { ascending: false })
  if (error || !data) return null
  return (data as BookmarkRow[]).map(fromRow)
}

/** Make the account's rows match the bookmarks on this device. */
async function push(userId: string, bookmarks: Bookmark[]) {
  if (!supabase) return
  if (bookmarks.length) {
    await supabase
      .from('bookmarks')
      .upsert(bookmarks.map((b) => toRow(userId, b)), { onConflict: 'user_id,verse_id' })
  }
  const { data } = await supabase.from('bookmarks').select('verse_id').eq('user_id', userId)
  const keep = new Set(bookmarks.map((b) => b.id))
  const gone = ((data ?? []) as { verse_id: string }[])
    .map((row) => row.verse_id)
    .filter((id) => !keep.has(id))
  if (gone.length) {
    await supabase.from('bookmarks').delete().eq('user_id', userId).in('verse_id', gone)
  }
}

/**
 * Join what was saved on this device before signing in with what the account
 * already holds, then write the union back so both sides agree.
 */
export async function syncBookmarks(userId: string): Promise<Bookmark[] | null> {
  if (!supabase) return null
  const local = loadBookmarks()
  const remote = (await pull(userId)) ?? []

  const merged = new Map<string, Bookmark>()
  for (const bookmark of [...remote, ...local]) {
    const existing = merged.get(bookmark.id)
    if (!existing || bookmark.savedAt > existing.savedAt) merged.set(bookmark.id, bookmark)
  }

  const next = [...merged.values()].sort((a, b) => b.savedAt - a.savedAt)
  applyingRemote = true
  saveBookmarks(next)
  applyingRemote = false

  await push(userId, next)
  return next
}

/** Keep the account up to date as bookmarks are added or removed. */
export function watchBookmarkChanges(userId: string) {
  const onChange = () => {
    if (applyingRemote) return
    void push(userId, loadBookmarks())
  }
  window.addEventListener('ss:bookmarks-changed', onChange)
  return () => window.removeEventListener('ss:bookmarks-changed', onChange)
}

/** Apply changes made on another device as they happen. */
export function subscribeBookmarks(userId: string) {
  if (!supabase) return () => undefined
  const channel = supabase
    .channel(`bookmarks:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'bookmarks', filter: `user_id=eq.${userId}` },
      () => {
        void pull(userId).then((remote) => {
          if (!remote) return
          applyingRemote = true
          saveBookmarks(remote)
          applyingRemote = false
        })
      },
    )
    .subscribe()

  return () => {
    void supabase?.removeChannel(channel)
  }
}

export interface SubscriptionStatus {
  status: string
  currentPeriodEnd: string | null
  priceId: string | null
}

export async function loadSubscription(userId: string): Promise<SubscriptionStatus | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('subscriptions')
    .select('status, current_period_end, price_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data) return null
  const row = data as { status: string; current_period_end: string | null; price_id: string | null }
  return { status: row.status, currentPeriodEnd: row.current_period_end, priceId: row.price_id }
}
