import type { BookFile, BookMeta, Registry } from './types'

const cache = new Map<string, Promise<unknown>>()

function fetchJSON<T>(path: string): Promise<T> {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(path, { cache: 'force-cache' }).then((res) => {
        if (!res.ok) throw new Error(`${res.status} loading ${path}`)
        return res.json() as Promise<T>
      }),
    )
  }
  return cache.get(path) as Promise<T>
}

export function loadRegistry(): Promise<Registry> {
  return fetchJSON<Registry>('data/registry.json')
}

export function loadSynonyms(): Promise<Record<string, string[]>> {
  return fetchJSON<Record<string, string[]>>('data/synonyms.json')
}

export interface LoadedBook {
  meta: BookFile['book']
  chapters: BookFile['chapters']
}

const bookCache = new Map<string, LoadedBook>()

export async function loadBookFile(path: string): Promise<BookFile> {
  return fetchJSON<BookFile>(path)
}

/** Load every shard of a collection (used by the search index and reader). */
export async function loadBookShards(meta: BookMeta): Promise<LoadedBook[]> {
  const files = meta.files || []
  const loaded = await Promise.all(
    files.map(async (file) => {
      const key = `${meta.id}:${file.path}`
      const hit = bookCache.get(key)
      if (hit) return hit
      const json = await loadBookFile(file.path)
      const value: LoadedBook = { meta: json.book, chapters: json.chapters }
      bookCache.set(key, value)
      return value
    }),
  )
  return loaded
}

/** Load just the shard that contains a chapter (keeps mobile reads light). */
export async function loadChapter(meta: BookMeta, chapter: number) {
  const files = meta.files || []
  const target =
    files.find((f) => f.chapters?.includes(chapter)) ||
    files.find(
      (f) =>
        f.firstChapter != null &&
        f.lastChapter != null &&
        chapter >= f.firstChapter &&
        chapter <= f.lastChapter,
    ) ||
    files[0]
  if (!target) throw new Error('This collection has no data files')
  const key = `${meta.id}:${target.path}`
  let loaded = bookCache.get(key)
  if (!loaded) {
    const json = await loadBookFile(target.path)
    loaded = { meta: json.book, chapters: json.chapters }
    bookCache.set(key, loaded)
  }
  const found = loaded.chapters.find((c) => c.number === chapter)
  if (!found) throw new Error('Chapter not found in this shard')
  return { book: loaded.meta, chapter: found, chapters: loaded.chapters }
}

export function bundledBooks(registry: Registry): BookMeta[] {
  return registry.books.filter((b) => b.status !== 'unavailable' && (b.verseCount || 0) > 0)
}
