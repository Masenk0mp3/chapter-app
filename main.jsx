import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'
const STORAGE_KEY = 'chapter-library-v02'
const THEME_KEY = 'chapter-theme-v02'

const demoBooks = [
  {
    id: 'demo-etranger',
    title: "L'Étranger",
    author: 'Albert Camus',
    year: 1942,
    cover: 'https://covers.openlibrary.org/b/isbn/9782070360024-L.jpg',
    status: 'finished',
    rating: 5,
    review: 'Une lecture courte, froide et marquante.',
  },
  {
    id: 'demo-dune',
    title: 'Dune',
    author: 'Frank Herbert',
    year: 1965,
    cover: 'https://covers.openlibrary.org/b/isbn/9782266320481-L.jpg',
    status: 'reading',
    rating: 0,
    review: '',
  },
]

const statusLabels = {
  wishlist: 'À lire',
  reading: 'En cours',
  finished: 'Terminé',
}

function coverUrl(doc) {
  if (doc.cover_i) return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
  if (doc.isbn?.[0]) return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-L.jpg`
  return ''
}

function normaliseResult(doc) {
  return {
    id: doc.key || `${doc.title}-${doc.first_publish_year || 'na'}`,
    title: doc.title || 'Sans titre',
    author: doc.author_name?.[0] || 'Auteur inconnu',
    year: doc.first_publish_year || null,
    cover: coverUrl(doc),
    status: 'wishlist',
    rating: 0,
    review: '',
  }
}

function Stars({ value, onChange }) {
  return (
    <div className="stars" aria-label="Note sur 5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={star <= value ? 'active' : ''}
          onClick={() => onChange(star)}
          aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

function BookCover({ book }) {
  return book.cover ? (
    <img className="book-cover" src={book.cover} alt={`Couverture de ${book.title}`} />
  ) : (
    <div className="book-cover placeholder">CHAPTER</div>
  )
}

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'dark')
  const [tab, setTab] = useState('home')
  const [library, setLibrary] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
      return Array.isArray(saved) ? saved : demoBooks
    } catch {
      return demoBooks
    }
  })
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(library))
  }, [library])

  const stats = useMemo(() => {
    const finished = library.filter((b) => b.status === 'finished')
    const authors = new Set(finished.map((b) => b.author))
    return { total: library.length, finished: finished.length, authors: authors.size }
  }, [library])

  async function searchBooks(event) {
    event?.preventDefault()
    if (query.trim().length < 2) {
      setMessage('Écris au moins deux lettres.')
      return
    }
    setLoading(true)
    setMessage('')
    try {
      const params = new URLSearchParams({ q: query.trim(), language: 'fre', limit: '18' })
      const response = await fetch(`${OPEN_LIBRARY_SEARCH}?${params}`)
      if (!response.ok) throw new Error('Recherche indisponible')
      const data = await response.json()
      setResults((data.docs || []).map(normaliseResult))
      if (!data.docs?.length) setMessage('Aucun livre trouvé.')
    } catch {
      setMessage('Impossible de rechercher pour le moment. Réessaie dans quelques secondes.')
    } finally {
      setLoading(false)
    }
  }

  function addBook(book) {
    if (library.some((item) => item.id === book.id)) {
      setMessage('Ce livre est déjà dans ta bibliothèque.')
      return
    }
    setEditing({ ...book })
  }

  function saveBook(book) {
    setLibrary((current) => {
      const exists = current.some((item) => item.id === book.id)
      return exists ? current.map((item) => (item.id === book.id ? book : item)) : [book, ...current]
    })
    setEditing(null)
    setMessage('Livre enregistré dans ta bibliothèque ✨')
    setTab('library')
  }

  function deleteBook(id) {
    setLibrary((current) => current.filter((book) => book.id !== id))
    setEditing(null)
    setMessage('Livre supprimé.')
  }

  const recentBooks = library.slice(0, 4)

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setTab('home')} aria-label="Accueil Chapter">
          <span className="brand-mark">C</span>
          <span>Chapter</span>
        </button>
        <button className="icon-button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </header>

      <main>
        {message && <div className="toast" onClick={() => setMessage('')}>{message}</div>}

        {tab === 'home' && (
          <section className="page home-page">
            <div className="hero-card">
              <p className="eyebrow">TON CHAPITRE ACTUEL</p>
              <h1>Ta vie de lecteur,<br />livre après livre.</h1>
              <p>Construis ta bibliothèque, note tes lectures et découvre les auteurs qui façonnent ton parcours.</p>
              <button className="primary" onClick={() => setTab('search')}>Ajouter un livre</button>
            </div>

            <div className="stats-grid">
              <article><strong>{stats.finished}</strong><span>livres terminés</span></article>
              <article><strong>{stats.authors}</strong><span>auteurs découverts</span></article>
              <article><strong>{stats.total}</strong><span>dans la bibliothèque</span></article>
            </div>

            <div className="section-title"><h2>Derniers livres</h2><button onClick={() => setTab('library')}>Tout voir</button></div>
            <div className="book-row">
              {recentBooks.map((book) => (
                <button key={book.id} className="mini-book" onClick={() => setEditing({ ...book })}>
                  <BookCover book={book} />
                  <strong>{book.title}</strong>
                  <span>{book.author}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {tab === 'search' && (
          <section className="page">
            <div className="page-heading">
              <p className="eyebrow">EXPLORER</p>
              <h1>Trouve ta prochaine lecture.</h1>
            </div>
            <form className="search-form" onSubmit={searchBooks}>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Titre, auteur, ISBN…" />
              <button className="primary" type="submit" disabled={loading}>{loading ? 'Recherche…' : 'Rechercher'}</button>
            </form>
            <div className="results-grid">
              {results.map((book) => (
                <article className="result-card" key={book.id}>
                  <BookCover book={book} />
                  <div>
                    <h3>{book.title}</h3>
                    <p>{book.author}</p>
                    <span>{book.year || 'Année inconnue'}</span>
                    <button className="secondary" onClick={() => addBook(book)}>Ajouter</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === 'library' && (
          <section className="page">
            <div className="page-heading split">
              <div><p className="eyebrow">MA BIBLIOTHÈQUE</p><h1>{library.length} livre{library.length > 1 ? 's' : ''}</h1></div>
              <button className="primary compact" onClick={() => setTab('search')}>+ Ajouter</button>
            </div>
            {library.length === 0 ? (
              <div className="empty-state"><h2>Ta bibliothèque est vide.</h2><p>Ajoute ton premier livre pour commencer ton histoire.</p></div>
            ) : (
              <div className="library-grid">
                {library.map((book) => (
                  <button className="library-card" key={book.id} onClick={() => setEditing({ ...book })}>
                    <BookCover book={book} />
                    <div className="status-pill">{statusLabels[book.status]}</div>
                    <h3>{book.title}</h3>
                    <p>{book.author}</p>
                    {book.rating > 0 && <span className="rating">{'★'.repeat(book.rating)}</span>}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === 'authors' && (
          <section className="page">
            <div className="page-heading"><p className="eyebrow">AUTEURS</p><h1>Ta collection d'auteurs.</h1></div>
            <div className="author-list">
              {[...new Set(library.map((book) => book.author))].map((author) => {
                const count = library.filter((book) => book.author === author).length
                return <article key={author}><div className="author-avatar">{author.charAt(0)}</div><div><h3>{author}</h3><p>{count} livre{count > 1 ? 's' : ''} dans ta bibliothèque</p></div></article>
              })}
            </div>
          </section>
        )}

        {tab === 'profile' && (
          <section className="page">
            <div className="profile-card">
              <div className="profile-avatar">S</div>
              <p className="eyebrow">LECTEUR</p>
              <h1>Mon profil Chapter</h1>
              <p>Chapitre 1 · 2026</p>
            </div>
            <div className="stats-grid profile-stats">
              <article><strong>{stats.finished}</strong><span>lus</span></article>
              <article><strong>{library.filter((b) => b.status === 'reading').length}</strong><span>en cours</span></article>
              <article><strong>{stats.authors}</strong><span>auteurs</span></article>
            </div>
          </section>
        )}
      </main>

      <nav className="bottom-nav">
        <button className={tab === 'home' ? 'active' : ''} onClick={() => setTab('home')}><span>⌂</span>Accueil</button>
        <button className={tab === 'search' ? 'active' : ''} onClick={() => setTab('search')}><span>⌕</span>Explorer</button>
        <button className={tab === 'library' ? 'active' : ''} onClick={() => setTab('library')}><span>▤</span>Bibliothèque</button>
        <button className={tab === 'authors' ? 'active' : ''} onClick={() => setTab('authors')}><span>✦</span>Auteurs</button>
        <button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}><span>◉</span>Profil</button>
      </nav>

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <form className="modal" onSubmit={(e) => { e.preventDefault(); saveBook(editing) }} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="close" onClick={() => setEditing(null)}>×</button>
            <div className="modal-book">
              <BookCover book={editing} />
              <div><p className="eyebrow">FICHE LIVRE</p><h2>{editing.title}</h2><p>{editing.author}{editing.year ? ` · ${editing.year}` : ''}</p></div>
            </div>
            <label>Statut
              <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                <option value="wishlist">À lire</option>
                <option value="reading">En cours</option>
                <option value="finished">Terminé</option>
              </select>
            </label>
            <label>Ta note
              <Stars value={editing.rating} onChange={(rating) => setEditing({ ...editing, rating })} />
            </label>
            <label>Ton avis
              <textarea value={editing.review} onChange={(e) => setEditing({ ...editing, review: e.target.value })} placeholder="Ce que tu as pensé du livre…" />
            </label>
            <button className="primary" type="submit">Enregistrer</button>
            {library.some((book) => book.id === editing.id) && <button className="danger" type="button" onClick={() => deleteBook(editing.id)}>Supprimer de ma bibliothèque</button>}
          </form>
        </div>
      )}
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
