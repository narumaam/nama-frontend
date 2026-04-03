"use client";

import React from "react";
import { Info } from "lucide-react";

export type ScreenHelpContent = {
  title: string;
  description: string;
  bullets: string[];
};

export default function ScreenInfoTip({ content }: { content: ScreenHelpContent }) {
  return (
    <div className="group relative inline-flex">
      <button
        type="button"
        aria-label={`About ${content.title}`}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#C9A84C]/20 bg-[#111111] text-[#C9A84C] transition-colors hover:bg-[#C9A84C]/10"
      >
        <Info size={14} />
      </button>
      <div className="pointer-events-none absolute right-0 top-10 z-50 hidden w-[320px] rounded-2xl border border-[#C9A84C]/15 bg-[#0A0A0A] p-4 text-left shadow-[0_20px_50px_rgba(0,0,0,0.45)] group-hover:block group-focus-within:block">
        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C9A84C]">Screen Guide</div>
        <div className="mt-2 text-sm font-black text-[#F5F0E8]">{content.title}</div>
        <p className="mt-2 text-sm leading-relaxed text-[#B8B0A0]">{content.description}</p>
        <div className="mt-3 space-y-2">
          {content.bullets.map((item) => (
            <div key={item} className="rounded-xl border border-[#C9A84C]/10 bg-[#111111] px-3 py-2 text-xs leading-relaxed text-[#B8B0A0]">
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
