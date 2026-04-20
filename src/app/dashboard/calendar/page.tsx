'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  ChevronLeft, ChevronRight, Calendar, Bell, Plane,
  Download, ExternalLink, X, Plus, CheckCircle2, Link2, Copy, Check,
} from 'lucide-react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalendarEvent {
  id: string
  type: 'booking' | 'reminder' | 'manual'
  title: string
  subtitle?: string
  date: string           // YYYY-MM-DD
  color: 'emerald' | 'amber' | 'blue' | 'rose'
  url?: string
  status?: string
  amount?: number
}

// ─── Seed data (used when API is unavailable) ─────────────────────────────────

function buildSeedEvents(): CalendarEvent[] {
  const d = (offset: number) =>
    new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10)

  return [
    {
      id: 'b1', type: 'booking',
      title: 'Aarav & Priya — Maldives', subtitle: 'Departure',
      date: d(5), color: 'emerald', status: 'CONFIRMED', amount: 350000,
      url: '/dashboard/bookings',
    },
    {
      id: 'b2', type: 'booking',
      title: 'Mehta Family — Bali', subtitle: 'Return',
      date: d(12), color: 'emerald', status: 'CONFIRMED', amount: 280000,
      url: '/dashboard/bookings',
    },
    {
      id: 'b3', type: 'booking',
      title: 'Desai Corp — Singapore MICE', subtitle: '45 pax',
      date: d(18), color: 'emerald', status: 'DRAFT', amount: 920000,
      url: '/dashboard/bookings',
    },
    {
      id: 'r1', type: 'reminder',
      title: 'Follow up: Kiran Shah', subtitle: 'Europe quote pending',
      date: d(2), color: 'amber', status: 'QUALIFIED',
      url: '/dashboard/leads',
    },
    {
      id: 'r2', type: 'reminder',
      title: 'Follow up: Desai Corp', subtitle: 'MICE quote — 45 pax',
      date: d(1), color: 'amber', status: 'CONTACTED',
      url: '/dashboard/leads',
    },
    {
      id: 'r3', type: 'reminder',
      title: 'Follow up: Ananya Rao', subtitle: 'Honeymoon — Maldives',
      date: d(4), color: 'amber', status: 'CONTACTED',
      url: '/dashboard/leads',
    },
    {
      id: 'b4', type: 'booking',
      title: 'Joshi Family — Kashmir', subtitle: 'Check-in',
      date: d(-2), color: 'emerald', status: 'CONFIRMED', amount: 175000,
      url: '/dashboard/bookings',
    },
  ]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}
function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
function tomorrowStr() {
  return new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
}

