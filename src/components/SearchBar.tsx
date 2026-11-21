import { useEffect, useRef } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  onSubmit?: () => void
  autoFocus?: boolean
  placeholder?: string
}

export default function SearchBar({
  value,
  onChange,
  onSubmit,
  autoFocus = false,
  placeholder = 'Search a word, feeling, or theme…',
}: Props) {
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (autoFocus) input.current?.focus()
  }, [autoFocus])

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit?.()
      }}
      className="relative"
    >
      <label htmlFor="scripture-search" className="sr-only">
        Search scriptures
      </label>
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.2-3.2" />
      </svg>
      <input
        id="scripture-search"
        ref={input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type="search"
        inputMode="search"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        placeholder={placeholder}
        className="h-14 w-full rounded-2xl border border-stone-300 bg-white pl-12 pr-12 text-base text-ink-900 shadow-card outline-none transition placeholder:text-stone-400 focus:border-accent focus:ring-4 focus:ring-accent/15 dark:border-stone-600 dark:bg-stone-800 dark:text-parchment-100"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange('')
            input.current?.focus()
          }}
          aria-label="Clear search"
          className="absolute right-6 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-200"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      )}
    </form>
  )
}
