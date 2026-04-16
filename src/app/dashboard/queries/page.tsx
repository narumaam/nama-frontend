'use client'

import React, { useState } from 'react'
import { queriesApi } from '@/lib/api'
import {
  Sparkles, Loader, AlertCircle, CheckCircle,
  MessageSquare, Clock, TrendingUp, X, Send,
} from 'lucide-react'

interface TriageResult {
  lead_id?: number
  destination?: string
  duration_days?: number
  travelers_count?: number
  budget_per_person?: number
  currency?: string
  travel_style?: string
  triage_confidence: number
  priority?: number
  suggested_reply?: string
  is_valid?: boolean
}

const EXAMPLE_QUERIES = [
  "Hi! We're a family of 4 looking for a 10-day trip to Rajasthan in March. Budget is around ₹80,000 per person. We love heritage hotels and cultural experiences.",
  "Good afternoon, I want to book a honeymoon trip to Maldives for 7 nights in February. We want an overwater villa, budget is around $3,000 per person.",
  "Looking for a budget-friendly 5 days trek to Kedarnath for 3 friends. We need permits, accommodation and guide. Budget max ₹20k each.",
  "Can you help plan a luxury safari in Kenya for 12 days? Group of 6, mix of couples and singles. Premium lodges preferred. Budget flexible.",
]

