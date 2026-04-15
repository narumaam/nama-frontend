'use client'

import React, { useState, useEffect } from 'react'
import { financeApi, LedgerEntry, LedgerSummary } from '@/lib/api'
import { TrendingUp, TrendingDown, AlertCircle, Loader } from 'lucide-react'

export default function FinancePage() {
  const [summary, setSummary] = useState<LedgerSummary | null>(null)
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchFinanceData()
  }, [])

  const fetchFinanceData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [summaryData, ledgerData] = await Promise.all([
        financeApi.summary(),
        financeApi.ledger(),
      ])
      setSummary(summaryData)
      setLedger(ledgerData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load financial data')
    } finally {
      setLoading(false)
    }
  }

  const marginPercent =
    summary && summary.total_revenue > 0
      ? ((summary.gross_profit / summary.total_revenue) * 100).toFixed(1)
      : '0'

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#0F172A]">Financial Overview</h1>
          <p className="text-slate-500 mt-2 font-medium">Real-time revenue, costs, and profitability tracking.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          <AlertCircle size={20} />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader size={32} className="animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-slate-500 text-sm font-medium mb-2">Total Revenue</div>
                <div className="text-3xl font-extrabold text-[#0F172A] mb-2">
                  {summary.currency} {summary.total_revenue.toLocaleString()}
                </div>
                <div className="flex items-center gap-1 text-green-600 text-xs font-bold">
                  <TrendingUp size={14} /> Revenue recognized
                </div>
              </div>

              <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-slate-500 text-sm font-medium mb-2">Total Cost</div>
                <div className="text-3xl font-extrabold text-red-600 mb-2">
                  {summary.currency} {summary.total_cost.toLocaleString()}
                </div>
                <div className="flex items-center gap-1 text-red-600 text-xs font-bold">
                  <TrendingDown size={14} /> Expenses incurred
                </div>
              </div>

              <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-slate-500 text-sm font-medium mb-2">Gross Profit</div>
                <div className="text-3xl font-extrabold text-emerald-600 mb-2">
                  {summary.currency} {summary.gross_profit.toLocaleString()}
                </div>
                <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
                  <TrendingUp size={14} /> Net profit
                </div>
              </div>

              <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-slate-500 text-sm font-medium mb-2">Profit Margin</div>
                <div className="text-3xl font-extrabold text-[#14B8A6] mb-2">{marginPercent}%</div>
                <div className="flex items-center gap-1 text-slate-600 text-xs font-bold">
                  Of gross revenue
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
            <h2 className="text-xl font-bold text-[#0F172A] mb-6">Ledger Entries</h2>

            {ledger.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-slate-400 text-sm font-medium">No ledger entries yet</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200">
                    <tr className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="pb-3 pl-4 pr-2">Entry ID</th>
                      <th className="pb-3 px-2">Type</th>
                      <th className="pb-3 px-2">Amount</th>
                      <th className="pb-3 px-2">Currency</th>
                      <th className="pb-3 px-2">Description</th>
                      <th className="pb-3 px-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((entry) => (
                      <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="py-3 pl-4 pr-2 font-bold text-[#0F172A]">{entry.id}</td>
                        <td className="py-3 px-2">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                              entry.entry_type === 'DEBIT'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-green-50 text-green-700'
                            }`}
                          >
                            {entry.entry_type}
                          </span>
                        </td>
                        <td
                          className={`py-3 px-2 font-bold ${
                            entry.entry_type === 'DEBIT' ? 'text-red-600' : 'text-green-600'
                          }`}
                        >
                          {entry.entry_type === 'DEBIT' ? '-' : '+'}
                          {entry.amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-slate-700">{entry.currency}</td>
                        <td className="py-3 px-2 text-slate-700">{entry.description}</td>
                        <td className="py-3 px-2 text-slate-500 text-xs">
                          {new Date(entry.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
