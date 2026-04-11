import Avatar from './Avatar'

const LOCATION_STYLE = {
  rome: {
    label: 'text-orange-900/70',
    icon: '🇮🇹',
    name: 'Rom',
  },
  mallorca: {
    label: 'text-blue-900/70',
    icon: '🇪🇸',
    name: 'Mallorca',
  },
}

export default function TodayOverview({ entries, users }) {
  const today = new Date().toISOString().split('T')[0]
  const userByName = Object.fromEntries(users.map((u) => [u.full_name, u]))

  const peopleAt = (loc) => {
    const seen = new Set()
    const people = []
    for (const e of entries.filter(
      (e) => e.location === loc && e.start_date <= today && e.end_date >= today
    )) {
      const names = e.participants?.length ? e.participants : [e.user.full_name]
      for (const name of names) {
        if (!seen.has(name) && userByName[name]) {
          seen.add(name)
          people.push(userByName[name])
        }
      }
    }
    return people
  }

  const dateStr = new Date().toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 mb-3 px-1">
        <h2 className="text-base font-bold text-gray-900">Wer ist heute wo?</h2>
        <span className="text-xs text-slate-500">{dateStr}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(['rome', 'mallorca']).map((loc) => {
          const { label, icon, name } = LOCATION_STYLE[loc]
          const people = peopleAt(loc)
          return (
            <div key={loc} className="glass-panel rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl bg-white/80 ring-1 ring-black/[0.06] flex items-center justify-center text-lg">
                  {icon}
                </div>
                <div>
                  <div className={`text-xs font-bold uppercase tracking-widest ${label}`}>
                    {name}
                  </div>
                  <div className="text-sm font-semibold text-gray-700">
                    {people.length === 0
                      ? 'Niemand da'
                      : `${people.length} Person${people.length > 1 ? 'en' : ''}`}
                  </div>
                </div>
              </div>

              {/* Stacked avatar circles */}
              {people.length === 0 ? (
                <span className="text-gray-300 text-sm">—</span>
              ) : (
                <div className="flex items-center">
                  <div className="flex -space-x-2.5">
                    {people.map((u) => (
                      <div
                        key={u.id}
                        title={u.full_name}
                        className="ring-2 ring-white rounded-full"
                        style={{ zIndex: 1 }}
                      >
                        <Avatar user={u} className="w-10 h-10" textSize="text-sm" />
                      </div>
                    ))}
                  </div>
                  {/* Name list on hover — shown as small text below on mobile */}
                  <span className="ml-3 text-xs text-gray-500 hidden sm:block">
                    {people.map((u) => u.full_name).join(', ')}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
