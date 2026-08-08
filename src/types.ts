export type ExtractionStatus = 'Completed' | 'Pending' | 'Failed';
export type MatchStatus = '3-Way Matched' | 'Price Discrepancy' | 'Qty Mismatch' | 'Pending Match' | 'Flagged - Quantity Mismatch' | 'Ready for Payment - No Issues' | string;
export type HumanReviewStatus = 'Verified' | 'Pending Review' | 'Flagged' | 'Completed';

export type PaymentStatus = 'Paid' | 'Payment On Hold' | 'Pending';

export type PaymentPriority = 'Urgent' | 'High' | 'Medium' | 'Low';

export type DuplicateCheckStatus = 
  | 'Possible Duplicate'
  | 'No Duplicate Found'
  | 'No Duplicate' 
  | 'Potential Duplicate (Same Inv #)' 
  | 'Potential Duplicate (Same Amt & Supplier)' 
  | 'Confirmed Unique';

export type PaymentMethod = 'Bank Transfer' | 'GIRO' | 'FAST' | 'Cheque' | 'Telegraphic Transfer' | 'N/A';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

export interface MasterLedgerRow {
  id: string;
  
  // Column A: Supplier Name (Read Only)
  supplierName: string;
  
  // Column B: Invoice Number (Read Only)
  invoiceNumber: string;
  
  // Column C: PO Reference (Read Only)
  poReference: string;
  
  // Column D: Invoice Date (Read Only)
  invoiceDate: string;
  
  // Column E: Due Date (Read Only)
  dueDate: string;
  
  // Column F: Description of Goods (Read Only)
  description: string;
  
  // Column G: Quantity (Read Only)
  quantity: number;
  
  // Column H: Unit Price (Read Only)
  unitPrice: number;
  
  // Column I: Total Amount (Read Only)
  totalAmount: number;
  
  // Column J: Extraction Status (Read Only)
  extractionStatus: ExtractionStatus;
  
  // Column K: Match Status (Read Only)
  matchStatus: MatchStatus;
  
  // Column M: Human Review (Read Only)
  humanReview: HumanReviewStatus;
  
  // Column N: Confidence Level (Read Only)
  confidenceLevel: number; // e.g., 98 for 98%
  
  // Column O: Bank Account (Read Only)
  bankAccount: string;
  
  // --- MANAGED BY THIS APPLICATION ---
  // Column L: Payment Status
  paymentStatus: PaymentStatus;
  
  // Column P: Payment Date
  paymentDate: string;
  
  // Column Q: Payment Method
  paymentMethod: PaymentMethod;
  
  // Column R: Approved By
  approvedBy: string;
  
  // Column S: Payment Priority
  paymentPriority: PaymentPriority;
  
  // Column T: Duplicate Check
  duplicateCheck: DuplicateCheckStatus;

  // Internal application metadata
  auditTrail: AuditLogEntry[];
  notes?: string;
  discountTerms?: string; // e.g. "2% 10 net 30"
}

export interface RecommendationBatch {
  id: string;
  createdDate: string;
  invoices: MasterLedgerRow[];
  totalAmount: number;
  urgentCount: number;
  highCount: number;
  aiAdvice: string;
  status: 'Pending Madam Lim Approval' | 'Approved' | 'Partially Approved' | 'Rejected';
}

export interface UserRole {
  name: string;
  role: 'Accounts Payable Specialist' | 'Madam Lim (Managing Director)';
  isMadamLim: boolean;
}
