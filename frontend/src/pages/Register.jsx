import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

export default function Register({ setUser }) {
  const [availableNames, setAvailableNames] = useState([])
  const [selected, setSelected] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingNames, setLoadingNames] = useState(true)

  useEffect(() => {
    api.get('/auth/available-names')
      .then((r) => setAvailableNames(r.data))
      .finally(() => setLoadingNames(false))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selected) return
    if (password !== passwordConfirm) {
      setError('Passwörter stimmen nicht überein')
      return
    }
    setLoading(true)
    setError('')
    try {
      const r = await api.post('/auth/register', { name: selected, password })
      localStorage.setItem('token', r.data.access_token)
      setUser(r.data.user)
    } catch (err) {
      setError(err.response?.data?.detail || 'Fehler bei der Registrierung')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[100svh] flex items-center justify-center px-4 py-10">
      <div className="glass-panel rounded-3xl p-8 w-full max-w-sm animate-fade-up">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏠</div>
          <h1 className="text-2xl font-bold text-gray-900">Konto erstellen</h1>
          <p className="text-slate-500 mt-1 text-sm">Familienkalender Roma &amp; Mallorca</p>
        </div>

        {loadingNames ? (
          <div className="text-center text-gray-500 text-sm py-4">Laden...</div>
        ) : availableNames.length === 0 ? (
          <div className="text-center py-4">
            <div className="text-gray-500 text-sm mb-4">
              Alle Familienmitglieder haben bereits ein Konto.
            </div>
            <Link to="/login" className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold">
              Zur Anmeldung
            </Link>
          </div>
        ) : (
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
                {availableNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Nur Namen die noch kein Konto haben werden angezeigt.
              </p>
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
                placeholder="Mindestens 6 Zeichen"
                minLength={6}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Passwort wiederholen
              </label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
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

            <div className="bg-amber-50 text-amber-700 text-xs px-4 py-2.5 rounded-xl">
              Das Passwort kann nachträglich nicht geändert werden. Bei Vergessen bitte Admin kontaktieren.
            </div>

            <button
              type="submit"
              disabled={loading || !selected}
              className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {loading ? 'Registrieren...' : 'Konto erstellen'}
            </button>
          </form>
        )}

        <div className="mt-5 text-center">
          <span className="text-sm text-gray-500">Schon ein Konto? </span>
          <Link
            to="/login"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
          >
            Anmelden
          </Link>
        </div>
      </div>
    </div>
  )
}
