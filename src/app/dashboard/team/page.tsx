"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardList, FileUp, Filter, Mail, Plus, Shield, Users, UserPlus2 } from "lucide-react";

type TeamRole = {
  name: string;
  scope: string;
  people: number;
  color: string;
};

type InviteRecord = {
  name: string;
  email: string;
  role: string;
  status: "Pending" | "Accepted" | "Invited";
  responsibility: string;
};

const TEAM_ROLES: TeamRole[] = [
  { name: "Admin", scope: "Full workspace control", people: 2, color: "text-[#C9A84C]" },
  { name: "Sales", scope: "Leads, quotes, follow-up", people: 5, color: "text-[#1D9E75]" },
  { name: "Operations", scope: "Itineraries, bookings, vouchers", people: 4, color: "text-[#F5F0E8]" },
  { name: "Finance", scope: "Deposits, balances, reconciliation", people: 2, color: "text-[#C9A84C]" },
  { name: "Sub-agent", scope: "Restricted customer-facing access", people: 3, color: "text-[#B8B0A0]" },
];

const INVITES: InviteRecord[] = [
  { name: "Aisha Khan", email: "aisha@demoagency.in", role: "Sales", status: "Pending", responsibility: "Maldives, Dubai" },
  { name: "Rohan Iyer", email: "rohan@demoagency.in", role: "Operations", status: "Accepted", responsibility: "Kerala, Content" },
  { name: "Meera Shah", email: "meera@demoagency.in", role: "Finance", status: "Invited", responsibility: "Billing, payouts" },
  { name: "Arjun Paul", email: "arjun@demoagency.in", role: "Sub-agent", status: "Pending", responsibility: "Inbound support" },
];

const BULK_ROWS = [
  { name: "Priya", email: "priya@demoagency.in", role: "Sales", designation: "Senior Executive", team: "Inbound Desk" },
  { name: "Nikhil", email: "nikhil@demoagency.in", role: "Operations", designation: "Trip Designer", team: "Luxury Desk" },
  { name: "Farah", email: "farah@demoagency.in", role: "Finance", designation: "Accounts Lead", team: "Billing" },
];

const HIERARCHY = [
  { level: "L1", label: "Super Admin", details: "Platform owner, global governance, billing, and system templates." },
  { level: "L2", label: "Customer Admin", details: "Agency owner or manager who creates users, roles, and teams." },
  { level: "L3", label: "Department Lead", details: "Sales, Ops, Finance, or Corporate lead with scoped oversight." },
  { level: "L4", label: "Team Member", details: "Handles assigned leads, quotes, bookings, or documents." },
  { level: "L5", label: "Sub-agent", details: "Limited-access external collaborator with controlled visibility." },
];

const ASSIGNMENTS = [
  { lead: "Meera Nair", owner: "Aisha Khan", role: "Sales", note: "Honeymoon lead assigned for quick quote turn-around." },
  { lead: "Arjun Mehta", owner: "Nikhil", role: "Operations", note: "Executive bleisure case handed to itinerary operations." },
  { lead: "Sharma Family", owner: "Farah", role: "Finance", note: "Payment reminder and deposit monitoring." },
];

