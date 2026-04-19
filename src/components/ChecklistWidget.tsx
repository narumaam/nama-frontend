'use client';

/**
 * ChecklistWidget — Floating "Get Started" onboarding checklist.
 * Persists progress to localStorage (nama_checklist).
 * Auto-detects completion by polling /api/v1/leads|itineraries|bookings.
 */

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Users, Map, FileText, UserPlus, CheckSquare,
  X, ChevronRight, Check, Zap, type LucideProps,
} from 'lucide-react';
import { type ForwardRefExoticComponent, type RefAttributes } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type StepId = 'first_lead' | 'first_itinerary' | 'first_quote' | 'invite_team' | 'first_booking';

type LucideIcon = ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>>;

interface ChecklistStep {
  id: StepId;
  label: string;
  link: string;
  IconComponent: LucideIcon;
}

type StepState = Record<StepId, boolean>;

// ── Constants ─────────────────────────────────────────────────────────────────

const CHECKLIST_STEPS: ChecklistStep[] = [
  { id: 'first_lead',       label: 'Add your first lead',       link: '/dashboard/leads',       IconComponent: Users },
  { id: 'first_itinerary',  label: 'Build an itinerary',        link: '/dashboard/itineraries', IconComponent: Map },
  { id: 'first_quote',      label: 'Send a quotation',          link: '/dashboard/quotations',  IconComponent: FileText },
  { id: 'invite_team',      label: 'Invite a team member',      link: '/dashboard/team',        IconComponent: UserPlus },
  { id: 'first_booking',    label: 'Confirm a booking',         link: '/dashboard/bookings',    IconComponent: CheckSquare },
];

const LS_KEY = 'nama_checklist';
const LS_DISMISSED = 'nama_checklist_dismissed';

function loadState(): StepState {
  if (typeof window === 'undefined') return defaultState();
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...defaultState(), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaultState();
}

function defaultState(): StepState {
  return {
    first_lead: false,
    first_itinerary: false,
    first_quote: false,
    invite_team: false,
    first_booking: false,
  };
}

