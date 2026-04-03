"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { ArrowRight, CheckCircle2, Mail, Shield, Users } from "lucide-react";

import { acceptDemoInvite, getInvitePath } from "@/lib/demo-workflow";
import { useDemoWorkflow } from "@/lib/use-demo-workflow";

export default function InviteAcceptancePage() {
  const params = useParams<{ inviteId: string }>();
  const workflow = useDemoWorkflow();
  const inviteId = Array.isArray(params.inviteId) ? params.inviteId[0] : params.inviteId;
  const invite = useMemo(() => workflow.invites.find((item) => item.id === inviteId), [inviteId, workflow.invites]);

  if (!invite) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] px-6 py-10 text-[#0F172A]">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-[#C9A84C]/20 bg-white p-10 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#8B6A1F]">Invite Link</div>
          <h1 className="mt-4 text-4xl font-black uppercase tracking-tight">Invite not found</h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            This acceptance link is no longer active in the demo workspace. Return to Team & Access to generate a new one.
          </p>
          <Link href="/dashboard/team" className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#0F172A] px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white">
            Back to Team
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] px-6 py-10 text-[#0F172A]">
      <div className="mx-auto max-w-4xl rounded-[32px] border border-[#C9A84C]/20 bg-white p-10 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-[#8B6A1F]">
          <span>Workspace Invite</span>
          <span className="rounded-full border border-[#C9A84C]/20 bg-[#FFF8E8] px-3 py-1">{invite.status}</span>
        </div>
        <h1 className="mt-4 text-4xl font-black uppercase tracking-tight">Join the workspace</h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-600">
          This route simulates the employee invite experience: the user receives a link, reviews their role, and accepts access into the same demo workspace used across the onboarding and operations flow.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <InviteMeta icon={<Users size={16} />} label="Invitee" value={invite.name} />
          <InviteMeta icon={<Mail size={16} />} label="Email" value={invite.email} />
          <InviteMeta icon={<Shield size={16} />} label="Role" value={`${invite.role} · ${invite.designation}`} />
          <InviteMeta icon={<CheckCircle2 size={16} />} label="Team" value={`${invite.team} · ${invite.reportsTo}`} />
        </div>

        <div className="mt-6 rounded-3xl border border-[#C9A84C]/10 bg-[#FFF8E8] p-5">
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#8B6A1F]">Responsibility</div>
          <div className="mt-2 text-sm leading-relaxed text-slate-700">{invite.responsibility}</div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => acceptDemoInvite(invite.id)}
            className="rounded-2xl bg-[#0F172A] px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white"
          >
            Accept Invite
          </button>
          <Link href="/dashboard" className="rounded-2xl border border-[#0F172A]/10 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-widest text-[#0F172A]">
            Enter Workspace
          </Link>
          <Link href={getInvitePath(invite.id)} className="rounded-2xl border border-[#C9A84C]/15 bg-[#FFF8E8] px-5 py-3 text-[10px] font-black uppercase tracking-widest text-[#8B6A1F]">
            Refresh Invite
          </Link>
        </div>

        {invite.acceptedAt && (
          <div className="mt-6 rounded-2xl border border-[#1D9E75]/20 bg-[#1D9E75]/10 p-4 text-sm leading-relaxed text-slate-700">
            Invite accepted on {invite.acceptedAt}. Team & Access now reflects this employee as joined.
          </div>
        )}
      </div>
    </div>
  );
}

function InviteMeta({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-2 text-sm font-semibold leading-relaxed text-[#0F172A]">{value}</div>
    </div>
  );
}
