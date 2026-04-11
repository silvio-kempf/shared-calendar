import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

// All family names + admin. The value is the username sent to the backend.
const ALL_NAMES = [
  { label: 'Marco', username: 'marco' },
  { label: 'Susanna', username: 'susanna' },
  { label: 'Silvio', username: 'silvio' },
  { label: 'Heiko', username: 'heiko' },
  { label: 'Marinho', username: 'marinho' },
  { label: 'Chiara', username: 'chiara' },
  { label: 'Keven', username: 'keven' },
  { label: 'Sandra', username: 'sandra' },
  { label: 'Jana', username: 'jana' },
  { label: 'Natalia', username: 'natalia' },
  { label: 'Sophie', username: 'sophie' },
  { label: 'Administrator', username: 'admin' },
]

export default function Login({ setUser }) {
  const [selected, setSelected] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selected) return
    setLoading(true)
    setError('')
    try {
      const form = new FormData()
      form.append('username', selected)
      form.append('password', password)
      const r = await api.post('/auth/login', form)
      localStorage.setItem('token', r.data.access_token)
      setUser(r.data.user)
    } catch {
      setError('Falscher Name oder Passwort')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[100svh] flex items-center justify-center px-4 py-10">
      <div className="glass-panel rounded-3xl p-8 w-full max-w-sm animate-fade-up">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏠</div>
          <h1 className="text-2xl font-bold text-gray-900">Familienkalender</h1>
          <p className="text-slate-500 mt-1 text-sm">Roma &amp; Mallorca</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Wer bist du?
            </label>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white/90"
              required
            >
              <option value="" disabled>Name auswählen...</option>
              {ALL_NAMES.map((n) => (
                <option key={n.username} value={n.username}>
                  {n.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Passwort
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white/90"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !selected}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {loading ? 'Anmelden...' : 'Anmelden'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <span className="text-sm text-gray-500">Noch kein Konto? </span>
          <Link
            to="/register"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
          >
            Jetzt registrieren
          </Link>
        </div>
      </div>
    </div>
  )
}
