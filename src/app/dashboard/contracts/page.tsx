"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FileSignature,
  Eye,
  Download,
  RefreshCw,
  XCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  X,
  ChevronRight,
  FileText,
  Copy,
  Send,
  PenLine,
  Calendar,
  Building2,
  Tag,
  DollarSign,
  MapPin,
  History,
  Paperclip,
} from "lucide-react";
import { api } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

type ContractStatus =
  | "ACTIVE"
  | "PENDING_SIGNATURE"
  | "EXPIRED"
  | "DRAFT"
  | "TERMINATED";

type ContractType =
  | "Rate Agreement"
  | "Commission Agreement"
  | "Exclusivity Agreement"
  | "Service Agreement";

type AgreementType =
  | "Booking T&C"
  | "Custom"
  | "Travel Insurance Waiver";

type AgreementStatus = "SIGNED" | "PENDING" | "EXPIRED";

type TemplateCategory = "Vendor" | "Client" | "Commission";

interface VendorContract {
  id: string;
  contractNo: string;
  vendorName: string;
  type: ContractType;
  destination: string;
  startDate: string;
  endDate: string;
  value: number;
  valueLabel: string;
  status: ContractStatus;
  keyTerms: string[];
  documents: string[];
  renewalHistory: { date: string; note: string }[];
}

interface ClientAgreement {
  id: string;
  agreementNo: string;
  clientName: string;
  bookingNo: string;
  type: AgreementType;
  createdDate: string;
  signedDate: string | null;
  status: AgreementStatus;
}

interface ContractTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

// "today" for expiry calculations — set to 2026-04-19 per project context
const TODAY = new Date("2026-04-19");

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  return Math.round((d.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24));
}

