import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import deLocale from '@fullcalendar/core/locales/de'

function shiftDate(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export default function CalendarView({ title, location, entries, currentUser, onSelect, onEventClick }) {
  const events = entries
    .filter((e) => e.location === location)
    .map((e) => {
      const names = e.participants?.length ? e.participants.join(', ') : e.user.full_name
      const isPending = e.status === 'pending'
      return {
        id: String(e.id),
        title: e.note ? `${names} · ${e.note}` : names,
        start: e.start_date,
        end: shiftDate(e.end_date, 1),
        backgroundColor: isPending ? '#f3f4f6' : e.user.color,
        borderColor: isPending ? '#9ca3af' : 'transparent',
        textColor: isPending ? '#6b7280' : '#ffffff',
        classNames: isPending ? ['fc-event-pending'] : [],
        extendedProps: { entry: e },
      }
    })

  return (
    <div className="glass-panel rounded-2xl overflow-hidden ring-1 ring-black/[0.04]">
      {/* Card header */}
      <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3 flex items-center justify-between">
        <h2 className="text-lg sm:text-base font-extrabold text-gray-900 tracking-tight">{title}</h2>
      </div>

      <div className="px-2 sm:px-3 pb-4 sm:pb-5">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={deLocale}
          firstDay={1}
          height="auto"
          events={events}
          selectable
          dateClick={(info) => {
            onSelect(info.dateStr, info.dateStr)
          }}
          selectMinDistance={0}
          longPressDelay={200}
          selectLongPressDelay={200}
          select={(info) => {
            onSelect(info.startStr, shiftDate(info.endStr, -1))
            info.view.calendar.unselect()
          }}
          eventClick={(info) => {
            onEventClick(info.event.extendedProps.entry)
          }}
          headerToolbar={{
            left: 'prev',
            center: 'title',
            right: 'next',
          }}
          eventDisplay="block"
          dayMaxEvents={4}
          eventTimeFormat={{ hour: undefined }}
        />
      </div>
    </div>
  )
}
