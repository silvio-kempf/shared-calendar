import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Avatar from './Avatar'
import api from '../api'

const COLORS = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E', '#14B8A6',
  '#3B82F6', '#8B5CF6', '#EC4899', '#F43F5E', '#06B6D4', '#84CC16',
]

export default function Navbar({ user, setUser, pendingCount = 0, onShowRequests }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [color, setColor] = useState(user.color)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const dropdownRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Sync color picker if user changes externally
  useEffect(() => { setColor(user.color) }, [user.color])

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    navigate('/login')
  }

  const saveColor = async () => {
    setSaving(true)
    try {
      const r = await api.put('/auth/me', { color })
      setUser(r.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const r = await api.post('/auth/me/avatar', form)
      setUser(r.data)
    } catch (err) {
      alert(err.response?.data?.detail || 'Upload fehlgeschlagen')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleRemoveAvatar = async () => {
    setUploading(true)
    try {
      const r = await api.delete('/auth/me/avatar')
      setUser(r.data)
    } finally {
      setUploading(false)
    }
  }

  return (
    <nav className="bg-white/80 border-b border-white/60 shadow-sm backdrop-blur sticky top-0 z-40">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-4 py-3 sm:py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🏠</span>
          <span className="font-bold text-gray-900">Familienkalender</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Requests button — only for approvers */}
          {(user.can_approve || user.is_admin) && (
            <button
              onClick={onShowRequests}
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition"
            >
              <span>Anfragen</span>
              {pendingCount > 0 && (
                <span className="flex items-center justify-center w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </button>
          )}

          <div className="relative" ref={dropdownRef}>
            {/* Navbar trigger button */}
            <button
              onClick={() => setOpen((o) => !o)}
              className="flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-gray-100 transition"
            >
              <Avatar user={user} className="w-8 h-8 ring-2 ring-white" textSize="text-sm" />
              <span className="text-sm font-medium text-gray-700 hidden sm:block">{user.full_name}</span>
            </button>

            {/* Dropdown */}
            {open && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 z-50">

                {/* Avatar upload area */}
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                  <div className="relative group">
                    <Avatar
                      user={user}
                      className="w-14 h-14 ring-2 ring-white shadow"
                      textSize="text-xl"
                    />
                    {/* Upload overlay */}
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
                      title="Foto hochladen"
                    >
                      <span className="text-white text-lg">📷</span>
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800 text-sm truncate">{user.full_name}</div>
                    <div className="text-xs text-gray-400 mb-1">@{user.username}</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50"
                      >
                        {uploading ? 'Lädt...' : 'Foto ändern'}
                      </button>
                      {user.avatar_url && (
                        <>
                          <span className="text-gray-300 text-xs">·</span>
                          <button
                            onClick={handleRemoveAvatar}
                            disabled={uploading}
                            className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50"
                          >
                            Entfernen
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Color picker */}
                <div className="mb-4">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Meine Farbe
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-7 h-7 rounded-full border-4 transition-transform ${
                          color === c ? 'border-gray-700 scale-110' : 'border-white shadow'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <button
                  onClick={saveColor}
                  disabled={saving || color === user.color}
                  className="w-full bg-indigo-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-40 mb-3"
                >
                  {saving ? 'Speichern...' : saved ? '✓ Gespeichert' : 'Farbe speichern'}
                </button>

                <div className="border-t border-gray-100 pt-3 space-y-1">
                  {user.is_admin && (
                    <Link
                      to="/admin"
                      onClick={() => setOpen(false)}
                      className="block text-sm text-indigo-600 hover:text-indigo-800 font-medium py-1"
                    >
                      Benutzerverwaltung
                    </Link>
                  )}
                  <button
                    onClick={logout}
                    className="block w-full text-left text-sm text-gray-500 hover:text-gray-700 py-1"
                  >
                    Abmelden
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
