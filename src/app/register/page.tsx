"use client";

import React from 'react';
import Link from 'next/link';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-[32px] shadow-xl p-10 border border-slate-100">
        <div className="mb-8 text-center text-left">
          <div className="w-12 h-12 bg-[#0F172A] rounded-xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-lg shadow-[#0F172A]/20">N</div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0F172A]">Start the NAMA Demo</h1>
          <p className="text-slate-500 mt-2 font-medium">Use your agency details to enter the demo workspace.</p>
        </div>

        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          <div className="text-left">
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Company Name</label>
            <input 
              type="text" 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all font-medium text-[#0F172A]"
              placeholder="e.g. Bali Dream DMCs"
            />
          </div>
          <div className="text-left">
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Business Email</label>
            <input 
              type="email" 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all font-medium text-[#0F172A]"
              placeholder="admin@company.com"
            />
          </div>
          <div className="text-left">
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Password</label>
            <input 
              type="password" 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all font-medium text-[#0F172A]"
              placeholder="••••••••"
            />
          </div>

          <Link 
            href="/dashboard" 
            className="block w-full bg-[#0F172A] text-white py-4 rounded-xl font-bold text-center hover:bg-slate-800 transition-all shadow-lg shadow-[#0F172A]/10 active:scale-[0.98]"
          >
            Enter Demo Workspace
          </Link>
        </form>

        <div className="mt-8 text-center text-sm text-slate-400 font-medium">
          Want to review the live landing page first? <Link href="/" className="text-[#14B8A6] font-bold hover:underline">Back to homepage</Link>
        </div>
      </div>
      
      <div className="mt-12 text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em]">
        Secure Enterprise Travel OS
      </div>
    </div>
  );
}
