import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import VerseCard from '../components/VerseCard'
import { useRegistry } from '../lib/hooks'
import { loadBookmarks } from '../lib/storage'
import type { Bookmark } from '../lib/types'

export default function Bookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const { registry } = useRegistry()

  useEffect(() => {
    setBookmarks(loadBookmarks())
  }, [])

  const scriptFor = (bookId: string) =>
    registry?.books.find((b) => b.id === bookId)?.script

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">Bookmarks</h1>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        Saved on this device only. {bookmarks.length ? `${bookmarks.length} saved.` : ''}
      </p>

      {bookmarks.length === 0 ? (
        <div className="card mt-5 p-6 text-center">
          <p className="font-medium">Nothing saved yet</p>
          <p className="mt-1 text-sm text-stone-500">
            Tap the bookmark icon on any verse to keep it here, even offline.
          </p>
          <Link to="/" className="btn mt-4">
            Find a verse
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {bookmarks.map((bookmark) => (
            <VerseCard
              key={bookmark.id}
              verse={bookmark}
              bookId={bookmark.bookId}
              script={scriptFor(bookmark.bookId)}
              savedLabel
              onRemove={() => setBookmarks(loadBookmarks())}
            />
          ))}
        </div>
      )}
    </div>
  )
}
