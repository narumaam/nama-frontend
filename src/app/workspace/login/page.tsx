"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Briefcase, CreditCard, Eye, Shield, Sparkles, Users } from "lucide-react";

import { createTenantRoleSession, getDefaultRouteForRole, normalizeTenantRole, type AppRole } from "@/lib/auth-session";
import { readDemoProfile } from "@/lib/demo-profile";
import { readDemoWorkflowState, type DemoEmployeeRecord, type DemoInviteRecord } from "@/lib/demo-workflow";

type TenantRoleOption = {
  role: Exclude<AppRole, "super-admin">;
  heading: string;
  detail: string;
  icon: typeof Users;
};

type PersonaCard = TenantRoleOption & {
  displayName: string;
  email: string;
  designation: string;
  team: string;
  source: string;
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

function resolvePersona(
  option: TenantRoleOption,
  employees: DemoEmployeeRecord[],
  invites: DemoInviteRecord[],
  company: string,
  operator: string,
): PersonaCard {
  if (option.role === "customer-admin") {
    return { ...option, ...fallbackPersona(option.role, company, operator) };
  }

  const employee = employees.find((item) => normalizeTenantRole(item.role) === option.role);
  if (employee) {
    return {
      ...option,
      displayName: employee.name,
      email: employee.email,
      designation: employee.designation,
      team: employee.team,
      source: "Seeded from employee directory",
    };
  }

  const acceptedInvite = invites.find((item) => normalizeTenantRole(item.role) === option.role && item.status === "Accepted");
  if (acceptedInvite) {
    return {
      ...option,
      displayName: acceptedInvite.name,
      email: acceptedInvite.email,
      designation: acceptedInvite.designation,
      team: acceptedInvite.team,
      source: "Seeded from accepted invite",
    };
  }

  return { ...option, ...fallbackPersona(option.role, company, operator) };
}

export default function WorkspaceLoginPage() {
  const router = useRouter();
  const profile = useMemo(() => readDemoProfile(), []);
  const [message, setMessage] = useState("Choose a seeded tenant role to enter the workspace from its own starting point.");
  const [personas, setPersonas] = useState<PersonaCard[]>([]);

  useEffect(() => {
    function syncPersonas() {
      const workflow = readDemoWorkflowState();
      setPersonas(
        TENANT_ROLE_OPTIONS.map((option) =>
          resolvePersona(option, workflow.employees, workflow.invites, profile.company, profile.operator)
        )
      );
    }

    syncPersonas();
    window.addEventListener("storage", syncPersonas);
    window.addEventListener("nama-demo-workflow-updated", syncPersonas as EventListener);
    window.addEventListener("nama-demo-profile-updated", syncPersonas as EventListener);

    return () => {
      window.removeEventListener("storage", syncPersonas);
      window.removeEventListener("nama-demo-workflow-updated", syncPersonas as EventListener);
      window.removeEventListener("nama-demo-profile-updated", syncPersonas as EventListener);
    };
  }, [profile.company, profile.operator]);

  function enterWorkspace(persona: PersonaCard) {
    createTenantRoleSession(persona.displayName, profile.company, persona.role);
    setMessage(`${persona.heading} access granted for ${persona.displayName}. Opening the workspace entry path now.`);
    router.push(getDefaultRouteForRole(persona.role));
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] px-4 py-12 text-[#F5F0E8] sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 lg:flex-row lg:items-stretch">
        <section className="flex-1 rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(201,168,76,0.16),_transparent_48%),linear-gradient(180deg,_rgba(255,255,255,0.04),_rgba(255,255,255,0.02))] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#C9A84C]/20 bg-[#C9A84C]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#C9A84C]">
            <Users size={12} />
            Tenant Role Access
          </div>
          <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">
            Seeded role entry for customer teams.
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-[#D6D0C4] sm:text-base">
            This beta route gives each tenant role its own believable starting point. Sales, finance, operations, viewer,
            and customer-admin can enter through a seeded persona and land directly on the route that matches their scope.
          </p>

          <div className="mt-8 grid gap-4 xl:grid-cols-2">
            {personas.map((persona) => {
              const Icon = persona.icon;
              return (
                <button
                  key={persona.role}
                  type="button"
                  onClick={() => enterWorkspace(persona)}
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
                      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9F9788]">Seeded login</div>
                      <div className="mt-2 break-all font-mono text-white">{persona.email}</div>
                      <div className="mt-2 text-xs text-[#B8B0A0]">{persona.source}</div>
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
            Beta Role Entry
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
                These role cards are beta-safe seeded personas. They improve realistic QA and demo entry without claiming
                production auth, password delivery, or backend-backed identity yet.
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
