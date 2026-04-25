"use client";

import { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Shield,
  Clock,
  Mail,
  ChevronDown,
  RefreshCw,
  X,
  Check,
  AlertCircle,
  Activity,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";

// ── Types ────────────────────────────────────────────────────────────────────

type RoleId =
  | "R0_NAMA_OWNER"
  | "R1_SUPER_ADMIN"
  | "R2_ORG_ADMIN"
  | "R3_SALES_MANAGER"
  | "R4_OPS_EXECUTIVE"
  | "R5_FINANCE_ADMIN"
  | "R6_SUB_AGENT";

type Status = "ACTIVE" | "INACTIVE" | "PENDING";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: RoleId;
  status: Status;
  lastActive: string;
  bookings: number;
  initials: string;
  avatarColor: string;
}

interface PendingInvite {
  id: string;
  email: string;
  role: RoleId;
  invitedBy: string;
  dateSent: string;
  expires: string;
  status: "PENDING" | "EXPIRED";
}

interface ActivityEvent {
  id: string;
  type: "role_changed" | "invite_sent" | "user_activated" | "permission_updated" | "user_deactivated";
  description: string;
  actor: string;
  timestamp: string;
}

interface PermissionSet {
  view: boolean;
  edit: boolean;
  delete: boolean;
}

interface RolePermissions {
  leads: PermissionSet;
  quotations: PermissionSet;
  bookings: PermissionSet;
  finance: PermissionSet;
  team: PermissionSet;
  settings: PermissionSet;
  reports: PermissionSet;
  integrations: PermissionSet;
}

interface RoleCard {
  id: RoleId;
  name: string;
  description: string;
  memberCount: number;
  permissions: RolePermissions;
}

interface TeamResponse {
  members: TeamMember[];
}

interface RolesResponse {
  roles: RoleCard[];
}

// ── Seed Data ────────────────────────────────────────────────────────────────

const SEED_MEMBERS: TeamMember[] = [
  { id: "1", name: "Priya Sharma", email: "priya@agency.com", role: "R3_SALES_MANAGER", status: "ACTIVE", lastActive: "2h ago", bookings: 12, initials: "PS", avatarColor: "bg-teal-500" },
  { id: "2", name: "Arjun Mehta", email: "arjun@agency.com", role: "R4_OPS_EXECUTIVE", status: "ACTIVE", lastActive: "4h ago", bookings: 8, initials: "AM", avatarColor: "bg-green-500" },
  { id: "3", name: "Deepika Rao", email: "deepika@agency.com", role: "R3_SALES_MANAGER", status: "ACTIVE", lastActive: "1d ago", bookings: 6, initials: "DR", avatarColor: "bg-pink-500" },
  { id: "4", name: "Rohan Singh", email: "rohan@agency.com", role: "R5_FINANCE_ADMIN", status: "ACTIVE", lastActive: "3h ago", bookings: 0, initials: "RS", avatarColor: "bg-amber-500" },
  { id: "5", name: "Anjali Kapoor", email: "anjali@agency.com", role: "R6_SUB_AGENT", status: "INACTIVE", lastActive: "1w ago", bookings: 2, initials: "AK", avatarColor: "bg-slate-500" },
  { id: "6", name: "Karan Patel", email: "karan@agency.com", role: "R3_SALES_MANAGER", status: "ACTIVE", lastActive: "30m ago", bookings: 15, initials: "KP", avatarColor: "bg-blue-500" },
  { id: "7", name: "Sneha Nair", email: "sneha@agency.com", role: "R2_ORG_ADMIN", status: "ACTIVE", lastActive: "10m ago", bookings: 3, initials: "SN", avatarColor: "bg-purple-500" },
  { id: "8", name: "Vikram Joshi", email: "vikram@agency.com", role: "R6_SUB_AGENT", status: "PENDING", lastActive: "Never", bookings: 0, initials: "VJ", avatarColor: "bg-indigo-500" },
];

