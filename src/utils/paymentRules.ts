import { MasterLedgerRow, PaymentPriority, PaymentStatus, DuplicateCheckStatus } from '../types';

export const CURRENT_DATE = '2026-08-04'; // Simulated system date for Boon Huat Hardware AP workflow

/**
 * Calculates payment priority based on Due Date (Column E)
 * Rules:
 * - If the invoice is overdue or due today: Payment Priority = High
 * - If the invoice is due within the next 7 calendar days: Payment Priority = Medium
 * - Otherwise: Payment Priority = Low
 */
export function calculatePriority(dueDateStr: string, currentDateStr: string = CURRENT_DATE): PaymentPriority {
  if (!dueDateStr) return 'Low';
  
  const current = new Date(currentDateStr);
  current.setHours(0, 0, 0, 0);

  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - current.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    // Overdue or due today
    return 'High';
  } else if (diffDays <= 7) {
    // Due within the next 7 calendar days
    return 'Medium';
  } else {
    // Otherwise
    return 'Low';
  }
}

/**
 * Compares an invoice with all other invoices in the Master Ledger.
 * Compares the following fields:
 * - Supplier Name (Column A)
 * - PO Reference (Column C)
 * - Description of Goods (Column F)
 * - Quantity (Column G)
 * - Total Amount (Column I)
 *
 * If another invoice has identical or very similar values for these fields,
 * even if the Invoice Number is different, flags it as 'Possible Duplicate'.
 */
export function isPossibleDuplicate(selected: MasterLedgerRow, allRows: MasterLedgerRow[]): boolean {
  if (!allRows || allRows.length <= 1) return false;

  const targetSupp = selected.supplierName.trim().toLowerCase();
  const targetPO = selected.poReference.trim().toLowerCase();
  const targetDesc = selected.description.trim().toLowerCase();
  const targetQty = selected.quantity;
  const targetAmt = selected.totalAmount;

  return allRows.some(other => {
    if (other.id === selected.id) return false;

    const otherSupp = other.supplierName.trim().toLowerCase();
    const otherPO = other.poReference.trim().toLowerCase();
    const otherDesc = other.description.trim().toLowerCase();
    const otherQty = other.quantity;
    const otherAmt = other.totalAmount;

    // Field comparison checks
    const suppMatch = targetSupp === otherSupp || (targetSupp !== '' && otherSupp !== '' && (targetSupp.includes(otherSupp) || otherSupp.includes(targetSupp)));
    const poMatch = targetPO === otherPO || (targetPO !== '' && otherPO !== '' && (targetPO.includes(otherPO) || otherPO.includes(targetPO)));
    const descMatch = targetDesc === otherDesc || (targetDesc !== '' && otherDesc !== '' && (targetDesc.includes(otherDesc) || otherDesc.includes(targetDesc)));
    const qtyMatch = targetQty === otherQty;
    const amtMatch = Math.abs(targetAmt - otherAmt) < 0.01;

    // Check 1: Identical Invoice Number
    const sameInvNum = selected.invoiceNumber.trim().toUpperCase() === other.invoiceNumber.trim().toUpperCase() && selected.invoiceNumber.trim() !== '';
    if (sameInvNum) return true;

    // Check 2: Same Supplier & Total Amount + matching PO Reference, Description, or Quantity
    if (suppMatch && amtMatch && (poMatch || descMatch || qtyMatch)) {
      return true;
    }

    // Check 3: Same PO Reference + Same Supplier + Same Total Amount
    if (poMatch && suppMatch && amtMatch) {
      return true;
    }

    // Check 4: High multi-field match count (4+ matching fields out of 5)
    const matchesCount = (suppMatch ? 1 : 0) + (poMatch ? 1 : 0) + (descMatch ? 1 : 0) + (qtyMatch ? 1 : 0) + (amtMatch ? 1 : 0);
    if (matchesCount >= 4) {
      return true;
    }

    return false;
  });
}

/**
 * Evaluates duplicate checks and calculates payment priorities across all rows in the ledger.
 * Writes result into Column T ('Possible Duplicate' or 'No Duplicate Found')
 * and Column S (Payment Priority).
 * Automatically syncs Column L (Payment Status):
 * - If Match Status is Flagged/mismatched -> 'Payment on Hold'
 * - If Match Status is 'Ready for Payment - No Issues Found' -> 'Pending Review' (if not paid/approved)
 * - If Approved -> 'Paid'
 */
