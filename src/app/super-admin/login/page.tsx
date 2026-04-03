"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowRight, Shield, Sparkles } from "lucide-react";
import {
  SUPER_ADMIN_DEMO_CODE,
  SUPER_ADMIN_DEMO_EMAIL,
  createSuperAdminSession,
  validateSuperAdminCredentials,
} from "@/lib/super-admin-session";

const ACCESS_NOTES = [
  "Use this route only for NAMA platform-control access.",
  "Customer workspace users should continue through registration and tenant-level routes.",
  "This alpha login is a preview-safe entry surface, not a production auth boundary.",
];

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(SUPER_ADMIN_DEMO_EMAIL);
  const [accessCode, setAccessCode] = useState(SUPER_ADMIN_DEMO_CODE);
  const [message, setMessage] = useState("Use the dedicated Super Admin route for platform control access.");
  const helperCopy = useMemo(
    () => [`Demo email: ${SUPER_ADMIN_DEMO_EMAIL}`, `Demo access code: ${SUPER_ADMIN_DEMO_CODE}`],
    [],
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateSuperAdminCredentials(email, accessCode)) {
      setMessage("Access denied. Use the Super Admin demo credentials on this separate route.");
      return;
    }

    createSuperAdminSession(email);
    setMessage("Super Admin session granted. Opening the control tower.");
    router.push("/dashboard/admin?entry=super-admin");
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] px-4 py-12 text-[#F5F0E8] sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 lg:flex-row lg:items-stretch">
        <section className="flex-1 rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(201,168,76,0.18),_transparent_48%),linear-gradient(180deg,_rgba(255,255,255,0.04),_rgba(255,255,255,0.02))] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#C9A84C]/20 bg-[#C9A84C]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#C9A84C]">
            <Shield size={12} />
            Super Admin Access
          </div>
          <h1 className="mt-6 max-w-xl text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">
            Platform control lives on a separate entry path.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-[#D6D0C4] sm:text-base">
            This route is reserved for NAMA Super Admin operators who need platform oversight, tenant audit visibility,
            commercial health monitoring, and scenario control. It should remain visibly separate from customer-facing
            onboarding and tenant workspace access.
          </p>
          <div className="mt-8 grid gap-3">
            {ACCESS_NOTES.map((note) => (
              <div key={note} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-[#D6D0C4]">
                {note}
              </div>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="mt-8 rounded-[28px] border border-white/10 bg-black/20 p-5">
            <div className="grid gap-4">
              <label className="grid gap-2 text-sm text-[#D6D0C4]">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9F9788]">Internal email</span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-[#111111] px-4 py-3 text-sm text-white outline-none transition focus:border-[#C9A84C]/40"
                  type="email"
                  autoComplete="username"
                />
              </label>
              <label className="grid gap-2 text-sm text-[#D6D0C4]">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9F9788]">Access code</span>
                <input
                  value={accessCode}
                  onChange={(event) => setAccessCode(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-[#111111] px-4 py-3 text-sm text-white outline-none transition focus:border-[#C9A84C]/40"
                  type="password"
                  autoComplete="current-password"
                />
              </label>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-[#C9A84C] px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#0A0A0A] transition hover:opacity-90"
              >
                Open Super Admin
                <ArrowRight size={14} />
              </button>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:border-[#C9A84C]/30 hover:text-[#C9A84C]"
              >
                Customer Onboarding
              </Link>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-[#B8B0A0]">{message}</p>
          </form>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/dashboard/admin?entry=super-admin"
              className="inline-flex items-center gap-2 rounded-full border border-dashed border-[#C9A84C]/25 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#C9A84C] transition hover:border-[#C9A84C]/40"
            >
              Existing session shortcut
            </Link>
          </div>
        </section>

        <aside className="w-full max-w-xl rounded-[32px] border border-white/10 bg-white/[0.03] p-8 lg:w-[430px]">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-[#9F9788]">
            <Sparkles size={12} className="text-[#C9A84C]" />
            Alpha Control Entry
          </div>
          <div className="mt-6 rounded-[28px] border border-white/10 bg-[#0F0F0F] p-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C9A84C]">NAMA Internal</p>
                <p className="mt-2 text-2xl font-black tracking-[-0.03em] text-white">Super Admin Login URL</p>
              </div>
              <div className="rounded-2xl border border-[#C9A84C]/20 bg-[#C9A84C]/10 p-3 text-[#C9A84C]">
                <Shield size={20} />
              </div>
            </div>

            <div className="mt-5 space-y-4 text-sm text-[#D6D0C4]">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9F9788]">Dedicated route</p>
                <p className="mt-2 break-all font-mono text-[#F5F0E8]">/super-admin/login</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9F9788]">Workspace routes</p>
                <p className="mt-2 font-mono text-[#F5F0E8]">/register</p>
                <p className="mt-1 font-mono text-[#F5F0E8]">/dashboard/*</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9F9788]">Alpha demo credentials</p>
                {helperCopy.map((line) => (
                  <p key={line} className="mt-2 font-mono text-[#F5F0E8]">
                    {line}
                  </p>
                ))}
              </div>
              <p>
                In this alpha branch, the separate URL communicates boundary and operating intent. Production-grade auth,
                RBAC, and access control still need to be completed in the next phase.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
