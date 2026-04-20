const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
  BorderStyle, WidthType, ShadingType, VerticalAlign, PageNumber, PageBreak,
  UnderlineType
} = require('/usr/local/lib/node_modules_global/lib/node_modules/docx');

const fs = require('fs');

// Colors
const NAVY = "0F172A";
const TEAL = "14B8A6";
const LIGHT_TEAL = "E0F7F5";
const GRAY = "64748B";
const LIGHT_GRAY = "F1F5F9";
const MID_GRAY = "94A3B8";
const WHITE = "FFFFFF";
const DARK_ROW = "E2E8F0";

// Helper: bold navy heading paragraph
function sectionHeading(text) {
  return new Paragraph({
    spacing: { before: 360, after: 120 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: TEAL, space: 4 }
    },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 36,
        font: "Arial",
        color: NAVY,
      })
    ]
  });
}

function subHeading(text) {
  return new Paragraph({
    spacing: { before: 240, after: 80 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 28,
        font: "Arial",
        color: TEAL,
      })
    ]
  });
}

function goalLine(text) {
  return new Paragraph({
    spacing: { before: 100, after: 120 },
    children: [
      new TextRun({
        text,
        size: 22,
        font: "Arial",
        color: GRAY,
        italics: true,
      })
    ]
  });
}

function featureTitle(text) {
  return new Paragraph({
    spacing: { before: 200, after: 60 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 24,
        font: "Arial",
        color: NAVY,
      })
    ]
  });
}

function bodyPara(text) {
  return new Paragraph({
    spacing: { before: 60, after: 100 },
    children: [
      new TextRun({
        text,
        size: 22,
        font: "Arial",
        color: "1E293B",
      })
    ]
  });
}

function spacer(before = 160) {
  return new Paragraph({ spacing: { before, after: 0 }, children: [new TextRun("")] });
}

// Table helpers
const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" };
const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

function headerCell(text, width, bgColor = NAVY) {
  return new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: bgColor, type: ShadingType.CLEAR },
    margins: { top: 120, bottom: 120, left: 160, right: 160 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      children: [new TextRun({ text, bold: true, size: 22, font: "Arial", color: WHITE })]
    })]
  });
}

function dataCell(text, width, bgColor = WHITE, bold = false, color = "1E293B") {
  return new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: bgColor, type: ShadingType.CLEAR },
    margins: { top: 100, bottom: 100, left: 160, right: 160 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      children: [new TextRun({ text, size: 22, font: "Arial", color, bold })]
    })]
  });
}

// ─── TABLES ───────────────────────────────────────────────────────────────────

// Foundation table (Module | Status) — 2 cols
const foundationRows = [
  ["Lead CRM & Pipeline", "Live"],
  ["Quotation Builder", "Live"],
  ["Itinerary Builder", "Live"],
  ["Bookings Management", "Live"],
  ["Vendor Marketplace", "Live"],
  ["NAMA Copilot (AI, OpenRouter)", "Live"],
  ["Customer Portal", "Live"],
  ["Finance & Documents", "Live"],
  ["AI Lead Scoring (heuristics)", "Live — upgrade in Phase 1"],
  ["Smart Pricing (static)", "Live — upgrade in Phase 2"],
  ["Upstash Redis Rate Limiting", "Live"],
  ["Playwright E2E Tests (27/27)", "Live"],
];

const foundationTable = new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [5400, 3960],
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        headerCell("Module", 5400),
        headerCell("Status", 3960),
      ]
    }),
    ...foundationRows.map((row, i) => new TableRow({
      children: [
        dataCell(row[0], 5400, i % 2 === 0 ? WHITE : LIGHT_GRAY),
        dataCell(row[1], 3960, i % 2 === 0 ? WHITE : LIGHT_GRAY, false, TEAL),
      ]
    }))
  ]
});

// Phase 1 targets table
const phase1TargetsTable = new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [3120, 6240],
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        headerCell("Timeline", 3120),
        headerCell("Target", 6240),
      ]
    }),
    new TableRow({ children: [dataCell("Week 2", 3120, WHITE), dataCell("5 paying customers", 6240, WHITE)] }),
    new TableRow({ children: [dataCell("Month 2", 3120, LIGHT_GRAY), dataCell("20 paying customers", 6240, LIGHT_GRAY)] }),
    new TableRow({ children: [dataCell("Month 3", 3120, WHITE), dataCell("50 paying customers", 6240, WHITE)] }),
  ]
});