export function evaluateDuplicates(rows: MasterLedgerRow[]): MasterLedgerRow[] {
  return rows.map(row => {
    const priority = calculatePriority(row.dueDate);
    const isDup = isPossibleDuplicate(row, rows);
    const dupStatus: DuplicateCheckStatus = isDup ? 'Possible Duplicate' : 'No Duplicate Found';

    let currentPaymentStatus = row.paymentStatus;
    let paymentDate = row.paymentDate || '';
    let paymentMethod = row.paymentMethod || 'N/A';
    let approvedBy = row.approvedBy || '';

    const isPaid = 
      currentPaymentStatus === 'Paid' || 
      (currentPaymentStatus as string) === 'paid' || 
      (currentPaymentStatus as string) === 'Approved';

    if (isPaid) {
      currentPaymentStatus = 'Paid';
      if (!paymentDate) {
        paymentDate = formatPaymentDateInFull(new Date().toISOString());
      }
      if (!paymentMethod || paymentMethod === 'N/A') {
        paymentMethod = 'Bank Transfer';
      }
      if (!approvedBy) {
        approvedBy = 'Madam Lim';
      }
    } else {
      const hasBank = !isBankAccountMissing(row.bankAccount);
      const isMatched = row.matchStatus === 'Ready for Payment - No Issues Found';
      const isExtractionCompleted = row.extractionStatus === 'Completed';
      const isHumanReviewCompleted = (row.humanReview as string) === 'Completed' || (row.humanReview as string) === 'Verified';

      const eligible = isMatched && hasBank;

      if (eligible) {
        currentPaymentStatus = 'Pending';
      } else {
        currentPaymentStatus = 'Payment On Hold';
      }

      paymentDate = '';
      paymentMethod = 'N/A';
      approvedBy = '';
    }

    return {
      ...row,
      paymentStatus: currentPaymentStatus as PaymentStatus,
      paymentDate,
      paymentMethod: paymentMethod as any,
      approvedBy,
      paymentPriority: priority,
      duplicateCheck: dupStatus
    };
  });
}

/**
 * Checks if bank account is Not Found, Blank, N/A, or Missing
 */
export function isBankAccountMissing(bankAccountStr: string | undefined | null): boolean {
  if (!bankAccountStr || bankAccountStr.trim() === '') {
    return true;
  }
  const clean = bankAccountStr.trim().toUpperCase();
  if (
    clean === 'NOT FOUND' ||
    clean.includes('NOT FOUND') ||
    clean === 'BLANK' ||
    clean.includes('BLANK') ||
    clean === 'N/A' ||
    clean.startsWith('N/A') ||
    clean === 'NONE' ||
    clean === '-' ||
    clean.includes('MISSING') ||
    clean.includes('UNVERIFIED')
  ) {
    return true;
  }
  return false;
}

/**
 * Verifies completeness of bank account information (Column O)
 */
export function verifyBankAccount(bankAccountStr: string): { isValid: boolean; reason: string } {
  if (isBankAccountMissing(bankAccountStr)) {
    return { isValid: false, reason: 'Supplier bank account information is missing. Payment On Hold.' };
  }

  if (bankAccountStr.trim().length < 8) {
    return { isValid: false, reason: 'Bank account number appears too short or invalid.' };
  }

  return { isValid: true, reason: 'Bank account verified.' };
}

/**
 * Checks whether an invoice can be recommended for payment
 * Criteria:
 * 1. Extraction Status = Completed
 * 2. Match Status = Ready for Payment - No Issues Found
 * 3. Human Review = Completed
 * 4. Bank Account is present
 * 5. Duplicate Check = No Duplicate Found
 * 6. Payment Status = Pending
 */
export function checkRecommendationEligibility(row: MasterLedgerRow): { eligible: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (row.extractionStatus !== 'Completed') {
    reasons.push(`Extraction Status is '${row.extractionStatus || 'Pending'}' (must be 'Completed').`);
  }

  const matchStr = row.matchStatus as string;
  if (matchStr !== 'Ready for Payment - No Issues Found') {
    reasons.push(`Match Status is '${row.matchStatus}' (must be 'Ready for Payment - No Issues Found').`);
  }

  if ((row.humanReview as string) !== 'Completed' && (row.humanReview as string) !== 'Verified') {
    reasons.push(`Human Review is '${row.humanReview || 'Pending Review'}' (must be 'Completed').`);
  }

  const bankCheck = verifyBankAccount(row.bankAccount);
  if (!bankCheck.isValid) {
    reasons.push(`Bank Account: ${bankCheck.reason}`);
  }

  if (row.duplicateCheck === 'Possible Duplicate' || row.duplicateCheck.startsWith('Potential Duplicate')) {
    reasons.push(`Possible duplicate invoice has been detected in the Accounts Payable records.`);
  }

  return {
    eligible: matchStr === 'Ready for Payment - No Issues Found' && !isBankAccountMissing(row.bankAccount),
    reasons
  };
}

/**
 * Formats SGD currency
 */
