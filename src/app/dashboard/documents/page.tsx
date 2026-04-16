"use client";

import React, { useState } from 'react';
import {
  FileText, Receipt, Ticket, CheckSquare, Download, MessageCircle,
  Copy, Eye, Plus, ChevronDown, ChevronUp, Search, Filter,
  User, Phone, Mail, MapPin, Calendar, DollarSign, Hash,
  Plane, Hotel, Car, Utensils, Star, Building, Globe, X, Check
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type DocType = 'invoice' | 'voucher' | 'confirmation';

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  items: { description: string; qty: number; rate: number; amount: number }[];
  notes: string;
  taxPercent: number;
  agencyName: string;
  agencyGST: string;
}

interface VoucherData {
  voucherNumber: string;
  bookingRef: string;
  clientName: string;
  destination: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  hotelName: string;
  hotelAddress: string;
  roomType: string;
  mealPlan: string;
  guestCount: number;
  specialRequests: string;
  vendorContact: string;
  agencyName: string;
}

interface ConfirmationData {
  bookingRef: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  destination: string;
  travelDate: string;
  returnDate: string;
  pax: number;
  packageName: string;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  inclusions: string[];
  exclusions: string[];
  terms: string;
  agencyName: string;
  agentName: string;
}

// ─── Seed Data ─────────────────────────────────────────────────────────────────

const SEED_INVOICE: InvoiceData = {
  invoiceNumber: 'NAMA-INV-2024-0042',
  date: new Date().toISOString().split('T')[0],
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  clientName: 'Arjun & Priya Mehta',
  clientEmail: 'arjun.mehta@email.com',
  clientPhone: '+91 98765 43210',
  clientAddress: 'Flat 4B, Sunshine Heights, Andheri West, Mumbai 400053',
  items: [
    { description: 'Bali Honeymoon Package — 7N/8D (2 Pax)', qty: 1, rate: 185000, amount: 185000 },
    { description: 'Return Airfare — Mumbai to Bali (IndiGo)', qty: 2, rate: 18500, amount: 37000 },
    { description: 'Airport Transfers (Private AC)', qty: 4, rate: 1500, amount: 6000 },
    { description: 'Romantic Dinner at Jimbaran Bay', qty: 1, rate: 8000, amount: 8000 },
  ],
  notes: 'Payment due within 7 days. 30% advance required to confirm booking. Balance due 15 days before travel.',
  taxPercent: 5,
  agencyName: 'NAMA Travel DMC',
  agencyGST: '27ABCDE1234F1Z5',
};

const SEED_VOUCHER: VoucherData = {
  voucherNumber: 'NAMA-VCH-2024-0088',
  bookingRef: 'BLI-MEH-2024-07',
  clientName: 'Arjun Mehta',
  destination: 'Bali, Indonesia',
  checkIn: '2024-12-22',
  checkOut: '2024-12-29',
  nights: 7,
  hotelName: 'The Layar — Private Villas',
  hotelAddress: 'Jl. Laksmana No.77, Seminyak, Bali 80361',
  roomType: 'One-Bedroom Private Pool Villa',
  mealPlan: 'Daily Breakfast + 2 Candlelight Dinners',
  guestCount: 2,
  specialRequests: 'Honeymoon setup — rose petals, sparkling wine, turndown service. Late checkout 14:00.',
  vendorContact: '+62 361 737 798',
  agencyName: 'NAMA Travel DMC',
};

const SEED_CONFIRMATION: ConfirmationData = {
  bookingRef: 'NAMA-BKG-2024-0042',
  clientName: 'Arjun & Priya Mehta',
  clientEmail: 'arjun.mehta@email.com',
  clientPhone: '+91 98765 43210',
  destination: 'Bali, Indonesia',
  travelDate: '2024-12-22',
  returnDate: '2024-12-29',
  pax: 2,
  packageName: 'Bali Honeymoon Deluxe — 7N/8D',
  totalAmount: 248000,
  amountPaid: 74400,
  balanceDue: 173600,
  inclusions: [
    '7 nights at The Layar Private Villas (Pool Villa)',
    'Daily breakfast for 2 guests',
    '2 Romantic candlelight dinners',
    'Return airport transfers (private AC vehicle)',
    'Jimbaran Bay sunset dinner experience',
    'Uluwatu Temple sunset tour with Kecak dance',
    'Ubud cooking class & rice terrace walk',
    'Snorkeling at Nusa Penida (group tour)',
    '24/7 NAMA travel support',
  ],
  exclusions: [
    'International airfare (quoted separately)',
    'Bali tourism tax (IDR 150,000/person)',
    'Travel insurance',
    'Personal expenses & shopping',
    'Visa on arrival (USD 35/person)',
  ],
  terms: 'Booking is confirmed upon receipt of 30% advance payment. Full balance due 15 days prior to departure. Cancellation within 30 days: 50% penalty. Within 15 days: 75% penalty. No-show: 100% penalty. NAMA Travel DMC acts as an agent and is not liable for force majeure events.',
  agencyName: 'NAMA Travel DMC',
  agentName: 'Prateek Mehta',
};

