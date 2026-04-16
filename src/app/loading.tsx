export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 bg-[#14B8A6] rounded-xl flex items-center justify-center animate-pulse">
          <span className="font-black text-[#0F172A] text-lg">N</span>
        </div>
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 bg-[#14B8A6] rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
