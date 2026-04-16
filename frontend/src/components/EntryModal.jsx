import { useEffect, useState } from 'react'
import Avatar from './Avatar'
import api from '../api'
import useMobileSheet from '../hooks/useMobileSheet'

const MOBILE_BREAKPOINT = 640

function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export default function EntryModal({ modal, currentUser, participants = [], onClose, onSaved }) {
  const { entry } = modal
  const canEdit = !entry || entry.user_id === currentUser.id || currentUser.is_admin

  const [location, setLocation] = useState(modal.location)
  const [startDate, setStartDate] = useState(modal.start)
  const [endDate, setEndDate] = useState(modal.end)
  const [selectedParticipants, setSelectedParticipants] = useState(
    entry ? (entry.participants ?? []) : [currentUser.full_name]
  )
  const [note, setNote] = useState(entry?.note || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const { handleProps, sheetStyle } = useMobileSheet({ open: true, onClose })

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const syncViewport = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    syncViewport()
    window.addEventListener('resize', syncViewport)
    return () => window.removeEventListener('resize', syncViewport)
  }, [])

  const toggleParticipant = (name) => {
    if (!canEdit) return
    setSelectedParticipants((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    )
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!canEdit) return
    if (!isValidIsoDate(startDate) || !isValidIsoDate(endDate)) {
      setError('Bitte Datum im Format JJJJ-MM-TT eingeben.')
      return
    }
    if (endDate < startDate) {
      setError('Das Enddatum darf nicht vor dem Startdatum liegen.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const payload = {
        location,
        start_date: startDate,
        end_date: endDate,
        participants: selectedParticipants,
        note: note.trim() || null,
      }
      if (entry) {
        await api.put(`/entries/${entry.id}`, payload)
      } else {
        await api.post('/entries', payload)
      }
      onSaved()
    } catch (err) {
      setError(err.response?.data?.detail || 'Fehler beim Speichern')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Eintrag wirklich löschen?')) return
    setLoading(true)
    try {
      await api.delete(`/entries/${entry.id}`)
      onSaved()
    } catch (err) {
      setError(err.response?.data?.detail || 'Fehler beim Löschen')
      setLoading(false)
    }
  }

  const modalTitle = entry
    ? entry.user_id === currentUser.id
      ? 'Eintrag bearbeiten'
      : `Eintrag von ${entry.user.full_name}`
    : 'Neuer Eintrag'

  // Exclude admin account from participant list
  const familyMembers = participants.filter((p) => !p.is_admin)

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92svh] overflow-y-auto overflow-x-hidden"
        style={sheetStyle}
      >
        {/* Drag handle — visible on mobile only */}
        <div
          {...handleProps}
          className="flex justify-center pt-3 pb-1 sm:hidden cursor-grab active:cursor-grabbing"
        >
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>
        <div className="p-5 sm:p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-bold text-gray-800">{modalTitle}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100"
            >
              ✕
            </button>
          </div>

          {/* Read-only notice */}
          {entry && !canEdit && (
            <div className="bg-amber-50 border border-amber-100 text-amber-700 text-sm px-4 py-2.5 rounded-xl mb-4">
              Du kannst nur deine eigenen Einträge bearbeiten.
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Ort</label>
              <div className="grid grid-cols-2 gap-2">
                {[['rome', '🏛️', 'Rom'], ['mallorca', '🏖️', 'Mallorca']].map(([val, icon, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => canEdit && setLocation(val)}
                    className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition flex items-center justify-center gap-1.5 ${location === val
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      } ${!canEdit ? 'opacity-60 cursor-default' : 'cursor-pointer'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Von</label>
                <input
                  type={isMobile ? 'text' : 'date'}
                  value={startDate}
                  onChange={(e) => {
                    if (!canEdit) return
                    setStartDate(e.target.value)
                    if (endDate < e.target.value) setEndDate(e.target.value)
                  }}
                  placeholder={isMobile ? 'JJJJ-MM-TT' : undefined}
                  inputMode={isMobile ? 'numeric' : undefined}
                  autoCapitalize="off"
                  autoCorrect="off"
                  className="w-full min-w-0 max-w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:bg-gray-50"
                  style={{ width: '100%', minWidth: 0, maxWidth: '100%' }}
                  disabled={!canEdit}
                  required
                />
              </div>
              <div className="min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Bis</label>
                <input
                  type={isMobile ? 'text' : 'date'}
                  value={endDate}
                  onChange={(e) => canEdit && setEndDate(e.target.value)}
                  placeholder={isMobile ? 'JJJJ-MM-TT' : undefined}
                  inputMode={isMobile ? 'numeric' : undefined}
                  autoCapitalize="off"
                  autoCorrect="off"
                  min={isMobile ? undefined : startDate}
                  className="w-full min-w-0 max-w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:bg-gray-50"
                  style={{ width: '100%', minWidth: 0, maxWidth: '100%' }}
                  disabled={!canEdit}
                  required
                />
              </div>
            </div>
            {isMobile && (
              <p className="text-xs text-gray-400 -mt-1">
                Datum auf dem iPhone im Format JJJJ-MM-TT eingeben.
              </p>
            )}

            {/* Participants — pill-style toggles */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Wer ist dabei?
              </label>
              <div className="flex flex-wrap gap-2">
                {familyMembers.map((p) => {
                  const active = selectedParticipants.includes(p.full_name)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleParticipant(p.full_name)}
                      className={`flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full text-sm font-semibold border-2 transition ${active
                        ? 'text-white border-transparent'
                        : 'text-gray-500 border-gray-200 bg-white hover:border-gray-300'
                        } ${!canEdit ? 'opacity-60 cursor-default' : 'cursor-pointer'}`}
                      style={active ? { backgroundColor: p.color, borderColor: p.color } : {}}
                    >
                      <Avatar user={p} className="w-5 h-5" textSize="text-[9px]" />
                      {p.full_name}
                    </button>
                  )
                })}
              </div>
              {canEdit && selectedParticipants.length === 0 && (
                <p className="text-xs text-amber-600 mt-1.5">
                  Mindestens eine Person auswählen
                </p>
              )}
            </div>

            {/* Note */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Notiz <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => canEdit && setNote(e.target.value)}
                placeholder="z.B. Urlaub, Geburtstag, Arbeit..."
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:bg-gray-50"
                disabled={!canEdit}
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl">{error}</div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              {canEdit && (
                <button
                  type="submit"
                  disabled={loading || selectedParticipants.length === 0}
                  className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {loading ? 'Speichern...' : 'Speichern'}
                </button>
              )}
              {entry && canEdit && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-100 transition disabled:opacity-50"
                >
                  Löschen
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-200 transition"
              >
                {canEdit ? 'Abbrechen' : 'Schließen'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
