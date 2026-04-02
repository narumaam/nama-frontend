import Link from "next/link";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#F5F0E8] px-6 py-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-[10px] uppercase tracking-[0.25em] text-[#C9A84C] font-mono mb-4">NAMA Demo</div>
        <h1 className="text-4xl font-black tracking-tight mb-4">Contact</h1>
        <p className="text-[#B8B0A0] leading-relaxed mb-4">
          For the Monday demo, use this page as the executive handoff point for follow-up questions, implementation planning, and pilot onboarding.
        </p>
        <p className="text-[#F5F0E8] text-sm mb-8">
          Contact: <span className="text-[#C9A84C]">Narayan Mallapur</span>
        </p>
        <Link href="/" className="text-[#C9A84C] text-sm font-bold hover:underline">Return to homepage</Link>
      </div>
    </main>
  );
}