const SEED_VENDOR_CONTRACTS: VendorContract[] = [
  {
    id: "vc1",
    contractNo: "VCA-2026-001",
    vendorName: "Atlantis The Palm Dubai",
    type: "Rate Agreement",
    destination: "Dubai",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    value: 4200000,
    valueLabel: "₹42L",
    status: "ACTIVE",
    keyTerms: [
      "20% allotment hold on all room categories",
      "Net rates valid Jan–Dec 2026",
      "7-day cancellation policy applies",
      "Complimentary breakfast for FIT bookings ≥5 nights",
    ],
    documents: ["Rate Sheet 2026.pdf", "Signed Contract.pdf"],
    renewalHistory: [
      { date: "2025-11-15", note: "Renewed for 2026 with 5% rate improvement" },
      { date: "2024-12-01", note: "Original contract signed for 2025" },
    ],
  },
  {
    id: "vc2",
    contractNo: "VCA-2026-002",
    vendorName: "Emirates Airlines",
    type: "Commission Agreement",
    destination: "Global",
    startDate: "2026-03-01",
    endDate: "2027-02-28",
    value: 800000,
    valueLabel: "₹8L",
    status: "ACTIVE",
    keyTerms: [
      "9% commission on Economy class tickets",
      "12% commission on Business class",
      "Overrides applicable on quarterly targets",
      "Minimum booking volume: 500 pax/year",
    ],
    documents: ["Commission Agreement 2026.pdf"],
    renewalHistory: [
      { date: "2025-02-20", note: "Renewed with improved Business class commission" },
    ],
  },
  {
    id: "vc3",
    contractNo: "VCA-2026-003",
    vendorName: "Bali DMC Partners",
    type: "Service Agreement",
    destination: "Bali, Indonesia",
    startDate: "2026-01-01",
    endDate: "2026-03-31",
    value: 1200000,
    valueLabel: "₹12L",
    status: "EXPIRED",
    keyTerms: [
      "Transfers, guides & activity packages",
      "48-hour confirmation SLA",
      "Ground ops coverage: Kuta, Ubud, Seminyak, Nusa Dua",
    ],
    documents: ["Service Agreement.pdf", "Rate Card Q1 2026.pdf"],
    renewalHistory: [],
  },
  {
    id: "vc4",
    contractNo: "VCA-2026-004",
    vendorName: "Maldives Speedboat Co.",
    type: "Rate Agreement",
    destination: "Maldives",
    startDate: "2026-02-15",
    endDate: "2027-02-14",
    value: 350000,
    valueLabel: "₹3.5L",
    status: "ACTIVE",
    keyTerms: [
      "Airport transfers — Male to resort islands",
      "Private charter and shared speedboat options",
      "24-hour advance booking required",
    ],
    documents: ["Rate Agreement 2026-27.pdf"],
    renewalHistory: [],
  },
  {
    id: "vc5",
    contractNo: "VCA-2026-005",
    vendorName: "Thai Smiles DMC",
    type: "Commission Agreement",
    destination: "Thailand",
    startDate: "2026-04-01",
    endDate: "2027-03-31",
    value: 900000,
    valueLabel: "₹9L",
    status: "PENDING_SIGNATURE",
    keyTerms: [
      "Destination: Bangkok, Phuket, Chiang Mai, Samui",
      "Commission 12% on land packages",
      "Dedicated account manager assigned",
      "Monthly reconciliation on 5th of each month",
    ],
    documents: ["Draft Commission Agreement.pdf"],
    renewalHistory: [],
  },
  {
    id: "vc6",
    contractNo: "VCA-2026-006",
    vendorName: "Rajasthan Heritage Hotels",
    type: "Rate Agreement",
    destination: "Rajasthan, India",
    startDate: "2026-02-01",
    // expiring in 20 days from 2026-04-19 = 2026-05-09
    endDate: "2026-05-09",
    value: 1800000,
    valueLabel: "₹18L",
    status: "ACTIVE",
    keyTerms: [
      "Heritage properties: Jaipur, Udaipur, Jodhpur, Jaisalmer",
      "FIT & GIT rates included",
      "Complimentary heritage walk on stays ≥3 nights",
      "Elephant/camel experiences at preferential rates",
    ],
    documents: ["Rate Agreement Feb–May 2026.pdf", "Property Catalogue.pdf"],
    renewalHistory: [
      { date: "2025-01-25", note: "Renewed Feb 2026 — added Jaisalmer properties" },
    ],
  },
  {
    id: "vc7",
    contractNo: "VCA-2026-007",
    vendorName: "Kenya Safaris Ltd.",
    type: "Exclusivity Agreement",
    destination: "Kenya",
    startDate: "2026-06-01",
    endDate: "2027-05-31",
    value: 2500000,
    valueLabel: "₹25L",
    status: "DRAFT",
    keyTerms: [
      "Exclusive partnership in South Asian market",
      "Masai Mara, Amboseli, Samburu circuits",
      "Minimum 50 pax commitment per year",
      "Co-marketing fund: ₹2L/year",
    ],
    documents: ["Draft Exclusivity Agreement.pdf"],
    renewalHistory: [],
  },
  {
    id: "vc8",
    contractNo: "VCA-2026-008",
    vendorName: "Sri Lanka DMC Network",
    type: "Commission Agreement",
    destination: "Sri Lanka",
    startDate: "2026-05-01",
    endDate: "2027-04-30",
    value: 600000,
    valueLabel: "₹6L",
    status: "ACTIVE",
    keyTerms: [
      "Colombo, Kandy, Galle, Sigiriya circuits",
      "10% commission on all land packages",
      "Train booking assistance included",
    ],
    documents: ["Commission Agreement 2026-27.pdf"],
    renewalHistory: [],
  },
];

const SEED_CLIENT_AGREEMENTS: ClientAgreement[] = [
  {
    id: "ca1",
    agreementNo: "CA-2026-001",
    clientName: "Priya Sharma",
    bookingNo: "BK-2026-019",
    type: "Booking T&C",
    createdDate: "2026-03-10",
    signedDate: "2026-03-11",
    status: "SIGNED",
  },
  {
    id: "ca2",
    agreementNo: "CA-2026-002",
    clientName: "Karan Mehta",
    bookingNo: "BK-2026-022",
    type: "Booking T&C",
    createdDate: "2026-03-25",
    signedDate: "2026-03-26",
    status: "SIGNED",
  },
  {
    id: "ca3",
    agreementNo: "CA-2026-003",
    clientName: "Anita Desai",
    bookingNo: "BK-2026-028",
    type: "Travel Insurance Waiver",
    createdDate: "2026-04-01",
    signedDate: null,
    status: "PENDING",
  },
  {
    id: "ca4",
    agreementNo: "CA-2026-004",
    clientName: "Vikram Nair",
    bookingNo: "BK-2026-031",
    type: "Custom",
    createdDate: "2026-04-10",
    signedDate: null,
    status: "PENDING",
  },
  {
    id: "ca5",
    agreementNo: "CA-2026-005",
    clientName: "Sunita Kapoor",
    bookingNo: "BK-2025-098",
    type: "Booking T&C",
    createdDate: "2025-11-05",
    signedDate: "2025-11-06",
    status: "EXPIRED",
  },
];

