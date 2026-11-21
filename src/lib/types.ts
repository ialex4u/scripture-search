export type Script = 'arabic' | 'devanagari' | 'hebrew' | 'gurmukhi' | 'han' | 'latin'

export interface ShardFile {
  path: string
  chapters?: number[]
  firstChapter?: number
  lastChapter?: number
}

export interface BookMeta {
  id: string
  religion: string
  title: string
  language?: string
  script?: Script
  translationName?: string
  translator?: string
  license?: string
  sourceUrl?: string
  coverage?: string
  notes?: string
  verseCount?: number
  chapterCount?: number
  autoTranslit?: number
  files?: ShardFile[]
  chaptersFile?: string
  status?: 'bundled' | 'unavailable'
  reason?: string
  summary?: string
}

export interface Religion {
  id: string
  name: string
  books: BookMeta[]
  verseCount?: number
}

export interface Registry {
  generated: string
  stats: { books: number; verses: number; bundledBooks: number }
  religions: Religion[]
  books: BookMeta[]
}

export interface Verse {
  id: string
  religion: string
  book: string
  chapter: number
  chapterTitle?: string
  verse: number
  ref?: string
  original?: string
  translit?: string
  autoTranslit?: boolean
  translation: string
  translationName?: string
  translator?: string
  tags?: string[]
}

export interface Chapter {
  number: number
  title?: string
  verses: Verse[]
}

export interface BookFile {
  book: {
    id: string
    religion: string
    title: string
    language: string
    script: Script
    translationName: string
    translator: string
    license: string
    sourceUrl: string
    coverage?: string
    notes?: string
    shard?: string
  }
  chapters: Chapter[]
}

export interface SearchHit extends Verse {
  bookId: string
  score: number
  matchedTerms: string[]
}

export interface Bookmark extends Verse {
  bookId: string
  savedAt: number
}

export type ThemePref = 'light' | 'dark' | 'system'
export type SortPref = 'religion' | 'relevance'

export interface Settings {
  theme: ThemePref
  fontScale: number
  showOriginal: boolean
  showTranslit: boolean
  showTranslation: boolean
  sortBy: SortPref
}
