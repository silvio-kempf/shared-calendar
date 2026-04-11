import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import api from '../api'

const COLORS = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E',
  '#14B8A6', '#3B82F6', '#8B5CF6', '#EC4899',
  '#F43F5E', '#06B6D4',
]

function UserForm({ editUser, onSaved, onClose }) {
  const [fullName, setFullName] = useState(editUser?.full_name || '')
  const [username, setUsername] = useState(editUser?.username || '')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState(editUser?.email || '')
  const [isAdmin, setIsAdmin] = useState(editUser?.is_admin || false)
  const [canApprove, setCanApprove] = useState(editUser?.can_approve || false)
  const [color, setColor] = useState(editUser?.color || COLORS[5])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (editUser) {
        const data = { full_name: fullName, is_admin: isAdmin, can_approve: canApprove, color, email: email || null }
        if (password) data.password = password
        await api.put(`/users/${editUser.id}`, data)
      } else {
        await api.post('/users', { username, full_name: fullName, password, is_admin: isAdmin, can_approve: canApprove, color, email: email || null })
      }
      onSaved()
    } catch (err) {
      setError(err.response?.data?.detail || 'Fehler beim Speichern')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-panel border border-indigo-100/80 rounded-2xl p-5 mb-4">
      <h3 className="font-bold text-gray-800 mb-4">
        {editUser ? 'Benutzer bearbeiten' : 'Neuer Benutzer'}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vollständiger Name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white/90"
              placeholder="Maria Müller"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Benutzername</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-400 bg-white/90"
              placeholder="maria"
              required={!editUser}
              disabled={!!editUser}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Passwort{' '}
            {editUser && (
              <span className="text-gray-400 font-normal">(leer lassen = unverändert)</span>
            )}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white/90"
            required={!editUser}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            E-Mail-Adresse{' '}
            <span className="text-gray-400 font-normal">(für Benachrichtigungen bei neuen Anfragen)</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white/90"
            placeholder="marco@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Farbe im Kalender</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full border-4 transition-transform ${
                  color === c ? 'border-gray-700 scale-110' : 'border-white shadow'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="canApprove"
              checked={canApprove}
              onChange={(e) => setCanApprove(e.target.checked)}
              className="rounded text-indigo-600"
            />
            <label htmlFor="canApprove" className="text-sm text-gray-700">
              Darf Kalenderanfragen genehmigen (Elternteil)
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isAdmin"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
              className="rounded text-indigo-600"
            />
            <label htmlFor="isAdmin" className="text-sm text-gray-700">
              Administrator (darf alle Einträge bearbeiten &amp; Benutzer verwalten)
            </label>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-xl">{error}</div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Speichern...' : 'Speichern'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-white/90 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50"
          >
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  )
}

export default function AdminPage({ user, setUser }) {
  const [users, setUsers] = useState([])
  const [formState, setFormState] = useState(null) // null | 'create' | User object

  const loadUsers = () => api.get('/users').then((r) => setUsers(r.data))

  useEffect(() => {
    loadUsers()
  }, [])

  const handleDelete = async (u) => {
    if (!window.confirm(`${u.full_name} wirklich löschen? Alle Kalendereinträge werden ebenfalls gelöscht.`))
      return
    await api.delete(`/users/${u.id}`)
    loadUsers()
  }

  const handleSaved = () => {
    setFormState(null)
    loadUsers()
  }

  return (
    <div className="min-h-[100svh] bg-transparent pb-10">
      <Navbar user={user} setUser={setUser} />

      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
          <div>
            <Link to="/" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
              ← Zurück zum Kalender
            </Link>
            <h1 className="text-2xl font-bold text-gray-800 mt-2">Benutzerverwaltung</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {users.length} Familienmitglieder
            </p>
          </div>
          <button
            onClick={() => setFormState('create')}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 w-full sm:w-auto"
          >
            + Neues Mitglied
          </button>
        </div>

        {formState === 'create' && (
          <UserForm onSaved={handleSaved} onClose={() => setFormState(null)} />
        )}

        {typeof formState === 'object' && formState !== null && (
          <UserForm editUser={formState} onSaved={handleSaved} onClose={() => setFormState(null)} />
        )}

        <div className="space-y-2">
          {users.map((u) => (
            <div
              key={u.id}
              className="glass-panel rounded-2xl border border-white/70 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: u.color }}
                >
                  {u.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-gray-800">{u.full_name}</div>
                  <div className="text-xs text-gray-400">
                    @{u.username}
                    {u.is_admin && ' · Admin'}
                  </div>
                </div>
              </div>

              <div className="flex gap-1">
                <button
                  onClick={() => setFormState(u)}
                  className="text-sm text-indigo-600 hover:text-indigo-800 px-3 py-1.5 rounded-lg hover:bg-indigo-50"
                >
                  Bearbeiten
                </button>
                {u.id !== user.id && (
                  <button
                    onClick={() => handleDelete(u)}
                    className="text-sm text-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50"
                  >
                    Löschen
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
