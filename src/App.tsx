import { lazy, Suspense } from 'react'
import { Link, NavLink, Route, Routes } from 'react-router-dom'
import AccountSync from './components/AccountSync'

const Home = lazy(() => import('./pages/Home'))
const SearchPage = lazy(() => import('./pages/SearchPage'))
const Browse = lazy(() => import('./pages/Browse'))
const BookPage = lazy(() => import('./pages/BookPage'))
const Reader = lazy(() => import('./pages/Reader'))
const Bookmarks = lazy(() => import('./pages/Bookmarks'))
const Account = lazy(() => import('./pages/Account'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const About = lazy(() => import('./pages/About'))

const nav = [
  { to: '/', label: 'Search', icon: SearchIcon },
  { to: '/browse', label: 'Browse', icon: BookIcon },
  { to: '/bookmarks', label: 'Saved', icon: BookmarkIcon },
  { to: '/account', label: 'Account', icon: PersonIcon },
  { to: '/settings', label: 'Settings', icon: GearIcon },
]

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col">
      <header className="sticky top-0 z-30 border-b border-stone-200/70 bg-parchment-50/90 backdrop-blur-lg dark:border-stone-700/60 dark:bg-ink-900/85">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-white shadow-sm">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
                <path d="M8 7h7M8 11h7M8 15h4" />
              </svg>
            </span>
            <span className="text-lg font-semibold tracking-tight">Scripture Search</span>
          </Link>
          <Link to="/about" className="text-sm font-medium text-stone-500 hover:text-accent dark:text-stone-400">
            About
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 pb-28 pt-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg dark:border-stone-700/70 dark:bg-stone-900/95">
        <div className="mx-auto grid max-w-3xl grid-cols-5">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex min-h-[3.75rem] flex-col items-center justify-center gap-1 text-[0.7rem] font-medium ${
                  isActive
                    ? 'text-accent dark:text-teal-300'
                    : 'text-stone-500 dark:text-stone-400'
                }`
              }
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

function Loading() {
  return (
    <div className="flex items-center justify-center py-20 text-stone-500">
      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-accent" />
      Loading…
    </div>
  )
}

export default function App() {
  return (
    <Shell>
      <AccountSync />
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/browse/:bookId" element={<BookPage />} />
          <Route path="/read/:bookId/:chapter" element={<Reader />} />
          <Route path="/bookmarks" element={<Bookmarks />} />
          <Route path="/account" element={<Account />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </Suspense>
    </Shell>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  )
}
function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
      <path d="M4 5.5v16" />
    </svg>
  )
}
function BookmarkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 3h12v18l-6-4.5L6 21z" />
    </svg>
  )
}
function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" />
    </svg>
  )
}
function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9v.06a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z" />
    </svg>
  )
}
