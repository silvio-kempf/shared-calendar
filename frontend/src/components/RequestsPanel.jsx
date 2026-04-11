import Avatar from './Avatar'
import api from '../api'

const LOCATION_LABEL = { rome: '🇮🇹 Rom', mallorca: '🇪🇸 Mallorca' }

function formatDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('de-DE', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export default function RequestsPanel({ entries, onClose, onUpdated }) {
  const pending = entries.filter((e) => e.status === 'pending')

  const approve = async (id) => {
    await api.post(`/entries/${id}/approve`)
    onUpdated()
  }

  const reject = async (id) => {
    if (!window.confirm('Anfrage ablehnen und löschen?')) return
    await api.delete(`/entries/${id}/reject`)
    onUpdated()
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-start justify-end p-4 sm:p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="glass-panel rounded-3xl sm:rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90svh] sm:max-h-[90vh] sm:mt-14">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-bold text-gray-800">Anfragen</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {pending.length === 0
                ? 'Keine offenen Anfragen'
                : `${pending.length} offene Anfrage${pending.length > 1 ? 'n' : ''}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {pending.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-sm font-medium">Alles erledigt!</div>
            </div>
          ) : (
            pending.map((e) => (
              <div
                key={e.id}
                className="bg-gray-50 rounded-2xl p-4 border border-gray-100"
              >
                {/* Who */}
                <div className="flex items-center gap-2.5 mb-3">
                  <Avatar user={e.user} className="w-9 h-9" textSize="text-sm" />
                  <div>
                    <div className="font-semibold text-gray-800 text-sm">{e.user.full_name}</div>
                    <div className="text-xs text-gray-400">möchte eintragen</div>
                  </div>
                  <span className="ml-auto text-sm">{LOCATION_LABEL[e.location]}</span>
                </div>

                {/* Dates */}
                <div className="flex items-center gap-1.5 text-sm text-gray-700 mb-2">
                  <span className="font-medium">{formatDate(e.start_date)}</span>
                  {e.start_date !== e.end_date && (
                    <>
                      <span className="text-gray-400">→</span>
                      <span className="font-medium">{formatDate(e.end_date)}</span>
                    </>
                  )}
                </div>

                {/* Participants */}
                {e.participants?.length > 0 && (
                  <div className="text-xs text-gray-500 mb-2">
                    👥 {e.participants.join(', ')}
                  </div>
                )}

                {/* Note */}
                {e.note && (
                  <div className="text-xs text-gray-500 mb-3 italic">"{e.note}"</div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => approve(e.id)}
                    className="flex-1 bg-emerald-500 text-white py-2 rounded-xl text-sm font-semibold hover:bg-emerald-600 transition"
                  >
                    ✓ Genehmigen
                  </button>
                  <button
                    onClick={() => reject(e.id)}
                    className="flex-1 bg-red-50 text-red-600 py-2 rounded-xl text-sm font-semibold hover:bg-red-100 transition"
                  >
                    ✕ Ablehnen
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
