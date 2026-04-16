import Link from 'next/link'
import { ArrowLeft, Map } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center font-sans px-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-[#14B8A6]/15 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Map size={28} className="text-[#14B8A6]" />
        </div>
        <div className="text-7xl font-black text-[#14B8A6] mb-4">404</div>
        <h1 className="text-2xl font-black text-white mb-3 tracking-tight">Page not found</h1>
        <p className="text-slate-400 font-medium text-sm leading-relaxed mb-8">
          The itinerary you&apos;re looking for doesn&apos;t exist — or has been moved to a better destination.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 bg-[#14B8A6] text-[#0F172A] font-black text-sm px-5 py-3 rounded-xl hover:bg-teal-400 transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-400 hover:text-white font-bold text-sm px-5 py-3 rounded-xl border border-slate-700 hover:border-slate-500 transition-all"
          >
            <ArrowLeft size={14} /> Home
          </Link>
        </div>
      </div>
    </div>
  )
}
