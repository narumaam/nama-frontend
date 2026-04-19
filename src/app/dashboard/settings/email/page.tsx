'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Mail, Server, Lock, CheckCircle, XCircle, AlertTriangle,
  RefreshCw, Loader, Eye, EyeOff, Zap, Trash2, Clock,
  ChevronDown, ChevronUp, ExternalLink, Info, Send,
} from 'lucide-react'
import { api } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmailConfig {
  id?: number
  tenant_id?: number
  // SMTP
  smtp_host: string
  smtp_port: number
  smtp_username: string
  smtp_password: string
  smtp_from_name: string
  smtp_from_email: string
  smtp_use_tls: boolean
  // IMAP
  imap_host: string
  imap_port: number
  imap_username: string
  imap_password: string
  imap_use_ssl: boolean
  imap_folder: string
  // State
  smtp_verified?: boolean
  imap_verified?: boolean
  last_imap_poll?: string | null
  configured?: boolean
}

interface TestResult {
  success: boolean
  error?: string | null
  latency_ms?: number
  message_count?: number
}

interface PollResult {
  replies_found: number
  matched: number
  unmatched: number
  replies: Array<{
    from_email: string
    subject: string
    received_at: string
    in_reply_to: string
    quotation_id: number | null
    threaded: boolean
  }>
}

const MASK = '••••••••'

// ─── Preset configurations ────────────────────────────────────────────────────

