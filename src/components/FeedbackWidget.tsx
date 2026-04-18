'use client'

import React, { useState } from 'react'
import { MessageSquare, Star, X, CheckCircle2 } from 'lucide-react'

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (score === null) return
    setLoading(true)
    
    try {
      // Call the API I created earlier
      const res = await fetch('/api/v1/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score,
          comment,
          feature: window.location.pathname
        })
      })
      
      if (res.ok) {
        setSubmitted(true)
        setTimeout(() => {
          setIsOpen(false)
          setSubmitted(false)
          setScore(null)
          setComment('')
        }, 3000)
      }
    } catch (err) {
      console.error('Feedback submission failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-6 left-6 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="w-12 h-12 bg-[#0F172A] text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all group"
        >
          <MessageSquare size={20} className="group-hover:rotate-12 transition-transform" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#14B8A6] rounded-full animate-ping" />
        </button>
      ) : (
        <div className="bg-white rounded-[24px] border border-slate-200 shadow-2xl w-80 p-6 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center mb-6">
            <h4 className="font-black text-slate-800 flex items-center gap-2">
              <Star size={18} className="text-[#14B8A6]" /> Feedback
            </h4>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>

          {!submitted ? (
            <div className="space-y-6">
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">How likely are you to recommend NAMA?</p>
                <div className="flex justify-between gap-1">
                  {[...Array(11)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setScore(i)}
                      className={`w-6 h-8 text-[10px] font-black rounded-md transition-all ${
                        score === i ? 'bg-[#14B8A6] text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tell us more (optional)</p>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Suggestions, bugs, or things you love..."
                  className="w-full h-24 bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#14B8A6] transition-all"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={score === null || loading}
                className={`w-full py-3 rounded-xl text-sm font-black transition-all ${
                  score !== null ? 'bg-[#0F172A] text-white hover:bg-slate-800' : 'bg-slate-100 text-slate-300'
                }`}
              >
                {loading ? 'Sending...' : 'Submit Feedback'}
              </button>
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 bg-teal-50 text-teal-500 rounded-full flex items-center justify-center animate-bounce">
                <CheckCircle2 size={24} />
              </div>
              <p className="font-bold text-slate-800">Thank you!</p>
              <p className="text-xs text-slate-500 font-medium">Your feedback helps us build the perfect Travel OS.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
