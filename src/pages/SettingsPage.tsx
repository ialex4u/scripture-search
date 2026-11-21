import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSettings } from '../lib/settings'
import { clearRecents, loadBookmarks, loadRecents, saveBookmarks } from '../lib/storage'
import type { ThemePref } from '../lib/types'

interface InstallEvent extends Event {
  prompt: () => Promise<void>
}

export default function SettingsPage() {
  const { settings, update } = useSettings()
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null)
  const [savedCount, setSavedCount] = useState(0)
  const [recentCount, setRecentCount] = useState(0)

  useEffect(() => {
    setSavedCount(loadBookmarks().length)
    setRecentCount(loadRecents().length)
    const handler = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as InstallEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const themes: { id: ThemePref; label: string }[] = [
    { id: 'system', label: 'System' },
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' },
  ]

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">Settings</h1>

      <section className="card mt-4 p-4">
        <h2 className="text-sm font-semibold">Appearance</h2>
        <div className="mt-3 flex gap-2">
          {themes.map((theme) => (
            <button
              key={theme.id}
              type="button"
              onClick={() => update({ theme: theme.id })}
              className={`chip flex-1 ${settings.theme === theme.id ? 'chip-active' : ''}`}
              aria-pressed={settings.theme === theme.id}
            >
              {theme.label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm">Reading text size</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-ghost h-11 min-h-0 px-3"
              onClick={() => update({ fontScale: Math.max(0.85, Math.round((settings.fontScale - 0.1) * 100) / 100) })}
              aria-label="Decrease font size"
            >
              A−
            </button>
            <span className="w-10 text-center text-sm tabular-nums">{Math.round(settings.fontScale * 100)}%</span>
            <button
              type="button"
              className="btn-ghost h-11 min-h-0 px-3"
              onClick={() => update({ fontScale: Math.min(1.6, Math.round((settings.fontScale + 0.1) * 100) / 100) })}
              aria-label="Increase font size"
            >
              A+
            </button>
          </div>
        </div>
      </section>

      <section className="card mt-3 p-4">
        <h2 className="text-sm font-semibold">What to show</h2>
        <div className="mt-3 space-y-2">
          <Row
            label="English translation"
            checked={settings.showTranslation}
            onChange={(v) => update({ showTranslation: v })}
          />
          <Row
            label="Original language"
            checked={settings.showOriginal}
            onChange={(v) => update({ showOriginal: v })}
          />
          <Row
            label="Transliteration"
            checked={settings.showTranslit}
            onChange={(v) => update({ showTranslit: v })}
          />
        </div>
        <p className="mt-3 text-xs text-stone-400">
          Verses marked “auto-transliterated” were romanised by software from the original script;
          the scripture text itself is never altered.
        </p>
      </section>

      <section className="card mt-3 p-4">
        <h2 className="text-sm font-semibold">Search</h2>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm">Default ordering</span>
          <div className="flex gap-2">
            <button
              type="button"
              className={`chip ${settings.sortBy === 'religion' ? 'chip-active' : ''}`}
              onClick={() => update({ sortBy: 'religion' })}
            >
              By religion
            </button>
            <button
              type="button"
              className={`chip ${settings.sortBy === 'relevance' ? 'chip-active' : ''}`}
              onClick={() => update({ sortBy: 'relevance' })}
            >
              Relevance
            </button>
          </div>
        </div>
      </section>

      <section className="card mt-3 p-4">
        <h2 className="text-sm font-semibold">Offline & install</h2>
        <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
          This app is a PWA. Add it to your home screen for an app-like, offline reading
          experience. Collections you open are cached on your device.
        </p>
        <button
          type="button"
          disabled={!installEvent}
          onClick={async () => {
            await installEvent?.prompt()
            setInstallEvent(null)
          }}
          className="btn mt-3 w-full"
        >
          {installEvent ? 'Install app' : 'Already installed or not available in this browser'}
        </button>
      </section>

      <section className="card mt-3 p-4">
        <h2 className="text-sm font-semibold">Your data</h2>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          {savedCount} bookmarks · {recentCount} recent searches. All stored locally; nothing is
          sent anywhere.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className="btn-ghost flex-1"
            onClick={() => {
              if (confirm('Clear recent searches?')) {
                clearRecents()
                setRecentCount(0)
              }
            }}
          >
            Clear recent searches
          </button>
          <button
            type="button"
            className="btn-ghost flex-1"
            onClick={() => {
              if (confirm('Remove all bookmarks? This cannot be undone.')) {
                saveBookmarks([])
                setSavedCount(0)
              }
            }}
          >
            Clear bookmarks
          </button>
        </div>
      </section>

      <div className="mt-4 flex items-center justify-between px-1 text-sm">
        <Link to="/about" className="font-medium text-accent dark:text-teal-300">
          About & data sources
        </Link>
        <span className="text-xs text-stone-400">v1.0.0</span>
      </div>
    </div>
  )
}

function Row({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex min-h-[2.75rem] items-center justify-between gap-3">
      <span className="text-sm">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-stone-300 transition-colors checked:bg-accent dark:bg-stone-600"
        style={{ accentColor: '#0f766e' }}
      />
    </label>
  )
}
