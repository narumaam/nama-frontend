"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Briefcase, CreditCard, Eye, Shield, Sparkles, Users } from "lucide-react";

import { createIssuedTenantSession, getDefaultRouteForRole, normalizeTenantRole, type AppRole } from "@/lib/auth-session";
import { confirmTenantCredentialReset, requestTenantCredentialReset } from "@/lib/credential-api";
import { type DemoMemberRecord } from "@/lib/demo-members";
import { readDemoProfile } from "@/lib/demo-profile";
import { readDemoWorkflowState, type DemoEmployeeRecord, type DemoInviteRecord } from "@/lib/demo-workflow";
import { issueTenantSession } from "@/lib/session-api";
import { useDemoMembers } from "@/lib/use-demo-members";

type TenantRoleOption = {
  role: Exclude<AppRole, "super-admin">;
  heading: string;
  detail: string;
  icon: typeof Users;
};

type PersonaCard = TenantRoleOption & {
  id: string;
  displayName: string;
  email: string;
  designation: string;
  team: string;
  source: string;
  status: string;
};

const TENANT_ROLE_OPTIONS: TenantRoleOption[] = [
  { role: "customer-admin", heading: "Customer Admin", detail: "Tenant-level owner for workspace setup, team access, and full operating oversight.", icon: Shield },
  { role: "sales", heading: "Sales", detail: "CRM, lead conversion, follow-up ownership, and deal progress control.", icon: Users },
  { role: "finance", heading: "Finance", detail: "Quote, deposit, invoice, and settlement visibility across the same case flow.", icon: CreditCard },
  { role: "operations", heading: "Operations", detail: "Bookings, confirmations, traveler dispatch, and fulfilment-side execution control.", icon: Briefcase },
  { role: "viewer", heading: "Viewer", detail: "Read-only reporting and artifact review without workspace mutation access.", icon: Eye },
];

function fallbackPersona(
  role: Exclude<AppRole, "super-admin">,
  company: string,
  operator: string,
): Pick<PersonaCard, "displayName" | "email" | "designation" | "team" | "source"> {
  const companyToken = company.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 18) || "tenant";
  const defaults: Record<Exclude<AppRole, "super-admin">, { displayName: string; designation: string; team: string }> = {
    "customer-admin": { displayName: operator || "Workspace Admin", designation: "Workspace Admin", team: "Leadership" },
    sales: { displayName: "Sales Persona", designation: "Travel Consultant", team: "Sales Desk" },
    finance: { displayName: "Finance Persona", designation: "Accounts Lead", team: "Billing" },
    operations: { displayName: "Operations Persona", designation: "Operations Lead", team: "Fulfilment" },
    viewer: { displayName: "Viewer Persona", designation: "Read-only Reviewer", team: "Reporting" },
  };
  const current = defaults[role];
  return {
    displayName: current.displayName,
    email: `${role.replace(/[^a-z]+/g, "")}@${companyToken}.demo`,
    designation: current.designation,
    team: current.team,
    source: role === "customer-admin" ? "Seeded from tenant onboarding" : "Seeded beta persona",
  };
}

function optionForRole(role: Exclude<AppRole, "super-admin">) {
  return TENANT_ROLE_OPTIONS.find((option) => option.role === role) ?? TENANT_ROLE_OPTIONS[TENANT_ROLE_OPTIONS.length - 1];
}

function memberPersona(member: DemoMemberRecord): PersonaCard {
  const option = optionForRole(member.role);
  return {
    ...option,
    id: member.id,
    displayName: member.name,
    email: member.email,
    designation: member.designation,
    team: member.team,
    source: member.source.replace(/-/g, " "),
    status: member.status,
  };
}

function resolvePersona(
  option: TenantRoleOption,
  employees: DemoEmployeeRecord[],
  invites: DemoInviteRecord[],
  company: string,
  operator: string,
): PersonaCard {
  if (option.role === "customer-admin") {
    return { ...option, id: option.role, ...fallbackPersona(option.role, company, operator), status: "Seeded" };
  }

  const employee = employees.find((item) => normalizeTenantRole(item.role) === option.role);
  if (employee) {
    return {
      ...option,
      id: employee.id,
      displayName: employee.name,
      email: employee.email,
      designation: employee.designation,
      team: employee.team,
      source: "Seeded from employee directory",
      status: "Active",
    };
  }

  const acceptedInvite = invites.find((item) => normalizeTenantRole(item.role) === option.role && item.status === "Accepted");
  if (acceptedInvite) {
    return {
      ...option,
      id: acceptedInvite.id,
      displayName: acceptedInvite.name,
      email: acceptedInvite.email,
      designation: acceptedInvite.designation,
      team: acceptedInvite.team,
      source: "Seeded from accepted invite",
      status: "Active",
    };
  }

  return { ...option, id: option.role, ...fallbackPersona(option.role, company, operator), status: "Seeded" };
}