function saveState(state: StepState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

// ── Circular progress SVG ──────────────────────────────────────────────────────

function RingProgress({ done, total }: { done: number; total: number }) {
  const R = 18;
  const C = 2 * Math.PI * R;
  const filled = total === 0 ? 0 : (done / total) * C;
  return (
    <svg width={44} height={44} viewBox="0 0 44 44">
      {/* Track */}
      <circle cx={22} cy={22} r={R} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={3} />
      {/* Progress */}
      <circle
        cx={22} cy={22} r={R}
        fill="none"
        stroke="#4ade80"
        strokeWidth={3}
        strokeDasharray={`${filled} ${C}`}
        strokeLinecap="round"
        transform="rotate(-90 22 22)"
        style={{ transition: 'stroke-dasharray 0.5s ease' }}
      />
    </svg>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ChecklistWidget() {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [steps, setSteps] = useState<StepState>(defaultState);
  const [allDoneShown, setAllDoneShown] = useState(false);
  const hasFetched = useRef(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if dismissed
    if (localStorage.getItem(LS_DISMISSED) === '1') {
      setDismissed(true);
      return;
    }

    setSteps(loadState());
  }, []);

  // Auto-detect from API (runs once per mount)
  useEffect(() => {
    if (hasFetched.current || dismissed) return;
    hasFetched.current = true;

    async function checkApi() {
      try {
        const updates: Partial<StepState> = {};

        const [leadsRes, itinRes, bookingsRes] = await Promise.allSettled([
          fetch('/api/v1/leads?per_page=1', { credentials: 'include' }),
          fetch('/api/v1/itineraries?per_page=1', { credentials: 'include' }),
          fetch('/api/v1/bookings?per_page=1', { credentials: 'include' }),
        ]);

        if (leadsRes.status === 'fulfilled' && leadsRes.value.ok) {
          const d = await leadsRes.value.json();
          if ((d?.total ?? d?.items?.length ?? 0) > 0) updates.first_lead = true;
        }
        if (itinRes.status === 'fulfilled' && itinRes.value.ok) {
          const d = await itinRes.value.json();
          if ((d?.total ?? (Array.isArray(d) ? d.length : 0)) > 0) updates.first_itinerary = true;
        }
        if (bookingsRes.status === 'fulfilled' && bookingsRes.value.ok) {
          const d = await bookingsRes.value.json();
          if ((d?.total ?? d?.items?.length ?? 0) > 0) updates.first_booking = true;
        }

        if (Object.keys(updates).length > 0) {
          setSteps((prev) => {
            const next = { ...prev, ...updates };
            saveState(next);
            return next;
          });
        }
      } catch { /* non-blocking */ }
    }

    checkApi();
  }, [dismissed]);

  // All-done confetti auto-hide
  const doneCount = Object.values(steps).filter(Boolean).length;
  const allDone = doneCount === CHECKLIST_STEPS.length;

  useEffect(() => {
    if (allDone && open && !allDoneShown) {
      setAllDoneShown(true);
      setTimeout(() => {
        setDismissed(true);
        localStorage.setItem(LS_DISMISSED, '1');
      }, 3000);
    }
  }, [allDone, open, allDoneShown]);

  // Dismiss entirely
  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(true);
    localStorage.setItem(LS_DISMISSED, '1');
  };

  // Mark a step optimistically when clicking its link
  const handleStepClick = (id: StepId) => {
    // Optimistically mark quote / invite (can't auto-detect via API count)
    if (id === 'first_quote' || id === 'invite_team') {
      setSteps((prev) => {
        const next = { ...prev, [id]: true };
        saveState(next);
        return next;
      });
    }
    setOpen(false);
  };

  if (dismissed) return null;

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="Get Started checklist"
          style={{
            position: 'fixed',
            bottom: 88, // above NamaCopilot / FeedbackWidget
            right: 20,
            zIndex: 9000,
            background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
            border: 'none',
            borderRadius: '50%',
            width: 52,
            height: 52,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(99,102,241,0.5)',
            color: 'white',
            fontSize: 11,
            fontWeight: 800,
            flexDirection: 'column',
            gap: 0,
            padding: 0,
          }}
        >
          {/* Ring progress behind button */}
          <div style={{ position: 'absolute', top: 0, left: 0 }}>
            <RingProgress done={doneCount} total={CHECKLIST_STEPS.length} />
          </div>
          {/* Icon + count */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Zap size={15} fill="currentColor" />
            <span style={{ fontSize: 9, fontWeight: 900, marginTop: 1, lineHeight: 1 }}>
              {doneCount}/{CHECKLIST_STEPS.length}
            </span>
          </div>
        </button>
      )}

      {/* Expanded panel */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            zIndex: 9001,
            width: 320,
            background: 'white',
            borderRadius: 20,
            boxShadow: '0 24px 64px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.06)',
            border: '1px solid rgba(99,102,241,0.12)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'white' }}>
              <Zap size={16} fill="currentColor" />
              <span style={{ fontWeight: 800, fontSize: 14 }}>Get Started</span>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={handleDismiss}
                title="Dismiss forever"
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  borderRadius: 6,
                  color: 'white',
                  cursor: 'pointer',
                  padding: '3px 7px',
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                Dismiss
              </button>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  borderRadius: 6,
                  color: 'white',
                  cursor: 'pointer',
                  padding: '3px 6px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ padding: '12px 16px 8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                {doneCount} of {CHECKLIST_STEPS.length} complete
              </span>
              <span style={{ fontSize: 11, color: '#6366f1', fontWeight: 700 }}>
                {Math.round((doneCount / CHECKLIST_STEPS.length) * 100)}%
              </span>
            </div>
            <div style={{ height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${(doneCount / CHECKLIST_STEPS.length) * 100}%`,
                  background: 'linear-gradient(90deg, #4f46e5, #6366f1)',
                  borderRadius: 99,
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
          </div>

          {/* All done state */}
          {allDone ? (
            <div
              style={{
                padding: '20px 16px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
              <p style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', margin: '0 0 4px' }}>
                All done!
              </p>
              <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                You&apos;re all set up. This widget will close in a moment.
              </p>
            </div>
          ) : (
            /* Step list */
            <ul style={{ listStyle: 'none', margin: '4px 0 8px', padding: '0 8px' }}>
              {CHECKLIST_STEPS.map((s) => {
                const done = steps[s.id];
                const Icon = s.IconComponent;
                return (
                  <li key={s.id}>
                    <Link
                      href={s.link}
                      onClick={() => handleStepClick(s.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '9px 8px',
                        borderRadius: 10,
                        textDecoration: 'none',
                        color: done ? '#94a3b8' : '#1e293b',
                        background: 'transparent',
                        transition: 'background 0.15s',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#f8fafc'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      {/* Checkbox */}
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 6,
                          border: done ? 'none' : '2px solid #cbd5e1',
                          background: done ? '#22c55e' : 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'all 0.2s',
                        }}
                      >
                        {done && <Check size={12} color="white" strokeWidth={3} />}
                      </div>

                      {/* Icon */}
                      <Icon
                        size={15}
                        className={done ? 'text-slate-300' : 'text-indigo-500'}
                      />

                      {/* Label */}
                      <span
                        style={{
                          flex: 1,
                          fontSize: 13,
                          fontWeight: 600,
                          textDecoration: done ? 'line-through' : 'none',
                          opacity: done ? 0.5 : 1,
                        }}
                      >
                        {s.label}
                      </span>

                      {/* Arrow */}
                      {!done && <ChevronRight size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
