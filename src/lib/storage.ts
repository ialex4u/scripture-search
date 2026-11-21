import type { Bookmark, Settings, Verse } from './types'

const KEYS = {
  bookmarks: 'ss.bookmarks.v1',
  recents: 'ss.recents.v1',
  settings: 'ss.settings.v1',
  lastRead: 'ss.lastRead.v1',
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  fontScale: 1,
  showOriginal: true,
  showTranslit: true,
  showTranslation: true,
  // Search results open ranked by match quality; "By religion" stays one
  // tap away in the Filters row for anyone who prefers the equal grouping.
  sortBy: 'relevance',
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return { ...fallback, ...(JSON.parse(raw) as object) } as T
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage may be full or blocked; the app still works for this session */
  }
}

export function loadSettings(): Settings {
  return read<Settings>(KEYS.settings, DEFAULT_SETTINGS)
}

export function saveSettings(settings: Settings) {
  write(KEYS.settings, settings)
}

export function loadBookmarks(): Bookmark[] {
  try {
    return JSON.parse(localStorage.getItem(KEYS.bookmarks) || '[]') as Bookmark[]
  } catch {
    return []
  }
}

export function saveBookmarks(bookmarks: Bookmark[]) {
  write(KEYS.bookmarks, bookmarks)
}

export function toggleBookmark(verse: Verse, bookId: string): Bookmark[] {
  const current = loadBookmarks()
  const exists = current.some((b) => b.id === verse.id)
  const next = exists
    ? current.filter((b) => b.id !== verse.id)
    : [{ ...verse, bookId, savedAt: Date.now() }, ...current]
  saveBookmarks(next)
  return next
}

export function isBookmarked(id: string): boolean {
  return loadBookmarks().some((b) => b.id === id)
}

export function loadRecents(): string[] {
  try {
    return (JSON.parse(localStorage.getItem(KEYS.recents) || '[]') as string[]).slice(0, 8)
  } catch {
    return []
  }
}

export function addRecent(query: string) {
  const q = query.trim()
  if (q.length < 2) return
  const next = [q, ...loadRecents().filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, 8)
  write(KEYS.recents, next)
}

export function clearRecents() {
  write(KEYS.recents, [])
}

export interface LastRead {
  bookId: string
  bookTitle: string
  chapter: number
  chapterTitle?: string
  at: number
}

export function loadLastRead(): LastRead | null {
  try {
    const raw = localStorage.getItem(KEYS.lastRead)
    return raw ? (JSON.parse(raw) as LastRead) : null
  } catch {
    return null
  }
}

export function saveLastRead(last: LastRead) {
  write(KEYS.lastRead, last)
}
