"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { canPerformAction, normalizeTenantRole } from "@/lib/auth-session";
import { fetchTenantAuthAudit, type AuthAuditEvent } from "@/lib/audit-api";
import ScreenInfoTip from "@/components/screen-info-tip";
import { DEMO_CASE_ROUTES } from "@/lib/demo-cases";
import { DEMO_CASE_ASSIGNMENTS } from "@/lib/demo-case-profiles";
import { bulkUpsertDemoMembersViaApi, syncTenantMembersFromApi, upsertDemoMemberViaApi } from "@/lib/demo-members";
import { DEFAULT_DEMO_PROFILE, getDemoBrandTheme, getDemoDomainMode, getDemoWorkspaceDomain, writeDemoProfile } from "@/lib/demo-profile";
import {
  createBulkDemoInvitesViaApi,
  createDemoInvite,
  createDemoInviteViaApi,
  createEmployeeRecord,
  getInvitePath,
  upsertDemoEmployees,
  type DemoInviteRecord,
} from "@/lib/demo-workflow";
import { SCREEN_HELP } from "@/lib/screen-help";
import { useAppSession } from "@/lib/use-app-session";
import { useDemoProfile } from "@/lib/use-demo-profile";
import { useDemoWorkflow } from "@/lib/use-demo-workflow";
import { fetchTenantSessions, revokeTenantSession } from "@/lib/session-api";
import { ArrowRight, CheckCircle2, ClipboardList, Copy, Download, FileUp, Filter, Mail, Palette, Plus, Send, Shield, Upload, Users, UserPlus2 } from "lucide-react";

type TeamRole = {
  name: string;
  scope: string;
  people: number;
  color: string;
};

const TEAM_ROLES: TeamRole[] = [
  { name: "Admin", scope: "Full workspace control", people: 2, color: "text-[#C9A84C]" },
  { name: "Sales", scope: "Leads, quotes, follow-up", people: 5, color: "text-[#1D9E75]" },
  { name: "Operations", scope: "Itineraries, bookings, vouchers", people: 4, color: "text-[#F5F0E8]" },
  { name: "Finance", scope: "Deposits, balances, reconciliation", people: 2, color: "text-[#C9A84C]" },
  { name: "Sub-agent", scope: "Restricted customer-facing access", people: 3, color: "text-[#B8B0A0]" },
];

const HIERARCHY = [
  { level: "L1", label: "Super Admin", details: "Platform owner, global governance, billing, and system templates." },
  { level: "L2", label: "Customer Admin", details: "Agency owner or manager who creates users, roles, and teams." },
  { level: "L3", label: "Department Lead", details: "Sales, Ops, Finance, or Corporate lead with scoped oversight." },
  { level: "L4", label: "Team Member", details: "Handles assigned leads, quotes, bookings, or documents." },
  { level: "L5", label: "Sub-agent", details: "Limited-access external collaborator with controlled visibility." },
];

const ASSIGNMENTS = DEMO_CASE_ASSIGNMENTS;

const PERMISSION_MATRIX = [
  { role: "Admin", view: "All modules", act: "Users, rules, workspace configuration", escalation: "Tenant-wide authority" },
  { role: "Sales", view: "Leads, deals, customer timeline", act: "Owns follow-up, quoting, and pipeline movement", escalation: "Escalates pricing and exceptions" },
  { role: "Operations", view: "Itineraries, bookings, suppliers", act: "Owns execution, handoff, and guest pack release", escalation: "Escalates supplier and delivery risks" },
  { role: "Finance", view: "Deposits, balances, payouts", act: "Owns payment release and reconciliation checks", escalation: "Escalates commercial and cash risks" },
  { role: "Sub-agent", view: "Assigned leads only", act: "Restricted response and assigned-customer work", escalation: "Needs higher-role approval for protected actions" },
];

const ROLE_TEMPLATES = [
  { title: "Inbound Sales Pod", note: "Fast lead intake, first response, and commercial follow-up.", stack: "Sales Manager + Executives + Sub-agent support" },
  { title: "Luxury Ops Cell", note: "High-touch itinerary, booking, and supplier coordination.", stack: "Operations Lead + Trip Designer + Finance checkpoint" },
  { title: "Collections Desk", note: "Deposit, balance reminders, and payout protection.", stack: "Finance Lead + Billing Coordinator" },
];

const NOMENCLATURE = [
  {
    label: "Business Entity",
    current: "Travel Organization",
    alternatives: ["DMC", "Tour Operator", "Travel Agency"],
  },
  {
    label: "Department",
    current: "Sales / Operations / Finance",
    alternatives: ["Holiday Desk", "Corporate Desk", "Back Office"],
  },
  {
    label: "Team",
    current: "Inbound Desk",
    alternatives: ["Luxury Desk", "MICE Desk", "Visa Cell"],
  },
  {
    label: "Designation",
    current: "Senior Executive",
    alternatives: ["Travel Consultant", "Trip Architect", "Reservations Lead"],
  },
  {
    label: "Reporting Layer",
    current: "Reports to Sales Manager",
    alternatives: ["Reports to Department Lead", "Reports to Admin", "Reports to Founder"],
  },
];

const ORG_CHART = {
  top: { title: "Customer Admin", subtitle: "Nair Luxury Escapes" },
  departments: [
    {
      title: "Holiday Desk",
      subtitle: "Sales Manager · Aisha Khan",
      teams: ["Inbound Desk", "Luxury Desk"],
    },
    {
      title: "Operations Cell",
      subtitle: "Ops Lead · Rohan Iyer",
      teams: ["Trip Design", "Bookings"],
    },
    {
      title: "Finance & Billing",
      subtitle: "Finance Lead · Meera Shah",
      teams: ["Collections", "Reconciliation"],
    },
  ],
  bottom: "Sub-agent Partners / External Contributors",
};