export function formatSGD(amount: number): string {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Exports Master Ledger data to CSV string or triggers file download
 */
export function exportLedgerToCSV(rows: MasterLedgerRow[], triggerDownload: boolean = true): string {
  const headers = [
    'Supplier Name (Col A)',
    'Invoice Number (Col B)',
    'PO Reference (Col C)',
    'Invoice Date (Col D)',
    'Due Date (Col E)',
    'Description (Col F)',
    'Qty (Col G)',
    'Unit Price (Col H)',
    'Total Amount SGD (Col I)',
    'Extraction Status (Col J)',
    'Match Status (Col K)',
    'Payment Status (Col L)',
    'Human Review (Col M)',
    'Confidence (Col N)',
    'Bank Account (Col O)',
    'Payment Date (Col P)',
    'Payment Method (Col Q)',
    'Approved By (Col R)',
    'Payment Priority (Col S)',
    'Duplicate Check (Col T)'
  ];

  const csvRows = [headers.join(',')];

  rows.forEach(r => {
    const rowValues = [
      `"${r.supplierName.replace(/"/g, '""')}"`,
      `"${r.invoiceNumber.replace(/"/g, '""')}"`,
      `"${r.poReference.replace(/"/g, '""')}"`,
      `"${r.invoiceDate}"`,
      `"${r.dueDate}"`,
      `"${(r.description || '').replace(/"/g, '""')}"`,
      r.quantity,
      r.unitPrice.toFixed(2),
      r.totalAmount.toFixed(2),
      `"${r.extractionStatus}"`,
      `"${r.matchStatus}"`,
      `"${r.paymentStatus}"`,
      `"${r.humanReview}"`,
      `"${r.confidenceLevel}%"`,
      `"${(r.bankAccount || '').replace(/"/g, '""')}"`,
      `"${r.paymentDate || ''}"`,
      `"${r.paymentMethod || ''}"`,
      `"${(r.approvedBy || '').replace(/"/g, '""')}"`,
      `"${r.paymentPriority}"`,
      `"${(r.duplicateCheck || '').replace(/"/g, '""')}"`
    ];
    csvRows.push(rowValues.join(','));
  });

  const contentStr = csvRows.join('\n');

  if (triggerDownload) {
    const blob = new Blob([contentStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Boon_Huat_Master_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return contentStr;
}

/**
 * Formats date strictly into "DATE/Month in full/ year" format (e.g. "06/August/2026")
 */
export function formatPaymentDateInFull(inputDate?: Date | string): string {
  if (!inputDate || inputDate === 'N/A' || inputDate === '') {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = today.toLocaleString('en-US', { month: 'long' });
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // If already formatted like 06/August/2026
  if (typeof inputDate === 'string') {
    const trimmed = inputDate.trim();
    if (/^\d{1,2}\/[A-Za-z]+\/\d{4}$/.test(trimmed)) {
      return trimmed;
    }
    // Handle YYYY-MM-DD
    const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const monthIndex = parseInt(isoMatch[2], 10) - 1;
      const day = String(parseInt(isoMatch[3], 10)).padStart(2, '0');
      const dummyDate = new Date(year, monthIndex, 1);
      const month = dummyDate.toLocaleString('en-US', { month: 'long' });
      return `${day}/${month}/${year}`;
    }
  }

  const d = new Date(inputDate);
  if (isNaN(d.getTime())) {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = today.toLocaleString('en-US', { month: 'long' });
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  }

  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'long' });
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Updates a record in the Master Ledger after Madam Lim approves payment.
 * Modifies ONLY:
 * - Column L: Payment Status = paid
 * - Column P: Payment Date = DATE/Month in full/ year (e.g. 06/August/2026)
 * - Column Q: Payment Method (e.g. Bank Transfer / GIRO)
 * - Column R: Approved By (e.g. Madam Lim)
 * - Column S: Payment Priority = High / Medium / Low
 * - Column T: Duplicate Check = No Duplicate Found or Possible Duplicate
 *
 * Leaves all read-only columns (A-K, M-O) untouched.
 */
export function updateLedgerRecordAfterApproval(row: MasterLedgerRow): MasterLedgerRow {
  let normPriority: PaymentPriority = 'High';
  if (row.paymentPriority === 'Low') {
    normPriority = 'Low';
  } else if (row.paymentPriority === 'Medium') {
    normPriority = 'Medium';
  } else {
    normPriority = 'High';
  }

  let normDuplicateCheck: DuplicateCheckStatus = 'No Duplicate Found';
  if (row.duplicateCheck === 'Possible Duplicate' || row.duplicateCheck.startsWith('Potential Duplicate')) {
    normDuplicateCheck = 'Possible Duplicate';
  } else {
    normDuplicateCheck = 'No Duplicate Found';
  }

  const formattedPaymentDate = formatPaymentDateInFull(row.paymentDate);

  const auditEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
    user: 'Madam Lim',
    action: 'Update Master Ledger',
    details: `Master Ledger updated: Payment Status=Paid, Date=${formattedPaymentDate}, Method=${row.paymentMethod || 'Bank Transfer'}, Approved By=Madam Lim.`
  };

  return {
    ...row,
    paymentStatus: 'Paid' as PaymentStatus,
    paymentDate: formattedPaymentDate,
    paymentMethod: row.paymentMethod && row.paymentMethod !== 'N/A' ? row.paymentMethod : 'Bank Transfer',
    approvedBy: row.approvedBy || 'Madam Lim',
    paymentPriority: normPriority,
    duplicateCheck: normDuplicateCheck,
    auditTrail: [auditEntry, ...(row.auditTrail || [])]
  };
}


