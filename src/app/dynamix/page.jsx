'use client'

import Link from 'next/link'

import { dynamixAiPrinciples } from '@/lib/dynamix-ai-data'

export default function DynamixLandingPage() {
  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <section className="glass rounded-[30px] p-8 md:p-10 bg-[radial-gradient(circle_at_top_right,rgba(229,9,20,0.18),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500 font-mono">Dynamix Entry</p>
            <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tight leading-[0.94] mt-4">
              Choose how NAMA DYNAMIX
              <br />
              <span className="text-red-500">builds the holiday.</span>
            </h1>
            <p className="text-zinc-400 mt-5 leading-7 text-base md:text-lg">
              Logged-in agents now get two paths: use the structured flow that is already built, or try the new AI-first category flow designed to think like a conversion engine, not just a package builder.
            </p>
          </div>
          <div className="grid gap-3 min-w-[280px]">
            <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono mb-2">Why AI-first</p>
              <p className="text-sm text-zinc-300">Category-first Dynamix should help an agent decide what to sell, how to position it, and where margin stays safe.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-6 mt-6">
        <article className="glass rounded-[28px] p-8 border border-white/8">
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-white/8 bg-white/5 text-[11px] uppercase tracking-[0.16em] text-zinc-400">
            Option A
          </div>
          <h2 className="text-3xl font-display font-semibold tracking-tight mt-5">What’s built yesterday</h2>
          <p className="text-zinc-400 mt-3 leading-7">
            Use the existing destination-led Dynamix flow. This is the already-built path for agents who want a stable, structured package workflow right away.
          </p>
          <div className="space-y-3 mt-6">
            {['Destination → dates → pax', 'Matched holidays', 'Builder → send → approval'].map((item) => (
              <div key={item} className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-zinc-300">{item}</div>
            ))}
          </div>
          <Link href="/dynamix/classic" className="mt-6 inline-flex items-center justify-center px-5 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium">
            Open classic flow
          </Link>
        </article>

        <article className="glass rounded-[28px] p-8 border border-red-600/20 bg-[linear-gradient(180deg,rgba(229,9,20,0.10),rgba(255,255,255,0.03))]">
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-red-600/25 bg-red-600/10 text-[11px] uppercase tracking-[0.16em] text-red-200">
            Option B · AI First
          </div>
          <h2 className="text-3xl font-display font-semibold tracking-tight mt-5">Category-first Dynamix</h2>
          <p className="text-zinc-300 mt-3 leading-7">
            This new path starts from the travel category and sales context, then lets AI shape the holiday blueprint, conversion strategy, and itinerary modules before the agent gets into detailed edits.
          </p>
          <div className="grid gap-3 mt-6">
            {dynamixAiPrinciples.map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <h3 className="text-sm font-semibold">{item.title}</h3>
                <p className="text-sm text-zinc-300 mt-2">{item.summary}</p>
              </div>
            ))}
          </div>
          <Link href="/dynamix/ai-categories" className="mt-6 inline-flex items-center justify-center px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-semibold">
            Try AI-first flow
          </Link>
        </article>
      </section>
    </main>
  )
}
