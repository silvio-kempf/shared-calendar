import { useState, useEffect, useCallback } from 'react'
import Navbar from '../components/Navbar'
import CalendarView from '../components/CalendarView'
import TodayOverview from '../components/TodayOverview'
import EntryModal from '../components/EntryModal'
import MemberLegend from '../components/MemberLegend'
import RequestsPanel from '../components/RequestsPanel'
import api from '../api'

export default function CalendarPage({ user, setUser }) {
  const [entries, setEntries] = useState([])
  const [users, setUsers] = useState([])
  const [modal, setModal] = useState(null)
  const [showRequests, setShowRequests] = useState(false)
  const [activeLocation, setActiveLocation] = useState('rome')

  const isApprover = user.can_approve || user.is_admin
  const pendingCount = isApprover ? entries.filter((e) => e.status === 'pending').length : 0

  const loadData = useCallback(async () => {
    const [entriesRes, usersRes] = await Promise.all([
      api.get('/entries'),
      api.get('/users'),
    ])
    setEntries(entriesRes.data)
    setUsers(usersRes.data)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSaved = () => {
    loadData()
    setModal(null)
  }

  const calendarProps = (location) => ({
    location,
    entries,
    currentUser: user,
    onSelect: (start, end) => setModal({ location, start, end, entry: null }),
    onEventClick: (entry) =>
      setModal({ location: entry.location, start: entry.start_date, end: entry.end_date, entry }),
  })

  return (
    <div className="min-h-[100svh] bg-transparent pb-10">
      <Navbar
        user={user}
        setUser={setUser}
        pendingCount={pendingCount}
        onShowRequests={() => setShowRequests(true)}
      />

      <div className="max-w-[1400px] mx-auto px-3 sm:px-4 py-5 sm:py-6 space-y-4 sm:space-y-5">
        <div className="space-y-4 animate-fade-up">
          <TodayOverview entries={entries} users={users} />
          <MemberLegend users={users} />
        </div>

        {/* Mobile location toggle */}
        <div className="flex lg:hidden glass-panel rounded-2xl p-1 animate-fade-up-delay">
          {[['rome', 'Rom'], ['mallorca', 'Mallorca']].map(([loc, name]) => (
            <button
              key={loc}
              onClick={() => setActiveLocation(loc)}
              className={`flex-1 flex items-center justify-center py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeLocation === loc
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        {/* Mobile: single calendar */}
        <div className="lg:hidden animate-fade-up-delay">
          <CalendarView
            title={activeLocation === 'rome' ? 'Rom 🇮🇹' : 'Mallorca 🇪🇸'}
            {...calendarProps(activeLocation)}
          />
        </div>

        {/* Desktop: side by side */}
        <div className="hidden lg:grid grid-cols-2 gap-5 animate-fade-up-delay">
          <CalendarView title="Rom 🇮🇹" {...calendarProps('rome')} />
          <CalendarView title="Mallorca 🇪🇸" {...calendarProps('mallorca')} />
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 px-1 text-slate-500">
          <div
            className="w-8 h-4 rounded border border-dashed border-gray-400 flex-shrink-0"
            style={{ background: 'repeating-linear-gradient(45deg, #f3f4f6, #f3f4f6 4px, #e5e7eb 4px, #e5e7eb 8px)' }}
          />
          <span className="text-xs font-medium">= In Anfrage (wartet auf Genehmigung)</span>
        </div>
      </div>

      {modal && (
        <EntryModal
          modal={modal}
          currentUser={user}
          participants={users}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      {showRequests && (
        <RequestsPanel
          entries={entries}
          onClose={() => setShowRequests(false)}
          onUpdated={() => { loadData(); setShowRequests(false) }}
        />
      )}
    </div>
  )
}
