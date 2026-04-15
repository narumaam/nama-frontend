'use client'

import React, { useState, useEffect } from 'react'
import { leadsApi, Lead } from '@/lib/api'
import { Search, ChevronDown, AlertCircle, Loader } from 'lucide-react'

const statusBadgeColor = {
  NEW: 'bg-blue-50 text-blue-700 border-blue-200',
  CONTACTED: 'bg-purple-50 text-purple-700 border-purple-200',
  QUALIFIED: 'bg-green-50 text-green-700 border-green-200',
  PROPOSAL_SENT: 'bg-amber-50 text-amber-700 border-amber-200',
  WON: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  LOST: 'bg-red-50 text-red-700 border-red-200',
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [expandedLeadId, setExpandedLeadId] = useState<number | null>(null)
  const [updating, setUpdating] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    fetchLeads()
  }, [statusFilter, page])

  const fetchLeads = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await leadsApi.list({ status: statusFilter || undefined, page })
      setLeads(data.items)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leads')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (leadId: number, newStatus: string) => {
    setUpdating(leadId)
    try {
      await leadsApi.update(leadId, { status: newStatus })
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)))
      setExpandedLeadId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update lead status')
    } finally {
      setUpdating(null)
    }
  }

  const filteredLeads = leads.filter((lead) => {
    const searchStr = searchTerm.toLowerCase()
    return (
      (lead.destination?.toLowerCase().includes(searchStr) || '') ||
      (lead.full_name?.toLowerCase().includes(searchStr) || '') ||
      (lead.email?.toLowerCase().includes(searchStr) || '')
    )
  })

  const pageSize = 10
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#0F172A]">Leads Pipeline</h1>
          <p className="text-slate-500 mt-2 font-medium">Manage and qualify incoming travel inquiries.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          <AlertCircle size={20} />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by destination, name, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all bg-white"
          >
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
            <option value="CONTACTED">Contacted</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="PROPOSAL_SENT">Proposal Sent</option>
            <option value="WON">Won</option>
            <option value="LOST">Lost</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader size={32} className="animate-spin text-slate-400" />
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-slate-400 text-sm font-medium">No leads found</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200">
                <tr className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="pb-3 pl-4 pr-2">#</th>
                  <th className="pb-3 px-2">Contact</th>
                  <th className="pb-3 px-2">Destination</th>
                  <th className="pb-3 px-2">Duration</th>
                  <th className="pb-3 px-2">Budget</th>
                  <th className="pb-3 px-2">Style</th>
                  <th className="pb-3 px-2">Status</th>
                  <th className="pb-3 px-2">Priority</th>
                  <th className="pb-3 px-2">Confidence</th>
                  <th className="pb-3 px-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <React.Fragment key={lead.id}>
                    <tr
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => setExpandedLeadId(expandedLeadId === lead.id ? null : lead.id)}
                    >
                      <td className="py-3 pl-4 pr-2 font-bold text-[#0F172A]">{lead.id}</td>
                      <td className="py-3 px-2">
                        <div>
                          <div className="font-medium text-slate-900">{lead.full_name || 'N/A'}</div>
                          <div className="text-xs text-slate-500">{lead.email}</div>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-slate-700">{lead.destination || 'N/A'}</td>
                      <td className="py-3 px-2 text-slate-700">{lead.duration_days || 'N/A'} days</td>
                      <td className="py-3 px-2">
                        {lead.budget_per_person
                          ? `${lead.currency} ${lead.budget_per_person.toLocaleString()}`
                          : 'N/A'}
                      </td>
                      <td className="py-3 px-2 text-slate-700">{lead.travel_style}</td>
                      <td className="py-3 px-2">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${
                            statusBadgeColor[lead.status as keyof typeof statusBadgeColor] || 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {lead.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-slate-700 font-bold">{lead.priority}</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                              className="bg-[#14B8A6] h-2 rounded-full"
                              style={{ width: `${lead.triage_confidence}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-bold text-slate-600 w-8">{lead.triage_confidence}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-slate-500 text-xs">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </td>
                    </tr>

                    {expandedLeadId === lead.id && (
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <td colSpan={10} className="py-6 px-4">
                          <div className="space-y-6">
                            <div>
                              <h4 className="font-bold text-slate-900 mb-2">Lead Details</h4>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-slate-500 font-medium">Phone:</span>
                                  <div className="text-slate-900 font-medium">{lead.phone || 'N/A'}</div>
                                </div>
                                <div>
                                  <span className="text-slate-500 font-medium">Travelers:</span>
                                  <div className="text-slate-900 font-medium">{lead.travelers_count}</div>
                                </div>
                                <div>
                                  <span className="text-slate-500 font-medium">Source:</span>
                                  <div className="text-slate-900 font-medium">{lead.source}</div>
                                </div>
                                <div>
                                  <span className="text-slate-500 font-medium">Confidence Score:</span>
                                  <div className="text-slate-900 font-medium">{lead.triage_confidence}%</div>
                                </div>
                              </div>
                            </div>

                            {lead.suggested_reply && (
                              <div>
                                <h4 className="font-bold text-slate-900 mb-2">AI Suggested Reply</h4>
                                <div className="bg-white p-4 rounded-lg border border-slate-200 italic text-slate-700">
                                  "{lead.suggested_reply}"
                                </div>
                              </div>
                            )}

                            <div>
                              <h4 className="font-bold text-slate-900 mb-2">Update Status</h4>
                              <div className="flex flex-wrap gap-2">
                                {['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'WON', 'LOST'].map(
                                  (status) => (
                                    <button
                                      key={status}
                                      onClick={() => handleStatusUpdate(lead.id, status)}
                                      disabled={updating === lead.id}
                                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                                        lead.status === status
                                          ? 'bg-[#14B8A6] text-white'
                                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                      } ${updating === lead.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                      {status}
                                    </button>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200">
            <div className="text-sm text-slate-500">
              Page {page} of {totalPages} ({total} total leads)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
