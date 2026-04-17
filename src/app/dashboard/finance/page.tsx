"use client";

import React from "react";
import { 
  Lock, 
  Mail, 
  Receipt, 
  CreditCard, 
  RefreshCw, 
  ArrowRightLeft 
} from "lucide-react";

export default function FinancePreviewPage() {
  const previewTiles = [
    { name: "Invoices", icon: Receipt },
    { name: "Payments", icon: CreditCard },
    { name: "Refunds", icon: RefreshCw },
    { name: "Vendor Payouts", icon: ArrowRightLeft },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      {/* Icon/Badge */}
      <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mb-6 border border-teal-100">
        <Lock className="text-[#14B8A6]" size={28} />
      </div>

      {/* Heading */}
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#0F172A] mb-4">
        Finance & P&L — <span className="text-[#14B8A6]">coming in May</span>
      </h1>

      {/* Paragraph */}
      <p className="max-w-xl text-slate-500 text-lg leading-relaxed mb-10">
        We're polishing the ledger, GST-compliant invoicing, and vendor payouts
        before launch. Your booking data is safe and nothing has been lost.
        Finance will go live in May 2026.
      </p>

      {/* Tiles Preview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl mb-12">
        {previewTiles.map((tile) => (
          <div 
            key={tile.name}
            className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex flex-col items-center gap-2 group hover:border-teal-200 transition-colors"
          >
            <tile.icon className="text-slate-300 group-hover:text-[#14B8A6] transition-colors" size={20} />
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              {tile.name}
            </span>
          </div>
        ))}
      </div>

      {/* CTA Button */}
      <a
        href="mailto:founder@namatravel.com"
        className="inline-flex items-center gap-2 bg-[#14B8A6] hover:bg-[#0D9488] text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-lg shadow-teal-500/20 active:scale-[0.98]"
      >
        <Mail size={18} />
        Notify me when Finance is live
      </a>

      {/* Footer hint */}
      <p className="mt-8 text-xs font-medium text-slate-400">
        NAMA OS v1.2 — Module M11 (Preview)
      </p>
    </div>
  );
}