// Pricing table
const pricingTable = new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [2600, 2800, 3960],
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        headerCell("Tier", 2600),
        headerCell("Price", 2800),
        headerCell("For", 3960),
      ]
    }),
    new TableRow({ children: [dataCell("Starter", 2600, WHITE, true, NAVY), dataCell("Rs 4,999/month", 2800, WHITE), dataCell("Small agencies, core CRM + quotes", 3960, WHITE)] }),
    new TableRow({ children: [dataCell("Growth", 2600, LIGHT_GRAY, true, NAVY), dataCell("Rs 14,999/month", 2800, LIGHT_GRAY), dataCell("Growing agencies, full AI features", 3960, LIGHT_GRAY)] }),
    new TableRow({ children: [dataCell("Pro", 2600, WHITE, true, NAVY), dataCell("Rs 39,999/month", 2800, WHITE), dataCell("Large DMCs, marketplace + analytics", 3960, WHITE)] }),
    new TableRow({ children: [dataCell("Voice", 2600, LIGHT_GRAY, true, TEAL), dataCell("Rs 4-8/minute", 2800, LIGHT_GRAY), dataCell("Usage-based, all tiers", 3960, LIGHT_GRAY)] }),
  ]
});

// ARR milestones table
const arrTable = new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [3120, 6240],
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        headerCell("Customer Base", 3120),
        headerCell("ARR Milestone", 6240),
      ]
    }),
    new TableRow({ children: [dataCell("50 customers", 3120, WHITE, true, NAVY), dataCell("Rs 25L – 2Cr ARR", 6240, WHITE)] }),
    new TableRow({ children: [dataCell("400 customers", 3120, LIGHT_GRAY, true, NAVY), dataCell("Rs 4-5Cr ARR (break-even)", 6240, LIGHT_GRAY)] }),
    new TableRow({ children: [dataCell("1,200 customers", 3120, WHITE, true, NAVY), dataCell("Rs 15-18Cr ARR", 6240, WHITE)] }),
    new TableRow({ children: [dataCell("3,000 customers", 3120, LIGHT_GRAY, true, NAVY), dataCell("Rs 50Cr ARR", 6240, LIGHT_GRAY)] }),
  ]
});

// ─── BULLET LIST CONFIG ───────────────────────────────────────────────────────
const bulletRef = "main-bullets";

function bullet(text) {
  return new Paragraph({
    numbering: { reference: bulletRef, level: 0 },
    spacing: { before: 80, after: 80 },
    children: [new TextRun({ text, size: 22, font: "Arial", color: "1E293B" })]
  });
}

// ─── COVER PAGE ───────────────────────────────────────────────────────────────
const coverChildren = [
  spacer(2880),
  // NAMA
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 200 },
    children: [new TextRun({ text: "NAMA", bold: true, size: 96, font: "Arial", color: NAVY })]
  }),
  // Teal divider line
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 100, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: TEAL, space: 6 } },
    children: [new TextRun("")]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 120 },
    children: [new TextRun({ text: "Product Roadmap 2026", bold: true, size: 52, font: "Arial", color: NAVY })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 80 },
    children: [new TextRun({ text: "The Operating System for Global Travel", size: 32, font: "Arial", color: TEAL, italics: true })]
  }),
  spacer(600),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 0 },
    children: [new TextRun({ text: "Confidential | Internal Use", size: 22, font: "Arial", color: GRAY })]
  }),
  // Page break to next section
  new Paragraph({ children: [new PageBreak()] }),
];

// ─── SECTION 1 — Strategic Principle ─────────────────────────────────────────
const section1Children = [
  sectionHeading("The Single Guiding Principle"),
  bodyPara("Faster response = higher conversion. NAMA is a revenue engine, not software. Every feature built must directly help a travel agency respond faster or close more bookings. If it does not, it does not get built."),
  spacer(),
];

// ─── SECTION 2 — Foundation ───────────────────────────────────────────────────
const section2Children = [
  sectionHeading("What Is Already Live"),
  bodyPara("The core product is functional and tested. 27/27 end-to-end tests passing. The 7-minute demo (Lead → Quote → Itinerary → Share) works today."),
  spacer(120),
  foundationTable,
  spacer(),
];

