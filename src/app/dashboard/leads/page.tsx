"use client";

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { Users, Plus } from 'lucide-react';

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const response = await fetch('https://stunning-joy-production-87bb.up.railway.app/api/v1/leads', {
          headers: { 'Authorization': 'Bearer test-token' }
        });
        const data = await response.json();
        setLeads(data);
      } catch (err) {
        console.error("Failed to fetch leads:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeads();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-96 text-slate-400 animate-pulse">
      Loading Leads...
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-primary">Leads</h1>
          <p className="text-slate-500 mt-2 font-medium">Manage and track all your incoming leads.</p>
        </div>
        <button className="bg-primary text-white px-6 py-3 rounded-xl font-bold flex items-center shadow-lg shadow-primary/10 hover:bg-slate-800 transition-all active:scale-95">
          <Plus size={20} className="mr-2" /> New Lead
        </button>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8">
        <div className="flex items-center space-x-3 mb-6">
          <Users size={24} className="text-primary" />
          <h3 className="text-xl font-bold text-primary">All Leads</h3>
        </div>
        {leads.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Users size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-medium">No leads yet. Create your first lead to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {leads.map((lead, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                <div className="font-bold text-slate-800">{lead.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