// ─── PDF Generators ───────────────────────────────────────────────────────────

function generateInvoiceHTML(data: InvoiceData): string {
  const subtotal = data.items.reduce((s, i) => s + i.amount, 0);
  const tax = Math.round(subtotal * data.taxPercent / 100);
  const total = subtotal + tax;

  const rows = data.items.map(item => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;">${item.description}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center;">${item.qty}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;">₹${item.rate.toLocaleString('en-IN')}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;">₹${item.amount.toLocaleString('en-IN')}</td>
    </tr>`).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Invoice ${data.invoiceNumber}</title>
  <style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;background:#fff;}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}</style></head>
  <body style="max-width:800px;margin:0 auto;padding:40px;">
    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px;padding-bottom:24px;border-bottom:3px solid #14B8A6;">
      <div>
        <div style="font-size:28px;font-weight:900;color:#0f172a;letter-spacing:-0.5px;">${data.agencyName}</div>
        <div style="color:#64748b;font-size:13px;margin-top:4px;">GST: ${data.agencyGST}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:32px;font-weight:900;color:#14B8A6;letter-spacing:-1px;">INVOICE</div>
        <div style="color:#64748b;font-size:13px;margin-top:4px;">${data.invoiceNumber}</div>
      </div>
    </div>
    <!-- Meta -->
    <div style="display:flex;gap:40px;margin-bottom:36px;">
      <div style="flex:1;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#94a3b8;margin-bottom:6px;">Bill To</div>
        <div style="font-weight:700;font-size:16px;">${data.clientName}</div>
        <div style="color:#64748b;font-size:13px;margin-top:2px;">${data.clientEmail}</div>
        <div style="color:#64748b;font-size:13px;">${data.clientPhone}</div>
        <div style="color:#64748b;font-size:13px;margin-top:4px;line-height:1.5;">${data.clientAddress}</div>
      </div>
      <div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#94a3b8;margin-bottom:6px;">Invoice Details</div>
        <table style="font-size:13px;border-collapse:collapse;">
          <tr><td style="color:#64748b;padding:2px 16px 2px 0;">Invoice Date</td><td style="font-weight:600;">${data.date}</td></tr>
          <tr><td style="color:#64748b;padding:2px 16px 2px 0;">Due Date</td><td style="font-weight:600;color:#ef4444;">${data.dueDate}</td></tr>
        </table>
      </div>
    </div>
    <!-- Items Table -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <thead>
        <tr style="background:#0f172a;color:#fff;">
          <th style="padding:12px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Description</th>
          <th style="padding:12px;text-align:center;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Qty</th>
          <th style="padding:12px;text-align:right;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Rate</th>
          <th style="padding:12px;text-align:right;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <!-- Totals -->
    <div style="display:flex;justify-content:flex-end;margin-bottom:32px;">
      <table style="font-size:14px;border-collapse:collapse;">
        <tr><td style="padding:6px 24px 6px 0;color:#64748b;">Subtotal</td><td style="text-align:right;font-weight:600;">₹${subtotal.toLocaleString('en-IN')}</td></tr>
        <tr><td style="padding:6px 24px 6px 0;color:#64748b;">GST (${data.taxPercent}%)</td><td style="text-align:right;font-weight:600;">₹${tax.toLocaleString('en-IN')}</td></tr>
        <tr style="background:#14B8A6;color:#fff;">
          <td style="padding:12px 24px 12px 16px;font-weight:800;font-size:16px;border-radius:4px 0 0 4px;">TOTAL DUE</td>
          <td style="padding:12px 16px 12px 0;font-weight:900;font-size:20px;text-align:right;border-radius:0 4px 4px 0;">₹${total.toLocaleString('en-IN')}</td>
        </tr>
      </table>
    </div>
    <!-- Notes -->
    ${data.notes ? `<div style="background:#f8fafc;border-left:3px solid #14B8A6;padding:12px 16px;border-radius:0 6px 6px 0;font-size:13px;color:#475569;margin-bottom:32px;"><strong>Notes:</strong> ${data.notes}</div>` : ''}
    <!-- Footer -->
    <div style="border-top:1px solid #e2e8f0;padding-top:16px;text-align:center;color:#94a3b8;font-size:12px;">
      Thank you for your business • ${data.agencyName} • Generated via NAMA OS
    </div>
  </body></html>`;
}

function generateVoucherHTML(data: VoucherData): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Voucher ${data.voucherNumber}</title>
  <style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;background:#fff;}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}</style></head>
  <body style="max-width:800px;margin:0 auto;padding:0;">
    <!-- Hero Band -->
    <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);color:#fff;padding:40px;position:relative;overflow:hidden;">
      <div style="position:absolute;top:-20px;right:-20px;width:200px;height:200px;background:rgba(20,184,166,0.1);border-radius:50%;"></div>
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#14B8A6;margin-bottom:8px;">Travel Voucher</div>
      <div style="font-size:32px;font-weight:900;letter-spacing:-1px;">Hotel Booking Confirmation</div>
      <div style="margin-top:8px;color:#94a3b8;font-size:14px;">${data.agencyName} · Ref: ${data.bookingRef}</div>
    </div>
    <!-- Body -->
    <div style="padding:36px 40px;">
      <!-- Guest Info -->
      <div style="display:flex;gap:32px;margin-bottom:28px;padding:20px;background:#f8fafc;border-radius:10px;">
        <div style="flex:1;">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#94a3b8;margin-bottom:4px;">Guest Name</div>
          <div style="font-size:20px;font-weight:800;">${data.clientName}</div>
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#94a3b8;margin-bottom:4px;">Voucher No.</div>
          <div style="font-size:15px;font-weight:700;color:#14B8A6;">${data.voucherNumber}</div>
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#94a3b8;margin-bottom:4px;">Guests</div>
          <div style="font-size:20px;font-weight:800;">${data.guestCount} Pax</div>
        </div>
      </div>
      <!-- Stay Details -->
      <div style="margin-bottom:28px;">
        <div style="font-size:13px;font-weight:800;text-transform:uppercase;color:#0f172a;margin-bottom:14px;letter-spacing:0.5px;">Accommodation Details</div>
        <div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
          <div style="padding:18px 20px;border-bottom:1px solid #e2e8f0;">
            <div style="font-size:20px;font-weight:800;">${data.hotelName}</div>
            <div style="color:#64748b;font-size:13px;margin-top:2px;">${data.hotelAddress}</div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0;">
            ${[
              { label: 'Check-In', value: data.checkIn },
              { label: 'Check-Out', value: data.checkOut },
              { label: 'Nights', value: data.nights.toString() },
              { label: 'Room Type', value: data.roomType },
            ].map((item, i) => `
              <div style="padding:16px 20px;${i < 3 ? 'border-right:1px solid #e2e8f0;' : ''}">
                <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#94a3b8;margin-bottom:4px;">${item.label}</div>
                <div style="font-weight:700;font-size:14px;">${item.value}</div>
              </div>`).join('')}
          </div>
          <div style="padding:14px 20px;background:#f8fafc;border-top:1px solid #e2e8f0;">
            <span style="font-size:12px;font-weight:700;text-transform:uppercase;color:#94a3b8;">Meal Plan: </span>
            <span style="font-size:13px;font-weight:600;">${data.mealPlan}</span>
          </div>
        </div>
      </div>
      <!-- Special Requests -->
      ${data.specialRequests ? `
      <div style="margin-bottom:28px;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:16px 20px;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#92400e;margin-bottom:6px;">Special Requests</div>
        <div style="font-size:14px;color:#78350f;">${data.specialRequests}</div>
      </div>` : ''}
      <!-- Vendor Contact -->
      <div style="background:#0f172a;color:#fff;border-radius:10px;padding:18px 24px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#94a3b8;margin-bottom:4px;">Hotel Contact</div>
          <div style="font-size:16px;font-weight:700;">${data.vendorContact}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#94a3b8;margin-bottom:4px;">Issued by</div>
          <div style="font-size:16px;font-weight:700;color:#14B8A6;">${data.agencyName}</div>
        </div>
      </div>
    </div>
    <div style="border-top:1px solid #e2e8f0;padding:16px 40px;text-align:center;color:#94a3b8;font-size:12px;">
      Please present this voucher at check-in • Generated via NAMA OS
    </div>
  </body></html>`;
}

function generateConfirmationHTML(data: ConfirmationData): string {
  const balance = data.totalAmount - data.amountPaid;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Booking Confirmation ${data.bookingRef}</title>
  <style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;background:#fff;}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}</style></head>
  <body style="max-width:800px;margin:0 auto;padding:0;">
    <!-- Header -->
    <div style="background:#0f172a;color:#fff;padding:32px 40px;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="font-size:26px;font-weight:900;letter-spacing:-0.5px;">${data.agencyName}</div>
        <div style="color:#64748b;font-size:13px;margin-top:2px;">Booking Confirmation</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#14B8A6;letter-spacing:1px;">Ref No.</div>
        <div style="font-size:18px;font-weight:800;margin-top:2px;">${data.bookingRef}</div>
      </div>
    </div>
    <div style="padding:36px 40px;">
      <!-- Confirmation Banner -->
      <div style="background:linear-gradient(135deg,#14B8A6,#0891b2);color:#fff;border-radius:10px;padding:20px 24px;margin-bottom:28px;text-align:center;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;opacity:0.8;margin-bottom:4px;">✓ Booking Confirmed</div>
        <div style="font-size:22px;font-weight:900;">${data.packageName}</div>
        <div style="opacity:0.85;margin-top:4px;">${data.destination} · ${data.travelDate} → ${data.returnDate} · ${data.pax} Pax</div>
      </div>
      <!-- Client Info -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px;">
        <div style="background:#f8fafc;border-radius:8px;padding:16px 20px;">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#94a3b8;margin-bottom:8px;">Client Details</div>
          <div style="font-weight:700;font-size:16px;">${data.clientName}</div>
          <div style="color:#64748b;font-size:13px;margin-top:4px;">${data.clientEmail}</div>
          <div style="color:#64748b;font-size:13px;">${data.clientPhone}</div>
        </div>
        <div style="background:#f8fafc;border-radius:8px;padding:16px 20px;">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#94a3b8;margin-bottom:8px;">Payment Summary</div>
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="color:#64748b;font-size:13px;">Total</span><span style="font-weight:700;">₹${data.totalAmount.toLocaleString('en-IN')}</span></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="color:#64748b;font-size:13px;">Paid</span><span style="font-weight:700;color:#16a34a;">₹${data.amountPaid.toLocaleString('en-IN')}</span></div>
          <div style="display:flex;justify-content:space-between;padding-top:6px;border-top:1px solid #e2e8f0;"><span style="font-weight:700;font-size:13px;">Balance Due</span><span style="font-weight:800;color:#dc2626;font-size:15px;">₹${balance.toLocaleString('en-IN')}</span></div>
        </div>
      </div>
      <!-- Inclusions / Exclusions -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px;">
        <div>
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:#16a34a;margin-bottom:10px;">✓ Inclusions</div>
          ${data.inclusions.map(i => `<div style="font-size:13px;padding:4px 0;color:#374151;">• ${i}</div>`).join('')}
        </div>
        <div>
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:#dc2626;margin-bottom:10px;">✕ Exclusions</div>
          ${data.exclusions.map(e => `<div style="font-size:13px;padding:4px 0;color:#374151;">• ${e}</div>`).join('')}
        </div>
      </div>
      <!-- Terms -->
      <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;margin-bottom:28px;font-size:12px;color:#713f12;line-height:1.6;">
        <div style="font-weight:700;margin-bottom:4px;text-transform:uppercase;font-size:11px;letter-spacing:0.5px;">Terms & Conditions</div>
        ${data.terms}
      </div>
      <!-- Agent Sign-off -->
      <div style="border-top:1px solid #e2e8f0;padding-top:20px;display:flex;justify-content:space-between;align-items:center;">
        <div style="color:#94a3b8;font-size:12px;">Issued by ${data.agentName} · ${data.agencyName}</div>
        <div style="text-align:right;">
          <div style="font-size:11px;color:#94a3b8;margin-bottom:4px;">Authorized Signature</div>
          <div style="width:140px;border-bottom:1px solid #94a3b8;height:28px;"></div>
        </div>
      </div>
    </div>
  </body></html>`;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  React.useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#14B8A6] text-white px-4 py-3 rounded-xl shadow-2xl text-sm font-semibold animate-in slide-in-from-bottom-2">
      <Check size={15} />
      {msg}
    </div>
  );
}

