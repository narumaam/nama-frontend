'use client'

import React, { useState, useEffect } from 'react'
import { leadsApi, commsApi, Lead } from '@/lib/api'
import { MessageSquare, Mail, Copy, AlertCircle, Loader, Check } from 'lucide-react'

export default function CommsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null)
  const [context, setContext] = useState('Follow Up')
  const [drafted, setDrafted] = useState<{whatsapp: string; email: string} | null>(null)
  const [loading, setLoading] = useState(false)
  const [leadsLoading, setLeadsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<'whatsapp' | 'email' | null>(null)
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'email'>('whatsapp')

  useEffect(() => {
    fetchLeads()
  }, [])

  const fetchLeads = async () => {
    setLeadsLoading(true)
    try {
      const data = await leadsApi.list({ size: 50 })
      setLeads(data.items)
      if (data.items.length > 0) {
        setSelectedLeadId(data.items[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leads')
    } finally {
      setLeadsLoading(false)
    }
  }

  const handleDraft = async () => {
    if (!selectedLeadId) {
      setError('Please select a lead')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await commsApi.draft({
        context,
        lead_id: selectedLeadId,
      })
      setDrafted(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to draft message')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (text: string, type: 'whatsapp' | 'email') => {
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  const selectedLead = leads.find((l) => l.id === selectedLeadId)

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#0F172A]">Communication Hub</h1>
          <p className="text-slate-500 mt-2 font-medium">AI-powered message drafting for WhatsApp and Email.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          <AlertCircle size={20} />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
            <h3 className="font-bold text-[#0F172A] mb-4">Select Lead</h3>

            {leadsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader size={24} className="animate-spin text-slate-400" />
              </div>
            ) : leads.length === 0 ? (
              <div className="text-sm text-slate-500 text-center py-8">No leads available</div>
            ) : (
              <select
                value={selectedLeadId || ''}
                onChange={(e) => setSelectedLeadId(Number(e.target.value))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all bg-white"
              >
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.full_name || `Lead #${lead.id}`} - {lead.destination || 'Unknown'}
                  </option>
                ))}
              </select>
            )}

            {selectedLead && (
              <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200 text-sm space-y-2">
                <div>
                  <span className="text-slate-500 font-medium">Email:</span>
                  <div className="text-slate-900 font-medium">{selectedLead.email}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Destination:</span>
                  <div className="text-slate-900 font-medium">{selectedLead.destination}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Status:</span>
                  <div className="text-slate-900 font-medium">{selectedLead.status}</div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
            <h3 className="font-bold text-[#0F172A] mb-4">Message Context</h3>

            <select
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all bg-white mb-4"
            >
              <option value="Follow Up">Follow Up</option>
              <option value="Quote Sent">Quote Sent</option>
              <option value="Payment Reminder">Payment Reminder</option>
              <option value="Booking Confirmed">Booking Confirmed</option>
            </select>

            <button
              onClick={handleDraft}
              disabled={loading || !selectedLeadId}
              className="w-full bg-[#14B8A6] text-[#0F172A] py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#0fa39f] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader size={18} className="animate-spin" /> Drafting...
                </>
              ) : (
                <>
                  <MessageSquare size={18} /> Draft with AI
                </>
              )}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2">
          {!drafted ? (
            <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare size={32} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Ready to draft?</h3>
              <p className="text-slate-500">Select a lead and context, then click "Draft with AI" to generate messages.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex gap-2 border-b border-slate-200">
                <button
                  onClick={() => setActiveTab('whatsapp')}
                  className={`px-6 py-3 font-bold text-sm transition-colors ${
                    activeTab === 'whatsapp'
                      ? 'text-[#14B8A6] border-b-2 border-[#14B8A6]'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <MessageSquare size={16} className="inline mr-2" />
                  WhatsApp
                </button>
                <button
                  onClick={() => setActiveTab('email')}
                  className={`px-6 py-3 font-bold text-sm transition-colors ${
                    activeTab === 'email'
                      ? 'text-[#14B8A6] border-b-2 border-[#14B8A6]'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Mail size={16} className="inline mr-2" />
                  Email
                </button>
              </div>

              <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                {activeTab === 'whatsapp' && (
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 whitespace-pre-wrap text-sm text-slate-700 leading-relaxed font-medium max-h-96 overflow-y-auto">
                      {drafted.whatsapp}
                    </div>
                    <button
                      onClick={() => handleCopy(drafted.whatsapp, 'whatsapp')}
                      className={`w-full px-4 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                        copied === 'whatsapp'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {copied === 'whatsapp' ? (
                        <>
                          <Check size={18} /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={18} /> Copy to Clipboard
                        </>
                      )}
                    </button>
                  </div>
                )}

                {activeTab === 'email' && (
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 whitespace-pre-wrap text-sm text-slate-700 leading-relaxed font-medium max-h-96 overflow-y-auto">
                      {drafted.email}
                    </div>
                    <button
                      onClick={() => handleCopy(drafted.email, 'email')}
                      className={`w-full px-4 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                        copied === 'email'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {copied === 'email' ? (
                        <>
                          <Check size={18} /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={18} /> Copy to Clipboard
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
