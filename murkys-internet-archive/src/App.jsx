import { useEffect, useMemo, useState } from 'react'
import './App.css'

const accentPalette = ['#7dd3fc', '#a78bfa', '#fbbf24', '#f472b6', '#34d399', '#fb7185']
const iconOptions = ['✦', '✧', '✺', '✹', '⬢', '◈', '◆', '☆', '⚑', '◉', '✷', '✴', '⌘', '⬣', '☼', '☾']

const scrollToLibrary = () => {
  document.getElementById('library')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}

function App() {
  const [libraryItems, setLibraryItems] = useState([])
  const [searchText, setSearchText] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [activeView, setActiveView] = useState('Overview')
  const [showEntryForm, setShowEntryForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [graphMonth, setGraphMonth] = useState(null)
  const [entryForm, setEntryForm] = useState({
    name: '',
    url: '',
    description: '',
    icon: '✦',
    accent: accentPalette[0],
  })

  useEffect(() => {
    const loadLibraryItems = async () => {
      try {
        const response = await fetch('/api/entries')
        if (!response.ok) {
          throw new Error('Failed to load entries')
        }

        const data = await response.json()
        setLibraryItems(data)
        if (data.length > 0) {
          setSelectedId(data[0].id)
        }
      } catch {
        setLibraryItems([])
      }
    }

    loadLibraryItems()
  }, [])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
  }, [])


  const filteredItems = useMemo(() => {
    return libraryItems.filter((item) =>
      item.name.toLowerCase().includes(searchText.toLowerCase()),
    )
  }, [searchText, libraryItems])

  useEffect(() => {
    if (!filteredItems.length) {
      return
    }

    const currentSelectionExists = filteredItems.some((item) => item.id === selectedId)
    if (!currentSelectionExists) {
      setSelectedId(filteredItems[0].id)
    }
  }, [filteredItems, selectedId])

  const selectedItem =
    filteredItems.find((item) => item.id === selectedId) ??
    filteredItems[0] ??
    libraryItems[0] ??
    null

  const handleAddEntry = async (event) => {
    event.preventDefault()

    const name = entryForm.name.trim()
    if (!name) {
      return
    }

    const rawUrl = entryForm.url.trim()
    const normalizedUrl = rawUrl
      ? /^https?:\/\//i.test(rawUrl)
        ? rawUrl
        : `https://${rawUrl}`
      : '#'

    const entryPayload = {
      name,
      category: 'Websites',
      accent: entryForm.accent || accentPalette[(libraryItems.length + 1) % accentPalette.length],
      icon: entryForm.icon.trim() || '✦',
      rarity: 'Saved',
      description:
        entryForm.description.trim() || 'A newly saved website in your personal archive.',
      url: normalizedUrl,
      createdAt: new Date().toISOString(),
    }

    try {
      let savedEntries
      const entryId = editingId ?? Date.now()

      if (editingId) {
        const response = await fetch(`/api/entries/${editingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ...entryPayload, id: editingId }),
        })

        if (!response.ok) {
          throw new Error('Failed to update entry')
        }

        savedEntries = await response.json()
        setSelectedId(editingId)
      } else {
        const response = await fetch('/api/entries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ...entryPayload, id: entryId }),
        })

        if (!response.ok) {
          throw new Error('Failed to save entry')
        }

        savedEntries = await response.json()
        setSelectedId(entryId)
      }

      setLibraryItems(savedEntries)
      setSearchText('')
      setEntryForm({
        name: '',
        url: '',
        description: '',
        icon: '✦',
        accent: accentPalette[0],
      })
      setEditingId(null)
      setShowEntryForm(false)
      setTimeout(scrollToLibrary, 50)
    } catch (error) {
      console.error('Could not save entry to archive:', error)
    }
  }

  const deleteEntry = async (id) => {
    try {
      const response = await fetch(`/api/entries/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete entry')
      }

      const remainingEntries = await response.json()
      setLibraryItems(remainingEntries)
      setSelectedId(remainingEntries[0]?.id ?? null)
      setActiveView('Library')
    } catch (error) {
      console.error('Could not delete entry from archive:', error)
    }
  }

  const handleViewChange = (view) => {
    setActiveView(view)
    if (view === 'Library') {
      setShowEntryForm(false)
      setEditingId(null)
      setEntryForm({ name: '', url: '', description: '', icon: '✦', accent: accentPalette[0] })
      setTimeout(scrollToLibrary, 50)
    }
    if (view === 'New entry') {
      setShowEntryForm(true)
    }
  }

  const beginEditEntry = (item) => {
    setEditingId(item.id)
    setSelectedId(item.id)
    setEntryForm({
      name: item.name,
      url: item.url === '#' ? '' : item.url,
      description: item.description,
      icon: item.icon || '✦',
      accent: item.accent || accentPalette[0],
    })
    setActiveView('Library')
    setShowEntryForm(false)
  }

  const cancelEditEntry = () => {
    setEditingId(null)
    setEntryForm({
      name: '',
      url: '',
      description: '',
      icon: '✦',
      accent: accentPalette[0],
    })
  }

  const archiveCount = libraryItems.length
  const overviewItems =
    libraryItems.length > 0
      ? Array.from({ length: Math.max(10, libraryItems.length * 2) }, (_, index) =>
          libraryItems[index % libraryItems.length],
        )
      : []

  const resolveEntryDate = (item) => {
    if (item?.createdAt) {
      const parsed = new Date(item.createdAt)
      if (!Number.isNaN(parsed.getTime())) {
        return parsed
      }
    }

    const numericId = Number(item?.id)
    if (Number.isFinite(numericId)) {
      const parsed = new Date(numericId)
      if (!Number.isNaN(parsed.getTime())) {
        return parsed
      }
    }

    return null
  }

  const monthlyArchiveData = useMemo(() => {
    const monthMap = new Map()

    libraryItems.forEach((item) => {
      const date = resolveEntryDate(item)
      if (!date) {
        return
      }

      const monthKey = date.toLocaleString('en-US', { month: 'short' })
      monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1)
    })

    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month) => ({
      label: month,
      value: monthMap.get(month) || 0,
    }))
  }, [libraryItems])

  const monthlyUsageBreakdown = useMemo(() => {
    const breakdown = {}

    libraryItems.forEach((item) => {
      const date = resolveEntryDate(item)
      if (!date) {
        return
      }

      const month = date.toLocaleString('en-US', { month: 'short' })
      const week = `W${Math.ceil(date.getDate() / 7)}`

      if (!breakdown[month]) {
        breakdown[month] = [
          { label: 'W1', value: 0 },
          { label: 'W2', value: 0 },
          { label: 'W3', value: 0 },
          { label: 'W4', value: 0 },
          { label: 'W5', value: 0 },
        ]
      }

      const bucket = breakdown[month].find((entry) => entry.label === week) || breakdown[month][0]
      bucket.value += 1
    })

    return Object.fromEntries(
      Object.entries(breakdown).map(([month, values]) => [
        month,
        values.filter((entry) => entry.value > 0 || entry.label === 'W1'),
      ]),
    )
  }, [libraryItems])

  const monthlyChartData = graphMonth ? monthlyUsageBreakdown[graphMonth] || [] : monthlyArchiveData
  const monthlyMax = Math.max(...monthlyChartData.map((item) => item.value), 1)

  const graphLabel = graphMonth ? `${graphMonth} usage` : 'Monthly archive'
  const graphLegend = graphMonth ? 'Weeks' : 'Months'

  const handleGraphMonthClick = (month) => {
    setGraphMonth(month)
  }

  const handleGraphBack = () => {
    setGraphMonth(null)
  }

  return (
    <div className="page-shell">
      <div className="scanlines" aria-hidden="true" />

      <header className="topbar">
        <div className="brand-wrap">
          <div className="brand-mark">V</div>
          <div>
            <span className="brand-title">Murkys</span>
            <span className="brand-subtitle">Internet Archive</span>
          </div>
        </div>

        <nav className="main-nav" aria-label="Main navigation">
          {['Overview', 'Library', 'New entry'].map((view) => (
            <button
              key={view}
              type="button"
              className={
                activeView === view
                  ? `main-nav-button active${view === 'New entry' ? ' new-entry' : ''}`
                  : `main-nav-button${view === 'New entry' ? ' new-entry' : ''}`
              }
              onClick={() => handleViewChange(view)}
            >
              {view}
            </button>
          ))}
        </nav>
      </header>

      <main className="dashboard">
        {activeView === 'Overview' && (
          <section className="hero-panel panel">
            <div className="hero-copy">
              <h1>Murkys Internet Archive.</h1>
              <div className="archive-meta">
                <span className="archive-count">{archiveCount}</span>
                <span className="archive-count-label">entries saved</span>
              </div>
              <div className="hero-actions">
                <button type="button" className="primary-btn" onClick={() => handleViewChange('Library')}>
                  Open library
                </button>
              </div>
            </div>

            <div className="hero-stats">

              <div className="graph-card bars-card">
                <div className="graph-header">
                  <span className="eyebrow small">{graphLabel}</span>
                  {graphMonth && (
                    <button type="button" className="graph-back-btn" onClick={handleGraphBack}>
                      Back
                    </button>
                  )}
                </div>

                <div className="mini-bars stats-bars" aria-label={graphLegend}>
                  {monthlyChartData.map(({ label, value }, index) => (
                    <button
                      key={`${label}-${index}`}
                      type="button"
                      className={graphMonth ? 'mini-bar-wrap chart-bar no-hover' : 'mini-bar-wrap chart-bar'}
                      title={graphMonth ? `${label}: ${value} saves in this month` : `${label}: ${value} saves`}
                      onClick={() => !graphMonth && handleGraphMonthClick(label)}
                      style={graphMonth ? { pointerEvents: 'none' } : undefined}
                    >
                      <div className="bar-stack">
                        <span className="bar-value">{value}</span>
                        <span
                          className="mini-bar"
                          style={{ height: `${Math.max(12, (value / monthlyMax) * 100)}%` }}
                        />
                      </div>
                    </button>
                  ))}
                </div>

                <div className="day-labels" aria-label={graphLegend}>
                  {monthlyChartData.map(({ label }, index) => (
                    <span key={`${label}-label-${index}`}>{label}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="overview-carousel" aria-live="polite">
              <div className="overview-carousel-header">
                <span className="eyebrow small">Library preview</span>
              </div>

              <div className="overview-carousel-window">
                {overviewItems.length > 0 && (
                  <div className="overview-carousel-track">
                    {overviewItems.map((item, index) => (
                      <div
                        key={`${item.id}-${index}`}
                        className="overview-slide"
                        style={{
                          '--accent': item.accent || '#7dd3fc',
                          '--index': index,
                        }}
                      >
                        <span>
                          {item.icon || '✦'} {item.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {activeView === 'Library' && (
          <section className="library-panel panel" id="library">
            <div className="panel-header-row">
              <div>
                <p className="eyebrow small">Collection index</p>
                <h2>Library</h2>
              </div>

              <div className="panel-header-actions">
                <label className="search-box">
                  <span>Search</span>
                  <input
                    type="text"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Find a website..."
                  />
                </label>
              </div>
            </div>

            <div className="catalog-layout">
              <div className="catalog-grid">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={selectedItem?.id === item.id ? 'resource-card active' : 'resource-card'}
                      onClick={() => setSelectedId(item.id)}
                      style={{ '--accent': item.accent }}
                    >
                      <div className="card-topline">
                        <span className="card-icon">{item.icon || '✦'}</span>
                        <span className="card-tag">{item.category}</span>
                        <span className="card-rarity">{item.rarity}</span>
                      </div>

                      <h3>{item.name}</h3>

                      <p>{item.description}</p>
                    </button>
                  ))
                ) : (
                  <div className="empty-state">
                    <h3>No entries yet</h3>
                    <p>Add your first website to begin building your archive.</p>
                    <button type="button" className="primary-btn" onClick={() => handleViewChange('New entry')}>
                      Add first website
                    </button>
                  </div>
                )}
              </div>

              {selectedItem ? (
                <aside className="detail-panel panel" aria-live="polite">
                  {editingId === selectedItem.id ? (
                    <>
                      <div className="detail-header">
                        <span className="detail-rarity">Editing</span>
                        <span className="detail-category">Website</span>
                      </div>

                      <h3>Edit {selectedItem.name}</h3>

                      <form className="entry-form compact-entry-form" onSubmit={handleAddEntry}>
                        <input
                          type="text"
                          value={entryForm.name}
                          placeholder="Website name"
                          onChange={(event) => setEntryForm((current) => ({ ...current, name: event.target.value }))}
                        />
                        <input
                          type="url"
                          value={entryForm.url}
                          placeholder="https://example.com"
                          onChange={(event) => setEntryForm((current) => ({ ...current, url: event.target.value }))}
                        />
                        <div className="icon-picker">
                          <span className="input-label">Icon</span>
                          <div className="icon-grid">
                            {iconOptions.map((icon) => (
                              <button
                                key={icon}
                                type="button"
                                className={entryForm.icon === icon ? 'icon-swatch active' : 'icon-swatch'}
                                onClick={() => setEntryForm((current) => ({ ...current, icon }))}
                                aria-label={`Choose icon ${icon}`}
                              >
                                {icon}
                              </button>
                            ))}
                          </div>
                        </div>
                        <label className="color-field">
                          <span>Accent</span>
                          <input
                            type="color"
                            value={entryForm.accent}
                            onChange={(event) => setEntryForm((current) => ({ ...current, accent: event.target.value }))}
                          />
                        </label>
                        <textarea
                          value={entryForm.description}
                          placeholder="Short description"
                          onChange={(event) => setEntryForm((current) => ({ ...current, description: event.target.value }))}
                        />
                        <div className="detail-actions compact-actions">
                          <button type="submit" className="primary-btn small-btn">
                            Save changes
                          </button>
                          <button type="button" className="secondary-btn small-btn" onClick={cancelEditEntry}>
                            Cancel
                          </button>
                        </div>
                      </form>
                    </>
                  ) : (
                    <>
                      <div className="detail-header">
                        <span className="detail-rarity">{selectedItem.rarity}</span>
                        <span className="detail-category">{selectedItem.category}</span>
                      </div>

                      <h3>{selectedItem.name}</h3>

                      <div className="detail-visual" style={{ '--accent': selectedItem.accent }}>
                        <div className="visual-square" />
                        <div className="visual-orb" />
                      </div>

                      <p className="detail-description">{selectedItem.description}</p>

                      <div className="detail-actions">
                        <a
                          href={selectedItem.url && selectedItem.url !== '#' ? selectedItem.url : '#'}
                          className={selectedItem.url && selectedItem.url !== '#' ? 'primary-btn small-btn' : 'primary-btn small-btn disabled-link'}
                          target={selectedItem.url && selectedItem.url !== '#' ? '_blank' : undefined}
                          rel={selectedItem.url && selectedItem.url !== '#' ? 'noreferrer' : undefined}
                          onClick={(event) => {
                            if (!selectedItem.url || selectedItem.url === '#') {
                              event.preventDefault()
                            }
                          }}
                        >
                          {selectedItem.url && selectedItem.url !== '#' ? 'Open entry' : 'No link saved'}
                        </a>
                        <button
                          type="button"
                          className="secondary-btn small-btn"
                          onClick={() => beginEditEntry(selectedItem)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="secondary-btn small-btn danger-btn"
                          onClick={() => deleteEntry(selectedItem.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </aside>
              ) : (
                <aside className="detail-panel panel empty-detail">
                  <h3>Your archive is empty.</h3>
                  <p>Add a new resource to get started.</p>
                </aside>
              )}
            </div>
          </section>
        )}

        {activeView === 'New entry' && (
          <section className="panel entry-panel">
            <div className="panel-header-row">
              <div>
                <p className="eyebrow small">{editingId ? 'Edit entry' : 'Add entry'}</p>
                <h2>{editingId ? 'Edit website' : 'Add website'}</h2>
              </div>

              <button type="button" className="secondary-btn small-btn" onClick={() => handleViewChange('Library')}>
                Back to library
              </button>
            </div>

            <form className="entry-form" onSubmit={handleAddEntry}>
              <input
                type="text"
                value={entryForm.name}
                placeholder="Website name"
                onChange={(event) => setEntryForm((current) => ({ ...current, name: event.target.value }))}
              />
              <input
                type="url"
                value={entryForm.url}
                placeholder="https://example.com"
                onChange={(event) => setEntryForm((current) => ({ ...current, url: event.target.value }))}
              />
              <div className="icon-picker">
                <span className="input-label">Icon</span>
                <div className="icon-grid">
                  {iconOptions.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      className={entryForm.icon === icon ? 'icon-swatch active' : 'icon-swatch'}
                      onClick={() => setEntryForm((current) => ({ ...current, icon }))}
                      aria-label={`Choose icon ${icon}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <label className="color-field">
                <span>Accent</span>
                <input
                  type="color"
                  value={entryForm.accent}
                  onChange={(event) => setEntryForm((current) => ({ ...current, accent: event.target.value }))}
                />
              </label>
              <textarea
                value={entryForm.description}
                placeholder="Short description"
                onChange={(event) => setEntryForm((current) => ({ ...current, description: event.target.value }))}
              />
              <button type="submit" className="primary-btn form-submit">
                {editingId ? 'Update website' : 'Save website'}
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