// ─── Doc Card ─────────────────────────────────────────────────────────────────

function DocCard({
  icon: Icon,
  color,
  title,
  desc,
  count,
  onClick,
}: {
  icon: React.ElementType;
  color: string;
  title: string;
  desc: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group text-left bg-white rounded-2xl border border-slate-200 p-6 hover:border-[#14B8A6]/50 hover:shadow-lg transition-all duration-200 w-full"
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div className="font-bold text-slate-800 text-lg mb-1">{title}</div>
      <div className="text-slate-500 text-sm mb-4 leading-relaxed">{desc}</div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{count} generated this month</span>
        <span className="text-xs font-semibold text-[#14B8A6] opacity-0 group-hover:opacity-100 transition-opacity">Create →</span>
      </div>
    </button>
  );
}

// ─── Invoice Editor ───────────────────────────────────────────────────────────

function InvoiceEditor({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<InvoiceData>(SEED_INVOICE);
  const [toast, setToast] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);

  const subtotal = data.items.reduce((s, i) => s + i.amount, 0);
  const tax = Math.round(subtotal * data.taxPercent / 100);
  const total = subtotal + tax;

  function handleExportPDF() {
    setPdfLoading(true);
    const html = generateInvoiceHTML(data);
    const win = window.open('', '_blank');
    if (!win) { setPdfLoading(false); return; }
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); setPdfLoading(false); }, 800);
  }

  function handleShareWhatsApp() {
    const msg = `Hello ${data.clientName.split(' ')[0]}! 👋\n\nPlease find your invoice from ${data.agencyName}:\n\nInvoice: ${data.invoiceNumber}\nAmount Due: ₹${total.toLocaleString('en-IN')}\nDue Date: ${data.dueDate}\n\nPlease let me know if you have any questions. Thank you! 🙏`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  }

  function handleCopyText() {
    const text = `Invoice ${data.invoiceNumber} | ${data.clientName} | ₹${total.toLocaleString('en-IN')} | Due: ${data.dueDate}`;
    navigator.clipboard.writeText(text).then(() => setToast('Copied to clipboard'));
  }

  return (
    <div className="flex flex-col h-full">
      {toast && <Toast msg={toast} onClose={() => setToast('')} />}
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div>
          <div className="font-bold text-slate-800 text-lg">Invoice Generator</div>
          <div className="text-xs text-slate-400">Fill in the details → Export PDF or share via WhatsApp</div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleCopyText} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors">
            <Copy size={13} /> Copy
          </button>
          <button onClick={handleShareWhatsApp} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-semibold transition-colors">
            <MessageCircle size={13} /> WhatsApp
          </button>
          <button onClick={handleExportPDF} disabled={pdfLoading} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#14B8A6] hover:bg-[#0d9488] text-white text-sm font-semibold transition-colors disabled:opacity-70">
            <Download size={13} /> {pdfLoading ? 'Opening…' : 'Export PDF'}
          </button>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Client */}
        <div className="bg-slate-50 rounded-xl p-5">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Client Information</div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Client Name', key: 'clientName' as const },
              { label: 'Email', key: 'clientEmail' as const },
              { label: 'Phone', key: 'clientPhone' as const },
              { label: 'Address', key: 'clientAddress' as const },
            ].map(({ label, key }) => (
              <div key={key} className={key === 'clientAddress' ? 'col-span-2' : ''}>
                <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
                <input
                  value={data[key]}
                  onChange={e => setData(p => ({ ...p, [key]: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#14B8A6] bg-white"
                />
              </div>
            ))}
          </div>
        </div>
        {/* Invoice Meta */}
        <div className="bg-slate-50 rounded-xl p-5">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Invoice Details</div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Invoice Number', key: 'invoiceNumber' as const },
              { label: 'Invoice Date', key: 'date' as const, type: 'date' },
              { label: 'Due Date', key: 'dueDate' as const, type: 'date' },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
                <input
                  type={type || 'text'}
                  value={data[key]}
                  onChange={e => setData(p => ({ ...p, [key]: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#14B8A6] bg-white"
                />
              </div>
            ))}
          </div>
        </div>
        {/* Line Items */}
        <div className="bg-slate-50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400">Line Items</div>
            <button
              onClick={() => setData(p => ({ ...p, items: [...p.items, { description: '', qty: 1, rate: 0, amount: 0 }] }))}
              className="flex items-center gap-1 text-xs font-semibold text-[#14B8A6] hover:underline"
            >
              <Plus size={12} /> Add Item
            </button>
          </div>
          <div className="space-y-2">
            {data.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <input
                  value={item.description}
                  onChange={e => {
                    const items = [...data.items];
                    items[idx] = { ...item, description: e.target.value };
                    setData(p => ({ ...p, items }));
                  }}
                  placeholder="Description"
                  className="col-span-6 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#14B8A6] bg-white"
                />
                <input
                  type="number"
                  value={item.qty}
                  onChange={e => {
                    const items = [...data.items];
                    const qty = Number(e.target.value);
                    items[idx] = { ...item, qty, amount: qty * item.rate };
                    setData(p => ({ ...p, items }));
                  }}
                  className="col-span-1 px-2 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#14B8A6] bg-white text-center"
                />
                <input
                  type="number"
                  value={item.rate}
                  onChange={e => {
                    const items = [...data.items];
                    const rate = Number(e.target.value);
                    items[idx] = { ...item, rate, amount: item.qty * rate };
                    setData(p => ({ ...p, items }));
                  }}
                  className="col-span-2 px-2 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#14B8A6] bg-white"
                />
                <div className="col-span-2 text-right text-sm font-semibold text-slate-700 pr-1">
                  ₹{item.amount.toLocaleString('en-IN')}
                </div>
                <button onClick={() => setData(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))} className="col-span-1 flex justify-center">
                  <X size={14} className="text-slate-400 hover:text-red-500 transition-colors" />
                </button>
              </div>
            ))}
          </div>
          {/* Totals */}
          <div className="mt-4 pt-4 border-t border-slate-200 space-y-1">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Subtotal</span><span className="font-semibold">₹{subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-500 items-center">
              <span>GST %</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={data.taxPercent}
                  onChange={e => setData(p => ({ ...p, taxPercent: Number(e.target.value) }))}
                  className="w-14 px-2 py-1 rounded border border-slate-200 text-sm text-right focus:outline-none focus:border-[#14B8A6]"
                />
                <span className="font-semibold">₹{tax.toLocaleString('en-IN')}</span>
              </div>
            </div>
            <div className="flex justify-between text-base font-bold text-[#14B8A6] pt-1 border-t border-slate-200">
              <span>Total</span><span>₹{total.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
        {/* Notes */}
        <div className="bg-slate-50 rounded-xl p-5">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Notes / Payment Instructions</div>
          <textarea
            value={data.notes}
            onChange={e => setData(p => ({ ...p, notes: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#14B8A6] bg-white resize-none"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Voucher Editor ───────────────────────────────────────────────────────────

function VoucherEditor({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<VoucherData>(SEED_VOUCHER);
  const [toast, setToast] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);

  function handleExportPDF() {
    setPdfLoading(true);
    const win = window.open('', '_blank');
    if (!win) { setPdfLoading(false); return; }
    win.document.write(generateVoucherHTML(data));
    win.document.close();
    setTimeout(() => { win.print(); setPdfLoading(false); }, 800);
  }

  function handleShareWhatsApp() {
    const msg = `Hello ${data.clientName.split(' ')[0]}! 🏨\n\nYour hotel voucher is ready:\n\nHotel: ${data.hotelName}\nCheck-In: ${data.checkIn} | Check-Out: ${data.checkOut}\nRoom: ${data.roomType} (${data.nights} nights)\nMeal Plan: ${data.mealPlan}\n\nRef: ${data.voucherNumber}\n\nPlease present this voucher at check-in. Have a wonderful stay! ✨`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  }

  const field = (label: string, key: keyof VoucherData, type = 'text', span = 1) => (
    <div key={key} className={span === 2 ? 'col-span-2' : ''}>
      <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
      <input
        type={type}
        value={data[key] as string}
        onChange={e => setData(p => ({ ...p, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#14B8A6] bg-white"
      />
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {toast && <Toast msg={toast} onClose={() => setToast('')} />}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div>
          <div className="font-bold text-slate-800 text-lg">Travel Voucher Generator</div>
          <div className="text-xs text-slate-400">Hotel/service voucher to present at the property</div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleShareWhatsApp} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-semibold transition-colors">
            <MessageCircle size={13} /> WhatsApp
          </button>
          <button onClick={handleExportPDF} disabled={pdfLoading} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#14B8A6] hover:bg-[#0d9488] text-white text-sm font-semibold transition-colors">
            <Download size={13} /> {pdfLoading ? 'Opening…' : 'Export PDF'}
          </button>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="bg-slate-50 rounded-xl p-5">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Guest & Booking</div>
          <div className="grid grid-cols-2 gap-4">
            {field('Guest Name', 'clientName')}
            {field('Voucher Number', 'voucherNumber')}
            {field('Booking Ref', 'bookingRef')}
            {field('Guest Count', 'guestCount', 'number')}
            {field('Destination', 'destination', 'text', 2)}
          </div>
        </div>
        <div className="bg-slate-50 rounded-xl p-5">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Hotel Details</div>
          <div className="grid grid-cols-2 gap-4">
            {field('Hotel Name', 'hotelName', 'text', 2)}
            {field('Hotel Address', 'hotelAddress', 'text', 2)}
            {field('Check-In', 'checkIn', 'date')}
            {field('Check-Out', 'checkOut', 'date')}
            {field('Nights', 'nights', 'number')}
            {field('Vendor Contact', 'vendorContact')}
            {field('Room Type', 'roomType', 'text', 2)}
            {field('Meal Plan', 'mealPlan', 'text', 2)}
          </div>
        </div>
        <div className="bg-slate-50 rounded-xl p-5">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Special Requests</div>
          <textarea
            value={data.specialRequests}
            onChange={e => setData(p => ({ ...p, specialRequests: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#14B8A6] bg-white resize-none"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Confirmation Editor ──────────────────────────────────────────────────────

function ConfirmationEditor({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<ConfirmationData>(SEED_CONFIRMATION);
  const [toast, setToast] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [inclInput, setInclInput] = useState('');
  const [exclInput, setExclInput] = useState('');

  function handleExportPDF() {
    setPdfLoading(true);
    const win = window.open('', '_blank');
    if (!win) { setPdfLoading(false); return; }
    win.document.write(generateConfirmationHTML(data));
    win.document.close();
    setTimeout(() => { win.print(); setPdfLoading(false); }, 800);
  }

  function handleShareWhatsApp() {
    const msg = `Hello ${data.clientName.split(' ')[0]}! 🎉\n\nYour booking is CONFIRMED!\n\n✅ ${data.packageName}\n📍 ${data.destination}\n📅 ${data.travelDate} → ${data.returnDate}\n👥 ${data.pax} Pax\n\nBooking Ref: ${data.bookingRef}\nTotal: ₹${data.totalAmount.toLocaleString('en-IN')}\nPaid: ₹${data.amountPaid.toLocaleString('en-IN')}\nBalance: ₹${data.balanceDue.toLocaleString('en-IN')}\n\nExcited for your trip! Let me know if you need anything. 🌏`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  }

  const sf = (label: string, key: keyof ConfirmationData, type = 'text') => (
    <div key={key}>
      <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
      <input
        type={type}
        value={data[key] as string | number}
        onChange={e => setData(p => ({ ...p, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#14B8A6] bg-white"
      />
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {toast && <Toast msg={toast} onClose={() => setToast('')} />}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div>
          <div className="font-bold text-slate-800 text-lg">Booking Confirmation Letter</div>
          <div className="text-xs text-slate-400">Professional confirmation with inclusions, payment summary & terms</div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleShareWhatsApp} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-semibold transition-colors">
            <MessageCircle size={13} /> WhatsApp
          </button>
          <button onClick={handleExportPDF} disabled={pdfLoading} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#14B8A6] hover:bg-[#0d9488] text-white text-sm font-semibold transition-colors">
            <Download size={13} /> {pdfLoading ? 'Opening…' : 'Export PDF'}
          </button>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="bg-slate-50 rounded-xl p-5">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Client & Trip Details</div>
          <div className="grid grid-cols-2 gap-4">
            {sf('Client Name', 'clientName')}
            {sf('Email', 'clientEmail')}
            {sf('Phone', 'clientPhone')}
            {sf('Destination', 'destination')}
            {sf('Travel Date', 'travelDate', 'date')}
            {sf('Return Date', 'returnDate', 'date')}
            {sf('No. of Pax', 'pax', 'number')}
            {sf('Booking Ref', 'bookingRef')}
            <div className="col-span-2">{sf('Package Name', 'packageName')}</div>
          </div>
        </div>
        <div className="bg-slate-50 rounded-xl p-5">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Payment Breakdown</div>
          <div className="grid grid-cols-3 gap-4">
            {sf('Total Amount (₹)', 'totalAmount', 'number')}
            {sf('Amount Paid (₹)', 'amountPaid', 'number')}
            {sf('Balance Due (₹)', 'balanceDue', 'number')}
          </div>
        </div>
        {/* Inclusions */}
        <div className="bg-slate-50 rounded-xl p-5">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Inclusions</div>
          <div className="space-y-1 mb-3">
            {data.inclusions.map((inc, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-slate-700">
                <Check size={12} className="text-green-500 flex-shrink-0" />
                <span className="flex-1">{inc}</span>
                <button onClick={() => setData(p => ({ ...p, inclusions: p.inclusions.filter((_, j) => j !== i) }))} className="text-slate-300 hover:text-red-400 transition-colors"><X size={12} /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={inclInput} onChange={e => setInclInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && inclInput.trim()) { setData(p => ({ ...p, inclusions: [...p.inclusions, inclInput.trim()] })); setInclInput(''); }}} placeholder="Add inclusion (Enter to add)" className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#14B8A6] bg-white" />
            <button onClick={() => { if (inclInput.trim()) { setData(p => ({ ...p, inclusions: [...p.inclusions, inclInput.trim()] })); setInclInput(''); }}} className="px-3 py-2 rounded-lg bg-green-100 text-green-700 text-sm font-semibold hover:bg-green-200 transition-colors"><Plus size={14} /></button>
          </div>
        </div>
        {/* Exclusions */}
        <div className="bg-slate-50 rounded-xl p-5">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Exclusions</div>
          <div className="space-y-1 mb-3">
            {data.exclusions.map((exc, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-slate-700">
                <X size={12} className="text-red-400 flex-shrink-0" />
                <span className="flex-1">{exc}</span>
                <button onClick={() => setData(p => ({ ...p, exclusions: p.exclusions.filter((_, j) => j !== i) }))} className="text-slate-300 hover:text-red-400 transition-colors"><X size={12} /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={exclInput} onChange={e => setExclInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && exclInput.trim()) { setData(p => ({ ...p, exclusions: [...p.exclusions, exclInput.trim()] })); setExclInput(''); }}} placeholder="Add exclusion (Enter to add)" className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#14B8A6] bg-white" />
            <button onClick={() => { if (exclInput.trim()) { setData(p => ({ ...p, exclusions: [...p.exclusions, exclInput.trim()] })); setExclInput(''); }}} className="px-3 py-2 rounded-lg bg-red-100 text-red-700 text-sm font-semibold hover:bg-red-200 transition-colors"><Plus size={14} /></button>
          </div>
        </div>
        {/* Terms */}
        <div className="bg-slate-50 rounded-xl p-5">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Terms & Conditions</div>
          <textarea
            value={data.terms}
            onChange={e => setData(p => ({ ...p, terms: e.target.value }))}
            rows={4}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#14B8A6] bg-white resize-none"
          />
        </div>
        <div className="bg-slate-50 rounded-xl p-5">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Agency Details</div>
          <div className="grid grid-cols-2 gap-4">
            {sf('Agency Name', 'agencyName')}
            {sf('Agent Name', 'agentName')}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const [activeDoc, setActiveDoc] = useState<DocType | null>(null);

  const docs = [
    {
      type: 'invoice' as DocType,
      icon: Receipt,
      color: 'bg-[#14B8A6]',
      title: 'Invoice',
      desc: 'Generate GST-compliant invoices with line items, tax calculation, and payment terms.',
      count: 12,
    },
    {
      type: 'voucher' as DocType,
      icon: Ticket,
      color: 'bg-[#8B5CF6]',
      title: 'Travel Voucher',
      desc: 'Create hotel & service vouchers to present at properties — with special requests and vendor contacts.',
      count: 8,
    },
    {
      type: 'confirmation' as DocType,
      icon: CheckSquare,
      color: 'bg-[#F59E0B]',
      title: 'Booking Confirmation',
      desc: 'Professional confirmation letters with inclusions, payment summary, and T&C for clients.',
      count: 15,
    },
  ];

  if (activeDoc) {
    return (
      <div className="h-full flex flex-col">
        {activeDoc === 'invoice' && <InvoiceEditor onClose={() => setActiveDoc(null)} />}
        {activeDoc === 'voucher' && <VoucherEditor onClose={() => setActiveDoc(null)} />}
        {activeDoc === 'confirmation' && <ConfirmationEditor onClose={() => setActiveDoc(null)} />}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-800 mb-1">Documents Hub</h1>
        <p className="text-slate-500 text-sm">Generate professional travel documents — invoices, vouchers, and booking confirmations — in seconds. Export as PDF or share instantly via WhatsApp.</p>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Generated This Month', value: '35', icon: FileText, color: 'text-[#14B8A6]' },
          { label: 'Sent via WhatsApp', value: '28', icon: MessageCircle, color: 'text-green-500' },
          { label: 'Exported as PDF', value: '19', icon: Download, color: 'text-[#8B5CF6]' },
          { label: 'Active Templates', value: '3', icon: Star, color: 'text-[#F59E0B]' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon size={16} className={color} />
              <span className="text-xs text-slate-400 font-medium">{label}</span>
            </div>
            <div className="text-2xl font-black text-slate-800">{value}</div>
          </div>
        ))}
      </div>

      {/* Doc Type Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {docs.map(doc => (
          <DocCard key={doc.type} {...doc} onClick={() => setActiveDoc(doc.type)} />
        ))}
      </div>

      {/* Quick Tips */}
      <div className="bg-gradient-to-r from-[#14B8A6]/5 to-[#8B5CF6]/5 border border-[#14B8A6]/20 rounded-2xl p-6">
        <div className="text-xs font-bold uppercase tracking-widest text-[#14B8A6] mb-3">Pro Tips</div>
        <div className="grid grid-cols-3 gap-6">
          {[
            { icon: '📋', tip: 'All documents are pre-filled with sample data — just update the client details and hit Export.' },
            { icon: '📱', tip: 'WhatsApp share crafts a personalised message summarising the document — client gets context instantly.' },
            { icon: '🖨️', tip: 'Export PDF uses your browser\'s native print dialog — save as PDF from any device, no plugins needed.' },
          ].map(({ icon, tip }) => (
            <div key={tip} className="flex gap-3">
              <span className="text-xl flex-shrink-0">{icon}</span>
              <p className="text-sm text-slate-600 leading-relaxed">{tip}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
