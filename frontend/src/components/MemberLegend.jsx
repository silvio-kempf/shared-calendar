import Avatar from './Avatar'

export default function MemberLegend({ users }) {
  if (users.length === 0) return null
  const family = users.filter((u) => !u.is_admin)

  return (
    <div className="glass-panel rounded-2xl p-3 flex items-center gap-3 flex-wrap">
      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap">
        Familienmitglieder
      </span>
      <div className="flex flex-wrap gap-2">
        {family.map((u) => (
          <div
            key={u.id}
            className="flex items-center gap-1.5 rounded-full pl-1 pr-3 py-1 shadow-sm"
            style={{ backgroundColor: u.color }}
          >
            <Avatar user={u} className="w-5 h-5" textSize="text-[9px]" />
            <span className="text-xs font-semibold text-white">{u.full_name}</span>
          </div>
        ))}

      </div>
    </div>
  )
}
