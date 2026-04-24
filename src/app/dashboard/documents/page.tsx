"use client";

import React, { useState } from 'react';
import {
  FileText, Receipt, Download, MessageCircle,
  Copy, Eye, Plus, Search, Filter,
  Calendar,
  Plane, Hotel, Shield, X, Check, Upload, Zap,
  FileCheck, FileBadge, FileSpreadsheet, LayoutGrid
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type DocType = 'invoice' | 'voucher' | 'confirmation';
type TabType = 'all' | 'invoice' | 'quotation' | 'voucher' | 'confirmation' | 'insurance';

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

// ─── Seed Document List ───────────────────────────────────────────────────────

interface SeedDoc {
  id: string;
  type: TabType;
  name: string;
  client: string;
  bookingRef: string;
  date: string;
  size: string;
}

const SEED_DOCS: SeedDoc[] = [
  { id: '1', type: 'invoice', name: 'NAMA-INV-2024-0042', client: 'Arjun & Priya Mehta', bookingRef: 'BLI-MEH-2024-07', date: '2024-12-01', size: '142 KB' },
  { id: '2', type: 'quotation', name: 'NAMA-QUO-2024-0031', client: 'Sanjay Gupta', bookingRef: 'EUR-GUP-2024-03', date: '2024-11-28', size: '98 KB' },
  { id: '3', type: 'voucher', name: 'NAMA-VCH-2024-0088', client: 'Arjun Mehta', bookingRef: 'BLI-MEH-2024-07', date: '2024-12-15', size: '76 KB' },
  { id: '4', type: 'confirmation', name: 'NAMA-BKG-2024-0042', client: 'Arjun & Priya Mehta', bookingRef: 'BLI-MEH-2024-07', date: '2024-12-10', size: '124 KB' },
  { id: '5', type: 'invoice', name: 'NAMA-INV-2024-0039', client: 'Rohan & Anika Shah', bookingRef: 'MLD-SHA-2024-02', date: '2024-11-20', size: '138 KB' },
  { id: '6', type: 'quotation', name: 'NAMA-QUO-2024-0028', client: 'Vikram Nair', bookingRef: 'SIN-NAI-2024-05', date: '2024-11-15', size: '91 KB' },
  { id: '7', type: 'insurance', name: 'NAMA-INS-2024-0012', client: 'Arjun & Priya Mehta', bookingRef: 'BLI-MEH-2024-07', date: '2024-12-05', size: '54 KB' },
  { id: '8', type: 'voucher', name: 'NAMA-VCH-2024-0081', client: 'Rohan Shah', bookingRef: 'MLD-SHA-2024-02', date: '2024-11-22', size: '68 KB' },
];

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
    ${data.notes ? `<div style="background:#f8fafc;border-left:3px solid #14B8A6;padding:12px 16px;border-radius:0 6px 6px 0;font-size:13px;color:#475569;margin-bottom:32px;"><strong>Notes:</strong> ${data.notes}</div>` : ''}
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
    <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);color:#fff;padding:40px;position:relative;overflow:hidden;">
      <div style="position:absolute;top:-20px;right:-20px;width:200px;height:200px;background:rgba(20,184,166,0.1);border-radius:50%;"></div>
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#14B8A6;margin-bottom:8px;">Travel Voucher</div>
      <div style="font-size:32px;font-weight:900;letter-spacing:-1px;">Hotel Booking Confirmation</div>
      <div style="margin-top:8px;color:#94a3b8;font-size:14px;">${data.agencyName} · Ref: ${data.bookingRef}</div>
    </div>
    <div style="padding:36px 40px;">
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
      ${data.specialRequests ? `
      <div style="margin-bottom:28px;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:16px 20px;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#92400e;margin-bottom:6px;">Special Requests</div>
        <div style="font-size:14px;color:#78350f;">${data.specialRequests}</div>
      </div>` : ''}
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
      <div style="background:linear-gradient(135deg,#14B8A6,#0891b2);color:#fff;border-radius:10px;padding:20px 24px;margin-bottom:28px;text-align:center;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;opacity:0.8;margin-bottom:4px;">✓ Booking Confirmed</div>
        <div style="font-size:22px;font-weight:900;">${data.packageName}</div>
        <div style="opacity:0.85;margin-top:4px;">${data.destination} · ${data.travelDate} → ${data.returnDate} · ${data.pax} Pax</div>
      </div>
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
      <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;margin-bottom:28px;font-size:12px;color:#713f12;line-height:1.6;">
        <div style="font-weight:700;margin-bottom:4px;text-transform:uppercase;font-size:11px;letter-spacing:0.5px;">Terms & Conditions</div>
        ${data.terms}
      </div>
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
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#14B8A6] text-white px-4 py-3 rounded-xl shadow-2xl text-sm font-semibold">
      <Check size={15} />
      {msg}
    </div>
  );
}

