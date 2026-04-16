"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zap, X, Loader, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

const LandingPage = () => {
  const router = useRouter();
  const { login } = useAuth();
  const [query, setQuery] = useState("Hi NAMA! My husband and I want to visit Bali for a week in December. We want a private villa with a pool and some spa time. Our budget is around $4000 total.");
  const [result, setResult] = useState({
    destination: "Bali, Indonesia",
    duration: "7 Days",
    travelers: "2 (Couple)",
    style: "Luxury",
    reply: "Hi! Thanks for your inquiry about Bali. Our travel specialists are putting together a custom 7-day luxury plan for you. Stay tuned!"
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [systemHealth, setSystemHealth] = useState("checking");

  // Login modal state
  const [showLogin, setShowLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [sessionToast, setSessionToast] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('redirect')) setShowLogin(true);
    // Show session expired toast
    if (params.get('session_expired')) {
      setSessionToast(true);
      setShowLogin(true);
      // Remove param from URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete('session_expired');
      window.history.replaceState({}, '', url.toString());
      setTimeout(() => setSessionToast(false), 6000);
    }
  }, []);

  useEffect(() => {
    // Use Vercel proxy — no direct Railway URL
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/v1/health');
        if (res.ok) setSystemHealth("green");
        else setSystemHealth("orange");
      } catch {
        setSystemHealth("red");
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      await login(loginEmail, loginPassword);
      const params = new URLSearchParams(window.location.search);
      router.push(params.get('redirect') || '/dashboard');
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login failed. Check your credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleTriage = async () => {
    setLoading(true);
    setStatus("Analyzing...");
    try {
      const response = await fetch('/api/v1/queries/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: "DIRECT",
          content: query,
          sender_id: "web-visitor",
          tenant_id: 1
        })
      });
      const data = await response.json();
      if (data.extracted_data) {
        setResult({
          destination: data.extracted_data.destination || "Unknown",
          duration: `${data.extracted_data.duration_days} Days`,
          travelers: `${data.extracted_data.travelers_count} People`,
          style: data.extracted_data.style || "Standard",
          reply: data.suggested_reply
        });
        setStatus("Success!");
      } else {
        setStatus("Extraction failed.");
      }
    } catch (err) {
      console.error("Triage failed:", err);
      setStatus("Backend connection failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-[#14B8A6] selection:text-white">

      {/* Session expired toast */}
      {sessionToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-amber-50 border border-amber-300 text-amber-800 rounded-2xl px-5 py-4 shadow-xl max-w-sm w-full mx-4 animate-bounce-once">
          <AlertCircle size={18} className="flex-shrink-0 text-amber-600" />
          <div className="flex-1">
            <p className="font-bold text-sm">Session expired</p>
            <p className="text-xs text-amber-600">Please log in again to continue.</p>
          </div>
          <button onClick={() => setSessionToast(false)} className="text-amber-400 hover:text-amber-600">
            <X size={16} />
          </button>
        </div>
      )}

      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex justify-between items-center transition-all duration-300">
        <div className="flex items-center space-x-2 text-left">
          <div className="w-8 h-8 bg-[#0F172A] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">N</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-[#0F172A]">NAMA</span>
          <div className="ml-4 flex items-center space-x-2 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              systemHealth === 'green' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 
              systemHealth === 'orange' ? 'bg-orange-500 shadow-[0_0_8px_#f97316]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'
            }`} />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {systemHealth === 'green' ? 'OS ACTIVE' : systemHealth === 'orange' ? 'DEGRADED' : 'OFFLINE'}
            </span>
          </div>
        </div>
        <div className="hidden md:flex space-x-10 text-sm font-medium text-slate-500 text-left text-left">
          <a href="#vision" className="hover:text-[#0F172A] transition-colors">Vision</a>
          <a href="#modules" className="hover:text-[#0F172A] transition-colors">Modules</a>
          <Link href="/kinetic" className="hover:text-[#0F172A] transition-colors font-semibold text-[#14B8A6] text-left">Kinetic OS</Link>
          <a href="#pricing" className="hover:text-[#0F172A] transition-colors text-left">Pricing</a>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-semibold text-slate-600 hover:text-[#0F172A] transition-colors px-3 py-2"
          >
            Log In
          </Link>
          <Link href="/register" className="bg-[#0F172A] text-white text-sm px-5 py-2 rounded-full font-medium hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-[#0F172A]/10">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <div className="w-10 h-10 bg-[#0F172A] rounded-xl flex items-center justify-center text-white font-bold text-xl mb-3">N</div>
                <h2 className="text-2xl font-extrabold text-[#0F172A]">Welcome back</h2>
                <p className="text-slate-500 text-sm font-medium mt-1">Sign in to your NAMA workspace</p>
              </div>
              <button onClick={() => { setShowLogin(false); setLoginError(''); }} className="p-2 text-slate-400 hover:text-slate-600 self-start">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
                  <AlertCircle size={16} />
                  {loginError}
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@company.com"
                  required
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all font-medium text-[#0F172A]"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all font-medium text-[#0F172A]"
                />
              </div>
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-[#0F172A] text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                {loginLoading ? <><Loader size={18} className="animate-spin" /> Signing in...</> : 'Sign In to Dashboard'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-400 font-medium">
              No account?{' '}
              <Link href="/register" className="text-[#14B8A6] font-bold hover:underline" onClick={() => setShowLogin(false)}>
                Create one free
              </Link>
            </p>
          </div>
        </div>
      )}

      <section id="vision" className="relative px-6 pt-24 pb-32 max-w-7xl mx-auto flex flex-col items-center text-center">
        <div className="inline-block px-4 py-1.5 mb-8 bg-slate-100 rounded-full text-xs font-semibold tracking-wider text-slate-500 uppercase">
          AI-Native Travel Operating System
        </div>
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter text-[#0F172A] leading-[1.05] mb-8 text-center">
          The future of travel<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0F172A] via-[#14B8A6] to-[#F97316]">is autonomous.</span>
        </h1>
        <p className="text-xl md:text-2xl text-slate-500 max-w-3xl leading-relaxed mb-12 text-center">
          Automate discovery, contracting, pricing, and fulfillment across global supply. 
          80%+ reduction in manual ops, <span className="text-[#0F172A] font-bold font-black">under 2 minutes</span> for any quotation.
        </p>
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6 items-center justify-center">
          <Link href="/register" className="bg-[#0F172A] text-white text-lg px-10 py-4 rounded-full font-semibold hover:shadow-2xl hover:shadow-[#0F172A]/20 transition-all active:scale-95 text-center">
            Start Free Pilot
          </Link>
          <button className="bg-white border-2 border-slate-200 text-lg px-10 py-4 rounded-full font-semibold hover:border-[#0F172A] transition-all active:scale-95">
            Watch the Demo
          </button>
        </div>

        <div className="mt-20 w-full max-w-5xl bg-slate-50 border border-slate-200 shadow-2xl rounded-3xl overflow-hidden">
          <div className="p-8 border-b border-slate-200 bg-white flex items-center justify-between">
            <div className="flex space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">NAMA Triage Playground</div>
            <div className="w-10"></div>
          </div>
          <div className="p-12 grid grid-cols-1 md:grid-cols-2 gap-12 text-left">
            <div className="text-left">
              <h3 className="text-xl font-bold mb-4 text-left">1. Send a messy query</h3>
              <p className="text-sm text-slate-500 mb-6 font-medium leading-relaxed text-left">Type any travel request below. See how NAMA's Query Triage Agent extracts structured data instantly.</p>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative group focus-within:border-[#14B8A6] transition-colors text-left">
                <textarea 
                  className="w-full bg-transparent border-none outline-none text-sm font-medium h-32 resize-none text-left"
                  placeholder="Hi! We are 2 people planning a 5-day luxury trip to Dubai next month. We love dining and desert safaris. Budget ₹5L."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                ></textarea>
                <button 
                  onClick={handleTriage}
                  disabled={loading}
                  className="absolute bottom-4 right-4 bg-[#0F172A] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
                >
                  {loading ? "Processing..." : "Triage Now"}
                </button>
              </div>
              {status && (
                <div className={`mt-4 text-[10px] font-bold uppercase tracking-widest text-left ${
                  status.includes("failed") ? "text-red-500" : "text-[#14B8A6]"
                }`}>
                  {status}
                </div>
              )}
            </div>
            <div className="bg-slate-100 rounded-2xl p-8 border border-slate-200 relative overflow-hidden text-left">
              <div className="absolute top-0 right-0 p-4 opacity-5 text-[#0F172A] text-left">
                <Zap size={120} fill="currentColor" />
              </div>
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 text-left">AI Extraction Output</h3>
              <div className="space-y-6 relative z-10 text-left">
                <div className="flex justify-between items-end border-b border-slate-200 pb-2 text-left">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Destination</span>
                  <span className="text-sm font-bold text-[#0F172A]">{result.destination}</span>
                </div>
                <div className="flex justify-between items-end border-b border-slate-200 pb-2 text-left">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Duration</span>
                  <span className="text-sm font-bold text-[#0F172A]">{result.duration}</span>
                </div>
                <div className="flex justify-between items-end border-b border-slate-200 pb-2 text-left">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Travelers</span>
                  <span className="text-sm font-bold text-[#0F172A]">{result.travelers}</span>
                </div>
                <div className="flex justify-between items-end border-b border-slate-200 pb-2 text-left">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Style</span>
                  <span className="text-sm font-bold text-[#14B8A6]">{result.style}</span>
                </div>
                <div className="mt-8 text-left">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 text-left">AI Suggested Reply</div>
                  <div className="text-xs bg-white p-4 rounded-xl border border-slate-200 text-slate-600 leading-relaxed font-medium italic text-left">
                    "{result.reply}"
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="modules" className="bg-slate-50 py-32 px-6 text-left">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-16 text-left">
          <div className="space-y-6 text-left">
            <div className="w-14 h-14 bg-[#14B8A6]/10 text-[#14B8A6] rounded-2xl flex items-center justify-center text-3xl">
              ⚡️
            </div>
            <h3 className="text-2xl font-bold text-[#0F172A] tracking-tight text-left">Rapid Quotation</h3>
            <p className="text-slate-500 leading-relaxed font-medium text-left">
              Generate full-day itineraries with real-time supply matching and pricing in under 2 minutes. No manual data entry required.
            </p>
          </div>
          <div className="space-y-6 text-left text-left">
            <div className="w-14 h-14 bg-[#0F172A]/10 text-[#0F172A] rounded-2xl flex items-center justify-center text-3xl">
              🤖
            </div>
            <h3 className="text-2xl font-bold text-[#0F172A] tracking-tight text-left">Autonomous Bidding</h3>
            <p className="text-slate-500 leading-relaxed font-medium text-left">
              Our agent swarm negotiates net rates with vendors on your behalf across WhatsApp, Email, and Voice. 
            </p>
          </div>
          <div className="space-y-6 text-left text-left">
            <div className="w-14 h-14 bg-[#F97316]/10 text-[#F97316] rounded-2xl flex items-center justify-center text-3xl text-left text-left">
              📊
            </div>
            <h3 className="text-2xl font-bold text-[#0F172A] tracking-tight text-left">Real-time P&L</h3>
            <p className="text-slate-500 leading-relaxed font-medium text-left text-left">
              Know the profitability of every booking down to the rupee before you even send the confirmation voucher.
            </p>
          </div>
        </div>
      </section>

      <section id="kinetic" className="bg-[#0F172A] py-32 px-6 overflow-hidden relative text-center">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#14B8A6]/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="max-w-5xl mx-auto text-center relative z-10 text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-10 tracking-tight leading-tight text-center">
            Switch to <span className="text-[#14B8A6] italic">Kinetic</span> mode.<br />
            Command your business like a flight center.
          </h2>
          <p className="text-slate-400 text-lg mb-12 max-w-2xl mx-auto font-medium leading-relaxed text-center text-center">
            Real-time anomaly detection, autonomous supply chain re-routing, and instant financial reconciliation. The power of NAMA, in high fidelity.
          </p>
          <Link href="/kinetic" className="bg-[#14B8A6] text-[#0F172A] px-12 py-5 rounded-full font-bold text-lg shadow-xl shadow-[#14B8A6]/20 hover:scale-105 transition-all inline-block">
            Enter Command Center
          </Link>
        </div>
      </section>

      <footer className="py-20 px-6 border-t border-slate-100 max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-slate-400 text-sm">
        <div className="flex items-center space-x-2 mb-8 md:mb-0 text-left">
          <div className="w-6 h-6 bg-slate-200 rounded flex items-center justify-center font-bold text-slate-400 text-[10px]">
            N
          </div>
          <span className="font-bold text-slate-600">NAMA TRAVEL OS</span>
        </div>
        <div className="flex space-x-12 font-medium">
          <a href="#" className="hover:text-[#0F172A] transition-colors font-sans font-medium">Privacy</a>
          <a href="#" className="hover:text-[#0F172A] transition-colors font-sans font-medium">Terms</a>
          <a href="#" className="hover:text-[#0F172A] transition-colors font-sans font-medium">Compliance</a>
          <a href="#" className="hover:text-[#0F172A] transition-colors font-sans font-medium">Contact</a>
        </div>
        <div className="mt-8 md:mt-0 font-medium font-sans">
          © 2026 NAMA Networks. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