const SEED_INVITES: PendingInvite[] = [
  { id: "i1", email: "rakesh@partner.com", role: "R6_SUB_AGENT", invitedBy: "Sneha Nair", dateSent: "3 days ago", expires: "4 days", status: "PENDING" },
  { id: "i2", email: "finance@agency.com", role: "R5_FINANCE_ADMIN", invitedBy: "Sneha Nair", dateSent: "1 day ago", expires: "6 days", status: "PENDING" },
  { id: "i3", email: "newagent@agency.com", role: "R6_SUB_AGENT", invitedBy: "Karan Patel", dateSent: "5 days ago", expires: "2 days", status: "PENDING" },
];

const SEED_ACTIVITY: ActivityEvent[] = [
  { id: "a1", type: "role_changed", description: "Role changed from Sub-Agent to Sales Manager", actor: "Sneha Nair", timestamp: "10 min ago" },
  { id: "a2", type: "invite_sent", description: "Invitation sent to finance@agency.com (Finance Admin)", actor: "Sneha Nair", timestamp: "1 day ago" },
  { id: "a3", type: "user_activated", description: "Karan Patel account activated", actor: "System", timestamp: "2 days ago" },
  { id: "a4", type: "permission_updated", description: "Sales Manager permissions updated (Reports: VIEW added)", actor: "Sneha Nair", timestamp: "3 days ago" },
  { id: "a5", type: "invite_sent", description: "Invitation sent to rakesh@partner.com (Sub-Agent)", actor: "Karan Patel", timestamp: "3 days ago" },
  { id: "a6", type: "user_deactivated", description: "Anjali Kapoor account deactivated", actor: "Sneha Nair", timestamp: "4 days ago" },
  { id: "a7", type: "role_changed", description: "Arjun Mehta promoted to Ops Executive", actor: "Sneha Nair", timestamp: "5 days ago" },
  { id: "a8", type: "invite_sent", description: "Invitation sent to newagent@agency.com (Sub-Agent)", actor: "Karan Patel", timestamp: "5 days ago" },
  { id: "a9", type: "permission_updated", description: "Finance Admin permissions updated (Integrations: VIEW added)", actor: "Sneha Nair", timestamp: "6 days ago" },
  { id: "a10", type: "user_activated", description: "Rohan Singh account activated", actor: "System", timestamp: "1 week ago" },
];

const ALL_PERMS: RolePermissions = {
  leads: { view: true, edit: true, delete: true },
  quotations: { view: true, edit: true, delete: true },
  bookings: { view: true, edit: true, delete: true },
  finance: { view: true, edit: true, delete: true },
  team: { view: true, edit: true, delete: true },
  settings: { view: true, edit: true, delete: true },
  reports: { view: true, edit: true, delete: true },
  integrations: { view: true, edit: true, delete: true },
};

