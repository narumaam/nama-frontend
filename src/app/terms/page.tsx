import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#F5F0E8] px-6 py-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-[10px] uppercase tracking-[0.25em] text-[#C9A84C] font-mono mb-4">NAMA Demo</div>
        <h1 className="text-4xl font-black tracking-tight mb-4">Demo Terms</h1>
        <p className="text-[#B8B0A0] leading-relaxed mb-8">
          This environment is a demonstration build of NAMA OS prepared to simulate lead triage, itinerary creation, deal review, and operating-system health.
          External supplier, payment, email, and messaging systems remain disconnected unless specifically configured later.
        </p>
        <Link href="/" className="text-[#C9A84C] text-sm font-bold hover:underline">Return to homepage</Link>
      </div>
    </main>
  );
}