const PRESETS = [
  {
    label: 'Gmail',
    icon: '✉️',
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_use_tls: true,
    imap_host: 'imap.gmail.com',
    imap_port: 993,
    imap_use_ssl: true,
    hint: 'Requires a Gmail App Password (not your regular password).',
    helpUrl: 'https://support.google.com/accounts/answer/185833',
    helpLabel: 'Create App Password',
  },
  {
    label: 'Outlook',
    icon: '📧',
    smtp_host: 'smtp-mail.outlook.com',
    smtp_port: 587,
    smtp_use_tls: true,
    imap_host: 'outlook.office365.com',
    imap_port: 993,
    imap_use_ssl: true,
    hint: 'Use your full Outlook email address as the username.',
    helpUrl: 'https://support.microsoft.com/en-us/office/pop-imap-and-smtp-settings-8361e398-8af4-4e97-b147-6c6c4ac95353',
    helpLabel: 'Outlook SMTP/IMAP settings',
  },
  {
    label: 'Zoho',
    icon: '🔵',
    smtp_host: 'smtp.zoho.com',
    smtp_port: 587,
    smtp_use_tls: true,
    imap_host: 'imap.zoho.com',
    imap_port: 993,
    imap_use_ssl: true,
    hint: 'Use your Zoho Mail credentials. Enable IMAP in Zoho Mail settings first.',
    helpUrl: 'https://www.zoho.com/mail/help/imap-access.html',
    helpLabel: 'Enable IMAP in Zoho',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="block text-sm font-medium text-slate-400 mb-1">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? '••••••••'}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 pr-10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 placeholder-slate-600"
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string | number
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 placeholder-slate-600"
      />
    </div>
  )
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-medium text-white">{label}</div>
        {description && <div className="text-xs text-slate-500 mt-0.5">{description}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-emerald-500' : 'bg-slate-700'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
        ok
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
      }`}
    >
      {ok ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
      {label}
    </span>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EmailSettingsPage() {
  const [config, setConfig] = useState<EmailConfig>({
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    smtp_from_name: '',
    smtp_from_email: '',
    smtp_use_tls: true,
    imap_host: '',
    imap_port: 993,
    imap_username: '',
    imap_password: '',
    imap_use_ssl: true,
    imap_folder: 'INBOX',
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [smtpTest, setSmtpTest] = useState<TestResult | null>(null)
  const [imapTest, setImapTest] = useState<TestResult | null>(null)
  const [pollResult, setPollResult] = useState<PollResult | null>(null)
  const [testingSmtp, setTestingSmtp] = useState(false)
  const [testingImap, setTestingImap] = useState(false)
  const [polling, setPolling] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showPresets, setShowPresets] = useState(false)
  const [showPollDetails, setShowPollDetails] = useState(false)
  const [isConfigured, setIsConfigured] = useState(false)

  // ── Load config ──────────────────────────────────────────────────────────────
  const loadConfig = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get('/api/v1/email-config/') as EmailConfig
      if (data && data.configured !== false && data.id) {
        setIsConfigured(true)
        setConfig({
          ...data,
          smtp_password: data.smtp_password === MASK ? MASK : '',
          imap_password: data.imap_password === MASK ? MASK : '',
        })
      } else {
        setIsConfigured(false)
      }
    } catch {
      setIsConfigured(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  // ── Apply preset ─────────────────────────────────────────────────────────────
  function applyPreset(preset: typeof PRESETS[0]) {
    setConfig(prev => ({
      ...prev,
      smtp_host: preset.smtp_host,
      smtp_port: preset.smtp_port,
      smtp_use_tls: preset.smtp_use_tls,
      imap_host: preset.imap_host,
      imap_port: preset.imap_port,
      imap_use_ssl: preset.imap_use_ssl,
    }))
    setShowPresets(false)
  }

  // ── Save ─────────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true)
    setSaveSuccess(false)
    setSaveError(null)

    const payload: Record<string, unknown> = {
      smtp_host:       config.smtp_host || null,
      smtp_port:       config.smtp_port,
      smtp_username:   config.smtp_username || null,
      smtp_from_name:  config.smtp_from_name || null,
      smtp_from_email: config.smtp_from_email || null,
      smtp_use_tls:    config.smtp_use_tls,
      imap_host:       config.imap_host || null,
      imap_port:       config.imap_port,
      imap_username:   config.imap_username || null,
      imap_use_ssl:    config.imap_use_ssl,
      imap_folder:     config.imap_folder || 'INBOX',
    }

    // Only send passwords if they've been changed (not the mask placeholder)
    if (config.smtp_password && config.smtp_password !== MASK) {
      payload.smtp_password = config.smtp_password
    }
    if (config.imap_password && config.imap_password !== MASK) {
      payload.imap_password = config.imap_password
    }

    try {
      await api.post('/api/v1/email-config/', payload)
      setSaveSuccess(true)
      setIsConfigured(true)
      await loadConfig()
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  // ── Test SMTP ────────────────────────────────────────────────────────────────
  async function handleTestSmtp() {
    setTestingSmtp(true)
    setSmtpTest(null)
    try {
      const res = await api.post('/api/v1/email-config/test-smtp', {}) as TestResult
      setSmtpTest(res)
      if (res.success) {
        setConfig(prev => ({ ...prev, smtp_verified: true }))
      }
    } catch (e: unknown) {
      setSmtpTest({ success: false, error: e instanceof Error ? e.message : 'Test failed' })
    } finally {
      setTestingSmtp(false)
    }
  }

  // ── Test IMAP ────────────────────────────────────────────────────────────────
  async function handleTestImap() {
    setTestingImap(true)
    setImapTest(null)
    try {
      const res = await api.post('/api/v1/email-config/test-imap', {}) as TestResult
      setImapTest(res)
      if (res.success) {
        setConfig(prev => ({ ...prev, imap_verified: true }))
      }
    } catch (e: unknown) {
      setImapTest({ success: false, error: e instanceof Error ? e.message : 'Test failed' })
    } finally {
      setTestingImap(false)
    }
  }

  // ── Poll replies ─────────────────────────────────────────────────────────────
  async function handlePollReplies() {
    setPolling(true)
    setPollResult(null)
    try {
      const res = await api.post('/api/v1/email-config/poll-replies', {}) as PollResult
      setPollResult(res)
      setConfig(prev => ({ ...prev, last_imap_poll: new Date().toISOString() }))
      setShowPollDetails(true)
    } catch (e: unknown) {
      setPollResult({
        replies_found: 0,
        matched: 0,
        unmatched: 0,
        replies: [],
      })
    } finally {
      setPolling(false)
    }
  }

  // ── Delete config ────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!confirm('Remove email configuration? NAMA will revert to the default sender (onboarding@getnama.app).')) return
    setDeleting(true)
    try {
      await api.delete('/api/v1/email-config/')
      setIsConfigured(false)
      setConfig({
        smtp_host: '', smtp_port: 587, smtp_username: '', smtp_password: '',
        smtp_from_name: '', smtp_from_email: '', smtp_use_tls: true,
        imap_host: '', imap_port: 993, imap_username: '', imap_password: '',
        imap_use_ssl: true, imap_folder: 'INBOX',
      })
      setSmtpTest(null)
      setImapTest(null)
      setPollResult(null)
    } catch {
      // ignore
    } finally {
      setDeleting(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader className="w-6 h-6 text-emerald-400 animate-spin" />
      </div>
    )
  }

  const smtpConfigured = !!(config.smtp_host && config.smtp_username)
  const imapConfigured = !!(config.imap_host && config.imap_username)

  return (
    <div className="min-h-screen bg-slate-950 p-6 max-w-3xl mx-auto">
      {/* ── Page header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
            <Mail className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Email Configuration</h1>
            <p className="text-sm text-slate-500">Send quotations from your own domain. Ingest client replies automatically.</p>
          </div>
        </div>
      </div>

      {/* ── Status bar ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {smtpConfigured ? (
            <StatusBadge
              ok={!!config.smtp_verified}
              label={
                config.smtp_verified
                  ? `Sending from ${config.smtp_from_email || config.smtp_username}`
                  : 'SMTP configured — not tested yet'
              }
            />
          ) : (
            <StatusBadge ok={false} label="Using NAMA default sender (onboarding@getnama.app)" />
          )}

          {imapConfigured ? (
            <StatusBadge
              ok={!!config.imap_verified}
              label={
                config.imap_verified
                  ? config.last_imap_poll
                    ? `Reply ingestion active — last checked ${timeAgo(config.last_imap_poll)}`
                    : 'Reply ingestion active — never polled'
                  : 'IMAP configured — not tested yet'
              }
            />
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-500 border border-slate-700">
              <Clock className="w-3 h-3" />
              Reply ingestion not configured
            </span>
          )}
        </div>

        {isConfigured && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs hover:bg-red-500/20 transition-colors disabled:opacity-50"
          >
            {deleting ? <Loader className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            Remove config
          </button>
        )}
      </div>

      {/* ── Quick presets ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl mb-6 overflow-hidden">
        <button
          onClick={() => setShowPresets(s => !s)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium text-slate-300 hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            Quick setup — choose your email provider
          </div>
          {showPresets ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </button>

        {showPresets && (
          <div className="border-t border-slate-800 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PRESETS.map(preset => (
              <button
                key={preset.label}
                onClick={() => applyPreset(preset)}
                className="text-left p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-emerald-500/40 rounded-xl transition-all"
              >
                <div className="text-lg mb-1">{preset.icon}</div>
                <div className="text-sm font-semibold text-white mb-1">{preset.label}</div>
                <div className="text-xs text-slate-500 mb-2">{preset.hint}</div>
                <a
                  href={preset.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:underline"
                >
                  {preset.helpLabel}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── SMTP card ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">SMTP Configuration</h2>
            <span className="text-xs text-slate-500">(outbound sending)</span>
          </div>
          {smtpConfigured && (
            <span className={`text-xs px-2 py-0.5 rounded-full border ${
              config.smtp_verified
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}>
              {config.smtp_verified ? 'Verified' : 'Unverified'}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <TextField
            label="From Name"
            value={config.smtp_from_name}
            onChange={v => setConfig(prev => ({ ...prev, smtp_from_name: v }))}
            placeholder="Sunrise Travels"
          />
          <TextField
            label="From Email"
            value={config.smtp_from_email}
            onChange={v => setConfig(prev => ({ ...prev, smtp_from_email: v }))}
            placeholder="hello@youragency.com"
            type="email"
          />
          <TextField
            label="SMTP Host"
            value={config.smtp_host}
            onChange={v => setConfig(prev => ({ ...prev, smtp_host: v }))}
            placeholder="smtp.gmail.com"
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Port"
              value={config.smtp_port}
              onChange={v => setConfig(prev => ({ ...prev, smtp_port: parseInt(v) || 587 }))}
              placeholder="587"
              type="number"
            />
            <div className="flex flex-col justify-end pb-0.5">
              <Toggle
                label="Use TLS"
                description="Recommended"
                checked={config.smtp_use_tls}
                onChange={v => setConfig(prev => ({ ...prev, smtp_use_tls: v }))}
              />
            </div>
          </div>
          <TextField
            label="Username"
            value={config.smtp_username}
            onChange={v => setConfig(prev => ({ ...prev, smtp_username: v }))}
            placeholder="you@gmail.com"
          />
          <PasswordField
            label="Password / App Password"
            value={config.smtp_password}
            onChange={v => setConfig(prev => ({ ...prev, smtp_password: v }))}
            placeholder={isConfigured ? MASK : 'Enter password'}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleTestSmtp}
            disabled={testingSmtp || !smtpConfigured}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {testingSmtp ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Server className="w-3.5 h-3.5" />}
            Test Connection
          </button>

          {smtpTest && (
            <div className={`flex items-center gap-1.5 text-sm ${smtpTest.success ? 'text-emerald-400' : 'text-red-400'}`}>
              {smtpTest.success ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Connected
                  {smtpTest.latency_ms !== undefined && (
                    <span className="text-slate-500 text-xs">({smtpTest.latency_ms}ms)</span>
                  )}
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  <span className="max-w-xs truncate">{smtpTest.error}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── IMAP card ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-white">IMAP Configuration</h2>
            <span className="text-xs text-slate-500">(reply ingestion)</span>
          </div>
          {imapConfigured && (
            <span className={`text-xs px-2 py-0.5 rounded-full border ${
              config.imap_verified
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}>
              {config.imap_verified ? 'Verified' : 'Unverified'}
            </span>
          )}
        </div>

        <div className="mb-4 flex items-start gap-2 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
          <Info className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-400">
            When a client replies to a quotation email, NAMA polls this inbox and automatically
            threads the reply back to the quotation in your CRM.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <TextField
            label="IMAP Host"
            value={config.imap_host}
            onChange={v => setConfig(prev => ({ ...prev, imap_host: v }))}
            placeholder="imap.gmail.com"
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Port"
              value={config.imap_port}
              onChange={v => setConfig(prev => ({ ...prev, imap_port: parseInt(v) || 993 }))}
              placeholder="993"
              type="number"
            />
            <div className="flex flex-col justify-end pb-0.5">
              <Toggle
                label="Use SSL"
                description="Recommended"
                checked={config.imap_use_ssl}
                onChange={v => setConfig(prev => ({ ...prev, imap_use_ssl: v }))}
              />
            </div>
          </div>
          <TextField
            label="Username"
            value={config.imap_username}
            onChange={v => setConfig(prev => ({ ...prev, imap_username: v }))}
            placeholder="you@gmail.com"
          />
          <PasswordField
            label="Password / App Password"
            value={config.imap_password}
            onChange={v => setConfig(prev => ({ ...prev, imap_password: v }))}
            placeholder={isConfigured ? MASK : 'Enter password'}
          />
          <TextField
            label="Mailbox Folder"
            value={config.imap_folder}
            onChange={v => setConfig(prev => ({ ...prev, imap_folder: v }))}
            placeholder="INBOX"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleTestImap}
            disabled={testingImap || !imapConfigured}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {testingImap ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Server className="w-3.5 h-3.5" />}
            Test Connection
          </button>

          <button
            onClick={handlePollReplies}
            disabled={polling || !imapConfigured}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {polling ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Poll Now
          </button>

          {config.last_imap_poll && (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Clock className="w-3 h-3" />
              Last polled {timeAgo(config.last_imap_poll)}
            </span>
          )}

          {imapTest && (
            <div className={`flex items-center gap-1.5 text-sm ${imapTest.success ? 'text-emerald-400' : 'text-red-400'}`}>
              {imapTest.success ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Connected
                  {imapTest.message_count !== undefined && (
                    <span className="text-slate-500 text-xs">
                      ({imapTest.message_count.toLocaleString()} messages in folder)
                    </span>
                  )}
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  <span className="max-w-xs truncate">{imapTest.error}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Poll results */}
        {pollResult && (
          <div className="mt-4 p-3 bg-slate-800 border border-slate-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3 text-sm">
                <span className="text-slate-400">
                  Found <span className="text-white font-medium">{pollResult.replies_found}</span> new messages
                </span>
                <span className="text-emerald-400">
                  <CheckCircle className="w-3.5 h-3.5 inline mr-1" />
                  {pollResult.matched} threaded
                </span>
                {pollResult.unmatched > 0 && (
                  <span className="text-slate-500">{pollResult.unmatched} unmatched</span>
                )}
              </div>
              {pollResult.replies.length > 0 && (
                <button
                  onClick={() => setShowPollDetails(s => !s)}
                  className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
                >
                  {showPollDetails ? 'Hide' : 'Show'} details
                  {showPollDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
            </div>

            {showPollDetails && pollResult.replies.length > 0 && (
              <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
                {pollResult.replies.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs py-1.5 border-b border-slate-700 last:border-0">
                    <span className={`mt-0.5 ${r.threaded ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {r.threaded ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    </span>
                    <div className="min-w-0">
                      <div className="text-slate-300 truncate">{r.subject || '(no subject)'}</div>
                      <div className="text-slate-500">
                        from {r.from_email}
                        {r.quotation_id && (
                          <span className="ml-2 text-emerald-400">→ Quotation #{r.quotation_id}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {pollResult.replies_found === 0 && (
              <div className="text-xs text-slate-500 mt-1">No new messages in the last 24 hours.</div>
            )}
          </div>
        )}
      </div>

      {/* ── Save button ── */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>

        {saveSuccess && (
          <div className="flex items-center gap-1.5 text-sm text-emerald-400">
            <CheckCircle className="w-4 h-4" />
            Configuration saved — passwords encrypted
          </div>
        )}

        {saveError && (
          <div className="flex items-center gap-1.5 text-sm text-red-400">
            <XCircle className="w-4 h-4" />
            {saveError}
          </div>
        )}
      </div>

      {/* ── Security notice ── */}
      <div className="mt-6 p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
        <div className="flex items-start gap-2">
          <Lock className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
          <div className="text-xs text-slate-500 leading-relaxed">
            <span className="text-slate-400 font-medium">Security: </span>
            Passwords are AES-256 encrypted (Fernet) before storage and never returned in
            API responses. Decryption happens only in-memory at send/poll time.
            NAMA staff cannot read your credentials.
          </div>
        </div>
      </div>
    </div>
  )
}