function formatAmount(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`
  return `₹${n}`
}

function statusColor(status?: string) {
  switch ((status || '').toUpperCase()) {
    case 'CONFIRMED': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    case 'DRAFT':     return 'bg-slate-500/20 text-slate-300 border-slate-500/30'
    case 'PENDING_CONFIRMATION': return 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    case 'CANCELLED': return 'bg-red-500/20 text-red-300 border-red-500/30'
    case 'QUALIFIED': return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    case 'CONTACTED': return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    default:          return 'bg-slate-500/20 text-slate-300 border-slate-500/30'
  }
}

/** Build auth headers for backend API calls — JWT only, no public API key */
function apiHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = typeof window !== 'undefined' ? localStorage.getItem('nama_token') : null
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

// ─── iCal export (one-time download) ─────────────────────────────────────────

function exportICal(allEvents: CalendarEvent[], year: number, month: number) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NAMA OS//Travel Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:NAMA OS — Bookings & Reminders',
    'X-WR-TIMEZONE:Asia/Kolkata',
  ]

  allEvents.forEach(event => {
    if (!event.date) return
    const dateStr = event.date.replace(/-/g, '')
    const uid = `${event.id}@getnama.app`
    const summary = `${event.type === 'booking' ? '✈ ' : '🔔 '}${event.title}`
      .replace(/[,;\\]/g, ' ')
    const desc = [event.subtitle, event.status ? `Status: ${event.status}` : '', event.amount ? `Amount: ${formatAmount(event.amount)}` : '']
      .filter(Boolean).join(' | ').replace(/[,;\\]/g, ' ')

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTART;VALUE=DATE:${dateStr}`,
      `DTEND;VALUE=DATE:${dateStr}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${desc}`,
      `URL:https://getnama.app${event.url || '/dashboard/calendar'}`,
      `CATEGORIES:${event.type === 'booking' ? 'BOOKING' : 'REMINDER'}`,
      'END:VEVENT',
    )
  })

  lines.push('END:VCALENDAR')

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `nama-calendar-${year}-${String(month + 1).padStart(2, '0')}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Add Reminder Modal ───────────────────────────────────────────────────────

interface ReminderModalProps {
  defaultDate: string
  onSave: (r: CalendarEvent) => void
  onClose: () => void
}

function ReminderModal({ defaultDate, onSave, onClose }: ReminderModalProps) {
  const [title, setTitle] = useState('')
  const [leadName, setLeadName] = useState('')
  const [date, setDate] = useState(defaultDate)
  const [notes, setNotes] = useState('')
  const [waNotify, setWaNotify] = useState(false)
  const [saving, setSaving] = useState(false)

  const isTomorrow = date === tomorrowStr()

  const handleSave = async () => {
    if (!title.trim() || !date) return
    setSaving(true)

    const event: CalendarEvent = {
      id: `manual_${Date.now()}`,
      type: 'manual',
      title: title.trim(),
      subtitle: leadName.trim() || notes.trim() || undefined,
      date,
      color: 'blue',
      url: '/dashboard/calendar',
    }

    // POST to backend — fire and forget (fall back to localStorage if it fails)
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      await fetch('/api/v1/calendar/reminders', {
        method: 'POST',
        headers: apiHeaders(),
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify({
          title: title.trim(),
          date,
          time: '09:00',
          type: 'manual',
          notes: notes.trim() || null,
          wa_notify: waNotify,
        }),
      })
      clearTimeout(timeoutId)
    } catch {
      // Non-fatal — we still save locally
    }

    onSave(event)
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#1E293B] rounded-2xl border border-white/10 shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Bell size={16} className="text-blue-400" />
            </div>
            <h3 className="font-black text-white">Add Reminder</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-white transition-colors rounded-lg hover:bg-white/5">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Follow up on Maldives quote"
              className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/60 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
              Lead / Client (optional)
            </label>
            <input
              type="text"
              value={leadName}
              onChange={e => setLeadName(e.target.value)}
              placeholder="e.g. Priya Sharma"
              className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/60 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
              Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/60 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Any additional context..."
              className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/60 transition-colors resize-none"
            />
          </div>

          {/* WhatsApp notification toggle */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5 flex-shrink-0">
              <input
                type="checkbox"
                checked={waNotify}
                onChange={e => setWaNotify(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`w-9 h-5 rounded-full transition-colors ${waNotify ? 'bg-green-500' : 'bg-slate-700'}`}
              />
              <div
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${waNotify ? 'translate-x-4' : 'translate-x-0'}`}
              />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">Send me a WhatsApp reminder</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {isTomorrow
                  ? 'Will send immediately since the date is tomorrow'
                  : date
                  ? 'Will send when date is tomorrow (requires WHATSAPP_TOKEN)'
                  : 'Sends a WhatsApp nudge the day before'}
              </p>
            </div>
          </label>
        </div>

        <div className="px-6 py-4 border-t border-white/10 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white transition-colors rounded-xl hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || !date || saving}
            className="px-5 py-2 text-sm font-black text-[#0F172A] bg-[#14B8A6] hover:bg-[#0d9488] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center gap-2"
          >
            <CheckCircle2 size={14} />
            {saving ? 'Saving…' : 'Save Reminder'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── iCal Subscribe Banner ────────────────────────────────────────────────────

function ICalSubscribeBanner() {
  const [subscribeUrl, setSubscribeUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const loadUrl = async () => {
    if (subscribeUrl) { setOpen(true); return }
    setLoading(true)
    try {
      const controller = new AbortController()
      setTimeout(() => controller.abort(), 5000)
      const res = await fetch('/api/v1/calendar/ics-token', {
        headers: apiHeaders(),
        credentials: 'include',
        signal: controller.signal,
      })
      if (res.ok) {
        const data = await res.json()
        // Build the frontend-accessible subscribe URL so it proxies through Next.js
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://getnama.app'
        const url = `${baseUrl}/api/v1/calendar/ics-feed?token=${data.token}`
        setSubscribeUrl(url)
        setOpen(true)
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!subscribeUrl) return
    navigator.clipboard.writeText(subscribeUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <div>
      <button
        onClick={loadUrl}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-slate-700/60 text-slate-300 border border-white/10 rounded-xl text-sm font-bold hover:bg-slate-700 transition-colors"
      >
        <Link2 size={15} />
        {loading ? 'Loading…' : 'Subscribe URL'}
      </button>

      {open && subscribeUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-[#1E293B] rounded-2xl border border-white/10 shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#14B8A6]/20 rounded-lg flex items-center justify-center">
                  <Link2 size={16} className="text-[#14B8A6]" />
                </div>
                <h3 className="font-black text-white">Subscribe to Calendar</h3>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-slate-400 leading-relaxed">
                Paste this URL into Google Calendar, Outlook, or Apple Calendar to get a live-updating feed of all your bookings and reminders.
              </p>

              <div className="bg-slate-800/60 border border-white/10 rounded-xl p-3 flex items-center gap-3">
                <p className="flex-1 text-xs text-slate-300 font-mono break-all leading-relaxed">{subscribeUrl}</p>
                <button
                  onClick={handleCopy}
                  className={`flex-shrink-0 p-2 rounded-lg transition-colors ${copied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
                  title="Copy URL"
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                </button>
              </div>

              <div className="space-y-2 text-xs text-slate-500">
                <p className="font-bold text-slate-400 uppercase tracking-wider text-[11px]">How to subscribe:</p>
                <p>• <strong className="text-slate-300">Google Calendar</strong> → Other calendars → From URL → paste above</p>
                <p>• <strong className="text-slate-300">Outlook</strong> → Add calendar → Subscribe from web → paste above</p>
                <p>• <strong className="text-slate-300">Apple Calendar</strong> → File → New Calendar Subscription → paste above</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [showAddReminder, setShowAddReminder] = useState(false)
  const [exportDone, setExportDone] = useState(false)
  const [manualReminders, setManualReminders] = useState<CalendarEvent[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem('nama_reminders') || '[]') } catch { return [] }
  })

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // ── Fetch events from API ──────────────────────────────────────────────────
  const fetchEvents = useCallback(async (y: number, m: number) => {
    setLoading(true)
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)

      const res = await fetch(
        `/api/v1/analytics/calendar-events?year=${y}&month=${m + 1}`,
        {
          headers: apiHeaders(),
          credentials: 'include',
          signal: controller.signal,
        },
      )
      clearTimeout(timeoutId)

      if (res.ok) {
        const data = await res.json()
        setEvents(data.events || [])
      } else {
        setEvents(buildSeedEvents())
      }
    } catch {
      // Timeout, network error, or backend down — fall back to seed silently
      setEvents(buildSeedEvents())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEvents(year, month)
  }, [year, month, fetchEvents])

  // ── Persist manual reminders ──────────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nama_reminders', JSON.stringify(manualReminders))
    }
  }, [manualReminders])

  // ── Navigation ────────────────────────────────────────────────────────────
  const goToPrev = () => {
    setSelectedDay(null)
    setCurrentDate(d => {
      const nd = new Date(d)
      nd.setMonth(nd.getMonth() - 1)
      return nd
    })
  }
  const goToNext = () => {
    setSelectedDay(null)
    setCurrentDate(d => {
      const nd = new Date(d)
      nd.setMonth(nd.getMonth() + 1)
      return nd
    })
  }
  const goToToday = () => {
    setSelectedDay(new Date().getDate())
    setCurrentDate(new Date())
  }

  // ── Calendar grid data ────────────────────────────────────────────────────
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month
  const todayDay = isCurrentMonth ? today.getDate() : -1

  const allEvents = [...events, ...manualReminders]

  const getEventsForDay = (day: number) => {
    const dateStr = toDateStr(year, month, day)
    return allEvents.filter(e => e.date === dateStr)
  }

  // ── iCal export (one-time download) ──────────────────────────────────────
  const handleExport = () => {
    exportICal(allEvents, year, month)
    setExportDone(true)
    setTimeout(() => setExportDone(false), 2500)
  }

  // ── Selected day info ─────────────────────────────────────────────────────
  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : []
  const selectedDateStr = selectedDay
    ? new Date(year, month, selectedDay).toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : null

  // ── Default add reminder date ─────────────────────────────────────────────
  const defaultReminderDate = selectedDay
    ? toDateStr(year, month, selectedDay)
    : new Date().toISOString().slice(0, 10)

  // ── Stats for the header strip ────────────────────────────────────────────
  const monthBookings = allEvents.filter(e => {
    if (e.type !== 'booking') return false
    if (!e.date) return false
    const [ey, em] = e.date.split('-').map(Number)
    return ey === year && em === month + 1
  })
  const monthReminders = allEvents.filter(e => {
    if (e.type === 'booking') return false
    if (!e.date) return false
    const [ey, em] = e.date.split('-').map(Number)
    return ey === year && em === month + 1
  })

  return (
    <div className="min-h-screen bg-[#0F172A] text-white">

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="px-4 md:px-8 pt-6 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
              <div className="w-9 h-9 bg-[#14B8A6]/20 rounded-xl flex items-center justify-center">
                <Calendar size={18} className="text-[#14B8A6]" />
              </div>
              Booking Calendar
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Travel dates, bookings and follow-up reminders — all in one view
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowAddReminder(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-xl text-sm font-bold hover:bg-blue-500/30 transition-colors"
            >
              <Plus size={15} />
              Add Reminder
            </button>
            <button
              onClick={handleExport}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${
                exportDone
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-slate-700/60 text-slate-300 border-white/10 hover:bg-slate-700'
              }`}
            >
              <Download size={15} />
              {exportDone ? 'Downloaded!' : 'Export iCal'}
            </button>
            <ICalSubscribeBanner />
          </div>
        </div>

        {/* Stat strip */}
        <div className="mt-4 flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2 text-emerald-400">
            <Plane size={14} />
            <span className="font-bold">{monthBookings.length}</span>
            <span className="text-slate-500">bookings this month</span>
          </div>
          <div className="flex items-center gap-2 text-amber-400">
            <Bell size={14} />
            <span className="font-bold">{monthReminders.length}</span>
            <span className="text-slate-500">reminders</span>
          </div>
          {loading && <span className="text-xs text-slate-500 animate-pulse">Syncing…</span>}
        </div>
      </div>

      {/* ── Month navigator ───────────────────────────────────────────────── */}
      <div className="px-4 md:px-8 pb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={goToPrev}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
          >
            <ChevronLeft size={20} />
          </button>

          <h2 className="text-xl font-black min-w-[200px] text-center">
            {MONTHS[month]} {year}
          </h2>

          <button
            onClick={goToNext}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
          >
            <ChevronRight size={20} />
          </button>

          <button
            onClick={goToToday}
            className="ml-2 px-3 py-1.5 text-xs font-black text-[#14B8A6] border border-[#14B8A6]/40 rounded-full hover:bg-[#14B8A6]/10 transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      {/* ── Main layout: calendar + selected day panel ────────────────────── */}
      <div className="px-4 md:px-8 pb-8 flex gap-6 items-start">

        {/* Calendar grid */}
        <div className="flex-1 min-w-0">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS_SHORT.map(d => (
              <div key={d} className="text-center text-xs font-bold text-slate-500 uppercase tracking-widest py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* Empty cells before month starts */}
            {Array.from({ length: firstDay }, (_, i) => (
              <div key={`empty-${i}`} className="min-h-[80px] md:min-h-[100px]" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }, (_, idx) => {
              const day = idx + 1
              const dayEvents = getEventsForDay(day)
              const isToday = day === todayDay
              const isSelected = day === selectedDay

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                  className={`
                    relative text-left rounded-xl p-1.5 border transition-all min-h-[80px] md:min-h-[100px]
                    ${isToday ? 'ring-2 ring-[#14B8A6] ring-offset-1 ring-offset-[#0F172A] border-[#14B8A6]/40' : 'border-slate-700/50'}
                    ${isSelected ? 'bg-slate-800/80 border-slate-500' : 'bg-slate-800/30 hover:bg-slate-800/60'}
                  `}
                >
                  {/* Day number */}
                  <span className={`
                    block text-xs font-black mb-1 w-6 h-6 flex items-center justify-center rounded-full
                    ${isToday ? 'bg-[#14B8A6] text-[#0F172A]' : 'text-slate-300'}
                  `}>
                    {day}
                  </span>

                  {/* Event badges */}
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 2).map(e => (
                      <div
                        key={e.id}
                        className={`text-[10px] px-1.5 py-0.5 rounded truncate leading-tight font-semibold
                          ${e.color === 'emerald'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : e.color === 'amber'
                            ? 'bg-amber-500/20 text-amber-300'
                            : e.color === 'blue'
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-rose-500/20 text-rose-300'
                          }`}
                      >
                        {e.type === 'booking' ? '✈' : '🔔'} {e.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[9px] text-slate-500 px-1">
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-5 flex items-center gap-5 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/30 border border-emerald-500/50 inline-block" />
              Bookings
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/30 border border-amber-500/50 inline-block" />
              Follow-up reminders
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500/30 border border-blue-500/50 inline-block" />
              Manual reminders
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full ring-2 ring-[#14B8A6] inline-block" />
              Today
            </div>
          </div>
        </div>

        {/* ── Selected Day Panel ───────────────────────────────────────────── */}
        {selectedDay ? (
          <aside className="w-80 flex-shrink-0 bg-slate-800/50 border border-white/10 rounded-2xl overflow-hidden">
            {/* Panel header */}
            <div className="px-5 py-4 border-b border-white/10 flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Selected</p>
                <h3 className="font-black text-white text-sm leading-snug">{selectedDateStr}</h3>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="p-1.5 text-slate-500 hover:text-white transition-colors rounded-lg hover:bg-white/5 mt-0.5"
              >
                <X size={14} />
              </button>
            </div>

            {/* Events list */}
            <div className="px-4 py-3 space-y-3 max-h-[600px] overflow-y-auto">
              {selectedDayEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar size={28} className="text-slate-600 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-500">No events this day</p>
                  <p className="text-xs text-slate-600 mt-1">Add a reminder below</p>
                </div>
              ) : (
                selectedDayEvents.map(event => (
                  <div
                    key={event.id}
                    className={`rounded-xl p-4 border
                      ${event.color === 'emerald'
                        ? 'bg-emerald-500/10 border-emerald-500/20'
                        : event.color === 'amber'
                        ? 'bg-amber-500/10 border-amber-500/20'
                        : event.color === 'blue'
                        ? 'bg-blue-500/10 border-blue-500/20'
                        : 'bg-rose-500/10 border-rose-500/20'
                      }`}
                  >
                    {/* Event type icon + title */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-start gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5
                          ${event.color === 'emerald' ? 'bg-emerald-500/20'
                          : event.color === 'amber' ? 'bg-amber-500/20'
                          : 'bg-blue-500/20'}`}
                        >
                          {event.type === 'booking'
                            ? <Plane size={13} className="text-emerald-400" />
                            : <Bell size={13} className={event.color === 'blue' ? 'text-blue-400' : 'text-amber-400'} />
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-white leading-tight">{event.title}</p>
                          {event.subtitle && (
                            <p className="text-xs text-slate-400 mt-0.5">{event.subtitle}</p>
                          )}
                        </div>
                      </div>

                      {event.url && (
                        <Link
                          href={event.url}
                          className="p-1.5 text-slate-500 hover:text-white transition-colors flex-shrink-0 rounded hover:bg-white/5"
                          title="Open"
                        >
                          <ExternalLink size={12} />
                        </Link>
                      )}
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-2 flex-wrap mt-2">
                      {event.status && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor(event.status)}`}>
                          {event.status.replace(/_/g, ' ')}
                        </span>
                      )}
                      {event.amount && event.amount > 0 && (
                        <span className="text-[10px] font-bold text-emerald-400">
                          {formatAmount(event.amount)}
                        </span>
                      )}
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full
                        ${event.type === 'booking' ? 'bg-emerald-500/10 text-emerald-500'
                        : event.type === 'manual' ? 'bg-blue-500/10 text-blue-400'
                        : 'bg-amber-500/10 text-amber-500'}`}
                      >
                        {event.type === 'booking' ? 'Booking' : event.type === 'manual' ? 'Custom' : 'Reminder'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick add reminder */}
            <div className="px-4 py-4 border-t border-white/10">
              <button
                onClick={() => setShowAddReminder(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-xl text-sm font-bold hover:bg-blue-500/30 transition-colors"
              >
                <Plus size={14} />
                Add reminder for this day
              </button>
            </div>
          </aside>
        ) : (
          /* Placeholder panel when no day is selected */
          <aside className="w-80 flex-shrink-0 bg-slate-800/30 border border-white/5 rounded-2xl flex flex-col items-center justify-center py-12 px-6 text-center">
            <Calendar size={36} className="text-slate-600 mb-4" />
            <p className="text-sm font-bold text-slate-500">Select a day</p>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Click any date to see bookings and reminders for that day
            </p>
          </aside>
        )}
      </div>

      {/* Add Reminder Modal */}
      {showAddReminder && (
        <ReminderModal
          defaultDate={defaultReminderDate}
          onSave={reminder => setManualReminders(prev => [...prev, reminder])}
          onClose={() => setShowAddReminder(false)}
        />
      )}
    </div>
  )
}
