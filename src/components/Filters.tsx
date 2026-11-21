import { useMemo, useState } from 'react'
import type { Registry } from '../lib/types'
import { useSettings } from '../lib/settings'
import type { SearchFilters } from '../lib/hooks'

interface Props {
  registry: Registry
  filters: SearchFilters
  onChange: (filters: SearchFilters) => void
  resultCount?: number
}

export default function Filters({ registry, filters, onChange, resultCount }: Props) {
  const [open, setOpen] = useState(false)
  const { settings, update } = useSettings()

  const bundled = useMemo(
    () => registry.books.filter((b) => (b.verseCount || 0) > 0),
    [registry],
  )
  const booksForSelect = useMemo(
    () =>
      filters.religions.length
        ? bundled.filter((b) => filters.religions.includes(b.religion))
        : bundled,
    [bundled, filters.religions],
  )

  const activeCount = filters.religions.length + filters.bookIds.length
  const toggleReligion = (religion: string) => {
    const has = filters.religions.includes(religion)
    onChange({
      ...filters,
      religions: has
        ? filters.religions.filter((r) => r !== religion)
        : [...filters.religions, religion],
      bookIds: [],
    })
  }

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`chip ${open || activeCount ? 'chip-active' : ''}`}
          aria-expanded={open}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          Filters{activeCount ? ` · ${activeCount}` : ''}
        </button>
        <div className="flex items-center gap-2">
          {typeof resultCount === 'number' && (
            <span className="text-xs text-stone-500 dark:text-stone-400">{resultCount} found</span>
          )}
          <button
            type="button"
            className="chip"
            onClick={() =>
              update({ sortBy: settings.sortBy === 'religion' ? 'relevance' : 'religion' })
            }
          >
            {settings.sortBy === 'religion' ? 'By religion' : 'By relevance'}
          </button>
        </div>
      </div>

      {open && (
        <div className="card mt-2 space-y-4 p-4">
          <div>
            <p className="label mb-2">Religion</p>
            <div className="flex flex-wrap gap-2">
              {registry.religions
                .filter((r) => r.books.some((b) => (b.verseCount || 0) > 0))
                .map((religion) => {
                  const active = filters.religions.includes(religion.name)
                  return (
                    <button
                      key={religion.id}
                      type="button"
                      onClick={() => toggleReligion(religion.name)}
                      className={`chip ${active ? 'chip-active' : ''}`}
                      aria-pressed={active}
                    >
                      {religion.name}
                    </button>
                  )
                })}
            </div>
          </div>

          <div>
            <label className="label mb-2 block" htmlFor="book-filter">
              Book
            </label>
            <select
              id="book-filter"
              value={filters.bookIds[0] || ''}
              onChange={(e) =>
                onChange({ ...filters, bookIds: e.target.value ? [e.target.value] : [] })
              }
              className="h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm dark:border-stone-600 dark:bg-stone-800"
            >
              <option value="">All books</option>
              {booksForSelect.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="label mb-2">Show in results</p>
            <div className="flex flex-wrap gap-2">
              <Toggle
                label="Translation"
                value={settings.showTranslation}
                onChange={(v) => update({ showTranslation: v })}
              />
              <Toggle
                label="Original"
                value={settings.showOriginal}
                onChange={(v) => update({ showOriginal: v })}
              />
              <Toggle
                label="Transliteration"
                value={settings.showTranslit}
                onChange={(v) => update({ showTranslit: v })}
              />
            </div>
          </div>

          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => onChange({ religions: [], bookIds: [] })}
              className="text-sm font-medium text-accent underline dark:text-teal-300"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      aria-pressed={value}
      className={`chip ${value ? 'chip-active' : ''}`}
    >
      {label}
    </button>
  )
}