export default function WorkspaceLoginPage() {
  const router = useRouter();
  const profile = useMemo(() => readDemoProfile(), []);
  const memberRegistry = useDemoMembers();
  const [email, setEmail] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [resetAccessCode, setResetAccessCode] = useState("");
  const [message, setMessage] = useState("Enter tenant member credentials or use a member card to prefill the login form.");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const personas = useMemo(() => {
    const sourceRank = {
      "tenant-profile": 0,
      "demo-api": 1,
      "backend-demo": 2,
      "accepted-invite": 3,
      manual: 4,
      "employee-directory": 5,
    } as const;
    const tenantMembers = memberRegistry.members
      .filter((member) => member.tenantName === profile.company)
      .filter((member) => member.status !== "Invited")
      .filter((member) => member.source in sourceRank)
      .sort((left, right) => {
        const statusRank = { Active: 0, Invited: 1, Seeded: 2 } as const;
        return (
          statusRank[left.status] - statusRank[right.status] ||
          left.role.localeCompare(right.role) ||
          sourceRank[left.source] - sourceRank[right.source] ||
          left.name.localeCompare(right.name)
        );
      });

    if (tenantMembers.length) {
      return tenantMembers.map(memberPersona);
    }

    const workflow = readDemoWorkflowState();
    return TENANT_ROLE_OPTIONS.map((option) => resolvePersona(option, workflow.employees, workflow.invites, profile.company, profile.operator));
  }, [memberRegistry.members, profile.company, profile.operator]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");
    const accessCodeParam = params.get("access_code");
    const inviteAccepted = params.get("invite_accepted");

    if (emailParam) {
      setEmail(emailParam);
    }
    if (accessCodeParam) {
      setAccessCode(accessCodeParam);
    }
    if (inviteAccepted === "1" && emailParam && accessCodeParam) {
      setMessage("Invite accepted. Confirm the issued credentials below to enter the workspace.");
    }
  }, []);

  function applyPersona(persona: PersonaCard) {
    setEmail(persona.email);
    setAccessCode("");
    setResetToken("");
    setResetAccessCode("");
    setMessage(`${persona.heading} email loaded for ${persona.displayName}. Enter the member credential or request a reset.`);
  }

  async function handleRequestReset() {
    if (!email.trim()) {
      setMessage("Enter the member email first so we can issue a reset token.");
      return;
    }

    setIsResetting(true);
    try {
      const response = await requestTenantCredentialReset({
        tenant_name: profile.company,
        email,
        scope: "tenant",
      });
      setResetToken(response.reset_token);
      setMessage("Reset token issued for this beta workspace. Set the new access code below and confirm the reset.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to request a reset token.");
    } finally {
      setIsResetting(false);
    }
  }

  async function handleConfirmReset() {
    if (!email.trim() || !resetToken.trim()) {
      setMessage("Request a reset token first, then confirm the new access code.");
      return;
    }
    if (resetAccessCode.trim().length < 8) {
      setMessage("Choose a new access code with at least 8 characters.");
      return;
    }

    setIsResetting(true);
    try {
      await confirmTenantCredentialReset({
        tenant_name: profile.company,
        email,
        scope: "tenant",
        reset_token: resetToken,
        access_code: resetAccessCode,
      });
      setAccessCode(resetAccessCode);
      setMessage("Workspace credential updated. Submit the login form to verify and enter.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to confirm the reset.");
    } finally {
      setIsResetting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const issuedSession = await issueTenantSession({
        email,
        scope: "tenant",
        tenant_name: profile.company,
        access_code: accessCode,
      });

      const nextRole = issuedSession.role === "super-admin" ? "customer-admin" : issuedSession.role;
      createIssuedTenantSession({
        accessToken: issuedSession.id,
        email: issuedSession.email,
        displayName: issuedSession.display_name,
        role: nextRole,
        tenantName: issuedSession.tenant_name || profile.company,
        memberId: issuedSession.member_id,
        memberStatus: issuedSession.member_status,
        designation: issuedSession.designation,
        team: issuedSession.team,
      });
      setMessage(`${issuedSession.display_name} verified. Opening the workspace route for ${nextRole}.`);
      router.push(getDefaultRouteForRole(nextRole));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Tenant member login failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] px-4 py-12 text-[#F5F0E8] sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 lg:flex-row lg:items-stretch">
        <section className="flex-1 rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(201,168,76,0.16),_transparent_48%),linear-gradient(180deg,_rgba(255,255,255,0.04),_rgba(255,255,255,0.02))] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#C9A84C]/20 bg-[#C9A84C]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#C9A84C]">
            <Users size={12} />
            Member Workspace Entry
          </div>
          <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">
            Workspace entry based on the tenant member roster.
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-[#D6D0C4] sm:text-base">
            This route now verifies against the member credential registry for the current tenant. Operators, imported employees,
            and accepted invitees sign in through the session contract and can rotate credentials without local session shortcuts.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 rounded-[28px] border border-white/10 bg-black/20 p-5">
            <div className="grid gap-4">
              <label className="grid gap-2 text-sm text-[#D6D0C4]">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9F9788]">Workspace email</span>
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
                {isSubmitting ? "Verifying Access" : "Enter Workspace"}
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
            </div>
          </form>

          <div className="mt-4 rounded-[28px] border border-white/10 bg-black/20 p-5">
            <div className="grid gap-4 md:grid-cols-[1.2fr_1fr_auto] md:items-end">
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
                  value={resetAccessCode}
                  onChange={(event) => setResetAccessCode(event.target.value)}
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

          <div className="mt-8 grid gap-4 xl:grid-cols-2">
            {personas.map((persona) => {
              const Icon = persona.icon;
              return (
                <button
                  key={persona.id}
                  type="button"
                  onClick={() => applyPersona(persona)}
                  className="rounded-[28px] border border-white/10 bg-black/20 p-6 text-left transition hover:border-[#C9A84C]/30 hover:bg-black/30"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-[#C9A84C]/20 bg-[#C9A84C]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#C9A84C]">
                        <Icon size={12} />
                        {persona.heading}
                      </div>
                      <h2 className="mt-4 text-2xl font-black tracking-[-0.03em] text-white">{persona.displayName}</h2>
                      <p className="mt-2 text-sm leading-relaxed text-[#D6D0C4]">{persona.detail}</p>
                    </div>
                    <ArrowRight size={18} className="mt-1 text-[#C9A84C]" />
                  </div>

                  <div className="mt-5 grid gap-3 text-sm text-[#D6D0C4] sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9F9788]">Designation</div>
                      <div className="mt-2 font-semibold text-white">{persona.designation}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9F9788]">Team</div>
                      <div className="mt-2 font-semibold text-white">{persona.team}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:col-span-2">
                      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9F9788]">Member login</div>
                      <div className="mt-2 break-all font-mono text-white">{persona.email}</div>
                      <div className="mt-2 text-xs text-[#B8B0A0]">
                        {persona.status} via {persona.source}
                      </div>
                      <div className="mt-3 text-xs text-[#C9A84C]">Prefill email only. Credentials are verified server-side.</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-6 rounded-[24px] border border-white/10 bg-black/20 p-5 text-sm leading-relaxed text-[#D6D0C4]">
            {message}
          </div>
        </section>

        <aside className="w-full max-w-xl rounded-[32px] border border-white/10 bg-white/[0.03] p-8 lg:w-[430px]">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-[#9F9788]">
            <Sparkles size={12} className="text-[#C9A84C]" />
            Member Entry Notes
          </div>
          <div className="mt-6 rounded-[28px] border border-white/10 bg-[#0F0F0F] p-6">
            <div className="space-y-4 text-sm text-[#D6D0C4]">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9F9788]">Dedicated route</p>
                <p className="mt-2 break-all font-mono text-[#F5F0E8]">/workspace/login</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9F9788]">Tenant onboarding</p>
                <p className="mt-2 font-mono text-[#F5F0E8]">/register</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9F9788]">Platform control</p>
                <p className="mt-2 font-mono text-[#F5F0E8]">/super-admin/login</p>
              </div>
              <p>
                Member cards are resolved from the tenant registry first. They prefill identity, while login and reset both verify through the credential contract instead of showing reusable codes in the UI.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:border-[#C9A84C]/30 hover:text-[#C9A84C]"
              >
                Customer Onboarding
              </Link>
              <Link
                href="/super-admin/login"
                className="inline-flex items-center gap-2 rounded-full border border-[#C9A84C]/20 bg-[#C9A84C]/10 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#C9A84C] transition hover:border-[#C9A84C]/35"
              >
                Super Admin Login
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
