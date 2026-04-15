"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    companyName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.fullName.trim()) {
      setError('Full Name is required');
      return;
    }
    if (!formData.companyName.trim()) {
      setError('Company Name is required');
      return;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }
    if (!formData.password) {
      setError('Password is required');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      // Step 1: Register organization
      const orgRes = await authApi.registerOrg({
        organization_name: formData.companyName,
        admin_email: formData.email,
        admin_password: formData.password,
      });

      // Step 2: Register admin user
      const userRes = await authApi.registerUser({
        email: formData.email,
        password: formData.password,
        full_name: formData.fullName,
        role: 'ADMIN',
        tenant_id: orgRes.tenant_id,
      });

      // Store auth token
      localStorage.setItem('nama_token', userRes.access_token);
      localStorage.setItem('nama_user', JSON.stringify({
        userId: userRes.user_id,
        tenantId: orgRes.tenant_id,
        role: 'ADMIN',
        email: formData.email,
      }));

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-[32px] shadow-xl p-10 border border-slate-100">
        <div className="mb-8 text-center text-left">
          <div className="w-12 h-12 bg-[#0F172A] rounded-xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-lg shadow-[#0F172A]/20">
            N
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0F172A]">Get Started with NAMA</h1>
          <p className="text-slate-500 mt-2 font-medium">Join the future of autonomous travel.</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          <div className="text-left">
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">
              Full Name
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all font-medium text-[#0F172A]"
              placeholder="John Doe"
              disabled={loading}
            />
          </div>

          <div className="text-left">
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">
              Company Name
            </label>
            <input
              type="text"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all font-medium text-[#0F172A]"
              placeholder="e.g. Bali Dream DMCs"
              disabled={loading}
            />
          </div>

          <div className="text-left">
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">
              Business Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all font-medium text-[#0F172A]"
              placeholder="admin@company.com"
              disabled={loading}
            />
          </div>

          <div className="text-left">
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all font-medium text-[#0F172A]"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          <div className="text-left">
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">
              Confirm Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all font-medium text-[#0F172A]"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="block w-full bg-[#0F172A] text-white py-4 rounded-xl font-bold text-center hover:bg-slate-800 transition-all shadow-lg shadow-[#0F172A]/10 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Account...' : 'Create Your Account'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-400 font-medium">
          Already have an account? <Link href="/" className="text-[#14B8A6] font-bold hover:underline">
            Go back
          </Link>
        </div>
      </div>

      <div className="mt-12 text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em]">
        Secure Enterprise Travel OS
      </div>
    </div>
  );
}