export default function TeamPage() {
  const session = useAppSession();
  const profile = useDemoProfile();
  const workflow = useDemoWorkflow();
  const brandTheme = getDemoBrandTheme(profile);
  const workspaceDomain = getDemoWorkspaceDomain(brandTheme);
  const domainMode = getDemoDomainMode(brandTheme);
  const [selectedRole, setSelectedRole] = useState("All");
  const [selectedMode, setSelectedMode] = useState<"invite" | "bulk" | "roles" | "hierarchy" | "structure" | "assign" | "brand">("invite");
  const [orgDepartments, setOrgDepartments] = useState(ORG_CHART.departments);
  const [draggingDept, setDraggingDept] = useState<string | null>(null);
  const [entityLabel, setEntityLabel] = useState(
    profile.roles[0] || DEFAULT_DEMO_PROFILE.roles[0]
  );
  const [teamLabel, setTeamLabel] = useState("Inbound Desk");
  const [designationLabel, setDesignationLabel] = useState("Senior Executive");
  const [reportingLabel, setReportingLabel] = useState("Reports to Sales Manager");
  const [whiteLabelEnabled, setWhiteLabelEnabled] = useState(profile.whiteLabel.enabled);
  const [workspaceName, setWorkspaceName] = useState(profile.whiteLabel.workspaceName);
  const [badgeGlyph, setBadgeGlyph] = useState(profile.whiteLabel.badgeGlyph);
  const [supportEmail, setSupportEmail] = useState(profile.whiteLabel.supportEmail);
  const [customDomain, setCustomDomain] = useState(profile.whiteLabel.customDomain);
  const [accentHex, setAccentHex] = useState(profile.whiteLabel.accentHex);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [inviteName, setInviteName] = useState("Aisha Khan");
  const [inviteEmail, setInviteEmail] = useState("aisha@demoagency.in");
  const [inviteRole, setInviteRole] = useState("Sales");
  const [inviteDesignation, setInviteDesignation] = useState("Senior Executive");
  const [inviteTeam, setInviteTeam] = useState("Inbound Desk");
  const [inviteReportsTo, setInviteReportsTo] = useState("Sales Manager");
  const [inviteResponsibility, setInviteResponsibility] = useState(DEMO_CASE_ROUTES.slice(0, 2).map((item) => item.destination).join(", "));
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [inviteMessage, setInviteMessage] = useState("Invites are ready to send.");
  const [isWorking, setIsWorking] = useState(false);
  const [tenantSessions, setTenantSessions] = useState<Array<{ id: string; email: string; display_name: string; role: string; granted_at: string }>>([]);
  const [authEvents, setAuthEvents] = useState<AuthAuditEvent[]>([]);

  const filteredInvites = useMemo(
    () => workflow.invites.filter((invite) => invite.role === selectedRole || selectedRole === "All"),
    [selectedRole, workflow.invites]
  );
  const filteredEmployees = useMemo(
    () => workflow.employees.filter((employee) => employee.role === selectedRole || selectedRole === "All"),
    [selectedRole, workflow.employees]
  );
  const visibleCompany = profile.company || DEFAULT_DEMO_PROFILE.company;
  const visibleOperator = profile.operator || DEFAULT_DEMO_PROFILE.operator;
  const pendingInviteCount = workflow.invites.filter((invite) => invite.status === "Pending").length;
  const acceptedInviteCount = workflow.invites.filter((invite) => invite.status === "Accepted").length;
  const expiredInviteCount = workflow.invites.filter((invite) => invite.tokenExpiresAt && !invite.tokenUsedAt && Date.parse(invite.tokenExpiresAt) < Date.now()).length;
  const usedInviteCount = workflow.invites.filter((invite) => Boolean(invite.tokenUsedAt)).length;
  const hierarchyPreview = {
    adminTitle: `${entityLabel} Admin`,
    adminSubtitle: `${visibleCompany} · ${visibleOperator}`,
    departmentTitle: `${teamLabel} Cluster`,
    designationTitle: designationLabel,
    reportingTitle: reportingLabel,
  };
  const canInvite = canPerformAction(session, "team.invite");
  const canBulkInvite = canPerformAction(session, "team.bulkInvite");
  const canSaveEmployee = canPerformAction(session, "team.employeeSave");
  const canManageWhiteLabel = canPerformAction(session, "team.whiteLabel");

  useEffect(() => {
    setWhiteLabelEnabled(profile.whiteLabel.enabled);
    setWorkspaceName(profile.whiteLabel.workspaceName);
    setBadgeGlyph(profile.whiteLabel.badgeGlyph);
    setSupportEmail(profile.whiteLabel.supportEmail);
    setCustomDomain(profile.whiteLabel.customDomain);
    setAccentHex(profile.whiteLabel.accentHex);
  }, [profile]);

  useEffect(() => {
    if (!session || (session.role !== "customer-admin" && session.role !== "super-admin")) {
      return;
    }

    let cancelled = false;
    void fetchTenantSessions(visibleCompany)
      .then((response) => {
        if (!cancelled) {
          setTenantSessions(response.sessions);
        }
      })
      .catch(() => {});
    void fetchTenantAuthAudit(visibleCompany)
      .then((response) => {
        if (!cancelled) {
          setAuthEvents(response.events);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [session, visibleCompany, workflow.invites.length]);

  function moveDepartment(targetTitle: string) {
    if (!draggingDept || draggingDept === targetTitle) return;
    const next = [...orgDepartments];
    const fromIndex = next.findIndex((dept) => dept.title === draggingDept);
    const toIndex = next.findIndex((dept) => dept.title === targetTitle);
    if (fromIndex === -1 || toIndex === -1) return;
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    setOrgDepartments(next);
  }

  function saveWhiteLabelSettings() {
    writeDemoProfile({
      whiteLabel: {
        enabled: whiteLabelEnabled,
        workspaceName,
        badgeGlyph,
        supportEmail,
        customDomain,
        accentHex,
      },
    });
  }

  function hydrateInviteFromEmployee(employeeId: string) {
    setSelectedEmployeeId(employeeId);
    const employee = workflow.employees.find((item) => item.id === employeeId);
    if (!employee) return;
    setInviteName(employee.name);
    setInviteEmail(employee.email);
    setInviteRole(employee.role);
    setInviteDesignation(employee.designation);
    setInviteTeam(employee.team);
    setInviteReportsTo(employee.reportsTo);
    setInviteResponsibility(employee.responsibility);
    setInviteMessage(`Loaded ${employee.name} from the employee directory.`);
  }

  async function sendInviteForCurrentForm() {
    if (!inviteName.trim() || !inviteEmail.trim()) {
      setInviteMessage("Name and email are required before an invite can be sent.");
      return;
    }
    setIsWorking(true);
    try {
      try {
        await createDemoInviteViaApi({
          name: inviteName,
          email: inviteEmail,
          role: inviteRole,
          designation: inviteDesignation,
          team: inviteTeam,
          reportsTo: inviteReportsTo,
          responsibility: inviteResponsibility,
          status: "Pending",
        });
      } catch {
        createDemoInvite({
          name: inviteName,
          email: inviteEmail,
          role: inviteRole,
          designation: inviteDesignation,
          team: inviteTeam,
          reportsTo: inviteReportsTo,
          responsibility: inviteResponsibility,
          status: "Pending",
        });
      }
      setInviteMessage(`Invite sent to ${inviteName}.`);
    } finally {
      setIsWorking(false);
    }
  }

  function toggleSelectedEmployee(employeeId: string) {
    setSelectedEmployeeIds((current) =>
      current.includes(employeeId) ? current.filter((item) => item !== employeeId) : [...current, employeeId]
    );
  }

  async function sendInvitesToSelectedEmployees() {
    const selectedEmployees = workflow.employees.filter((employee) => selectedEmployeeIds.includes(employee.id));
    if (!selectedEmployees.length) {
      setInviteMessage("Select at least one employee before sending invites in bulk.");
      return;
    }
    setIsWorking(true);
    try {
      try {
        await createBulkDemoInvitesViaApi(selectedEmployees);
      } catch {
        selectedEmployees.forEach((employee) => {
          createDemoInvite({
            name: employee.name,
            email: employee.email,
            role: employee.role,
            designation: employee.designation,
            team: employee.team,
            reportsTo: employee.reportsTo,
            responsibility: employee.responsibility,
            status: "Pending",
          });
        });
      }
      setInviteMessage(`Sent ${selectedEmployees.length} employee invite${selectedEmployees.length > 1 ? "s" : ""}.`);
      setSelectedEmployeeIds([]);
    } finally {
      setIsWorking(false);
    }
  }

  function downloadEmployeeTemplate() {
    if (typeof window === "undefined") return;
    const template = [
      "name,email,role,designation,team,reportsTo,responsibility",
      "Jane Doe,jane@agency.com,Sales,Senior Executive,Inbound Desk,Sales Manager,Inbound CRM and quote follow-up",
      "John Smith,john@agency.com,Operations,Trip Designer,Luxury Desk,Operations Lead,Trip design and supplier coordination",
    ].join("\n");
    const blob = new Blob([template], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "nama-employee-template.csv";
    link.click();
    URL.revokeObjectURL(url);
    setInviteMessage("Employee CSV template downloaded.");
  }

  function uploadEmployeeList(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === "string" ? reader.result : "";
      const lines = content.split(/\r?\n/).filter(Boolean);
      const rows = lines.slice(1);
      const employees = rows
        .map((line) => line.split(",").map((value) => value.trim()))
        .filter((parts) => parts.length >= 7 && parts[0] && parts[1])
        .map(([name, email, role, designation, team, reportsTo, responsibility]) =>
          createEmployeeRecord({ name, email, role, designation, team, reportsTo, responsibility })
        );

      if (!employees.length) {
        setInviteMessage("The uploaded file did not contain any valid employee rows.");
        return;
      }

      setIsWorking(true);
      void (async () => {
        try {
          try {
            await bulkUpsertDemoMembersViaApi(
              employees.map((employee) => ({
                tenantName: visibleCompany,
                name: employee.name,
                email: employee.email,
                role: normalizeTenantRole(employee.role),
                designation: employee.designation,
                team: employee.team,
                reportsTo: employee.reportsTo,
                responsibility: employee.responsibility,
                status: "Active",
                source: "employee-directory",
              }))
            );
            await syncTenantMembersFromApi(visibleCompany);
          } catch {
            // Local fallback remains the safety net for frontend-only demos.
          }

          upsertDemoEmployees(employees);
          setInviteMessage(`Imported ${employees.length} employee${employees.length > 1 ? "s" : ""} into the directory.`);
        } finally {
          setIsWorking(false);
        }
      })();
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  async function copyInviteLink(inviteId: string) {
    if (typeof window === "undefined" || !navigator.clipboard) return;
    const invite = workflow.invites.find((item) => item.id === inviteId);
    const inviteUrl = `${window.location.origin}${getInvitePath(inviteId, invite?.inviteToken)}`;
    await navigator.clipboard.writeText(inviteUrl);
    setInviteMessage("Invite link copied.");
  }

  async function revokeWorkspaceSession(sessionId: string) {
    try {
      await revokeTenantSession({
        tenant_name: visibleCompany,
        session_id: sessionId,
      });
      setTenantSessions((current) => current.filter((item) => item.id !== sessionId));
      const audit = await fetchTenantAuthAudit(visibleCompany);
      setAuthEvents(audit.events);
      setInviteMessage("Workspace session revoked.");
    } catch (error) {
      setInviteMessage(error instanceof Error ? error.message : "Session revoke failed.");
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-mono text-[#C9A84C] uppercase tracking-[0.3em] mb-2">
            <span>Customer Admin</span>
            <ArrowRight size={10} />
            <span className="opacity-50">Team Workspace</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-[32px] sm:text-4xl font-black tracking-tighter uppercase text-[#F5F0E8] font-headline">Team & Access</h1>
            <ScreenInfoTip content={SCREEN_HELP.team} />
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#B8B0A0]">
            Preview-safe workspace for customer admins to create individual invites, preview bulk user uploads, assign roles, and show the hierarchy and team ownership model without touching live credentials.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-widest">
            <span className="rounded-full border border-[#C9A84C]/15 bg-[#111111] px-3 py-1.5 text-[#C9A84C]">{visibleCompany}</span>
            <span className="rounded-full border border-white/10 bg-[#111111] px-3 py-1.5 text-[#B8B0A0]">{profile.market.country}</span>
            <span className="rounded-full border border-white/10 bg-[#111111] px-3 py-1.5 text-[#B8B0A0]">
              Base {profile.baseCurrency} · {profile.enabledCurrencies.join(" / ")}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
          <Link
            href="/dashboard/leads"
            className="w-full sm:w-auto text-center rounded-xl border border-[#C9A84C]/15 bg-[#111111] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#C9A84C] transition-all hover:bg-[#C9A84C]/10"
          >
            Back to Leads
          </Link>
          <button
            type="button"
            onClick={() => {
              setSelectedMode("invite");
              void sendInviteForCurrentForm();
            }}
            disabled={isWorking}
            className="w-full sm:w-auto rounded-xl bg-[#C9A84C] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#0A0A0A] shadow-[0_0_12px_rgba(201,168,76,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isWorking ? "Working..." : "Send Invite"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Employee Directory" value={`${workflow.employees.length}`} sub="Added individually or through CSV import" icon={<Users size={16} />} />
        <Metric label="Pending Invites" value={`${pendingInviteCount}`} sub="Sent and waiting for employee acceptance" icon={<UserPlus2 size={16} />} />
        <Metric label="Accepted Invites" value={`${acceptedInviteCount}`} sub="Employees who already joined the workspace" icon={<CheckCircle2 size={16} />} />
        <Metric label="Hierarchy" value="L1-L5" sub="From super admin to sub-agent" icon={<Shield size={16} />} />
      </div>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <div className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">Invite Health</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <AuthStatCard label="Pending" value={String(pendingInviteCount)} />
            <AuthStatCard label="Expired" value={String(expiredInviteCount)} />
            <AuthStatCard label="Used" value={String(usedInviteCount)} />
          </div>

          <div className="mt-6 text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">Active Sessions</div>
          <div className="mt-4 space-y-3">
            {tenantSessions.length ? tenantSessions.map((tenantSession) => (
              <div key={tenantSession.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <div>
                  <div className="text-sm font-black text-[#F5F0E8]">{tenantSession.display_name}</div>
                  <div className="mt-1 text-xs text-[#B8B0A0]">{tenantSession.email} · {tenantSession.role}</div>
                </div>
                <button
                  type="button"
                  onClick={() => revokeWorkspaceSession(tenantSession.id)}
                  className="rounded-full border border-[#C9A84C]/20 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#C9A84C]"
                >
                  Revoke
                </button>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-[#B8B0A0]">
                No active workspace sessions recorded yet.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <div className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">Auth Audit</div>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-[#F5F0E8]">Recent credential and invite activity</h2>
          <div className="mt-4 space-y-3">
            {authEvents.slice(0, 6).map((event) => (
              <div key={event.id} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-widest text-[#9F9788]">
                  <span>{event.category}</span>
                  <span>{event.action}</span>
                </div>
                <div className="mt-2 text-sm text-[#F5F0E8]">{event.detail}</div>
                <div className="mt-2 text-xs text-[#B8B0A0]">{event.subject_email || event.actor_email || "Workspace"} · {event.created_at}</div>
              </div>
            ))}
            {!authEvents.length && (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-[#B8B0A0]">
                No auth events yet. Invite sends, acceptances, resets, and session issuance will appear here.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-[#C9A84C]" />
                <h2 className="text-lg font-black text-[#F5F0E8]">Access Control Layer</h2>
              </div>
              <ScreenInfoTip content={SCREEN_HELP.teamAccess} />
            </div>
            <p className="max-w-3xl text-sm leading-relaxed text-[#B8B0A0]">
              This is the alpha governance view behind Team: who can see what, who acts where, and which team templates the customer admin can use before inviting real users.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">Permission Matrix</div>
            <div className="mt-4 space-y-3">
              {PERMISSION_MATRIX.map((item) => (
                <div key={item.role} className="rounded-xl border border-[#C9A84C]/10 bg-[#111111] p-4">
                  <div className="text-sm font-black text-[#F5F0E8]">{item.role}</div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3 text-sm">
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-[#4A453E]">View</div>
                      <div className="mt-1 text-[#B8B0A0]">{item.view}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-[#4A453E]">Act</div>
                      <div className="mt-1 text-[#B8B0A0]">{item.act}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-[#4A453E]">Escalation</div>
                      <div className="mt-1 text-[#B8B0A0]">{item.escalation}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">Role Templates</div>
              <div className="mt-4 space-y-3">
                {ROLE_TEMPLATES.map((item) => (
                  <div key={item.title} className="rounded-xl border border-[#C9A84C]/10 bg-[#111111] p-4">
                    <div className="text-sm font-black text-[#F5F0E8]">{item.title}</div>
                    <div className="mt-2 text-sm leading-relaxed text-[#B8B0A0]">{item.note}</div>
                    <div className="mt-3 text-[10px] font-mono uppercase tracking-widest text-[#C9A84C]">{item.stack}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">Admin Summary</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <PreviewField label="Visible entity" value={entityLabel} />
                <PreviewField label="Reporting line" value={reportingLabel} />
                <PreviewField label="Primary team" value={teamLabel} />
                <PreviewField label="Designation default" value={designationLabel} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <section className="min-w-0 xl:col-span-3 rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-black uppercase tracking-tight text-[#F5F0E8] font-headline">Workflow Modes</h2>
                <ScreenInfoTip content={SCREEN_HELP.teamModes} />
              </div>
              <p className="mt-1 text-sm text-[#B8B0A0]">Switch between invite creation, bulk upload, role design, hierarchy, and assignments.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["invite", "bulk", "roles", "hierarchy", "structure", "assign", "brand"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSelectedMode(mode)}
                  className={`rounded-full border px-3 py-2 text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
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
              <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-4 text-[#C9A84C]">
                  <Mail size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Individual Invite</span>
                </div>
                <div className="mb-4 rounded-2xl border border-[#C9A84C]/10 bg-[#111111] p-4">
                  <div className="text-[9px] font-black uppercase tracking-widest text-[#4A453E]">Select from employee directory</div>
                  <select
                    value={selectedEmployeeId}
                    onChange={(event) => hydrateInviteFromEmployee(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#C9A84C]/10 bg-[#0A0A0A] px-3 py-3 text-sm font-semibold text-[#F5F0E8] outline-none"
                  >
                    <option value="">Choose an employee</option>
                    {workflow.employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name} · {employee.role}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <EditableField label="Name" value={inviteName} onChange={setInviteName} />
                  <EditableField label="Email" value={inviteEmail} onChange={setInviteEmail} />
                  <EditableField label="Role" value={inviteRole} onChange={setInviteRole} />
                  <EditableField label="Designation" value={inviteDesignation} onChange={setInviteDesignation} />
                  <EditableField label="Team" value={inviteTeam} onChange={setInviteTeam} />
                  <EditableField label="Reports to" value={inviteReportsTo} onChange={setInviteReportsTo} />
                  <div className="sm:col-span-2">
                    <EditableField label="Responsibility" value={inviteResponsibility} onChange={setInviteResponsibility} />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void sendInviteForCurrentForm()}
                    disabled={!canInvite || isWorking}
                    className={`rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest ${
                      canInvite && !isWorking ? "bg-[#C9A84C] text-[#0A0A0A]" : "border border-white/10 bg-[#111111] text-[#4A453E]"
                    }`}
                  >
                    {isWorking ? "Sending..." : "Send Individual Invite"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const employee = createEmployeeRecord({
                        name: inviteName,
                        email: inviteEmail,
                        role: inviteRole,
                        designation: inviteDesignation,
                        team: inviteTeam,
                        reportsTo: inviteReportsTo,
                        responsibility: inviteResponsibility,
                      });

                      setIsWorking(true);
                      void (async () => {
                        try {
                          try {
                            await upsertDemoMemberViaApi({
                              id: employee.id,
                              tenantName: visibleCompany,
                              name: employee.name,
                              email: employee.email,
                              role: normalizeTenantRole(employee.role),
                              designation: employee.designation,
                              team: employee.team,
                              reportsTo: employee.reportsTo,
                              responsibility: employee.responsibility,
                              status: "Active",
                              source: "employee-directory",
                            });
                            await syncTenantMembersFromApi(visibleCompany);
                          } catch {
                            // Local employee directory remains available when the API path is unavailable.
                          }
                          upsertDemoEmployees([employee]);
                          setInviteMessage(`${employee.name} saved to the employee directory.`);
                        } finally {
                          setIsWorking(false);
                        }
                      })();
                    }}
                    disabled={!canSaveEmployee || isWorking}
                    className={`rounded-xl border px-4 py-2.5 text-[10px] font-black uppercase tracking-widest ${
                      canSaveEmployee && !isWorking ? "border-[#C9A84C]/15 bg-[#111111] text-[#C9A84C]" : "border-white/10 bg-[#111111] text-[#4A453E]"
                    }`}
                  >
                    {isWorking ? "Saving..." : "Save to Employee List"}
                  </button>
                </div>
                <div className="mt-4 rounded-2xl border border-dashed border-[#C9A84C]/20 bg-[#111111] p-4 text-sm text-[#B8B0A0]">
                  {inviteMessage}
                </div>
              </div>
              <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4 sm:p-5">
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
                    <InviteRow key={invite.id} invite={invite} onCopyInvite={copyInviteLink} />
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
                  <span className="text-[10px] font-black uppercase tracking-widest">Employee List Upload + Bulk Send</span>
                </div>
                <div className="mb-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={downloadEmployeeTemplate}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#C9A84C]/15 bg-[#111111] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#C9A84C]"
                  >
                    <Download size={12} />
                    Download CSV Template
                  </button>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-[#111111] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#F5F0E8]">
                    <Upload size={12} />
                    Upload Employee List
                    <input type="file" accept=".csv" className="hidden" onChange={uploadEmployeeList} />
                  </label>
                  <button
                    type="button"
                    onClick={() => void sendInvitesToSelectedEmployees()}
                    disabled={!canBulkInvite || isWorking}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest ${
                      canBulkInvite && !isWorking ? "bg-[#C9A84C] text-[#0A0A0A]" : "border border-white/10 bg-[#111111] text-[#4A453E]"
                    }`}
                  >
                    <Send size={12} />
                    {isWorking ? "Sending..." : "Send to Selected"}
                  </button>
                </div>
                <div className="overflow-hidden rounded-2xl border border-[#C9A84C]/10">
                  <div className="grid grid-cols-[0.4fr_1fr_1.2fr_0.8fr_0.9fr] bg-[#111111] px-4 py-3 text-[9px] font-black uppercase tracking-widest text-[#4A453E]">
                    <span>Select</span>
                    <span>Name</span>
                    <span>Email</span>
                    <span>Role</span>
                    <span>Team</span>
                  </div>
                  <div className="divide-y divide-[#C9A84C]/10">
                    {filteredEmployees.map((row) => (
                      <div key={row.id} className="grid grid-cols-[0.4fr_1fr_1.2fr_0.8fr_0.9fr] items-center px-4 py-3 text-sm text-[#F5F0E8]">
                        <input
                          type="checkbox"
                          checked={selectedEmployeeIds.includes(row.id)}
                          onChange={() => toggleSelectedEmployee(row.id)}
                          className="h-4 w-4 rounded border-[#C9A84C]/20 bg-[#0A0A0A]"
                        />
                        <span>{row.name}</span>
                        <span className="text-[#B8B0A0]">{row.email}</span>
                        <span className="text-[#C9A84C]">{row.role}</span>
                        <span className="text-[#B8B0A0]">{row.team}</span>
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
                  <li>Download the template first so the employee list lands with the right headers and invite fields.</li>
                  <li>Uploaded rows become part of the employee directory and can be invited individually or in bulk.</li>
                  <li>Use the checkboxes to select exactly who should receive invites in one send action.</li>
                </ul>
                <div className="mt-4 rounded-2xl border border-dashed border-[#C9A84C]/20 bg-[#111111] p-4 text-sm leading-relaxed text-[#B8B0A0]">
                  {inviteMessage}
                </div>
              </div>
            </div>
          )}

          {selectedMode === "roles" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4 sm:p-5">
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
              <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4 sm:p-5">
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

          {selectedMode === "structure" && (
            <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-4 text-[#C9A84C]">
                  <Users size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Visible Hierarchy Diagram</span>
                </div>
                <p className="mb-4 text-xs leading-relaxed text-[#B8B0A0]">
                  Drag the department cards to reorder the visible hierarchy for each business entity. This is a preview-safe interaction layer to show configurability on screen.
                </p>
                <div className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-4 sm:p-5">
                  <div className="mx-auto w-full max-w-[260px] rounded-2xl border border-[#C9A84C]/20 bg-[#C9A84C]/10 px-4 py-4 text-center">
                    <div className="text-sm font-black text-[#F5F0E8]">{hierarchyPreview.adminTitle}</div>
                    <div className="mt-1 text-[10px] font-mono uppercase tracking-widest text-[#4A453E]">{hierarchyPreview.adminSubtitle}</div>
                  </div>
                  <div className="mx-auto h-6 w-px bg-[#C9A84C]/20" />
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {orgDepartments.map((dept) => (
                      <div
                        key={dept.title}
                        className="relative"
                        draggable
                        onDragStart={() => setDraggingDept(dept.title)}
                        onDragEnd={() => setDraggingDept(null)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => moveDepartment(dept.title)}
                      >
                        <div className="absolute -top-6 left-1/2 h-6 w-px -translate-x-1/2 bg-[#C9A84C]/20" />
                        <div className={`rounded-2xl border bg-[#0A0A0A] p-4 text-center cursor-grab active:cursor-grabbing transition-all ${
                          draggingDept === dept.title ? "border-[#C9A84C]/30 shadow-[0_0_18px_rgba(201,168,76,0.12)]" : "border-[#C9A84C]/10"
                        }`}>
                          <div className="mb-3 text-[9px] font-mono uppercase tracking-widest text-[#4A453E]">Drag to reorder</div>
                          <div className="text-sm font-black text-[#F5F0E8]">{dept.title === ORG_CHART.departments[0].title ? hierarchyPreview.departmentTitle : dept.title}</div>
                          <div className="mt-1 text-[10px] font-mono uppercase tracking-widest text-[#4A453E]">{dept.subtitle}</div>
                          <div className="mt-4 space-y-2">
                            {dept.teams.map((team) => (
                              <div key={team} className="rounded-xl border border-[#C9A84C]/10 bg-[#111111] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">
                                {team}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mx-auto h-6 w-px bg-[#C9A84C]/20" />
                  <div className="mx-auto w-full max-w-[260px] rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] px-4 py-3 text-center">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#B8B0A0]">{ORG_CHART.bottom}</div>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-4 text-[#C9A84C]">
                  <Shield size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Configurable Nomenclature</span>
                </div>
                <div className="mb-4 rounded-2xl border border-[#C9A84C]/10 bg-[#111111] p-4">
                  <div className="text-[9px] font-black uppercase tracking-widest text-[#4A453E]">Visible preview</div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <PreviewField label="Business entity" value={entityLabel} />
                    <PreviewField label="Team label" value={teamLabel} />
                    <PreviewField label="Designation" value={designationLabel} />
                    <PreviewField label="Reporting line" value={reportingLabel} />
                  </div>
                </div>
                <div className="space-y-3">
                  {NOMENCLATURE.map((item) => (
                    <div key={item.label} className="rounded-2xl border border-[#C9A84C]/10 bg-[#111111] p-4">
                      <div className="text-[9px] font-black uppercase tracking-widest text-[#4A453E]">{item.label}</div>
                      <div className="mt-1 text-sm font-black text-[#F5F0E8]">
                        {item.label === "Business Entity"
                          ? entityLabel
                          : item.label === "Team"
                            ? teamLabel
                            : item.label === "Designation"
                              ? designationLabel
                              : item.label === "Reporting Layer"
                                ? reportingLabel
                                : item.current}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.alternatives.map((alt) => (
                          <button
                            key={alt}
                            type="button"
                            onClick={() => {
                              if (item.label === "Business Entity") setEntityLabel(alt);
                              if (item.label === "Team") setTeamLabel(alt);
                              if (item.label === "Designation") setDesignationLabel(alt);
                              if (item.label === "Reporting Layer") setReportingLabel(alt);
                            }}
                            className="rounded-full border border-[#C9A84C]/15 bg-[#0A0A0A] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[#C9A84C] hover:bg-[#C9A84C]/10"
                          >
                            {alt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {selectedMode === "brand" && (
            <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3 text-[#C9A84C]">
                  <div className="flex items-center gap-2">
                    <Palette size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">White-label Controls</span>
                  </div>
                  <ScreenInfoTip content={SCREEN_HELP.teamBrand} />
                </div>
                <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#111111] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-black text-[#F5F0E8]">Enable white label</div>
                      <div className="mt-2 text-sm leading-relaxed text-[#B8B0A0]">
                        Unlock tenant branding controls only when customer admin explicitly turns white-label on.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => canManageWhiteLabel && setWhiteLabelEnabled((value) => !value)}
                      disabled={!canManageWhiteLabel}
                      className={`relative h-7 w-14 rounded-full border transition-all ${
                        !canManageWhiteLabel
                          ? "border-white/10 bg-[#0A0A0A] opacity-50"
                          : whiteLabelEnabled
                            ? "border-[#C9A84C]/40 bg-[#C9A84C]/10"
                            : "border-white/10 bg-[#0A0A0A]"
                      }`}
                      aria-label="Toggle white label"
                    >
                      <span
                        className={`absolute top-[3px] h-[20px] w-[20px] rounded-full transition-all ${
                          whiteLabelEnabled ? "left-[30px] bg-[#C9A84C]" : "left-[3px] bg-[#4A453E]"
                        }`}
                      />
                    </button>
                  </div>
                </div>
                <div className={`mt-4 grid gap-3 sm:grid-cols-2 ${whiteLabelEnabled ? "" : "opacity-50"}`}>
                  <EditableField label="Workspace Name" value={workspaceName} onChange={setWorkspaceName} disabled={!whiteLabelEnabled || !canManageWhiteLabel} placeholder="Nair Luxury Escapes" hint="This is the name shown in the dashboard shell and overview." />
                  <EditableField label="Badge Glyph" value={badgeGlyph} onChange={setBadgeGlyph} disabled={!whiteLabelEnabled || !canManageWhiteLabel} placeholder="NL" hint="Use 1-2 characters until logo upload is introduced." />
                  <EditableField label="Support Email" value={supportEmail} onChange={setSupportEmail} disabled={!whiteLabelEnabled || !canManageWhiteLabel} placeholder="support@nairluxury.com" hint="This becomes the tenant-facing support contact." />
                  <EditableField label="Subdomain or Domain" value={customDomain} onChange={setCustomDomain} disabled={!whiteLabelEnabled || !canManageWhiteLabel} placeholder="nairluxury or travel.nairluxury.com" hint="Short values become a NAMA subdomain. Full domains stay exactly as entered." />
                  <EditableField label="Accent Hex" value={accentHex} onChange={setAccentHex} disabled={!whiteLabelEnabled || !canManageWhiteLabel} placeholder="#C9A84C" hint="Use a 6-digit hex color for buttons, highlights, and key brand moments." />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <GuidanceCard
                    title="Domain options"
                    body="Use a short value like nairluxury for a hosted subdomain under NAMA, or enter a full domain like travel.nairluxury.com if the customer wants their own domain."
                  />
                  <GuidanceCard
                    title="Logo guidance"
                    body="Keep the logo mark square at 256 x 256 px minimum, with a 512 x 512 px recommended export and a 512 KB max upload target."
                  />
                  <GuidanceCard
                    title="User-friendly setup"
                    body="Show examples inline, keep technical wording light, and let the customer admin understand brand impact before anything touches production infra."
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={saveWhiteLabelSettings}
                    disabled={!canManageWhiteLabel}
                    className={`rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest ${
                      canManageWhiteLabel ? "bg-[#C9A84C] text-[#0A0A0A]" : "border border-white/10 bg-[#111111] text-[#4A453E]"
                    }`}
                  >
                    Save White Label
                  </button>
                  <div className="rounded-xl border border-[#C9A84C]/10 bg-[#111111] px-4 py-2.5 text-[10px] uppercase tracking-widest text-[#B8B0A0]">
                    {whiteLabelEnabled ? "Branding controls unlocked" : "Branding controls greyed out"}
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4 sm:p-5">
                <div className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">White-label Preview</div>
                <div className="mt-4 rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#C9A84C] text-sm font-black text-[#0A0A0A]">
                      {whiteLabelEnabled ? (badgeGlyph.trim() || workspaceName[0] || "W").slice(0, 2).toUpperCase() : "N"}
                    </div>
                    <div>
                      <div className="text-sm font-black text-[#F5F0E8]">
                        {whiteLabelEnabled ? workspaceName || visibleCompany : "NAMA OS"}
                      </div>
                      <div className="mt-1 text-[10px] font-mono uppercase tracking-widest text-[#4A453E]">
                        {whiteLabelEnabled ? workspaceDomain : "Platform shell locked"}
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <PreviewField label="State" value={whiteLabelEnabled ? "Enabled" : "Disabled"} />
                    <PreviewField label="Support" value={whiteLabelEnabled ? supportEmail || "Not set" : "Platform default"} />
                    <PreviewField label="Tenant" value={visibleCompany} />
                    <PreviewField label="Accent" value={whiteLabelEnabled ? accentHex || "Not set" : "Platform gold"} />
                    <PreviewField label="Domain Mode" value={whiteLabelEnabled ? (domainMode === "nama-subdomain" ? "NAMA-hosted subdomain" : "Bring your own domain") : "Platform default"} />
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-dashed border-[#C9A84C]/20 bg-[#111111] p-4 text-sm leading-relaxed text-[#B8B0A0]">
                  This is the behavior we want: customer admin sees the white-label section, but its fields stay disabled until they explicitly enable white label for the tenant.
                </div>
              </div>
            </div>
          )}

          {selectedMode === "assign" && (
            <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4 sm:p-5">
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
                  <span className="text-[10px] font-black uppercase tracking-widest">Preview-safe Notes</span>
                </div>
                <ul className="space-y-3 text-sm text-[#B8B0A0] leading-relaxed">
                  <li>Assignments are rendered as static preview work so the alpha stays stable while the workflow model is reviewed.</li>
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
            A customer admin can create users one by one, preview a bulk CSV import, assign roles and designations, show a visible hierarchy diagram, and rename the business structure to match their own entity. This keeps the alpha focused on operational control without needing live auth provisioning.
          </p>
          <div className="mt-5 rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C] mb-2">Preview Positioning</div>
            <div className="text-sm text-[#F5F0E8] leading-relaxed">
              Use this page as the admin control-room appendix after the main lead-to-deal walkthrough. It is demo-ready, self-contained, and safe to show live.
            </div>
          </div>
          <div className="mt-5 rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C] mb-2">Current tenant snapshot</div>
            <div className="space-y-2 text-sm text-[#B8B0A0]">
              <div>{visibleCompany}</div>
              <div>{profile.market.country} · {profile.market.language}</div>
              <div>{entityLabel} · {designationLabel}</div>
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

function AuthStatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
      <div className="text-[10px] font-black uppercase tracking-widest text-[#9F9788]">{label}</div>
      <div className="mt-2 text-2xl font-black text-[#F5F0E8]">{value}</div>
    </div>
  );
}

function EditableField({
  label,
  value,
  onChange,
  disabled,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className={`rounded-2xl border border-[#C9A84C]/10 bg-[#111111] p-4 ${disabled ? "cursor-not-allowed" : ""}`}>
      <div className="text-[9px] font-black uppercase tracking-widest text-[#4A453E]">{label}</div>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="mt-2 w-full bg-transparent text-sm font-semibold text-[#F5F0E8] outline-none disabled:cursor-not-allowed disabled:text-[#4A453E]"
      />
      {hint && <div className="mt-2 text-xs leading-relaxed text-[#B8B0A0]">{hint}</div>}
    </label>
  );
}

function PreviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-3">
      <div className="text-[9px] font-black uppercase tracking-widest text-[#4A453E]">{label}</div>
      <div className="mt-1 text-sm font-semibold text-[#F5F0E8]">{value}</div>
    </div>
  );
}

function InviteRow({
  invite,
  onCopyInvite,
}: {
  invite: DemoInviteRecord;
  onCopyInvite: (inviteId: string) => void | Promise<void>;
}) {
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
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onCopyInvite(invite.id)}
          className="inline-flex items-center gap-2 rounded-full border border-[#C9A84C]/15 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-[#C9A84C]"
        >
          <Copy size={11} />
          Copy link
        </button>
        <Link
          href={getInvitePath(invite.id, invite.inviteToken)}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-[#B8B0A0]"
        >
          Open acceptance
        </Link>
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

function GuidanceCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#C9A84C]/20 bg-[#111111] p-4">
      <div className="text-[9px] font-black uppercase tracking-widest text-[#C9A84C]">{title}</div>
      <div className="mt-2 text-sm leading-relaxed text-[#B8B0A0]">{body}</div>
    </div>
  );
}
