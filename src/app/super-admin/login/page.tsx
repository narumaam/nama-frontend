"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Shield, Sparkles } from "lucide-react";
import { SUPER_ADMIN_DEMO_CODE, SUPER_ADMIN_DEMO_EMAIL } from "@/lib/super-admin-session";
import { createIssuedSuperAdminSession } from "@/lib/auth-session";
import { confirmSuperAdminCredentialReset, requestSuperAdminCredentialReset } from "@/lib/credential-api";
import { issueSuperAdminSession } from "@/lib/session-api";

const ACCESS_NOTES = [
  "Use this route only for NAMA platform-control access.",
  "Customer workspace users should continue through registration and tenant-level routes.",
  "This beta login uses the same contract-backed credential lifecycle as workspace member access.",
];

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(SUPER_ADMIN_DEMO_EMAIL);
  const [accessCode, setAccessCode] = useState(SUPER_ADMIN_DEMO_CODE);
  const [resetToken, setResetToken] = useState("");
  const [newAccessCode, setNewAccessCode] = useState("");
  const [message, setMessage] = useState("Use the dedicated Super Admin route for platform control access.");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const issuedSession = await issueSuperAdminSession({
        email,
        access_code: accessCode,
      });
      createIssuedSuperAdminSession({
        accessToken: issuedSession.id,
        email: issuedSession.email,
        displayName: issuedSession.display_name,
      });
      setMessage("Super Admin session granted. Opening the control tower.");
      router.push("/dashboard/admin?entry=super-admin");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Access denied. Use the Super Admin demo credentials on this separate route.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRequestReset() {
    setIsResetting(true);

    try {
      const response = await requestSuperAdminCredentialReset({
        email,
        scope: "platform",
        tenant_name: null,
      });
      setResetToken(response.reset_token);
      setMessage("Super Admin reset token issued. Confirm the new credential below, then sign in again.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to request a Super Admin reset.");
    } finally {
      setIsResetting(false);
    }
  }

  async function handleConfirmReset() {
    if (!resetToken.trim()) {
      setMessage("Request a reset token first.");
      return;
    }
    if (newAccessCode.trim().length < 8) {
      setMessage("Choose a new Super Admin access code with at least 8 characters.");
      return;
    }

    setIsResetting(true);
    try {
      await confirmSuperAdminCredentialReset({
        email,
        scope: "platform",
        tenant_name: null,
        reset_token: resetToken,
        access_code: newAccessCode,
      });
      setAccessCode(newAccessCode);
      setMessage("Super Admin credential updated. Use it to sign back into the control tower.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to confirm the Super Admin reset.");
    } finally {
      setIsResetting(false);
    }
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
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-full bg-[#C9A84C] px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#0A0A0A] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Checking Access" : "Open Super Admin"}
                <ArrowRight size={14} />
              </button>
              <button
                type="button"
                onClick={handleRequestReset}
                disabled={isResetting}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:border-[#C9A84C]/30 hover:text-[#C9A84C] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isResetting ? "Working..." : "Request Reset"}
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
          <div className="mt-4 rounded-[28px] border border-white/10 bg-black/20 p-5">
            <div className="grid gap-4 md:grid-cols-[1.1fr_1fr_auto] md:items-end">
              <label className="grid gap-2 text-sm text-[#D6D0C4]">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9F9788]">Reset token</span>
                <input
                  value={resetToken}
                  onChange={(event) => setResetToken(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-[#111111] px-4 py-3 text-sm text-white outline-none transition focus:border-[#C9A84C]/40"
                  type="text"
                />
              </label>
              <label className="grid gap-2 text-sm text-[#D6D0C4]">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9F9788]">New access code</span>
                <input
                  value={newAccessCode}
                  onChange={(event) => setNewAccessCode(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-[#111111] px-4 py-3 text-sm text-white outline-none transition focus:border-[#C9A84C]/40"
                  type="password"
                  autoComplete="new-password"
                />
              </label>
              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={isResetting}
                className="inline-flex h-[50px] items-center justify-center rounded-full bg-white px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#0A0A0A] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Confirm Reset
              </button>
            </div>
          </div>
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
            Control Entry
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
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9F9788]">Bootstrap credential</p>
                <p className="mt-2 font-mono text-[#F5F0E8]">Email: {SUPER_ADMIN_DEMO_EMAIL}</p>
                <p className="mt-2 font-mono text-[#F5F0E8]">Initial access code: {SUPER_ADMIN_DEMO_CODE}</p>
              </div>
              <p>
                The separate URL still communicates boundary and operating intent, but the credential now supports rotation through
                the shared auth contract instead of remaining a permanent demo-only shortcut.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