// ─── SECTION 3 — Phase 1 ─────────────────────────────────────────────────────
const section3Children = [
  sectionHeading("Phase 1 — Revenue Engine"),
  subHeading("0 to 50 Customers | Now → Month 3"),
  goalLine("Goal: Get to product-market fit. Build only what directly helps close and retain the first 50 agencies."),
  spacer(100),

  featureTitle("1. Self-Serve Onboarding"),
  bodyPara("Agencies sign up, connect WhatsApp or email, and run their first lead in under 10 minutes without founder involvement. Without this, every customer requires manual onboarding."),

  featureTitle("2. AI Lead Scoring v2"),
  bodyPara("Replace the current rule-based heuristics with real LLM scoring via the Copilot. Feed it lead source, budget, response time, and conversation context. Output: \"72% probability of closing in 5 days at Rs 1.2L — call within 2 hours.\" This is the feature that makes NAMA feel intelligent rather than a CRM."),

  featureTitle("3. Copilot Reply Drafting"),
  bodyPara("When an agent opens a lead, Copilot auto-drafts the WhatsApp or email reply based on conversation history. Agent approves with one click. Directly solves the top pain point: over calls, hard to enter details in CRM."),

  featureTitle("4. Founder Revenue Intelligence"),
  bodyPara("The dashboard shows: \"You lost Rs 8.4L this week due to slow response time.\" Specific, actionable, revenue-framed. Makes owners push their teams to use NAMA daily."),

  spacer(120),
  new Paragraph({
    spacing: { before: 120, after: 80 },
    children: [new TextRun({ text: "90-Day Targets", bold: true, size: 24, font: "Arial", color: NAVY })]
  }),
  phase1TargetsTable,
  spacer(),
];

// ─── SECTION 4 — Phase 2 ─────────────────────────────────────────────────────
const section4Children = [
  sectionHeading("Phase 2 — AI Intelligence"),
  subHeading("50 to 400 Customers | Month 3 → Month 6"),
  goalLine("Goal: Once you have 50 customers, you have real data. Now AI gets genuinely smart."),
  spacer(100),

  featureTitle("1. Voice-to-CRM"),
  bodyPara("Agent records a call (with consent). NAMA transcribes it and auto-fills the lead: budget, dates, destination, preferences. No more quick notes then manual CRM entry. This alone justifies the subscription for most agencies."),

  featureTitle("2. DMC Contract Parser"),
  bodyPara("DMC uploads a PDF or Excel contract. NAMA extracts net rates, gross rates, validity dates, and room types automatically into the rate card. Solves the painful contract upload problem for the supply side."),

  featureTitle("3. Smart Pricing v2"),
  bodyPara("Uses actual booking data from the platform. \"Quote Rs 1,38,500. Similar trips converted at 68% at this price point.\" No external data needed — the platform becomes smarter the more it is used."),

  featureTitle("4. Vendor Reliability Scores"),
  bodyPara("Tracks delivery vs promise across all bookings. Flags vendors with over 20% complaint rate. Simple but powerful for agencies choosing suppliers."),

  featureTitle("5. Agent Performance Analytics"),
  bodyPara("Response time by agent, conversion rate by agent, revenue per agent. Makes it easy for founders to coach and retain top performers."),

  spacer(),
];

// ─── SECTION 5 — Phase 3 ─────────────────────────────────────────────────────
const section5Children = [
  sectionHeading("Phase 3 — Marketplace and Voice"),
  subHeading("400 to 3,000 Customers | Month 6 → Month 18"),
  goalLine("Goal: Network effects kick in. Competitors cannot follow."),
  spacer(100),

  featureTitle("1. Live DMC Rate Marketplace"),
  bodyPara("DMCs upload rates directly. Agencies browse and book without email exchanges. AI matches agency enquiry profiles to the right DMC automatically. This is the two-sided marketplace that creates the real moat — it took 6 years to build trust the first time. Now AI accelerates it."),

  featureTitle("2. Agency Trust Scores"),
  bodyPara("DMCs see payment track record and booking volume before accepting an agency. Solves the reliable agencies with assured payments problem from the supply side."),

  featureTitle("3. NAMA Voice (Outbound)"),
  bodyPara("Calls new leads within 30 seconds of enquiry. Structured discovery: budget, dates, preferences. Auto-pushed to CRM. Usage-based pricing at Rs 4-8 per minute — never bundled into subscription to protect margins."),

  featureTitle("4. Lead Discovery AI"),
  bodyPara("Scans social signals for travel intent. Auto-creates scored leads before the agency even knows they exist. Requires the scoring engine to be mature first — hence Phase 3."),

  spacer(),
];