export default function TeamPage() {
  const [selectedRole, setSelectedRole] = useState("Sales");
  const [selectedMode, setSelectedMode] = useState<"invite" | "bulk" | "roles" | "hierarchy" | "assign">("invite");

  const filteredInvites = useMemo(
    () => INVITES.filter((invite) => invite.role === selectedRole || selectedRole === "All"),
    [selectedRole]
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-[#C9A84C] uppercase tracking-[0.3em] mb-2">
            <span>Customer Admin</span>
            <ArrowRight size={10} />
            <span className="opacity-50">Team Workspace</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter uppercase text-[#F5F0E8] font-headline">Team & Access</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#B8B0A0]">
            Demo-safe workspace for customer admins to create individual invites, preview bulk user uploads, assign roles, and show the hierarchy and team ownership model without touching live credentials.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/leads"
            className="rounded-xl border border-[#C9A84C]/15 bg-[#111111] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#C9A84C] transition-all hover:bg-[#C9A84C]/10"
          >
            Back to Leads
          </Link>
          <button className="rounded-xl bg-[#C9A84C] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#0A0A0A] shadow-[0_0_12px_rgba(201,168,76,0.18)]">
            Create Invite
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <Metric label="Active Users" value="14" sub="Across Sales, Ops, Finance" icon={<Users size={16} />} />
        <Metric label="Pending Invites" value="4" sub="Ready for customer admin send" icon={<UserPlus2 size={16} />} />
        <Metric label="Bulk Import" value="CSV Preview" sub="Imported rows staged before send" icon={<FileUp size={16} />} />
        <Metric label="Hierarchy" value="L1-L5" sub="From super admin to sub-agent" icon={<Shield size={16} />} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <section className="xl:col-span-3 rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-[#F5F0E8] font-headline">Workflow Modes</h2>
              <p className="mt-1 text-sm text-[#B8B0A0]">Switch between invite creation, bulk upload, role design, hierarchy, and assignments.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["invite", "bulk", "roles", "hierarchy", "assign"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSelectedMode(mode)}
                  className={`rounded-full border px-3 py-2 text-[9px] font-black uppercase tracking-widest transition-all ${
                    selectedMode === mode
                      ? "border-[#C9A84C]/30 bg-[#C9A84C]/10 text-[#C9A84C]"
                      : "border-[#C9A84C]/10 bg-[#0A0A0A] text-[#B8B0A0] hover:text-[#F5F0E8]"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {selectedMode === "invite" && (
            <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-5">
                <div className="flex items-center gap-2 mb-4 text-[#C9A84C]">
                  <Mail size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Individual Invite</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Name" value="Aisha Khan" />
                  <Field label="Email" value="aisha@demoagency.in" />
                  <Field label="Role" value="Sales" />
                  <Field label="Designation" value="Senior Executive" />
                  <Field label="Team" value="Inbound Desk" />
                  <Field label="Reports to" value="Sales Manager" />
                </div>
                <div className="mt-4 rounded-2xl border border-dashed border-[#C9A84C]/20 bg-[#111111] p-4 text-sm text-[#B8B0A0]">
                  Preview: invitation email, access role, and reporting line are prepared before the customer admin clicks send.
                </div>
              </div>
              <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-[#F5F0E8]">Recent Invites</h3>
                  <span className="text-[9px] font-mono uppercase tracking-widest text-[#4A453E]">Filter: {selectedRole}</span>
                </div>
                <div className="mb-3 flex flex-wrap gap-2">
                  {["All", "Sales", "Operations", "Finance", "Sub-agent"].map((role) => (
                    <button
                      key={role}
                      onClick={() => setSelectedRole(role)}
                      className={`rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all ${
                        selectedRole === role
                          ? "bg-[#C9A84C] text-[#0A0A0A]"
                          : "bg-[#1A1A1A] text-[#B8B0A0] hover:text-[#F5F0E8]"
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
                <div className="space-y-3">
                  {filteredInvites.map((invite) => (
                    <InviteRow key={invite.email} invite={invite} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {selectedMode === "bulk" && (
            <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-5">
                <div className="flex items-center gap-2 mb-4 text-[#C9A84C]">
                  <FileUp size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Bulk CSV Import Preview</span>
                </div>
                <div className="overflow-hidden rounded-2xl border border-[#C9A84C]/10">
                  <div className="grid grid-cols-4 bg-[#111111] px-4 py-3 text-[9px] font-black uppercase tracking-widest text-[#4A453E]">
                    <span>Name</span>
                    <span>Email</span>
                    <span>Role</span>
                    <span>Designation</span>
                  </div>
                  <div className="divide-y divide-[#C9A84C]/10">
                    {BULK_ROWS.map((row) => (
                      <div key={row.email} className="grid grid-cols-4 px-4 py-3 text-sm text-[#F5F0E8]">
                        <span>{row.name}</span>
                        <span className="text-[#B8B0A0]">{row.email}</span>
                        <span className="text-[#C9A84C]">{row.role}</span>
                        <span className="text-[#B8B0A0]">{row.designation}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-5">
                <div className="flex items-center gap-2 mb-4 text-[#C9A84C]">
                  <ClipboardList size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Import Notes</span>
                </div>
                <ul className="space-y-3 text-sm text-[#B8B0A0] leading-relaxed">
                  <li>Rows are validated before invite send, so the customer admin can review the structure without risk.</li>
                  <li>Roles, designations, teams, and reporting lines are mapped in one place.</li>
                  <li>Imported users inherit the selected permissions and hierarchy on approval.</li>
                </ul>
              </div>
            </div>
          )}

          {selectedMode === "roles" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-5">
                <div className="flex items-center gap-2 mb-4 text-[#C9A84C]">
                  <Filter size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Role Matrix</span>
                </div>
                <div className="space-y-3">
                  {TEAM_ROLES.map((role) => (
                    <div key={role.name} className="rounded-2xl border border-[#C9A84C]/10 bg-[#111111] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className={`text-sm font-black uppercase tracking-widest ${role.color}`}>{role.name}</div>
                          <div className="mt-1 text-xs text-[#B8B0A0]">{role.scope}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-black text-[#F5F0E8]">{role.people}</div>
                          <div className="text-[9px] font-mono uppercase tracking-widest text-[#4A453E]">people</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-5">
                <div className="flex items-center gap-2 mb-4 text-[#C9A84C]">
                  <CheckCircle2 size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Responsibilities</span>
                </div>
                <div className="space-y-3 text-sm text-[#B8B0A0]">
                  <Item text="Admin can create users individually or in bulk." />
                  <Item text="Sales receives leads, quote access, and follow-up tasks." />
                  <Item text="Operations handles itinerary, booking, and voucher execution." />
                  <Item text="Finance handles deposits, balance reminders, and reconciliation." />
                  <Item text="Sub-agents are restricted to assigned leads and customer-facing scope." />
                </div>
              </div>
            </div>
          )}

          {selectedMode === "hierarchy" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-5">
                <div className="flex items-center gap-2 mb-4 text-[#C9A84C]">
                  <Shield size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Hierarchy Map</span>
                </div>
                <div className="space-y-3">
                  {HIERARCHY.map((item) => (
                    <div key={item.level} className="rounded-2xl border border-[#C9A84C]/10 bg-[#111111] p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center text-[#C9A84C] font-black text-xs">
                          {item.level}
                        </div>
                        <div>
                          <div className="text-sm font-black text-[#F5F0E8]">{item.label}</div>
                          <div className="mt-1 text-xs text-[#B8B0A0] leading-relaxed">{item.details}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-5">
                <div className="flex items-center gap-2 mb-4 text-[#C9A84C]">
                  <Users size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Designations</span>
                </div>
                <div className="space-y-3">
                  {[
                    "Sales Manager",
                    "Senior Executive",
                    "Trip Designer",
                    "Operations Lead",
                    "Billing Coordinator",
                    "Sub-agent Partner",
                  ].map((designation) => (
                    <div key={designation} className="rounded-2xl border border-[#C9A84C]/10 bg-[#111111] px-4 py-3 text-sm text-[#F5F0E8]">
                      {designation}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {selectedMode === "assign" && (
            <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-5">
                <div className="flex items-center gap-2 mb-4 text-[#C9A84C]">
                  <Plus size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Assignment Board</span>
                </div>
                <div className="space-y-3">
                  {ASSIGNMENTS.map((item) => (
                    <div key={item.lead} className="rounded-2xl border border-[#C9A84C]/10 bg-[#111111] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-black text-[#F5F0E8]">{item.lead}</div>
                          <div className="mt-1 text-xs text-[#B8B0A0]">{item.note}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black text-[#C9A84C]">{item.owner}</div>
                          <div className="text-[9px] font-mono uppercase tracking-widest text-[#4A453E]">{item.role}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-5">
                <div className="flex items-center gap-2 mb-4 text-[#C9A84C]">
                  <CheckCircle2 size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Demo-safe Notes</span>
                </div>
                <ul className="space-y-3 text-sm text-[#B8B0A0] leading-relaxed">
                  <li>Assignments are rendered as static demo work so the Monday demo stays stable.</li>
                  <li>The screen shows how ownership, team, and designation mapping would look for a customer admin.</li>
                  <li>Real provisioning can be connected later without changing the visible flow.</li>
                </ul>
              </div>
            </div>
          )}
        </section>

        <aside className="xl:col-span-2 rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">What This Proves</h2>
          </div>
          <p className="text-sm leading-relaxed text-[#B8B0A0]">
            A customer admin can create users one by one, preview a bulk CSV import, assign roles and designations, and present a clear hierarchy from super admin down to sub-agent. This keeps the Monday story focused on operational control without needing live auth provisioning.
          </p>
          <div className="mt-5 rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C] mb-2">Demo Positioning</div>
            <div className="text-sm text-[#F5F0E8] leading-relaxed">
              Use this page as the admin control-room appendix after the main lead-to-deal walkthrough. It is demo-ready, self-contained, and safe to show live.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Metric({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#111111] p-5">
      <div className="mb-3 flex items-center gap-2 text-[#C9A84C]">
        {icon}
        <span className="text-[10px] font-mono uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-2xl font-black text-[#F5F0E8]">{value}</div>
      <div className="mt-1 text-xs text-[#4A453E]">{sub}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#111111] p-4">
      <div className="text-[9px] font-black uppercase tracking-widest text-[#4A453E]">{label}</div>
      <div className="mt-1 text-sm font-semibold text-[#F5F0E8]">{value}</div>
    </div>
  );
}

function InviteRow({ invite }: { invite: InviteRecord }) {
  const statusClass =
    invite.status === "Accepted"
      ? "text-[#1D9E75] border-[#1D9E75]/20 bg-[#1D9E75]/10"
      : invite.status === "Pending"
        ? "text-[#C9A84C] border-[#C9A84C]/20 bg-[#C9A84C]/10"
        : "text-[#B8B0A0] border-[#B8B0A0]/20 bg-[#B8B0A0]/10";

  return (
    <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#111111] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-black text-[#F5F0E8]">{invite.name}</div>
          <div className="mt-1 text-xs text-[#B8B0A0]">{invite.email}</div>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${statusClass}`}>{invite.status}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[9px] font-mono uppercase tracking-widest text-[#4A453E]">
        <span>{invite.role}</span>
        <span>•</span>
        <span>{invite.responsibility}</span>
      </div>
    </div>
  );
}

function Item({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#111111] px-4 py-3">
      {text}
    </div>
  );
}