const SEED_TEMPLATES: ContractTemplate[] = [
  {
    id: "tpl1",
    name: "Standard Booking T&Cs",
    description: "General terms and conditions for client travel bookings including cancellation, payment, and liability clauses.",
    category: "Client",
  },
  {
    id: "tpl2",
    name: "Hotel Rate Agreement",
    description: "Comprehensive rate agreement template for hotel and resort partners covering FIT, GIT, allotment, and cancellation policies.",
    category: "Vendor",
  },
  {
    id: "tpl3",
    name: "DMC Commission Agreement",
    description: "Commission structure and partnership terms for DMC relationships including targets, overrides, and reconciliation.",
    category: "Commission",
  },
  {
    id: "tpl4",
    name: "Sub-agent Partnership",
    description: "Agreement for sub-agent and B2B partners covering commission splits, booking procedures, and brand guidelines.",
    category: "Vendor",
  },
  {
    id: "tpl5",
    name: "Travel Insurance Waiver",
    description: "Client waiver acknowledging declination of travel insurance with explicit liability limitations.",
    category: "Client",
  },
  {
    id: "tpl6",
    name: "Exclusivity Agreement",
    description: "Exclusive partnership agreement for destination or product exclusivity with minimum volume commitments.",
    category: "Vendor",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtValue(v: number): string {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  return `₹${(v / 1000).toFixed(0)}K`;
}

const STATUS_CONFIG: Record<ContractStatus, { label: string; cls: string }> = {
  ACTIVE: { label: "Active", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  PENDING_SIGNATURE: { label: "Pending Signature", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  EXPIRED: { label: "Expired", cls: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
  DRAFT: { label: "Draft", cls: "bg-gray-100 text-gray-600 dark:bg-gray-800/60 dark:text-gray-400" },
  TERMINATED: { label: "Terminated", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

const AGREEMENT_STATUS_CONFIG: Record<AgreementStatus, { label: string; cls: string }> = {
  SIGNED: { label: "Signed", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  PENDING: { label: "Pending", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  EXPIRED: { label: "Expired", cls: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" },
};

const TEMPLATE_BADGE: Record<TemplateCategory, string> = {
  Vendor: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  Client: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Commission: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon: Icon,
  colorCls,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  colorCls: string;
}) {
  return (
    <div className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-2xl p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colorCls}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{value}</p>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ─── Slide-over Detail Panel ──────────────────────────────────────────────────

function ContractDetailPanel({
  contract,
  onClose,
}: {
  contract: VendorContract;
  onClose: () => void;
}) {
  const days = daysUntil(contract.endDate);
  const statusCfg = STATUS_CONFIG[contract.status];

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white dark:bg-[#0F1B35] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 dark:border-white/5">
          <div>
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">
              {contract.vendorName}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {contract.contractNo} · {contract.type}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Status + expiry */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusCfg.cls}`}>
              {statusCfg.label}
            </span>
            {days >= 0 && days <= 30 && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle size={11} /> Expires in {days}d
              </span>
            )}
            {days < 0 && contract.status !== "TERMINATED" && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                Expired {Math.abs(days)}d ago
              </span>
            )}
          </div>

          {/* Fields grid */}
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
              Contract Details
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Building2, label: "Vendor", value: contract.vendorName },
                { icon: Tag, label: "Type", value: contract.type },
                { icon: MapPin, label: "Destination", value: contract.destination },
                { icon: DollarSign, label: "Contract Value", value: fmtValue(contract.value) },
                { icon: Calendar, label: "Start Date", value: fmtDate(contract.startDate) },
                { icon: Calendar, label: "End Date", value: fmtDate(contract.endDate) },
              ].map(({ icon: Ic, label, value }) => (
                <div key={label} className="bg-[#F8FAFC] dark:bg-white/5 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Ic size={13} className="text-slate-400 dark:text-slate-500" />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {label}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Key terms */}
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
              Key Terms
            </p>
            <ul className="space-y-2">
              {contract.keyTerms.map((term, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <ChevronRight size={14} className="text-[#14B8A6] mt-0.5 flex-shrink-0" />
                  {term}
                </li>
              ))}
            </ul>
          </div>

          {/* Documents */}
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
              <Paperclip size={12} /> Attached Documents
            </p>
            <div className="space-y-2">
              {contract.documents.map((doc) => (
                <div
                  key={doc}
                  className="flex items-center justify-between bg-[#F8FAFC] dark:bg-white/5 rounded-xl px-3 py-2.5"
                >
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-slate-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{doc}</span>
                  </div>
                  <button className="p-1 text-slate-400 hover:text-[#14B8A6] transition-colors">
                    <Download size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Renewal history */}
          {contract.renewalHistory.length > 0 && (
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
                <History size={12} /> Renewal History
              </p>
              <div className="relative pl-4 border-l-2 border-slate-100 dark:border-white/10 space-y-4">
                {contract.renewalHistory.map((r, i) => (
                  <div key={i} className="relative">
                    <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-[#14B8A6] border-2 border-white dark:border-[#0F1B35]" />
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{fmtDate(r.date)}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{r.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 flex flex-wrap gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-[#F8FAFC] dark:bg-white/5 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-all">
            <Download size={14} /> Download
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-[#F8FAFC] dark:bg-white/5 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-all">
            <Send size={14} /> Send for Signature
          </button>
          {contract.status === "PENDING_SIGNATURE" && (
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all">
              <PenLine size={14} /> Mark Signed
            </button>
          )}
          {(contract.status === "EXPIRED" || daysUntil(contract.endDate) <= 30) && (
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-[#14B8A6]/10 text-[#14B8A6] rounded-xl hover:bg-[#14B8A6]/20 transition-all">
              <RefreshCw size={14} /> Renew
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ─── New Contract Modal ───────────────────────────────────────────────────────

function NewContractModal({ onClose }: { onClose: () => void }) {
  const [contractKind, setContractKind] = useState<"Vendor" | "Client">("Vendor");

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-[#0F1B35] rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100 dark:border-white/5">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-white/5">
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">New Contract</h2>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all"
            >
              <X size={18} />
            </button>
          </div>
          {/* Body */}
          <div className="px-6 py-5 space-y-4">
            {/* Type selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Contract Type
              </label>
              <div className="flex gap-2">
                {(["Vendor", "Client"] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => setContractKind(k)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                      contractKind === k
                        ? "bg-[#1B2E5E] text-white border-[#1B2E5E] dark:bg-[#14B8A6]/20 dark:text-[#14B8A6] dark:border-[#14B8A6]/40"
                        : "bg-[#F8FAFC] dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/10"
                    }`}
                  >
                    {k} Contract
                  </button>
                ))}
              </div>
            </div>

            {/* Vendor/Client name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                {contractKind === "Vendor" ? "Vendor Name" : "Client Name"}
              </label>
              <input
                type="text"
                placeholder={contractKind === "Vendor" ? "e.g. Atlantis The Palm" : "e.g. Priya Sharma"}
                className="w-full px-4 py-2.5 text-sm bg-[#F8FAFC] dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/30"
              />
            </div>

            {/* Template */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Template
              </label>
              <select className="w-full px-4 py-2.5 text-sm bg-[#F8FAFC] dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/30">
                <option value="">Select a template</option>
                {SEED_TEMPLATES.filter(
                  (t) =>
                    (contractKind === "Vendor" && t.category !== "Client") ||
                    (contractKind === "Client" && t.category === "Client")
                ).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2.5 text-sm bg-[#F8FAFC] dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/30"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2.5 text-sm bg-[#F8FAFC] dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/30"
                />
              </div>
            </div>

            {/* Value */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Contract Value (₹)
              </label>
              <input
                type="number"
                placeholder="e.g. 1500000"
                className="w-full px-4 py-2.5 text-sm bg-[#F8FAFC] dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/30"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold bg-[#F8FAFC] dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
            >
              Save as Draft
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold bg-[#1B2E5E] dark:bg-[#14B8A6] text-white dark:text-[#0A0F1E] rounded-xl hover:opacity-90 transition-all"
            >
              Send for Signature
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "vendor" | "client" | "templates" | "expiring";

export default function ContractsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("vendor");
  const [vendorContracts, setVendorContracts] = useState<VendorContract[]>([]);
  const [clientAgreements, setClientAgreements] = useState<ClientAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<VendorContract | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [vc, ca] = await Promise.all([
        api.get("/api/v1/contracts/vendor").catch(() => null),
        api.get("/api/v1/contracts/client").catch(() => null),
      ]);
      setVendorContracts(
        (vc as VendorContract[] | null) ?? SEED_VENDOR_CONTRACTS
      );
      setClientAgreements(
        (ca as ClientAgreement[] | null) ?? SEED_CLIENT_AGREEMENTS
      );
    } catch {
      setVendorContracts(SEED_VENDOR_CONTRACTS);
      setClientAgreements(SEED_CLIENT_AGREEMENTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // KPI derivations
  const activeCount = vendorContracts.filter((c) => c.status === "ACTIVE").length;
  const expiringCount = vendorContracts.filter(
    (c) => daysUntil(c.endDate) >= 0 && daysUntil(c.endDate) <= 30
  ).length;
  const pendingCount = vendorContracts.filter(
    (c) => c.status === "PENDING_SIGNATURE"
  ).length;
  const totalValue = vendorContracts.reduce((s, c) => s + c.value, 0);

  const expiringContracts = vendorContracts
    .filter((c) => daysUntil(c.endDate) >= 0 && daysUntil(c.endDate) <= 60)
    .sort((a, b) => daysUntil(a.endDate) - daysUntil(b.endDate));

  const TABS: { key: Tab; label: string }[] = [
    { key: "vendor", label: "Vendor Contracts" },
    { key: "client", label: "Client Agreements" },
    { key: "templates", label: "Templates" },
    { key: "expiring", label: "Expiring Soon" },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
            <FileSignature size={24} className="text-[#14B8A6]" />
            Contracts Manager
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage vendor contracts, client agreements, and templates in one place.
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#1B2E5E] dark:bg-[#14B8A6] text-white dark:text-[#0A0F1E] rounded-xl text-sm font-bold hover:opacity-90 transition-all active:scale-95"
        >
          <Plus size={16} /> New Contract
        </button>
      </div>

      {/* KPI strip */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-2xl p-5 h-20 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Active Contracts"
            value={activeCount}
            icon={CheckCircle}
            colorCls="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
          />
          <KpiCard
            label="Expiring in 30 Days"
            value={expiringCount}
            icon={AlertTriangle}
            colorCls="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
          />
          <KpiCard
            label="Pending Signature"
            value={pendingCount}
            icon={Clock}
            colorCls="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
          />
          <KpiCard
            label="Total Contract Value"
            value={fmtValue(totalValue)}
            icon={DollarSign}
            colorCls="bg-[#14B8A6]/10 text-[#14B8A6]"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-2xl overflow-hidden">
        {/* Tab bar */}
        <div className="border-b border-slate-100 dark:border-white/5 px-4 flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`relative px-4 py-4 text-sm font-bold whitespace-nowrap transition-colors ${
                activeTab === t.key
                  ? "text-[#14B8A6]"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              {t.label}
              {t.key === "expiring" && expiringContracts.length > 0 && (
                <span className="ml-1.5 text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                  {expiringContracts.length}
                </span>
              )}
              {activeTab === t.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#14B8A6] rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-0">
          {/* ── Vendor Contracts ── */}
          {activeTab === "vendor" && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/5">
                    {["Contract #", "Vendor Name", "Type", "Destination", "Start Date", "End Date", "Value", "Status", "Actions"].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 whitespace-nowrap"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                  {vendorContracts.map((c) => {
                    const days = daysUntil(c.endDate);
                    const expiring = days >= 0 && days <= 30;
                    const s = STATUS_CONFIG[c.status];
                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedContract(c)}
                        className="hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors group"
                      >
                        <td className="px-4 py-3.5">
                          <span className="text-sm font-bold text-[#14B8A6]">{c.contractNo}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {c.vendorName}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {c.type}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {c.destination}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {fmtDate(c.startDate)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {fmtDate(c.endDate)}
                            </span>
                            {expiring && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 flex items-center gap-1 whitespace-nowrap">
                                <AlertTriangle size={9} /> {days}d
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                            {c.valueLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${s.cls}`}>
                            {s.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => setSelectedContract(c)}
                              title="View"
                              className="p-1.5 text-slate-400 hover:text-[#1B2E5E] dark:hover:text-[#14B8A6] hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-all"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              title="Download PDF"
                              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-all"
                            >
                              <Download size={14} />
                            </button>
                            {(c.status === "EXPIRED" || expiring) && (
                              <button
                                title="Renew"
                                className="p-1.5 text-slate-400 hover:text-[#14B8A6] hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-all"
                              >
                                <RefreshCw size={14} />
                              </button>
                            )}
                            {c.status !== "TERMINATED" && c.status !== "EXPIRED" && (
                              <button
                                title="Terminate"
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                              >
                                <XCircle size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {vendorContracts.length === 0 && (
                <div className="text-center py-16 text-slate-400 dark:text-slate-500">
                  No vendor contracts yet. Click &ldquo;New Contract&rdquo; to add one.
                </div>
              )}
            </div>
          )}

          {/* ── Client Agreements ── */}
          {activeTab === "client" && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/5">
                    {["Agreement #", "Client Name", "Booking #", "Type", "Created", "Signed Date", "Status"].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 whitespace-nowrap"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                  {clientAgreements.map((a) => {
                    const s = AGREEMENT_STATUS_CONFIG[a.status];
                    return (
                      <tr
                        key={a.id}
                        className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                      >
                        <td className="px-4 py-3.5">
                          <span className="text-sm font-bold text-[#14B8A6]">{a.agreementNo}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#14B8A6]/10 flex items-center justify-center text-xs font-black text-[#14B8A6] flex-shrink-0">
                              {a.clientName[0]}
                            </div>
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                              {a.clientName}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-sm text-slate-500 dark:text-slate-400">{a.bookingNo}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-xs text-slate-500 dark:text-slate-400">{a.type}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {fmtDate(a.createdDate)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          {a.signedDate ? (
                            <span className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 whitespace-nowrap">
                              <CheckCircle size={13} /> {fmtDate(a.signedDate)}
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400 dark:text-slate-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${s.cls}`}>
                            {s.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Templates ── */}
          {activeTab === "templates" && (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {SEED_TEMPLATES.map((t) => (
                <div
                  key={t.id}
                  className="bg-[#F8FAFC] dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl p-5 flex flex-col gap-4 hover:border-[#14B8A6]/30 dark:hover:border-[#14B8A6]/30 transition-all group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 flex items-center justify-center flex-shrink-0">
                      <FileText size={18} className="text-[#1B2E5E] dark:text-[#14B8A6]" />
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${TEMPLATE_BADGE[t.category]}`}>
                      {t.category}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-slate-800 dark:text-slate-100">{t.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                      {t.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                    <button
                      onClick={() => setShowNewModal(true)}
                      className="flex-1 py-2 text-xs font-bold bg-[#1B2E5E] dark:bg-[#14B8A6]/20 text-white dark:text-[#14B8A6] rounded-xl hover:opacity-90 dark:hover:bg-[#14B8A6]/30 transition-all"
                    >
                      Use Template
                    </button>
                    <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-white/10 rounded-xl transition-all" title="Edit">
                      <PenLine size={14} />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-white/10 rounded-xl transition-all" title="Duplicate">
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Expiring Soon ── */}
          {activeTab === "expiring" && (
            <div className="p-6">
              {expiringContracts.length === 0 ? (
                <div className="text-center py-16">
                  <CheckCircle size={40} className="text-emerald-400 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-slate-400 font-semibold">
                    No contracts expiring in the next 60 days.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {expiringContracts.map((c) => {
                    const days = daysUntil(c.endDate);
                    const urgencyColor =
                      days < 14
                        ? "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30"
                        : days < 30
                        ? "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30"
                        : "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30";
                    const s = STATUS_CONFIG[c.status];
                    return (
                      <div
                        key={c.id}
                        className="flex items-center justify-between gap-4 bg-[#F8FAFC] dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl px-5 py-4 hover:border-[#14B8A6]/30 dark:hover:border-[#14B8A6]/30 transition-all cursor-pointer group"
                        onClick={() => setSelectedContract(c)}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 flex items-center justify-center flex-shrink-0">
                            <FileSignature size={18} className="text-[#1B2E5E] dark:text-[#14B8A6]" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-slate-800 dark:text-slate-100 truncate">
                              {c.vendorName}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-xs text-slate-500 dark:text-slate-400">{c.type}</span>
                              <span className="text-slate-300 dark:text-slate-600">·</span>
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                Expires {fmtDate(c.endDate)}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.cls}`}>
                                {s.label}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className={`text-xs font-black px-3 py-1.5 rounded-full ${urgencyColor}`}>
                            {days}d left
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowNewModal(true);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[#14B8A6]/10 text-[#14B8A6] rounded-xl hover:bg-[#14B8A6]/20 transition-all"
                          >
                            <RefreshCw size={12} /> Renew
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Slide-over detail panel */}
      {selectedContract && (
        <ContractDetailPanel
          contract={selectedContract}
          onClose={() => setSelectedContract(null)}
        />
      )}

      {/* New Contract modal */}
      {showNewModal && <NewContractModal onClose={() => setShowNewModal(false)} />}
    </div>
  );
}