// ─── Doc Type Badge ───────────────────────────────────────────────────────────

function DocTypeBadge({ type }: { type: TabType }) {
  const map: Record<TabType, { label: string; cls: string }> = {
    all:          { label: 'All', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
    invoice:      { label: 'Invoice', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
    quotation:    { label: 'Quotation', cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
    voucher:      { label: 'Voucher', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
    confirmation: { label: 'Confirmation', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
    insurance:    { label: 'Insurance', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
  };
  const { label, cls } = map[type] ?? map.all;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

// ─── File Type Icon ───────────────────────────────────────────────────────────

function DocIcon({ type }: { type: TabType }) {
  const map: Record<TabType, { icon: React.ElementType; bg: string; fg: string }> = {
    all:          { icon: FileText,        bg: 'bg-slate-100 dark:bg-slate-700',          fg: 'text-slate-500 dark:text-slate-300' },
    invoice:      { icon: Receipt,         bg: 'bg-blue-100 dark:bg-blue-900/40',          fg: 'text-blue-600 dark:text-blue-400' },
    quotation:    { icon: FileSpreadsheet, bg: 'bg-violet-100 dark:bg-violet-900/40',      fg: 'text-violet-600 dark:text-violet-400' },
    voucher:      { icon: Hotel,           bg: 'bg-emerald-100 dark:bg-emerald-900/40',    fg: 'text-emerald-600 dark:text-emerald-400' },
    confirmation: { icon: FileCheck,       bg: 'bg-amber-100 dark:bg-amber-900/40',        fg: 'text-amber-600 dark:text-amber-400' },
    insurance:    { icon: Shield,          bg: 'bg-rose-100 dark:bg-rose-900/40',          fg: 'text-rose-600 dark:text-rose-400' },
  };
  const { icon: Icon, bg, fg } = map[type] ?? map.all;
  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
      <Icon size={18} className={fg} />
    </div>
  );
}

// ─── Document Card ────────────────────────────────────────────────────────────

function DocumentCard({ doc, onGenerate }: { doc: SeedDoc; onGenerate: (type: DocType) => void }) {
  const isGeneratable = doc.type === 'invoice' || doc.type === 'voucher' || doc.type === 'confirmation';

  function handleDownload() {
    if (!isGeneratable) return;
    onGenerate(doc.type as DocType);
  }

  return (
    <div className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-2xl p-4 hover:shadow-md hover:border-[#14B8A6]/30 dark:hover:border-[#14B8A6]/20 transition-all duration-200 group">
      <div className="flex items-start gap-3 mb-3">
        <DocIcon type={doc.type} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">{doc.name}</div>
          <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{doc.client}</div>
        </div>
        <DocTypeBadge type={doc.type} />
      </div>

      <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500 mb-3">
        <span className="flex items-center gap-1">
          <Calendar size={11} />
          {doc.date}
        </span>
        <span className="flex items-center gap-1">
          <FileText size={11} />
          {doc.size}
        </span>
        <span className="flex items-center gap-1 ml-auto">
          <FileBadge size={11} />
          {doc.bookingRef}
        </span>
      </div>

      <div className="flex items-center gap-1 pt-2 border-t border-slate-100 dark:border-white/5">
        <button
          onClick={handleDownload}
          title="Download / Preview"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-[#14B8A6]/10 hover:text-[#14B8A6] dark:hover:text-[#14B8A6] transition-colors"
        >
          <Download size={13} /> Download
        </button>
        <button
          title="Send"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 transition-colors"
        >
          <MessageCircle size={13} /> Send
        </button>
        <button
          onClick={handleDownload}
          title="Preview"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
        >
          <Eye size={13} /> Preview
        </button>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ tab, onGenerate }: { tab: TabType; onGenerate: () => void }) {
  const map: Record<TabType, { icon: React.ElementType; label: string; cta: string }> = {
    all:          { icon: LayoutGrid,      label: 'No documents yet',             cta: 'Generate your first document' },
    invoice:      { icon: Receipt,         label: 'No invoices yet',              cta: 'Create Invoice' },
    quotation:    { icon: FileSpreadsheet, label: 'No quotations yet',            cta: 'Create Quotation' },
    voucher:      { icon: Hotel,           label: 'No vouchers yet',              cta: 'Create Hotel Voucher' },
    confirmation: { icon: FileCheck,       label: 'No confirmations yet',         cta: 'Create Confirmation' },
    insurance:    { icon: Shield,          label: 'No insurance documents yet',   cta: 'Add Insurance Document' },
  };
  const { icon: Icon, label, cta } = map[tab];
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4">
        <Icon size={24} className="text-slate-400 dark:text-slate-500" />
      </div>
      <div className="font-semibold text-slate-600 dark:text-slate-300 mb-1">{label}</div>
      <div className="text-sm text-slate-400 dark:text-slate-500 mb-4">Generate professional documents in seconds</div>
      <button
        onClick={onGenerate}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#14B8A6]/10 text-[#14B8A6] border border-[#14B8A6]/20 text-sm font-semibold hover:bg-[#14B8A6]/20 transition-colors"
      >
        <Plus size={14} /> {cta}
      </button>
    </div>
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

  const inputCls = "w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-sm focus:outline-none focus:border-[#14B8A6] bg-white dark:bg-[#0A0F1E] text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600";
  const sectionCls = "bg-[#F8FAFC] dark:bg-[#0A0F1E] border border-slate-100 dark:border-white/5 rounded-xl p-5";
  const labelCls = "block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1";
  const sectionHeadingCls = "text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4";

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0F1B35]">
      {toast && <Toast msg={toast} onClose={() => setToast('')} />}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/5">
        <div>
          <div className="font-bold text-slate-800 dark:text-slate-100 text-lg">Invoice Generator</div>
          <div className="text-xs text-slate-400 dark:text-slate-500">Fill in the details, then export as PDF or share via WhatsApp</div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleCopyText} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-sm font-semibold transition-colors">
            <Copy size={13} /> Copy
          </button>
          <button onClick={handleShareWhatsApp} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-semibold transition-colors">
            <MessageCircle size={13} /> WhatsApp
          </button>
          <button onClick={handleExportPDF} disabled={pdfLoading} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#14B8A6] hover:bg-[#0d9488] text-white text-sm font-semibold transition-colors disabled:opacity-70">
            <Download size={13} /> {pdfLoading ? 'Opening…' : 'Export PDF'}
          </button>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className={sectionCls}>
          <div className={sectionHeadingCls}>Client Information</div>
          <div className="grid grid-cols-2 gap-4">
            {([
              { label: 'Client Name', key: 'clientName' as const },
              { label: 'Email', key: 'clientEmail' as const },
              { label: 'Phone', key: 'clientPhone' as const },
              { label: 'Address', key: 'clientAddress' as const },
            ] as const).map(({ label, key }) => (
              <div key={key} className={key === 'clientAddress' ? 'col-span-2' : ''}>
                <label className={labelCls}>{label}</label>
                <input value={data[key]} onChange={e => setData(p => ({ ...p, [key]: e.target.value }))} className={inputCls} />
              </div>
            ))}
          </div>
        </div>
        <div className={sectionCls}>
          <div className={sectionHeadingCls}>Invoice Details</div>
          <div className="grid grid-cols-3 gap-4">
            {([
              { label: 'Invoice Number', key: 'invoiceNumber' as const, type: 'text' as const },
              { label: 'Invoice Date', key: 'date' as const, type: 'date' as const },
              { label: 'Due Date', key: 'dueDate' as const, type: 'date' as const },
            ] as const).map(({ label, key, type }) => (
              <div key={key}>
                <label className={labelCls}>{label}</label>
                <input type={type || 'text'} value={data[key]} onChange={e => setData(p => ({ ...p, [key]: e.target.value }))} className={inputCls} />
              </div>
            ))}
          </div>
        </div>
        <div className={sectionCls}>
          <div className="flex items-center justify-between mb-4">
            <div className={sectionHeadingCls.replace('mb-4', '')}>Line Items</div>
            <button onClick={() => setData(p => ({ ...p, items: [...p.items, { description: '', qty: 1, rate: 0, amount: 0 }] }))} className="flex items-center gap-1 text-xs font-semibold text-[#14B8A6] hover:underline">
              <Plus size={12} /> Add Item
            </button>
          </div>
          <div className="space-y-2">
            {data.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <input value={item.description} onChange={e => { const items = [...data.items]; items[idx] = { ...item, description: e.target.value }; setData(p => ({ ...p, items })); }} placeholder="Description" className={`col-span-6 ${inputCls}`} />
                <input type="number" value={item.qty} onChange={e => { const items = [...data.items]; const qty = Number(e.target.value); items[idx] = { ...item, qty, amount: qty * item.rate }; setData(p => ({ ...p, items })); }} className={`col-span-1 text-center ${inputCls}`} />
                <input type="number" value={item.rate} onChange={e => { const items = [...data.items]; const rate = Number(e.target.value); items[idx] = { ...item, rate, amount: item.qty * rate }; setData(p => ({ ...p, items })); }} className={`col-span-2 ${inputCls}`} />
                <div className="col-span-2 text-right text-sm font-semibold text-slate-700 dark:text-slate-300 pr-1">₹{item.amount.toLocaleString('en-IN')}</div>
                <button onClick={() => setData(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))} className="col-span-1 flex justify-center">
                  <X size={14} className="text-slate-400 hover:text-red-500 transition-colors" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10 space-y-1">
            <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
              <span>Subtotal</span><span className="font-semibold">₹{subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400 items-center">
              <span>GST %</span>
              <div className="flex items-center gap-2">
                <input type="number" value={data.taxPercent} onChange={e => setData(p => ({ ...p, taxPercent: Number(e.target.value) }))} className="w-14 px-2 py-1 rounded border border-slate-200 dark:border-white/10 text-sm text-right focus:outline-none focus:border-[#14B8A6] bg-white dark:bg-[#0A0F1E] text-slate-800 dark:text-slate-200" />
                <span className="font-semibold">₹{tax.toLocaleString('en-IN')}</span>
              </div>
            </div>
            <div className="flex justify-between text-base font-bold text-[#14B8A6] pt-1 border-t border-slate-200 dark:border-white/10">
              <span>Total</span><span>₹{total.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
        <div className={sectionCls}>
          <div className={sectionHeadingCls}>Notes / Payment Instructions</div>
          <textarea value={data.notes} onChange={e => setData(p => ({ ...p, notes: e.target.value }))} rows={3} className={`${inputCls} resize-none`} />
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

  const inputCls = "w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-sm focus:outline-none focus:border-[#14B8A6] bg-white dark:bg-[#0A0F1E] text-slate-800 dark:text-slate-200";
  const sectionCls = "bg-[#F8FAFC] dark:bg-[#0A0F1E] border border-slate-100 dark:border-white/5 rounded-xl p-5";
  const labelCls = "block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1";
  const sectionHeadingCls = "text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4";

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
      <label className={labelCls}>{label}</label>
      <input type={type} value={data[key] as string} onChange={e => setData(p => ({ ...p, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))} className={inputCls} />
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0F1B35]">
      {toast && <Toast msg={toast} onClose={() => setToast('')} />}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/5">
        <div>
          <div className="font-bold text-slate-800 dark:text-slate-100 text-lg">Travel Voucher Generator</div>
          <div className="text-xs text-slate-400 dark:text-slate-500">Hotel/service voucher to present at the property</div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleShareWhatsApp} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-semibold transition-colors">
            <MessageCircle size={13} /> WhatsApp
          </button>
          <button onClick={handleExportPDF} disabled={pdfLoading} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#14B8A6] hover:bg-[#0d9488] text-white text-sm font-semibold transition-colors">
            <Download size={13} /> {pdfLoading ? 'Opening…' : 'Export PDF'}
          </button>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className={sectionCls}>
          <div className={sectionHeadingCls}>Guest & Booking</div>
          <div className="grid grid-cols-2 gap-4">
            {field('Guest Name', 'clientName')}
            {field('Voucher Number', 'voucherNumber')}
            {field('Booking Ref', 'bookingRef')}
            {field('Guest Count', 'guestCount', 'number')}
            {field('Destination', 'destination', 'text', 2)}
          </div>
        </div>
        <div className={sectionCls}>
          <div className={sectionHeadingCls}>Hotel Details</div>
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
        <div className={sectionCls}>
          <div className={sectionHeadingCls}>Special Requests</div>
          <textarea value={data.specialRequests} onChange={e => setData(p => ({ ...p, specialRequests: e.target.value }))} rows={3} className={`${inputCls} resize-none`} />
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

  const inputCls = "w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-sm focus:outline-none focus:border-[#14B8A6] bg-white dark:bg-[#0A0F1E] text-slate-800 dark:text-slate-200";
  const sectionCls = "bg-[#F8FAFC] dark:bg-[#0A0F1E] border border-slate-100 dark:border-white/5 rounded-xl p-5";
  const labelCls = "block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1";
  const sectionHeadingCls = "text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4";

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
      <label className={labelCls}>{label}</label>
      <input type={type} value={data[key] as string | number} onChange={e => setData(p => ({ ...p, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))} className={inputCls} />
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0F1B35]">
      {toast && <Toast msg={toast} onClose={() => setToast('')} />}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/5">
        <div>
          <div className="font-bold text-slate-800 dark:text-slate-100 text-lg">Booking Confirmation Letter</div>
          <div className="text-xs text-slate-400 dark:text-slate-500">Professional confirmation with inclusions, payment summary & terms</div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleShareWhatsApp} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-semibold transition-colors">
            <MessageCircle size={13} /> WhatsApp
          </button>
          <button onClick={handleExportPDF} disabled={pdfLoading} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#14B8A6] hover:bg-[#0d9488] text-white text-sm font-semibold transition-colors">
            <Download size={13} /> {pdfLoading ? 'Opening…' : 'Export PDF'}
          </button>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className={sectionCls}>
          <div className={sectionHeadingCls}>Client & Trip Details</div>
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
        <div className={sectionCls}>
          <div className={sectionHeadingCls}>Payment Breakdown</div>
          <div className="grid grid-cols-3 gap-4">
            {sf('Total Amount (₹)', 'totalAmount', 'number')}
            {sf('Amount Paid (₹)', 'amountPaid', 'number')}
            {sf('Balance Due (₹)', 'balanceDue', 'number')}
          </div>
        </div>
        <div className={sectionCls}>
          <div className={sectionHeadingCls}>Inclusions</div>
          <div className="space-y-1 mb-3">
            {data.inclusions.map((inc, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <Check size={12} className="text-green-500 flex-shrink-0" />
                <span className="flex-1">{inc}</span>
                <button onClick={() => setData(p => ({ ...p, inclusions: p.inclusions.filter((_, j) => j !== i) }))} className="text-slate-300 dark:text-slate-600 hover:text-red-400 transition-colors"><X size={12} /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={inclInput} onChange={e => setInclInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && inclInput.trim()) { setData(p => ({ ...p, inclusions: [...p.inclusions, inclInput.trim()] })); setInclInput(''); }}} placeholder="Add inclusion (Enter to add)" className={inputCls} />
            <button onClick={() => { if (inclInput.trim()) { setData(p => ({ ...p, inclusions: [...p.inclusions, inclInput.trim()] })); setInclInput(''); }}} className="px-3 py-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-semibold hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"><Plus size={14} /></button>
          </div>
        </div>
        <div className={sectionCls}>
          <div className={sectionHeadingCls}>Exclusions</div>
          <div className="space-y-1 mb-3">
            {data.exclusions.map((exc, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <X size={12} className="text-red-400 flex-shrink-0" />
                <span className="flex-1">{exc}</span>
                <button onClick={() => setData(p => ({ ...p, exclusions: p.exclusions.filter((_, j) => j !== i) }))} className="text-slate-300 dark:text-slate-600 hover:text-red-400 transition-colors"><X size={12} /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={exclInput} onChange={e => setExclInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && exclInput.trim()) { setData(p => ({ ...p, exclusions: [...p.exclusions, exclInput.trim()] })); setExclInput(''); }}} placeholder="Add exclusion (Enter to add)" className={inputCls} />
            <button onClick={() => { if (exclInput.trim()) { setData(p => ({ ...p, exclusions: [...p.exclusions, exclInput.trim()] })); setExclInput(''); }}} className="px-3 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm font-semibold hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"><Plus size={14} /></button>
          </div>
        </div>
        <div className={sectionCls}>
          <div className={sectionHeadingCls}>Terms & Conditions</div>
          <textarea value={data.terms} onChange={e => setData(p => ({ ...p, terms: e.target.value }))} rows={4} className={`${inputCls} resize-none`} />
        </div>
        <div className={sectionCls}>
          <div className={sectionHeadingCls}>Agency Details</div>
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

const TABS: { key: TabType; label: string }[] = [
  { key: 'all', label: 'All Documents' },
  { key: 'invoice', label: 'Invoices' },
  { key: 'quotation', label: 'Quotations' },
  { key: 'voucher', label: 'Vouchers' },
  { key: 'confirmation', label: 'Confirmations' },
  { key: 'insurance', label: 'Insurance' },
];

export default function DocumentsPage() {
  const [activeDoc, setActiveDoc] = useState<DocType | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');

  const kpis = [
    { label: 'Total Documents', value: SEED_DOCS.length, icon: FileText, color: 'text-[#14B8A6]', bg: 'bg-[#14B8A6]/10 dark:bg-[#14B8A6]/10' },
    { label: 'Invoices', value: SEED_DOCS.filter(d => d.type === 'invoice').length, icon: Receipt, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Quotations', value: SEED_DOCS.filter(d => d.type === 'quotation').length, icon: FileSpreadsheet, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20' },
    { label: 'Vouchers', value: SEED_DOCS.filter(d => d.type === 'voucher').length, icon: Hotel, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  ];

  const filteredDocs = SEED_DOCS.filter(doc => {
    if (activeTab !== 'all' && doc.type !== activeTab) return false;
    if (search && !doc.name.toLowerCase().includes(search.toLowerCase()) && !doc.client.toLowerCase().includes(search.toLowerCase())) return false;
    if (clientFilter && !doc.client.toLowerCase().includes(clientFilter.toLowerCase())) return false;
    if (dateFilter && doc.date < dateFilter) return false;
    return true;
  });

  const QUICK_GEN = [
    { type: 'invoice' as DocType, label: 'Invoice', icon: Receipt, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/40' },
    { type: 'confirmation' as DocType, label: 'Quotation PDF', icon: FileSpreadsheet, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20', hover: 'hover:bg-violet-100 dark:hover:bg-violet-900/40' },
    { type: 'voucher' as DocType, label: 'Hotel Voucher', icon: Hotel, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', hover: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/40' },
    { type: 'confirmation' as DocType, label: 'Flight Confirmation', icon: Plane, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', hover: 'hover:bg-amber-100 dark:hover:bg-amber-900/40' },
  ];

  if (activeDoc) {
    return (
      <div className="h-full flex flex-col bg-[#F8FAFC] dark:bg-[#0A0F1E]">
        {activeDoc === 'invoice' && <InvoiceEditor onClose={() => setActiveDoc(null)} />}
        {activeDoc === 'voucher' && <VoucherEditor onClose={() => setActiveDoc(null)} />}
        {activeDoc === 'confirmation' && <ConfirmationEditor onClose={() => setActiveDoc(null)} />}
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#F8FAFC] dark:bg-[#0A0F1E] p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black text-[#1B2E5E] dark:text-slate-100 tracking-tight">Documents Hub</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Generate professional travel documents — invoices, vouchers, and confirmations — in seconds.</p>
          </div>
          <button
            onClick={() => setActiveDoc('invoice')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1B2E5E] dark:bg-[#14B8A6] hover:bg-[#14265a] dark:hover:bg-[#0d9488] text-white text-sm font-semibold transition-colors shadow-sm"
          >
            <Upload size={15} /> Upload
          </button>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg}`}>
                  <Icon size={16} className={color} />
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium leading-tight">{label}</span>
              </div>
              <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-150 ${
                activeTab === tab.key
                  ? 'bg-[#14B8A6]/10 text-[#14B8A6] border border-[#14B8A6]/20'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search + Filter Bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search documents or clients..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F1B35] text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-[#14B8A6] dark:focus:border-[#14B8A6] transition-colors"
            />
          </div>
          <div className="relative">
            <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F1B35] text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-[#14B8A6] transition-colors"
            />
          </div>
          <div className="relative">
            <Filter size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              value={clientFilter}
              onChange={e => setClientFilter(e.target.value)}
              placeholder="Filter by client..."
              className="pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F1B35] text-sm text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-[#14B8A6] transition-colors w-44"
            />
          </div>
          {(search || dateFilter || clientFilter) && (
            <button
              onClick={() => { setSearch(''); setDateFilter(''); setClientFilter(''); }}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F1B35] transition-colors"
            >
              <X size={13} /> Clear
            </button>
          )}
        </div>

        {/* Document Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.length === 0
            ? <EmptyState tab={activeTab} onGenerate={() => setActiveDoc('invoice')} />
            : filteredDocs.map(doc => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  onGenerate={type => setActiveDoc(type)}
                />
              ))
          }
        </div>

        {/* Quick Generate Section */}
        <div className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#14B8A6]/10 flex items-center justify-center">
              <Zap size={15} className="text-[#14B8A6]" />
            </div>
            <div>
              <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">Generate Document</div>
              <div className="text-xs text-slate-400 dark:text-slate-500">Pick a type to open the editor with pre-filled data</div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {QUICK_GEN.map(({ type, label, icon: Icon, color, bg, hover }) => (
              <button
                key={label}
                onClick={() => setActiveDoc(type)}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border border-slate-100 dark:border-white/5 ${bg} ${hover} transition-colors text-left`}
              >
                <Icon size={16} className={color} />
                <span className={`text-sm font-semibold ${color}`}>{label}</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