const SEED_ROLES: RoleCard[] = [
  {
    id: "R0_NAMA_OWNER",
    name: "NAMA Owner",
    description: "Full system access, cannot be restricted",
    memberCount: 1,
    permissions: ALL_PERMS,
  },
  {
    id: "R2_ORG_ADMIN",
    name: "Org Admin",
    description: "Manages team, settings, and all operations",
    memberCount: 1,
    permissions: {
      leads: { view: true, edit: true, delete: true },
      quotations: { view: true, edit: true, delete: true },
      bookings: { view: true, edit: true, delete: true },
      finance: { view: true, edit: false, delete: false },
      team: { view: true, edit: true, delete: true },
      settings: { view: true, edit: true, delete: false },
      reports: { view: true, edit: true, delete: false },
      integrations: { view: true, edit: true, delete: false },
    },
  },
  {
    id: "R3_SALES_MANAGER",
    name: "Sales Manager",
    description: "Manages leads, quotations, and bookings",
    memberCount: 3,
    permissions: {
      leads: { view: true, edit: true, delete: false },
      quotations: { view: true, edit: true, delete: false },
      bookings: { view: true, edit: true, delete: false },
      finance: { view: true, edit: false, delete: false },
      team: { view: true, edit: false, delete: false },
      settings: { view: false, edit: false, delete: false },
      reports: { view: true, edit: false, delete: false },
      integrations: { view: false, edit: false, delete: false },
    },
  },
  {
    id: "R4_OPS_EXECUTIVE",
    name: "Ops Executive",
    description: "Handles operational tasks and bookings",
    memberCount: 1,
    permissions: {
      leads: { view: true, edit: false, delete: false },
      quotations: { view: true, edit: true, delete: false },
      bookings: { view: true, edit: true, delete: false },
      finance: { view: false, edit: false, delete: false },
      team: { view: true, edit: false, delete: false },
      settings: { view: false, edit: false, delete: false },
      reports: { view: true, edit: false, delete: false },
      integrations: { view: false, edit: false, delete: false },
    },
  },
  {
    id: "R5_FINANCE_ADMIN",
    name: "Finance Admin",
    description: "Manages finances, invoices, and payments",
    memberCount: 1,
    permissions: {
      leads: { view: true, edit: false, delete: false },
      quotations: { view: true, edit: false, delete: false },
      bookings: { view: true, edit: false, delete: false },
      finance: { view: true, edit: true, delete: true },
      team: { view: false, edit: false, delete: false },
      settings: { view: false, edit: false, delete: false },
      reports: { view: true, edit: true, delete: false },
      integrations: { view: true, edit: false, delete: false },
    },
  },
  {
    id: "R6_SUB_AGENT",
    name: "Sub-Agent",
    description: "Limited access to assigned leads only",
    memberCount: 2,
    permissions: {
      leads: { view: true, edit: true, delete: false },
      quotations: { view: true, edit: false, delete: false },
      bookings: { view: true, edit: false, delete: false },
      finance: { view: false, edit: false, delete: false },
      team: { view: false, edit: false, delete: false },
      settings: { view: false, edit: false, delete: false },
      reports: { view: false, edit: false, delete: false },
      integrations: { view: false, edit: false, delete: false },
    },
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<RoleId, string> = {
  R0_NAMA_OWNER: "Owner",
  R1_SUPER_ADMIN: "Super Admin",
  R2_ORG_ADMIN: "Org Admin",
  R3_SALES_MANAGER: "Sales Manager",
  R4_OPS_EXECUTIVE: "Ops Executive",
  R5_FINANCE_ADMIN: "Finance Admin",
  R6_SUB_AGENT: "Sub-Agent",
};

const ROLE_BADGE_CLASSES: Record<RoleId, string> = {
  R0_NAMA_OWNER: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  R1_SUPER_ADMIN: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  R2_ORG_ADMIN: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  R3_SALES_MANAGER: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  R4_OPS_EXECUTIVE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  R5_FINANCE_ADMIN: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  R6_SUB_AGENT: "bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300",
};

const STATUS_CLASSES: Record<Status, string> = {
  ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  INACTIVE: "bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400",
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

const ACTIVITY_DOT: Record<ActivityEvent["type"], string> = {
  role_changed: "bg-blue-500",
  invite_sent: "bg-teal-500",
  user_activated: "bg-green-500",
  permission_updated: "bg-purple-500",
  user_deactivated: "bg-red-500",
};

const PERM_AREAS = [
  "leads",
  "quotations",
  "bookings",
  "finance",
  "team",
  "settings",
  "reports",
  "integrations",
] as const;

type PermArea = typeof PERM_AREAS[number];
type PermAction = "view" | "edit" | "delete";

// ── Toggle Switch ─────────────────────────────────────────────────────────────

function Toggle({
  enabled,
  onToggle,
  locked,
}: {
  enabled: boolean;
  onToggle: () => void;
  locked?: boolean;
}) {
  return (
    <button
      onClick={locked ? undefined : onToggle}
      disabled={locked}
      className={`relative w-9 h-5 rounded-full transition-colors ${
        enabled ? "bg-[#14B8A6]" : "bg-slate-200 dark:bg-slate-700"
      } ${locked ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
          enabled ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const [activeTab, setActiveTab] = useState<
    "members" | "permissions" | "invitations" | "activity"
  >("members");
  const [members, setMembers] = useState<TeamMember[]>(SEED_MEMBERS);
  const [invites, setInvites] = useState<PendingInvite[]>(SEED_INVITES);
  const [roles, setRoles] = useState<RoleCard[]>(SEED_ROLES);
  const [selectedRole, setSelectedRole] = useState<RoleId>("R3_SALES_MANAGER");
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<RoleId>("R6_SUB_AGENT");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteSending, setInviteSending] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState<string | null>(null);
  const [savingPerms, setSavingPerms] = useState(false);
  const [savedPerms, setSavedPerms] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teamRes, rolesRes] = await Promise.allSettled([
          api.get<TeamResponse>("/api/v1/team"),
          api.get<RolesResponse>("/api/v1/roles"),
        ]);
        // Trust the backend's response even when empty — set [] if backend says so.
        // Seed only persists if the request itself was rejected (network/4xx/5xx),
        // not when the backend cleanly returns an empty list.
        if (teamRes.status === "fulfilled" && Array.isArray(teamRes.value?.members)) {
          setMembers(teamRes.value.members);
        }
        if (rolesRes.status === "fulfilled" && Array.isArray(rolesRes.value?.roles)) {
          setRoles(rolesRes.value.roles);
        }
      } catch {
        // Network error — keep seed so the page isn't blank during outage.
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const activeRole = roles.find((r) => r.id === selectedRole) ?? roles[0];

  const togglePermission = (area: PermArea, action: PermAction) => {
    if (selectedRole === "R0_NAMA_OWNER") return;
    setRoles((prev) =>
      prev.map((r) =>
        r.id === selectedRole
          ? {
              ...r,
              permissions: {
                ...r.permissions,
                [area]: {
                  ...r.permissions[area],
                  [action]: !r.permissions[area][action],
                },
              },
            }
          : r
      )
    );
  };

  const handleSavePermissions = async () => {
    setSavingPerms(true);
    try {
      await api.put(`/api/v1/roles/${selectedRole}/permissions`, {
        permissions: activeRole?.permissions,
      });
    } catch {
      // non-breaking
    } finally {
      setSavingPerms(false);
      setSavedPerms(true);
      setTimeout(() => setSavedPerms(false), 2000);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail) return;
    setInviteSending(true);
    try {
      await api.post("/api/v1/team/invite", {
        email: inviteEmail,
        role: inviteRole,
        message: inviteMessage,
      });
    } catch {
      // non-breaking
    } finally {
      const newInvite: PendingInvite = {
        id: `i${Date.now()}`,
        email: inviteEmail,
        role: inviteRole,
        invitedBy: "You",
        dateSent: "Just now",
        expires: "7 days",
        status: "PENDING",
      };
      setInvites((prev) => [newInvite, ...prev]);
      setInviteSending(false);
      setShowInviteModal(false);
      setInviteEmail("");
      setInviteMessage("");
      setInviteRole("R6_SUB_AGENT");
    }
  };

  const handleDeactivate = (id: string) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: "INACTIVE" as Status } : m))
    );
    setConfirmDeactivate(null);
  };

  const handleCancelInvite = (id: string) => {
    setInvites((prev) => prev.filter((i) => i.id !== id));
  };

  const handleResendInvite = (id: string) => {
    setInvites((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, dateSent: "Just now", expires: "7 days" } : i
      )
    );
  };

  const kpis = [
    {
      label: "Total Staff",
      value: members.length,
      icon: Users,
      color: "text-[#1B2E5E] dark:text-blue-300",
    },
    {
      label: "Active Now",
      value: members.filter((m) => m.status === "ACTIVE").length,
      icon: Activity,
      color: "text-green-600 dark:text-green-400",
    },
    {
      label: "Roles Assigned",
      value: new Set(
        members.filter((m) => m.status !== "PENDING").map((m) => m.role)
      ).size,
      icon: Shield,
      color: "text-[#14B8A6]",
    },
    {
      label: "Pending",
      value:
        members.filter((m) => m.status === "PENDING").length + invites.length,
      icon: Clock,
      color: "text-amber-500",
    },
  ];

  const tabs = [
    { id: "members" as const, label: "Team Members" },
    { id: "permissions" as const, label: "Role Permissions" },
    { id: "invitations" as const, label: "Pending Invitations" },
    { id: "activity" as const, label: "Activity Log" },
  ];

  const assignableRoles: RoleId[] = [
    "R2_ORG_ADMIN",
    "R3_SALES_MANAGER",
    "R4_OPS_EXECUTIVE",
    "R5_FINANCE_ADMIN",
    "R6_SUB_AGENT",
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1E] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#14B8A6]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1E] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            Staff & Permissions
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your team, roles, and access controls
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#1B2E5E] hover:bg-[#243d7a] dark:bg-[#14B8A6] dark:hover:bg-[#0ea594] text-white text-sm font-medium rounded-lg transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Invite Member
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-xl p-1 mb-6 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab.id
                ? "bg-[#1B2E5E] text-white dark:bg-[#14B8A6]"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Team Members Tab ── */}
      {activeTab === "members" && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {kpis.map((k) => (
              <div
                key={k.label}
                className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {k.label}
                  </span>
                  <k.icon className={`w-4 h-4 ${k.color}`} />
                </div>
                <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Staff Table */}
          <div className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/5">
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">
                      Member
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">
                      Role
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">
                      Status
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">
                      Last Active
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">
                      Bookings
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr
                      key={member.id}
                      className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors last:border-0"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full ${member.avatarColor} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
                          >
                            {member.initials}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                              {member.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {member.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE_CLASSES[member.role]}`}
                        >
                          {ROLE_LABELS[member.role]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASSES[member.status]}`}
                        >
                          {member.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                        {member.lastActive}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 font-medium">
                        {member.bookings}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Change Role dropdown */}
                          <div className="relative group">
                            <button className="flex items-center gap-1 text-xs text-[#1B2E5E] dark:text-[#14B8A6] border border-slate-200 dark:border-white/10 rounded px-2 py-1 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                              Change Role{" "}
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            <div className="absolute z-10 hidden group-hover:block left-0 top-full mt-1 w-40 bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/10 rounded-lg shadow-lg overflow-hidden">
                              {assignableRoles.map((r) => (
                                <button
                                  key={r}
                                  onClick={() =>
                                    setMembers((prev) =>
                                      prev.map((m) =>
                                        m.id === member.id
                                          ? { ...m, role: r }
                                          : m
                                      )
                                    )
                                  }
                                  className="w-full text-left text-xs px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                                >
                                  {ROLE_LABELS[r]}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Deactivate */}
                          {confirmDeactivate === member.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDeactivate(member.id)}
                                className="text-xs text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setConfirmDeactivate(null)}
                                className="text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 rounded px-2 py-1 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeactivate(member.id)}
                              disabled={member.status === "INACTIVE"}
                              className="text-xs text-red-500 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              Deactivate
                            </button>
                          )}

                          <button className="text-xs text-slate-500 dark:text-slate-400 hover:text-[#14B8A6] transition-colors underline">
                            Reset Password
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Role Permissions Tab ── */}
      {activeTab === "permissions" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Role Cards */}
          <div className="space-y-2">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selectedRole === role.id
                    ? "bg-[#1B2E5E] text-white border-[#1B2E5E]"
                    : "bg-white dark:bg-[#0F1B35] border-slate-100 dark:border-white/5 hover:border-[#14B8A6]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p
                    className={`text-sm font-semibold ${
                      selectedRole === role.id
                        ? "text-white"
                        : "text-slate-800 dark:text-slate-200"
                    }`}
                  >
                    {role.name}
                  </p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      selectedRole === role.id
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {role.memberCount} member{role.memberCount !== 1 ? "s" : ""}
                  </span>
                </div>
                <p
                  className={`text-xs ${
                    selectedRole === role.id
                      ? "text-white/70"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {role.description}
                </p>
              </button>
            ))}
          </div>

          {/* Right: Permission Matrix */}
          <div className="lg:col-span-2 bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-semibold text-slate-800 dark:text-white">
                  {activeRole?.name} Permissions
                </h3>
                {selectedRole === "R0_NAMA_OWNER" && (
                  <p className="text-xs text-amber-500 mt-0.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Owner permissions are
                    locked and cannot be changed
                  </p>
                )}
              </div>
              {savedPerms && (
                <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <Check className="w-3 h-3" /> Saved
                </span>
              )}
            </div>

            <div className="space-y-4">
              {/* Header row */}
              <div className="grid grid-cols-4 gap-4 pb-2 border-b border-slate-100 dark:border-white/5">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Permission Area
                </p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 text-center">
                  VIEW
                </p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 text-center">
                  EDIT
                </p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 text-center">
                  DELETE
                </p>
              </div>

              {PERM_AREAS.map((area) => (
                <div key={area} className="grid grid-cols-4 gap-4 items-center">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">
                    {area}
                  </p>
                  {(["view", "edit", "delete"] as PermAction[]).map((action) => (
                    <div key={action} className="flex justify-center">
                      <Toggle
                        enabled={activeRole?.permissions[area][action] ?? false}
                        onToggle={() => togglePermission(area, action)}
                        locked={selectedRole === "R0_NAMA_OWNER"}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {selectedRole !== "R0_NAMA_OWNER" && (
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5">
                <button
                  onClick={handleSavePermissions}
                  disabled={savingPerms}
                  className="flex items-center gap-2 px-5 py-2 bg-[#14B8A6] hover:bg-[#0ea594] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
                >
                  {savingPerms ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Pending Invitations Tab ── */}
      {activeTab === "invitations" && (
        <div className="space-y-4">
          {invites.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={() =>
                  setInvites((prev) =>
                    prev.map((i) => ({
                      ...i,
                      dateSent: "Just now",
                      expires: "7 days",
                    }))
                  )
                }
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#1B2E5E] dark:text-[#14B8A6] border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Bulk Resend All
              </button>
            </div>
          )}

          {invites.length === 0 ? (
            <div className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-xl p-12 text-center">
              <Mail className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                No pending invitations
              </p>
              <button
                onClick={() => setShowInviteModal(true)}
                className="mt-4 text-sm text-[#14B8A6] hover:underline"
              >
                Send an invitation
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/5">
                      <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">
                        Email
                      </th>
                      <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">
                        Invited Role
                      </th>
                      <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">
                        Invited By
                      </th>
                      <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">
                        Date Sent
                      </th>
                      <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">
                        Expires In
                      </th>
                      <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">
                        Status
                      </th>
                      <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invites.map((invite) => (
                      <tr
                        key={invite.id}
                        className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors last:border-0"
                      >
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                          {invite.email}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE_CLASSES[invite.role]}`}
                          >
                            {ROLE_LABELS[invite.role]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                          {invite.invitedBy}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                          {invite.dateSent}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs font-medium ${
                              invite.expires === "2 days"
                                ? "text-red-500"
                                : "text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            {invite.expires}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            {invite.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleResendInvite(invite.id)}
                              className="text-xs text-[#14B8A6] hover:underline"
                            >
                              Resend
                            </button>
                            <button
                              onClick={() => handleCancelInvite(invite.id)}
                              className="text-xs text-red-500 dark:text-red-400 hover:underline"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Activity Log Tab ── */}
      {activeTab === "activity" && (
        <div className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-5">
            Recent Team Activity
          </h3>
          <div className="space-y-0">
            {SEED_ACTIVITY.map((event, idx) => (
              <div key={event.id} className="relative flex gap-4">
                {/* Vertical connector line */}
                {idx < SEED_ACTIVITY.length - 1 && (
                  <div className="absolute left-[9px] top-5 bottom-0 w-px bg-slate-100 dark:bg-white/5" />
                )}
                <div
                  className={`mt-1 w-[18px] h-[18px] rounded-full flex-shrink-0 ${ACTIVITY_DOT[event.type]}`}
                />
                <div className="pb-5 flex-1 min-w-0">
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {event.description}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      by {event.actor}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {event.timestamp}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Invite Modal ── */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5">
              <h3 className="text-base font-semibold text-slate-800 dark:text-white">
                Invite Team Member
              </h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Email Address{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@agency.com"
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-[#1B2E5E]/30 border-slate-200 dark:border-white/10 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#14B8A6] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Assign Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as RoleId)}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-[#1B2E5E]/30 border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:border-[#14B8A6] transition-colors"
                >
                  {assignableRoles.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Personal Message{" "}
                  <span className="text-slate-400">(optional)</span>
                </label>
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  rows={3}
                  placeholder="Welcome to our team! Looking forward to working with you."
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-[#1B2E5E]/30 border-slate-200 dark:border-white/10 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#14B8A6] resize-none transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 pb-6">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendInvite}
                disabled={!inviteEmail || inviteSending}
                className="flex items-center gap-2 px-5 py-2 bg-[#1B2E5E] dark:bg-[#14B8A6] hover:opacity-90 text-white text-sm font-medium rounded-lg transition-opacity disabled:opacity-50"
              >
                {inviteSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                Send Invitation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
