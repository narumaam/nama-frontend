'use client'

import React, { useState, useEffect } from 'react'
import { bookingsApi, Booking } from '@/lib/api'
import { AlertCircle, Loader, CheckCircle, XCircle } from 'lucide-react'

const statusBadgeColor = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  CONFIRMED: 'bg-green-50 text-green-700 border-green-200',
  PENDING_CONFIRMATION: 'bg-amber-50 text-amber-700 border-amber-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [cancelConfirmId, setCancelConfirmId] = useState<number | null>(null)

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await bookingsApi.list()
      setBookings(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async (bookingId: number) => {
    setActionLoading(bookingId)
    try {
      await bookingsApi.confirm(bookingId)
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: 'CONFIRMED' } : b))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm booking')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancel = async (bookingId: number) => {
    // First call sets the confirm state; second call (confirmed) executes
    if (cancelConfirmId !== bookingId) {
      setCancelConfirmId(bookingId)
      return
    }
    setCancelConfirmId(null)
    setActionLoading(bookingId)
    try {
      await bookingsApi.cancel(bookingId)
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: 'CANCELLED' } : b))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel booking')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#0F172A]">Bookings Management</h1>
          <p className="text-slate-500 mt-2 font-medium">View and manage all confirmed and pending bookings.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          <AlertCircle size={20} />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6 overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader size={32} className="animate-spin text-slate-400" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No bookings yet</h3>
            <p className="text-slate-500">Create your first itinerary and confirm a booking to see it here.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200">
              <tr className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="pb-3 pl-4 pr-2">Booking ID</th>
                <th className="pb-3 px-2">Lead ID</th>
                <th className="pb-3 px-2">Itinerary ID</th>
                <th className="pb-3 px-2">Status</th>
                <th className="pb-3 px-2">Total Amount</th>
                <th className="pb-3 px-2">Currency</th>
                <th className="pb-3 px-2">Created</th>
                <th className="pb-3 px-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-3 pl-4 pr-2 font-bold text-[#0F172A]">#{booking.id}</td>
                  <td className="py-3 px-2 text-slate-700">{booking.lead_id}</td>
                  <td className="py-3 px-2 text-slate-700">{booking.itinerary_id}</td>
                  <td className="py-3 px-2">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${
                        statusBadgeColor[booking.status as keyof typeof statusBadgeColor] ||
                        'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {booking.status}
                    </span>
                  </td>
                  <td className="py-3 px-2 font-medium text-slate-900">
                    {booking.total_price.toLocaleString()}
                  </td>
                  <td className="py-3 px-2 text-slate-700">{booking.currency}</td>
                  <td className="py-3 px-2 text-slate-500 text-xs">
                    {new Date(booking.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex gap-2">
                      {(booking.status === 'DRAFT' || booking.status === 'PENDING_CONFIRMATION') && (
                        <button
                          onClick={() => handleConfirm(booking.id)}
                          disabled={actionLoading === booking.id}
                          className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                          <CheckCircle size={14} />
                          Confirm
                        </button>
                      )}
                      {booking.status !== 'CANCELLED' && (
                        cancelConfirmId === booking.id ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-red-600 font-bold">Sure?</span>
                            <button
                              onClick={() => handleCancel(booking.id)}
                              disabled={actionLoading === booking.id}
                              className="px-2 py-1 bg-red-600 text-white rounded text-xs font-bold hover:bg-red-700 transition-colors"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setCancelConfirmId(null)}
                              className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-xs font-bold hover:bg-slate-300 transition-colors"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleCancel(booking.id)}
                            disabled={actionLoading === booking.id}
                            className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            <XCircle size={14} />
                            Cancel
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