export default function QueriesPage() {
  const [rawMessage, setRawMessage] = useState('')
  const [source, setSource] = useState('WHATSAPP')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<TriageResult | null>(null)
  const [history, setHistory] = useState<Array<{ query: string; result: TriageResult; ts: string }>>([])

  const handleTriage = async () => {
    if (!rawMessage.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await queriesApi.ingest({ raw_message: rawMessage, source })
      setResult(data)
      setHistory(prev => [{ query: rawMessage, result: data, ts: new Date().toLocaleTimeString() }, ...prev.slice(0, 9)])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI triage failed')
    } finally {
      setLoading(false)
    }
  }

  const confidenceColor = (c: number) =>
    c >= 80 ? 'text-emerald-600 bg-emerald-50' :
    c >= 60 ? 'text-amber-600 bg-amber-50' :
    'text-red-600 bg-red-50'

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#0F172A]">Query Triage Inbox</h1>
          <p className="text-slate-500 mt-2 font-medium">
            Paste a raw client message — AI extracts destination, budget, style, and drafts a reply in seconds.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            M1 AI Agent Active
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ── Input Panel ── */}
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-[#0F172A]">Incoming Message</h3>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 bg-white outline-none focus:border-[#14B8A6]"
            >
              <option value="WHATSAPP">WhatsApp</option>
              <option value="EMAIL">Email</option>
              <option value="WEBSITE">Website Form</option>
              <option value="PHONE">Phone Call Note</option>
              <option value="DASHBOARD">Dashboard</option>
            </select>
          </div>

          <textarea
            value={rawMessage}
            onChange={(e) => setRawMessage(e.target.value)}
            placeholder="Paste the client's raw message here..."
            rows={7}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all resize-none text-sm text-slate-700 leading-relaxed"
          />

          {/* Example queries */}
          <div className="mt-3 mb-4">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Try an example:</p>
            <div className="space-y-1">
              {EXAMPLE_QUERIES.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setRawMessage(q)}
                  className="w-full text-left text-xs text-slate-500 hover:text-[#14B8A6] hover:bg-teal-50 px-3 py-2 rounded-lg transition-all truncate"
                >
                  <span className="font-bold text-slate-300 mr-2">{i + 1}.</span>
                  {q.substring(0, 80)}...
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleTriage}
            disabled={loading || !rawMessage.trim()}
            className="w-full bg-[#14B8A6] text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#14B8A6]/20"
          >
            {loading
              ? <><Loader size={16} className="animate-spin" /> Analysing with AI...</>
              : <><Sparkles size={16} fill="currentColor" /> Triage Message</>
            }
          </button>

          {error && (
            <div className="mt-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
              <AlertCircle size={16} />
              <span className="font-medium">{error}</span>
            </div>
          )}
        </div>

        {/* ── Result Panel ── */}
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
          <h3 className="font-extrabold text-[#0F172A] mb-4">Triage Result</h3>

          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <div className="w-14 h-14 bg-teal-50 rounded-full flex items-center justify-center mb-4">
                <Sparkles size={24} className="text-[#14B8A6] animate-pulse" />
              </div>
              <p className="font-medium text-sm">AI is reading the message...</p>
              <p className="text-xs mt-1 text-slate-300">Extracting intent, destination, budget</p>
            </div>
          )}

          {!loading && !result && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-300">
              <MessageSquare size={40} className="mb-3" />
              <p className="font-medium text-sm text-slate-400">Paste a message and click Triage</p>
              <p className="text-xs mt-1">Results appear here instantly</p>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-4">
              {/* Confidence badge */}
              <div className="flex items-center justify-between">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-black text-sm ${confidenceColor(result.triage_confidence)}`}>
                  <TrendingUp size={14} />
                  {result.triage_confidence}% Confidence
                </div>
                {result.lead_id && (
                  <div className="text-xs font-bold text-slate-400">
                    Lead #{result.lead_id} created ✓
                  </div>
                )}
              </div>

              {/* Extracted fields */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Destination', value: result.destination },
                  { label: 'Duration', value: result.duration_days ? `${result.duration_days} days` : null },
                  { label: 'Travelers', value: result.travelers_count },
                  { label: 'Budget/Person', value: result.budget_per_person ? `${result.currency || '₹'} ${result.budget_per_person.toLocaleString()}` : null },
                  { label: 'Travel Style', value: result.travel_style },
                  { label: 'Priority', value: result.priority ? `P${result.priority}` : null },
                ].map(({ label, value }) => (
                  value != null && (
                    <div key={label} className="bg-slate-50 rounded-xl p-3">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</div>
                      <div className="font-bold text-slate-800 text-sm">{value}</div>
                    </div>
                  )
                ))}
              </div>

              {/* Confidence bar */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-400 mb-1">
                  <span>Lead Quality Score</span>
                  <span>{result.triage_confidence}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${result.triage_confidence}%`,
                      background: result.triage_confidence >= 80 ? '#10B981' : result.triage_confidence >= 60 ? '#F59E0B' : '#EF4444'
                    }}
                  />
                </div>
              </div>

              {/* Suggested reply */}
              {result.suggested_reply && (
                <div className="bg-[#0F172A] rounded-2xl p-5">
                  <div className="flex items-center gap-2 text-[#14B8A6] mb-3">
                    <Send size={14} />
                    <span className="text-xs font-black uppercase tracking-widest">AI Suggested Reply</span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed italic">
                    "{result.suggested_reply}"
                  </p>
                  <button
                    onClick={() => navigator.clipboard?.writeText(result.suggested_reply!)}
                    className="mt-3 text-xs font-bold text-[#14B8A6] hover:underline"
                  >
                    Copy to clipboard
                  </button>
                </div>
              )}

              {/* Action buttons */}
              {result.lead_id && (
                <div className="flex gap-2">
                  <a
                    href={`/dashboard/leads`}
                    className="flex-1 py-2.5 bg-[#00236f] text-white rounded-xl text-xs font-black text-center uppercase tracking-wider hover:bg-slate-800 transition-all"
                  >
                    View in CRM →
                  </a>
                  <a
                    href={`/dashboard/itineraries`}
                    className="flex-1 py-2.5 border border-[#14B8A6] text-[#14B8A6] rounded-xl text-xs font-black text-center uppercase tracking-wider hover:bg-teal-50 transition-all"
                  >
                    Build Itinerary
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── History ── */}
      {history.length > 0 && (
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-extrabold text-[#0F172A]">Session History</h3>
            <button onClick={() => setHistory([])} className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors">
              Clear
            </button>
          </div>
          <div className="space-y-3">
            {history.map((h, i) => (
              <div
                key={i}
                onClick={() => { setRawMessage(h.query); setResult(h.result) }}
                className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-[#14B8A6]/30 hover:bg-teal-50/30 cursor-pointer transition-all"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 font-medium truncate">{h.query.substring(0, 80)}...</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Lead #{h.result.lead_id || '—'} · {h.result.destination || 'Unknown'} · {h.ts}
                  </p>
                </div>
                <div className={`ml-4 text-xs font-black px-2.5 py-1 rounded-full flex-shrink-0 ${confidenceColor(h.result.triage_confidence)}`}>
                  {h.result.triage_confidence}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
