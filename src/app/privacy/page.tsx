'use client'

import Link from 'next/link'

const TEAL = '#14B8A6'
const NAVY = '#0F172A'

interface Section {
  title: string
  content: React.ReactNode
}

function DocSection({ id, title, sections }: {
  id: string
  title: string
  sections: Section[]
}) {
  return (
    <section id={id} className="mb-14 scroll-mt-24">
      <div className="border-l-4 pl-6 mb-6" style={{ borderColor: TEAL }}>
        <h2 className="text-xl font-black text-white mb-1">{title}</h2>
      </div>
      <div className="space-y-6">
        {sections.map((s, i) => (
          <div key={i} className="rounded-xl border border-white/8 p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
            <h3 className="text-sm font-bold text-white mb-2">{s.title}</h3>
            <div className="text-slate-300 text-sm leading-relaxed space-y-2">{s.content}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span style={{ color: TEAL }} className="mt-0.5 flex-shrink-0">▸</span>
      <span>{children}</span>
    </li>
  )
}

function Ul({ items }: { items: (string | React.ReactNode)[] }) {
  return (
    <ul className="space-y-1 mt-1">
      {items.map((item, i) => <Li key={i}>{item}</Li>)}
    </ul>
  )
}

function Pill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border mr-1 mb-1"
          style={{ color: TEAL, borderColor: `${TEAL}40`, backgroundColor: `${TEAL}10` }}>
      {label}
    </span>
  )
}

const toc = [
  { id: 'intro', label: 'Introduction' },
  { id: 'collect', label: 'Data We Collect' },
  { id: 'use', label: 'How We Use Your Data' },
  { id: 'storage', label: 'Storage & Security' },
  { id: 'third-party', label: 'Third-Party Services' },
  { id: 'rights', label: 'Your Rights (GDPR)' },
  { id: 'cookies', label: 'Cookies Policy' },
  { id: 'retention', label: 'Data Retention' },
  { id: 'transfers', label: 'International Transfers' },
  { id: 'children', label: 'Children' },
  { id: 'changes', label: 'Policy Changes' },
  { id: 'contact', label: 'Contact Us' },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: NAVY }}>

      {/* Header */}
      <header
        className="border-b border-white/10 sticky top-0 z-50 backdrop-blur-xl"
        style={{ backgroundColor: 'rgba(15,23,42,0.95)' }}
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm"
              style={{ backgroundColor: TEAL, color: NAVY }}
            >
              N
            </div>
            <span className="font-black text-white text-lg tracking-tight">NAMA OS</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/terms"
              className="text-sm text-slate-400 hover:text-white transition-colors hidden sm:block"
            >
              Terms of Service
            </Link>
            <Link
              href="/login"
              className="text-sm font-bold px-4 py-2 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:border-white/25 transition-all"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="border-b border-white/5" style={{ backgroundColor: 'rgba(20,184,166,0.05)' }}>
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-black uppercase tracking-widest mb-5"
            style={{ color: TEAL, borderColor: `${TEAL}30`, backgroundColor: `${TEAL}10` }}
          >
            Legal · Privacy
          </div>
          <h1 className="text-4xl font-black text-white mb-3">Privacy Policy</h1>
          <p className="text-slate-400 text-base max-w-xl">
            We take your privacy seriously. This policy explains exactly what data NAMA OS collects,
            how it is used, and the controls you have over your information.
          </p>
          <p className="text-slate-500 text-sm mt-3">
            Last updated: <span className="text-slate-400 font-semibold">April 2026</span>
            &nbsp;·&nbsp; Effective: <span className="text-slate-400 font-semibold">April 2026</span>
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 flex gap-12">

        {/* Sidebar TOC */}
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <div className="sticky top-20">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">
              On this page
            </p>
            <nav className="space-y-0.5">
              {toc.map(item => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="block text-sm text-slate-400 hover:text-white py-1.5 px-3 rounded-lg hover:bg-white/5 transition-all"
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="mt-8 pt-6 border-t border-white/10">
              <p className="text-xs text-slate-500 mb-1">Privacy questions?</p>
              <a
                href="mailto:privacy@getnama.app"
                style={{ color: TEAL }}
                className="text-sm font-bold hover:underline"
              >
                privacy@getnama.app
              </a>
            </div>
            <div className="mt-4">
              <Link
                href="/terms"
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                ← View Terms of Service
              </Link>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">

          {/* Introduction */}
          <DocSection id="intro" title="1. Introduction" sections={[
            {
              title: 'Who we are',
              content: (
                <>
                  <p>
                    NAMA OS (&ldquo;NAMA&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) is a SaaS platform for travel businesses, operated by
                    Narayan Mallapur (A 902, Vaishnavi Nakshatra, Tumkur Road, Yeshwantpur, Bengaluru 560 022,
                    Karnataka, India).
                  </p>
                  <p className="mt-2">
                    This Privacy Policy applies to all users of the NAMA OS platform accessible at{' '}
                    <span style={{ color: TEAL }}>getnama.app</span> and any related subdomains or APIs.
                  </p>
                </>
              ),
            },
            {
              title: 'Scope',
              content: (
                <p>
                  This policy covers personal data collected when you register for an account, use the platform,
                  interact with our customer support, or visit our website. It does not cover data practices of
                  third-party services you may connect to NAMA OS.
                </p>
              ),
            },
          ]} />

          {/* Data We Collect */}
          <DocSection id="collect" title="2. Data We Collect" sections={[
            {
              title: 'Account & Identity Information',
              content: (
                <>
                  <p>When you register or manage your account:</p>
                  <Ul items={[
                    'Full name',
                    'Email address',
                    'Phone number',
                    'Company / agency name',
                    'Role within your organisation',
                    'Profile photo (optional)',
                  ]} />
                </>
              ),
            },
            {
              title: 'Business & Travel Data',
              content: (
                <>
                  <p>Data you enter or import while using the platform:</p>
                  <Ul items={[
                    'Customer / traveller names, email addresses, and contact details',
                    'Lead enquiries and communication history',
                    'Itinerary details: destinations, dates, accommodation, transport',
                    'Quotations, invoices, vouchers, and booking documents',
                    'Vendor profiles and contracted rates',
                    'Financial records including payment amounts and status',
                    'Imported CSV files (leads, rate cards)',
                  ]} />
                </>
              ),
            },
            {
              title: 'Usage & Technical Data',
              content: (
                <>
                  <p>Automatically collected when you use the platform:</p>
                  <Ul items={[
                    'IP address and approximate geolocation (country/city)',
                    'Browser type and version',
                    'Device type and operating system',
                    'Pages visited and features used',
                    'Session duration and login timestamps',
                    'Error logs and performance metrics',
                  ]} />
                </>
              ),
            },
            {
              title: 'Communications Data',
              content: (
                <>
                  <p>When you use NAMA OS communication tools:</p>
                  <Ul items={[
                    'Emails sent and received via the platform (SMTP/IMAP)',
                    'WhatsApp messages routed through the platform',
                    'Chat history with NAMA Copilot (AI assistant)',
                    'Support messages sent to our team',
                  ]} />
                </>
              ),
            },
          ]} />

          {/* How We Use Data */}
          <DocSection id="use" title="3. How We Use Your Data" sections={[
            {
              title: 'Providing the Service',
              content: (
                <Ul items={[
                  'Authenticating you and maintaining your session',
                  'Displaying your CRM, leads, itineraries, bookings, and documents',
                  'Running AI-assisted features (lead scoring, itinerary suggestions, copilot)',
                  'Generating PDFs (invoices, quotations, vouchers)',
                  'Processing payments via integrated payment gateways',
                ]} />
              ),
            },
            {
              title: 'Transactional & Service Emails',
              content: (
                <Ul items={[
                  'Account registration confirmation',
                  'Password reset and security alerts',
                  'Onboarding drip sequence (Day 0 welcome, Day 1 tips, Day 3 social proof, Day 7 re-engagement)',
                  'Follow-up reminders generated by automations you configure',
                  'Invoices and quotations sent to your clients on your behalf',
                  'Infrastructure alerts (Sentinel) if you configure thresholds',
                ]} />
              ),
            },
            {
              title: 'Analytics & Platform Improvement',
              content: (
                <Ul items={[
                  'Understanding which features are used most',
                  'Identifying and fixing bugs and performance issues',
                  'Aggregate, anonymised benchmarks for Smart Pricing features',
                  'Improving AI model prompts and outputs (no data is shared with model providers to train public models without consent)',
                ]} />
              ),
            },
            {
              title: 'Legal Basis for Processing (GDPR)',
              content: (
                <>
                  <p>We rely on the following legal bases:</p>
                  <Ul items={[
                    <><strong className="text-white">Contractual necessity</strong> — processing required to deliver the service you subscribed to</>,
                    <><strong className="text-white">Legitimate interests</strong> — security monitoring, fraud prevention, product analytics</>,
                    <><strong className="text-white">Consent</strong> — marketing emails and optional feature usage analytics (you can withdraw at any time)</>,
                    <><strong className="text-white">Legal obligation</strong> — retaining financial records as required by law</>,
                  ]} />
                </>
              ),
            },
          ]} />

          {/* Storage & Security */}
          <DocSection id="storage" title="4. Data Storage & Security" sections={[
            {
              title: 'Where your data is stored',
              content: (
                <>
                  <p>NAMA OS stores all persistent data in:</p>
                  <div className="mt-3 p-4 rounded-lg border border-white/10" style={{ backgroundColor: 'rgba(20,184,166,0.05)' }}>
                    <p className="font-bold text-white mb-1">Neon PostgreSQL</p>
                    <p className="text-slate-400">Serverless PostgreSQL hosted on AWS infrastructure (us-east-1 region). Neon is SOC 2 Type II certified.</p>
                  </div>
                  <p className="mt-3">Application servers run on Railway (United States). The frontend is served via Vercel&apos;s global edge network.</p>
                </>
              ),
            },
            {
              title: 'Encryption at rest',
              content: (
                <Ul items={[
                  'Database storage encrypted with AES-256 at rest (managed by Neon / AWS)',
                  'Sensitive credentials (SMTP/IMAP passwords) are Fernet-encrypted before database storage',
                  'API keys and secrets stored as environment variables, never in source code',
                ]} />
              ),
            },
            {
              title: 'Encryption in transit',
              content: (
                <Ul items={[
                  'All data transmitted over HTTPS (TLS 1.2+)',
                  'HSTS headers enforced on all NAMA OS domains',
                  'Internal service-to-service calls use Railway private networking or HTTPS',
                ]} />
              ),
            },
            {
              title: 'Access controls',
              content: (
                <Ul items={[
                  'Role-based access control (RBAC) with 6 permission tiers: Owner, Org Admin, Sales Manager, Ops Executive, Finance Admin, View Only',
                  'Attribute-based conditions (ABAC): geography, product type, deal size, shift hours',
                  'All API routes require authentication via HttpOnly JWT cookies',
                  'Admin-only features protected by page-level role guards',
                  'Audit logs maintained for permission changes and sensitive operations',
                ]} />
              ),
            },
            {
              title: 'Breach notification',
              content: (
                <p>
                  In the event of a data breach affecting your personal data, we will notify you and, where applicable,
                  the relevant supervisory authority within 72 hours of becoming aware, as required by GDPR.
                </p>
              ),
            },
          ]} />

          {/* Third-Party Services */}
          <DocSection id="third-party" title="5. Third-Party Services" sections={[
            {
              title: 'Services we use and what data they receive',
              content: (
                <div className="space-y-3 mt-1">
                  {[
                    {
                      name: 'Resend',
                      purpose: 'Transactional email delivery',
                      data: 'Recipient email address, email subject and body',
                      link: 'https://resend.com/privacy',
                    },
                    {
                      name: 'Razorpay',
                      purpose: 'Payment link generation',
                      data: 'Amount, currency, customer name and email for payment link',
                      link: 'https://razorpay.com/privacy/',
                    },
                    {
                      name: 'Railway',
                      purpose: 'Backend application hosting',
                      data: 'All application data passes through Railway servers in the US',
                      link: 'https://railway.app/privacy',
                    },
                    {
                      name: 'Vercel',
                      purpose: 'Frontend hosting and edge delivery',
                      data: 'Request logs, IP addresses, page visit data',
                      link: 'https://vercel.com/legal/privacy-policy',
                    },
                    {
                      name: 'Neon',
                      purpose: 'PostgreSQL database',
                      data: 'All persistent application data',
                      link: 'https://neon.tech/privacy-policy',
                    },
                    {
                      name: 'OpenRouter / Anthropic',
                      purpose: 'AI features (Copilot, lead scoring, config generation)',
                      data: 'Query content sent to LLM (no PII sent unless you include it in prompts)',
                      link: 'https://openrouter.ai/privacy',
                    },
                    {
                      name: 'Meta (WhatsApp / Facebook)',
                      purpose: 'WhatsApp messaging and Facebook Lead Ads integration',
                      data: 'Phone numbers, message content, lead form responses',
                      link: 'https://www.facebook.com/privacy/policy/',
                    },
                    {
                      name: 'Pexels',
                      purpose: 'Stock image search in Content Library',
                      data: 'Search query string',
                      link: 'https://www.pexels.com/privacy-policy/',
                    },
                    {
                      name: 'Sentry',
                      purpose: 'Error monitoring and crash reporting',
                      data: 'Error stack traces, browser/OS metadata (no PII by default)',
                      link: 'https://sentry.io/privacy/',
                    },
                    {
                      name: 'Upstash Redis',
                      purpose: 'Rate limiting across serverless instances',
                      data: 'Hashed IP addresses for rate-limit counters only',
                      link: 'https://upstash.com/privacy',
                    },
                  ].map(svc => (
                    <div key={svc.name} className="flex gap-3">
                      <span style={{ color: TEAL }} className="mt-0.5 flex-shrink-0">▸</span>
                      <div>
                        <span className="font-bold text-white">{svc.name}</span>
                        {' — '}
                        <span className="text-slate-400">{svc.purpose}.</span>
                        {' '}
                        <span className="text-slate-400">Data shared: {svc.data}.</span>
                        {' '}
                        <a href={svc.link} target="_blank" rel="noopener noreferrer"
                           style={{ color: TEAL }} className="text-xs hover:underline">
                          Privacy Policy ↗
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ),
            },
            {
              title: 'No data selling',
              content: (
                <p>
                  We do not sell, rent, or broker your personal data or your customers&apos; data to any third party.
                  Data is shared with the above sub-processors solely to operate the platform on your behalf.
                </p>
              ),
            },
          ]} />

          {/* GDPR Rights */}
          <DocSection id="rights" title="6. Your Rights (GDPR & Applicable Law)" sections={[
            {
              title: 'Rights available to you',
              content: (
                <>
                  <p>
                    If you are located in the EU/EEA, UK, or a jurisdiction with equivalent data protection law,
                    you have the following rights:
                  </p>
                  <div className="mt-3 space-y-3">
                    {[
                      { right: 'Right of Access', desc: 'Request a copy of all personal data we hold about you.' },
                      { right: 'Right to Rectification', desc: 'Request correction of inaccurate or incomplete data.' },
                      { right: 'Right to Erasure ("Right to be Forgotten")', desc: 'Request deletion of your data. We will action this within 30 days and confirm in writing.' },
                      { right: 'Right to Data Portability', desc: 'Receive your data in a structured, machine-readable format (JSON or CSV) so you can transfer it to another service.' },
                      { right: 'Right to Restrict Processing', desc: 'Ask us to pause processing your data in certain circumstances (e.g. while disputing accuracy).' },
                      { right: 'Right to Object', desc: 'Object to processing based on legitimate interests, including profiling.' },
                      { right: 'Right to Withdraw Consent', desc: 'Where processing is based on consent, you may withdraw it at any time without affecting the lawfulness of prior processing.' },
                      { right: 'Right to Lodge a Complaint', desc: 'You may raise a complaint with your local data protection authority (e.g. ICO in the UK, your national DPA in the EU).' },
                    ].map(({ right, desc }) => (
                      <div key={right} className="flex gap-2">
                        <span style={{ color: TEAL }} className="mt-0.5 flex-shrink-0">▸</span>
                        <div>
                          <span className="font-semibold text-white">{right}:</span>
                          {' '}
                          <span className="text-slate-300">{desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ),
            },
            {
              title: 'How to exercise your rights',
              content: (
                <>
                  <p>Email your request to:</p>
                  <div className="mt-2 p-3 rounded-lg border border-white/10 inline-block" style={{ backgroundColor: `${TEAL}10` }}>
                    <a href="mailto:privacy@getnama.app" style={{ color: TEAL }} className="font-bold">
                      privacy@getnama.app
                    </a>
                  </div>
                  <p className="mt-2">
                    We will respond within 30 days. We may ask you to verify your identity before processing the request.
                  </p>
                </>
              ),
            },
          ]} />

          {/* Cookies */}
          <DocSection id="cookies" title="7. Cookies Policy" sections={[
            {
              title: 'Essential cookies (cannot be disabled)',
              content: (
                <>
                  <p>These cookies are required for the platform to function:</p>
                  <div className="mt-3 space-y-2">
                    <div className="p-3 rounded-lg border border-white/8" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                      <div className="flex items-center justify-between mb-1">
                        <code className="text-xs font-mono" style={{ color: TEAL }}>nama_session</code>
                        <Pill label="HttpOnly" />
                      </div>
                      <p className="text-xs text-slate-400">
                        JWT authentication cookie. HttpOnly (not accessible to JavaScript), Secure (HTTPS only),
                        SameSite=Strict. Set server-side via <code className="font-mono">/api/auth/set-cookie</code>.
                        Expires when you sign out or after session timeout.
                      </p>
                    </div>
                    <div className="p-3 rounded-lg border border-white/8" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                      <div className="flex items-center justify-between mb-1">
                        <code className="text-xs font-mono" style={{ color: TEAL }}>nama_demo</code>
                        <Pill label="SameSite=Strict" />
                      </div>
                      <p className="text-xs text-slate-400">
                        Demo mode indicator cookie. Set when you use the &ldquo;Try Demo&rdquo; feature. Acts as a limited
                        read-only Sales Manager session. SameSite=Strict. No personal data stored in this cookie.
                      </p>
                    </div>
                  </div>
                </>
              ),
            },
            {
              title: 'Functional cookies',
              content: (
                <>
                  <p>Store your preferences to improve your experience:</p>
                  <Ul items={[
                    'Currency preference (stored in localStorage, not a cookie)',
                    'Onboarding progress (localStorage key: nama_onboarding_v2)',
                    'Dashboard checklist state (localStorage)',
                    'Product tour completion state (localStorage)',
                  ]} />
                  <p className="mt-2 text-slate-400">
                    These preferences are stored in your browser&apos;s localStorage and are never sent to our servers.
                  </p>
                </>
              ),
            },
            {
              title: 'Analytics & monitoring',
              content: (
                <>
                  <p>
                    We use Sentry for error monitoring. Sentry may store a cookie or fingerprint to correlate
                    error sessions. No advertising or cross-site tracking cookies are used.
                  </p>
                  <p className="mt-2">We do not use Google Analytics, Meta Pixel, or any advertising trackers.</p>
                </>
              ),
            },
            {
              title: 'Managing cookies',
              content: (
                <p>
                  You can control cookies through your browser settings. Disabling the session cookie will prevent
                  you from logging in. Clearing localStorage will reset your preferences and onboarding progress
                  but will not delete any server-side data.
                </p>
              ),
            },
          ]} />

          {/* Data Retention */}
          <DocSection id="retention" title="8. Data Retention" sections={[
            {
              title: 'Active accounts',
              content: (
                <p>
                  Your data is retained for as long as your account remains active or as needed to provide
                  the service. We will not delete your data due to inactivity without prior notice.
                </p>
              ),
            },
            {
              title: 'Deletion on request',
              content: (
                <Ul items={[
                  'Upon a verified deletion request, we will delete your personal data and all associated business data within 30 days',
                  'You will receive written confirmation once deletion is complete',
                  'Backups containing your data are purged on their natural rotation cycle (maximum 30 additional days)',
                ]} />
              ),
            },
            {
              title: 'Legal retention requirements',
              content: (
                <p>
                  Certain financial records (invoices, payment records) may be retained for up to 7 years
                  as required by applicable accounting and tax law, even after account closure. These records
                  will be kept in a restricted archive inaccessible to the service.
                </p>
              ),
            },
            {
              title: 'Automated reminder emails and logs',
              content: (
                <p>
                  Audit logs and automation run logs are retained for 12 months for security and debugging purposes,
                  then automatically purged.
                </p>
              ),
            },
          ]} />

          {/* International Transfers */}
          <DocSection id="transfers" title="9. International Data Transfers" sections={[
            {
              title: 'Where data is processed',
              content: (
                <>
                  <p>
                    NAMA OS is operated from India, with infrastructure hosted in the United States (Railway, Neon, Vercel).
                    If you are located in the EU/EEA or UK, your data will be transferred to and processed in the US.
                  </p>
                  <p className="mt-2">Safeguards in place:</p>
                  <Ul items={[
                    'Sub-processors (Neon, Railway, Vercel) are covered by EU Standard Contractual Clauses (SCCs) in their own DPAs',
                    'All transfers occur over HTTPS/TLS encrypted connections',
                    'We select sub-processors that maintain SOC 2 Type II or equivalent certifications',
                  ]} />
                </>
              ),
            },
          ]} />

          {/* Children */}
          <DocSection id="children" title="10. Children's Privacy" sections={[
            {
              title: 'Age restriction',
              content: (
                <p>
                  NAMA OS is a business platform intended for use by individuals who are at least 18 years of age.
                  We do not knowingly collect personal data from anyone under 18. If you believe a minor has
                  provided us with personal data, please contact{' '}
                  <a href="mailto:privacy@getnama.app" style={{ color: TEAL }}>privacy@getnama.app</a> and
                  we will delete it promptly.
                </p>
              ),
            },
          ]} />

          {/* Policy Changes */}
          <DocSection id="changes" title="11. Changes to This Policy" sections={[
            {
              title: 'How we notify you',
              content: (
                <>
                  <p>
                    We may update this Privacy Policy from time to time. When we make material changes, we will:
                  </p>
                  <Ul items={[
                    'Update the "Last updated" date at the top of this page',
                    'Send an in-app notification and/or email to registered account owners',
                    'Provide at least 14 days\' notice before material changes take effect',
                  ]} />
                  <p className="mt-2">
                    Continued use of NAMA OS after the effective date constitutes acceptance of the revised policy.
                  </p>
                </>
              ),
            },
          ]} />

          {/* Contact */}
          <DocSection id="contact" title="12. Contact Us" sections={[
            {
              title: 'Privacy enquiries & requests',
              content: (
                <>
                  <p>For all privacy-related questions, data access requests, or deletion requests:</p>
                  <div className="mt-3 p-5 rounded-xl border border-white/10" style={{ backgroundColor: 'rgba(20,184,166,0.05)' }}>
                    <p className="font-black text-white text-base mb-3">NAMA OS — Privacy Team</p>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="text-slate-400">Email: </span>
                        <a href="mailto:privacy@getnama.app" style={{ color: TEAL }} className="font-bold hover:underline">
                          privacy@getnama.app
                        </a>
                      </p>
                      <p>
                        <span className="text-slate-400">General: </span>
                        <a href="mailto:hello@getnama.app" style={{ color: TEAL }} className="font-bold hover:underline">
                          hello@getnama.app
                        </a>
                      </p>
                      <p className="text-slate-400 mt-3">
                        Narayan Mallapur<br />
                        A 902, Vaishnavi Nakshatra, Tumkur Road, Yeshwantpur<br />
                        Bengaluru 560 022, Karnataka, India
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-slate-400">
                    We aim to respond to all privacy requests within 5 business days and to resolve them within 30 days.
                  </p>
                </>
              ),
            },
          ]} />

          {/* Footer */}
          <div className="mt-16 pt-8 border-t border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs"
                  style={{ backgroundColor: TEAL, color: NAVY }}
                >
                  N
                </div>
                <span className="font-black text-white">NAMA OS</span>
              </div>
              <p className="text-sm text-slate-500">© 2026 Narayan Mallapur / NAMA AI. All rights reserved.</p>
              <div className="flex items-center gap-4">
                <Link href="/terms" className="text-sm text-slate-400 hover:text-white transition-colors">
                  Terms of Service
                </Link>
                <Link href="/register" style={{ color: TEAL }} className="text-sm font-bold hover:underline">
                  ← Back to Sign Up
                </Link>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
