import type { ReactNode } from 'react'
import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service | NAMA AI',
  description: 'NAMA AI Terms of Service, Privacy Policy, Cookie Policy, Enterprise SaaS Agreement and Data Processing Agreement.',
}

const TEAL = '#14B8A6'
const NAVY = '#0F172A'

interface Section {
  title: string
  content: ReactNode
}

function DocSection({ id, title, sections, effectiveDate }: {
  id: string
  title: string
  sections: Section[]
  effectiveDate?: string
}) {
  return (
    <section id={id} className="mb-16 scroll-mt-24">
      <div className="border-l-4 pl-6 mb-6" style={{ borderColor: TEAL }}>
        <h2 className="text-2xl font-black text-white mb-1">{title}</h2>
        {effectiveDate && (
          <p className="text-sm text-slate-400">
            Effective Date: {effectiveDate} &nbsp;·&nbsp; Last Updated: {effectiveDate}
          </p>
        )}
      </div>
      <div className="space-y-6">
        {sections.map((s, i) => (
          <div key={i}>
            <h3 className="text-base font-bold text-white mb-2">{s.title}</h3>
            <div className="text-slate-300 text-sm leading-relaxed space-y-2">{s.content}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Li({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2">
      <span style={{ color: TEAL }} className="mt-0.5 flex-shrink-0">▸</span>
      <span>{children}</span>
    </li>
  )
}

function Ul({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1 mt-1">
      {items.map((item, i) => <Li key={i}>{item}</Li>)}
    </ul>
  )
}

export default function TermsPage() {
  const docs = [
    { id: 'tos', label: 'Terms of Service' },
    { id: 'privacy', label: 'Privacy Policy' },
    { id: 'cookies', label: 'Cookie Policy' },
    { id: 'enterprise', label: 'Enterprise SaaS Agreement' },
    { id: 'dpa', label: 'Data Processing Agreement' },
  ]

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: NAVY }}>

      {/* ── Header ── */}
      <header className="border-b border-white/10 sticky top-0 z-50 backdrop-blur-xl"
              style={{ backgroundColor: 'rgba(15,23,42,0.95)' }}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm"
                 style={{ backgroundColor: TEAL, color: NAVY }}>N</div>
            <span className="font-black text-white text-lg tracking-tight">NAMA OS</span>
          </Link>
          <Link href="/login"
                className="text-sm font-bold px-4 py-2 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:border-white/25 transition-all">
            Sign In
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <div className="border-b border-white/5" style={{ backgroundColor: 'rgba(20,184,166,0.05)' }}>
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-black uppercase tracking-widest mb-5"
               style={{ color: TEAL, borderColor: `${TEAL}30`, backgroundColor: `${TEAL}10` }}>
            Legal Documents
          </div>
          <h1 className="text-4xl font-black text-white mb-3">Terms &amp; Policies</h1>
          <p className="text-slate-400 text-base max-w-xl">
            These documents govern your use of NAMA AI. Please read them carefully before using the platform.
          </p>
          <p className="text-slate-500 text-sm mt-2">Last updated: April 17, 2026</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 flex gap-12">

        {/* ── Sidebar TOC ── */}
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <div className="sticky top-20">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Contents</p>
            <nav className="space-y-1">
              {docs.map(d => (
                <a key={d.id} href={`#${d.id}`}
                   className="block text-sm text-slate-400 hover:text-white py-1.5 px-3 rounded-lg hover:bg-white/5 transition-all">
                  {d.label}
                </a>
              ))}
            </nav>
            <div className="mt-8 pt-6 border-t border-white/10">
              <p className="text-xs text-slate-500 mb-1">Questions?</p>
              <a href="mailto:hello@getnama.app" style={{ color: TEAL }}
                 className="text-sm font-bold hover:underline">
                hello@getnama.app
              </a>
            </div>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 min-w-0">

          {/* ── Terms of Service ── */}
          <DocSection id="tos" title="Terms of Service" effectiveDate="April 17, 2026" sections={[
            { title: '1. Acceptance of Terms', content: <p>By accessing or using NAMA AI ("NAMA", "Platform", "Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the platform.</p> },
            { title: '2. Legal Entity', content: <>
              <p>NAMA AI is owned and operated by:</p>
              <div className="mt-2 p-4 rounded-lg border border-white/10 bg-white/3">
                <p className="font-bold text-white">Narayan Mallapur</p>
                <p>A 902, Vaishnavi Nakshatra, Tumkur Road, Yeshwantpur</p>
                <p>Bengaluru 560 022, Karnataka, India</p>
                <p>Email: <a href="mailto:hello@getnama.app" style={{ color: TEAL }}>hello@getnama.app</a></p>
              </div>
            </> },
            { title: '3. Nature of Service', content: <>
              <p>NAMA AI is a SaaS platform for travel businesses, including:</p>
              <Ul items={['CRM and lead management','Itinerary creation','Quotations, invoices, and vouchers','Automation and communication tools','AI-assisted workflows']} />
              <p className="mt-2">NAMA does not provide travel services and does not act as a travel agent.</p>
            </> },
            { title: '4. User Accounts', content: <>
              <p>Users may include owners, administrators, employees, and authorised users of client organisations. You are responsible for:</p>
              <Ul items={['Maintaining account confidentiality','All activities under your account','Ensuring compliance with these Terms']} />
            </> },
            { title: '5. Acceptable Use', content: <>
              <p>You agree not to:</p>
              <Ul items={['Use the platform for unlawful purposes','Misuse or unlawfully process customer data','Send unsolicited or spam communications','Attempt unauthorised access or disrupt services','Copy, modify, reverse engineer, or resell the platform']} />
            </> },
            { title: '6. Subscriptions and Payments', content: <Ul items={['Services are provided on a subscription basis','Fees are billed in advance','Payments are non-refundable unless agreed otherwise','Non-payment may result in suspension or termination','Pricing may change with prior notice']} /> },
            { title: '7. Data Ownership', content: <Ul items={['You retain ownership of all business data','NAMA processes data solely to provide services','No ownership rights are claimed over your data']} /> },
            { title: '8. AI Features', content: <>
              <p>AI-generated outputs may include itineraries, recommendations, or communications. These outputs:</p>
              <Ul items={['Are generated automatically','May not be accurate or complete','Must be reviewed before use']} />
            </> },
            { title: '9. Third-Party Services', content: <>
              <p>The platform may integrate with third-party services. NAMA is not responsible for:</p>
              <Ul items={['Third-party service availability','Third-party data handling practices']} />
            </> },
            { title: '10. Data Hosting', content: <p>Data is hosted on infrastructure located in the United States. By using the platform, you consent to cross-border data transfer.</p> },
            { title: '11. Availability', content: <p>Service availability is not guaranteed. Maintenance, updates, or interruptions may occur.</p> },
            { title: '12. Termination', content: <>
              <p>Access may be suspended or terminated if:</p>
              <Ul items={['Terms are violated','Payments are overdue','Misuse is detected']} />
              <p className="mt-2">You may discontinue use at any time.</p>
            </> },
            { title: '13. Limitation of Liability', content: <>
              <p>To the maximum extent permitted by law:</p>
              <Ul items={['NAMA is not liable for indirect or consequential damages','Liability is limited to fees paid in the previous three months']} />
            </> },
            { title: '14. Indemnity', content: <>
              <p>You agree to indemnify NAMA against claims arising from:</p>
              <Ul items={['Your use of the platform','Your data or business operations']} />
            </> },
            { title: '15. Governing Law', content: <p>These Terms are governed by the laws of India. Jurisdiction: Bengaluru, Karnataka.</p> },
            { title: '16. Updates', content: <p>These Terms may be updated from time to time. Continued use constitutes acceptance.</p> },
            { title: '17. Contact', content: <p>Email: <a href="mailto:hello@getnama.app" style={{ color: TEAL }}>hello@getnama.app</a></p> },
          ]} />

          <div className="my-12 border-t border-white/10" />

          {/* ── Privacy Policy ── */}
          <DocSection id="privacy" title="Privacy Policy" effectiveDate="April 17, 2026" sections={[
            { title: '1. Introduction', content: <p>This Privacy Policy explains how NAMA AI collects, uses, and protects data.</p> },
            { title: '2. Data Collected', content: <>
              <p className="font-semibold text-white mb-1">Account Information</p>
              <Ul items={['Name','Email address','Phone number','Company details']} />
              <p className="font-semibold text-white mb-1 mt-3">Business Data</p>
              <Ul items={['Customer data','Leads and enquiries','Itineraries','Financial documents']} />
              <p className="font-semibold text-white mb-1 mt-3">Usage Data</p>
              <Ul items={['Login activity','Device and browser information','Feature usage']} />
            </> },
            { title: '3. Purpose of Processing', content: <>
              <p>Data is used to:</p>
              <Ul items={['Provide and maintain services','Enable CRM and automation','Generate AI outputs','Improve platform functionality','Ensure security']} />
            </> },
            { title: '4. Legal Basis', content: <>
              <p>Processing is based on:</p>
              <Ul items={['Contractual necessity','Legitimate interests','Consent where applicable']} />
            </> },
            { title: '5. Data Sharing', content: <>
              <p>Data is not sold. Data may be shared with:</p>
              <Ul items={['Cloud infrastructure providers','Communication service providers','Analytics providers','Legal authorities where required']} />
            </> },
            { title: '6. Cross-Border Transfers', content: <p>Data is stored and processed in the United States. Appropriate safeguards are applied.</p> },
            { title: '7. Data Retention', content: <Ul items={['Retained while account is active','Deleted within a reasonable time after account closure unless required by law']} /> },
            { title: '8. User Rights', content: <>
              <p>Users may:</p>
              <Ul items={['Access their data','Request correction','Request deletion','Withdraw consent where applicable']} />
            </> },
            { title: '9. Security', content: <>
              <p>Measures include:</p>
              <Ul items={['Access controls','Encryption where applicable','Secure infrastructure']} />
            </> },
            { title: '10. AI Processing', content: <Ul items={['Data may be processed by AI features','Outputs are generated dynamically','Data is not used to train public AI models without consent']} /> },
            { title: '11. Children', content: <p>The platform is not intended for individuals under 18.</p> },
            { title: '12. Updates', content: <p>This policy may be updated. Continued use indicates acceptance.</p> },
            { title: '13. Contact', content: <p>Email: <a href="mailto:hello@getnama.app" style={{ color: TEAL }}>hello@getnama.app</a></p> },
          ]} />

          <div className="my-12 border-t border-white/10" />

          {/* ── Cookie Policy ── */}
          <DocSection id="cookies" title="Cookie Policy" effectiveDate="April 17, 2026" sections={[
            { title: '1. Overview', content: <p>Cookies are small files stored on your device to enable platform functionality.</p> },
            { title: '2. Types of Cookies', content: <>
              <p className="font-semibold text-white mb-1">Essential Cookies</p>
              <p>Required for login and platform functionality.</p>
              <p className="font-semibold text-white mb-1 mt-3">Functional Cookies</p>
              <p>Store preferences and settings.</p>
              <p className="font-semibold text-white mb-1 mt-3">Analytics Cookies</p>
              <p>Measure usage and performance.</p>
            </> },
            { title: '3. Use of Cookies', content: <>
              <p>Cookies are used to:</p>
              <Ul items={['Maintain sessions','Improve user experience','Analyse platform performance']} />
            </> },
            { title: '4. Managing Cookies', content: <p>You can control cookies through browser settings. Disabling cookies may affect functionality.</p> },
            { title: '5. Third-Party Cookies', content: <p>Third-party services may place cookies. Their policies apply.</p> },
            { title: '6. Contact', content: <p>Email: <a href="mailto:hello@getnama.app" style={{ color: TEAL }}>hello@getnama.app</a></p> },
          ]} />

          <div className="my-12 border-t border-white/10" />

          {/* ── Enterprise SaaS Agreement ── */}
          <DocSection id="enterprise" title="Enterprise SaaS Agreement" effectiveDate="April 17, 2026" sections={[
            { title: '1. Parties', content: <p>This Agreement is between Narayan Mallapur (NAMA AI) and the Client Organisation.</p> },
            { title: '2. Scope', content: <p>Provision of NAMA AI SaaS platform including CRM, automation, and AI tools.</p> },
            { title: '3. License', content: <p>A non-exclusive, non-transferable licence is granted for internal business use.</p> },
            { title: '4. Pricing and Payment', content: <Ul items={['Pricing is defined in a separate agreement','Payment terms: Net 15 or Net 30 unless otherwise agreed','Late payments may incur penalties']} /> },
            { title: '5. Data Ownership', content: <Ul items={['Client retains full ownership of data','NAMA acts as data processor']} /> },
            { title: '6. Confidentiality', content: <p>Both parties must protect confidential information.</p> },
            { title: '7. Service Levels', content: <Ul items={['Target uptime: 99% or higher','Critical support response: within 4 hours','Standard support response: within 24 hours']} /> },
            { title: '8. Security', content: <p>Industry-standard safeguards and role-based access controls are implemented.</p> },
            { title: '9. Term and Termination', content: <Ul items={['Minimum term as agreed','Termination permitted for breach or non-payment']} /> },
            { title: '10. Limitation of Liability', content: <p>Liability is limited to fees paid in the previous six months.</p> },
            { title: '11. Governing Law', content: <p>Jurisdiction: Bengaluru, Karnataka, India.</p> },
            { title: '12. Contact', content: <p>Email: <a href="mailto:hello@getnama.app" style={{ color: TEAL }}>hello@getnama.app</a></p> },
          ]} />

          <div className="my-12 border-t border-white/10" />

          {/* ── DPA ── */}
          <DocSection id="dpa" title="Data Processing Agreement (DPA)" effectiveDate="April 17, 2026" sections={[
            { title: '1. Roles', content: <Ul items={['Client: Data Controller','NAMA AI: Data Processor']} /> },
            { title: '2. Subject Matter', content: <p>Processing of personal data for providing SaaS services.</p> },
            { title: '3. Types of Data', content: <Ul items={['Customer data','Contact details','Travel-related data','Business communications']} /> },
            { title: '4. Purpose', content: <p>Data is processed solely to provide NAMA AI services.</p> },
            { title: '5. Processor Obligations', content: <>
              <p>NAMA shall:</p>
              <Ul items={['Process data only on instructions from the client','Ensure confidentiality','Implement security measures','Assist with data subject rights','Notify of data breaches without undue delay']} />
            </> },
            { title: '6. Subprocessors', content: <p>NAMA may use subprocessors such as cloud providers and communication tools. NAMA remains responsible for their compliance.</p> },
            { title: '7. International Transfers', content: <p>Data may be transferred to the United States with safeguards in place.</p> },
            { title: '8. Data Breach', content: <p>NAMA will notify the client promptly upon becoming aware of a breach.</p> },
            { title: '9. Data Deletion', content: <p>Upon termination, data will be deleted within a reasonable timeframe unless legally required.</p> },
            { title: '10. Audit Rights', content: <p>Clients may request reasonable information regarding data protection practices.</p> },
            { title: '11. Governing Law', content: <p>Bengaluru, Karnataka, India.</p> },
            { title: '12. Contact', content: <p>Email: <a href="mailto:hello@getnama.app" style={{ color: TEAL }}>hello@getnama.app</a></p> },
          ]} />

          {/* ── Footer ── */}
          <div className="mt-16 pt-8 border-t border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs"
                     style={{ backgroundColor: TEAL, color: NAVY }}>N</div>
                <span className="font-black text-white">NAMA OS</span>
              </div>
              <p className="text-sm text-slate-500">© 2026 Narayan Mallapur / NAMA AI. All rights reserved.</p>
              <Link href="/register" style={{ color: TEAL }} className="text-sm font-bold hover:underline">
                ← Back to Sign Up
              </Link>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
