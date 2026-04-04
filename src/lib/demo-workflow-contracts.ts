export type DemoLeadStage = "New" | "Qualified" | "Quoted" | "Follow Up" | "Won";
export type DemoBookingState = "Pending finance" | "Ready for handoff" | "Guest pack released";
export type DemoInvoiceState = "Draft" | "Sent" | "Paid";
export type DemoDownloadState = "Ready" | "Downloaded";
export type DemoTravelerApprovalState = "Awaiting approval" | "Approved for send";
export type DemoTravelerPdfState = "Draft" | "Shared" | "Downloaded";

export type DemoCaseWorkflowContract = {
  slug: string;
  leadStage: DemoLeadStage;
  nextAction: string;
  nextActionAt: string;
  financeStatus: string;
  paymentState: string;
  bookingState: DemoBookingState;
  guestPackState: "Queued" | "Released";
  invoiceState: DemoInvoiceState;
  invoiceDownloadState: DemoDownloadState;
  travelerPdfState: DemoTravelerPdfState;
  travelerApprovalState: DemoTravelerApprovalState;
  lastUpdated: string;
};

export type DemoWorkflowAction =
  | "lead.set-stage"
  | "finance.send-quote"
  | "finance.record-deposit"
  | "booking.release-guest-pack"
  | "artifact.download-invoice"
  | "artifact.mark-invoice-sent"
  | "artifact.mark-invoice-paid"
  | "artifact.download-traveler-pdf"
  | "artifact.approve-traveler-pdf"
  | "artifact.share-traveler-pdf";

export type DemoWorkflowSyncResponse = {
  tenant_name: string;
  source: "local-demo" | "backend-demo";
  cases: Record<string, DemoCaseWorkflowContract>;
};

export type DemoWorkflowUpdatePayload = {
  tenant_name: string;
  slug: string;
  action: DemoWorkflowAction;
  patch: Partial<DemoCaseWorkflowContract>;
};