// ─── SECTION 6 — What Not to Build ───────────────────────────────────────────
const section6Children = [
  sectionHeading("Discipline — What We Do Not Build"),
  bodyPara("The stress test scenarios show that overbuilding and uncontrolled AI costs are the two fastest ways to kill the business."),
  spacer(80),
  bullet("White-label platform — not until 400+ customers. Sounds like revenue, is a distraction before PMF."),
  bullet("Multi-language support — not until a non-English market actively requests it with payment."),
  bullet("Unlimited voice plans — voice costs Rs 4-8 per minute. Cap usage to protect margins."),
  bullet("Any feature that does not help an agency respond faster or close more bookings."),
  spacer(),
];

// ─── SECTION 7 — Revenue Model ───────────────────────────────────────────────
const section7Children = [
  sectionHeading("Pricing and Revenue"),
  spacer(80),
  new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [new TextRun({ text: "Subscription Tiers", bold: true, size: 24, font: "Arial", color: NAVY })]
  }),
  pricingTable,
  spacer(200),
  new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [new TextRun({ text: "ARR Milestones", bold: true, size: 24, font: "Arial", color: NAVY })]
  }),
  arrTable,
  spacer(),
];

// ─── SECTION 8 — The Real Moat ───────────────────────────────────────────────
const section8Children = [
  sectionHeading("The Unfair Advantage"),
  bodyPara("Most travel tools store data and help execute. NAMA predicts, decides, and acts. The real moat is not the AI features themselves — any competitor can copy features. The moat is the proprietary dataset built from thousands of bookings, quotes, and outcomes across hundreds of agencies. Every booking makes the pricing engine smarter. Every lead makes the scoring engine more accurate. Every vendor interaction makes the reliability scores more precise. This compounds over time in a way no new entrant can replicate."),
  spacer(160),
  new Paragraph({
    spacing: { before: 120, after: 120 },
    children: [
      new TextRun({
        text: "Built by someone who already did this once with 1,600 companies across 51 countries — and is doing it again with AI.",
        bold: true,
        size: 24,
        font: "Arial",
        color: NAVY,
      })
    ]
  }),
];

// ─── ALL CONTENT ──────────────────────────────────────────────────────────────
const allContent = [
  ...coverChildren,
  ...section1Children,
  ...section2Children,
  ...section3Children,
  ...section4Children,
  ...section5Children,
  ...section6Children,
  ...section7Children,
  ...section8Children,
];

// ─── DOCUMENT ─────────────────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [
      {
        reference: bulletRef,
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: "\u2022",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      }
    ]
  },
  styles: {
    default: {
      document: {
        run: { font: "Arial", size: 22 }
      }
    }
  },
  sections: [
    // Cover section — no header
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "Page ", size: 18, font: "Arial", color: MID_GRAY }),
              new TextRun({ children: [PageNumber.CURRENT], size: 18, font: "Arial", color: MID_GRAY }),
            ]
          })]
        })
      },
      children: coverChildren.slice(0, coverChildren.length - 1), // exclude PageBreak para — handle via sections
    },
    // Main content section — with header
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0", space: 4 } },
              children: [
                new TextRun({ text: "NAMA", bold: true, size: 20, font: "Arial", color: NAVY }),
                new TextRun({ text: "  —  Confidential", size: 20, font: "Arial", color: GRAY }),
              ],
              tabStops: [{ type: "right", position: 9360 }],
            })
          ]
        })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "Page ", size: 18, font: "Arial", color: MID_GRAY }),
              new TextRun({ children: [PageNumber.CURRENT], size: 18, font: "Arial", color: MID_GRAY }),
            ]
          })]
        })
      },
      children: [
        ...section1Children,
        ...section2Children,
        ...section3Children,
        ...section4Children,
        ...section5Children,
        ...section6Children,
        ...section7Children,
        ...section8Children,
      ]
    }
  ]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('/sessions/stoic-bold-planck/mnt/nama-frontend/NAMA_Product_Roadmap_2026.docx', buffer);
  console.log('Document created successfully!');
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
