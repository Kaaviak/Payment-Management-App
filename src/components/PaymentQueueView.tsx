import React, { useState } from 'react';
import { MasterLedgerRow, UserRole } from '../types';
import { formatSGD, isBankAccountMissing } from '../utils/paymentRules';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Copy, 
  ArrowUpDown, 
  AlertTriangle,
  Building,
  CreditCard,
  Layers,
  FileText
} from 'lucide-react';

interface PaymentQueueViewProps {
  rows: MasterLedgerRow[];
  currentUser: UserRole;
  selectedRowIds?: string[];
  onSelectRow?: (id: string) => void;
  onOpenMadamLimApproval: (rows: MasterLedgerRow[]) => void;
  onOpenRowDetail: (row: MasterLedgerRow) => void;
  onOpenRecommendationModal?: (rows: MasterLedgerRow[]) => void;
}

export const PaymentQueueView: React.FC<PaymentQueueViewProps> = ({
  rows,
  currentUser,
  selectedRowIds = [],
  onSelectRow,
  onOpenMadamLimApproval,
  onOpenRowDetail,
  onOpenRecommendationModal
}) => {
  // Filter for Eligible Payment Queue
  const queueRows = rows.filter(r => 
    r.paymentStatus !== 'Paid' && 
    r.paymentStatus !== 'paid' && 
    r.paymentStatus !== 'Approved'
  );

  const [sortField, setSortField] = useState<keyof MasterLedgerRow | 'priority_duedate'>('priority_duedate');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const handleSort = (field: keyof MasterLedgerRow | 'priority_duedate') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const getPriorityRank = (p: string | undefined): number => {
    const val = (p || '').toLowerCase();
    if (val === 'urgent') return 1;
    if (val === 'high') return 2;
    if (val === 'medium') return 3;
    if (val === 'low') return 4;
    return 5;
  };

  const sortedQueueRows = [...queueRows].sort((a, b) => {
    if (sortField === 'priority_duedate') {
      const rankA = getPriorityRank(a.paymentPriority);
      const rankB = getPriorityRank(b.paymentPriority);
      if (rankA !== rankB) {
        return sortAsc ? rankA - rankB : rankB - rankA;
      }
      const timeA = new Date(a.dueDate).getTime() || 0;
      const timeB = new Date(b.dueDate).getTime() || 0;
      return sortAsc ? timeA - timeB : timeB - timeA;
    }

    if (sortField === 'paymentPriority') {
      const rankA = getPriorityRank(a.paymentPriority);
      const rankB = getPriorityRank(b.paymentPriority);
      if (rankA !== rankB) {
        return sortAsc ? rankA - rankB : rankB - rankA;
      }
      const timeA = new Date(a.dueDate).getTime() || 0;
      const timeB = new Date(b.dueDate).getTime() || 0;
      return timeA - timeB;
    }

    let valA = a[sortField];
    let valB = b[sortField];

    if (valA === undefined || valA === null) valA = '';
    if (valB === undefined || valB === null) valB = '';

    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortAsc ? valA - valB : valB - valA;
    }

    const strA = String(valA).toLowerCase();
    const strB = String(valB).toLowerCase();

    if (strA < strB) return sortAsc ? -1 : 1;
    if (strA > strB) return sortAsc ? 1 : -1;

    // Secondary sort tiebreaker by due date
    const timeA = new Date(a.dueDate).getTime() || 0;
    const timeB = new Date(b.dueDate).getTime() || 0;
    return timeA - timeB;
  });

  const getSortLabel = () => {
    switch (sortField) {
      case 'priority_duedate':
        return `Payment Priority — Due Date (${sortAsc ? 'High-Low' : 'Low-High'})`;
      case 'supplierName':
        return `Supplier Name (${sortAsc ? 'A-Z' : 'Z-A'})`;
      case 'invoiceNumber':
        return `Invoice Number (${sortAsc ? 'Asc' : 'Desc'})`;
      case 'dueDate':
        return `Due Date (${sortAsc ? 'Earliest First' : 'Latest First'})`;
      case 'totalAmount':
        return `Total Amount (${sortAsc ? 'Low-High' : 'High-Low'})`;
      case 'paymentPriority':
        return `Payment Priority (${sortAsc ? 'High-Low' : 'Low-High'})`;
      case 'duplicateCheck':
        return `Duplicate Status (${sortAsc ? 'A-Z' : 'Z-A'})`;
      case 'bankAccount':
        return `Bank Account (${sortAsc ? 'A-Z' : 'Z-A'})`;
      case 'paymentStatus':
        return `Payment Status (${sortAsc ? 'A-Z' : 'Z-A'})`;
      default:
        return 'Payment Priority — Due Date';
    }
  };

  const [selectedRowId, setSelectedRowId] = useState<string>(
    selectedRowIds.length > 0 ? selectedRowIds[0] : (sortedQueueRows.length > 0 ? sortedQueueRows[0].id : '')
  );

  const [reviewedRowIds, setReviewedRowIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  // Get currently selected row object
  const selectedRow = sortedQueueRows.find(r => r.id === (selectedRowIds[0] || selectedRowId)) || sortedQueueRows[0] || rows[0];

  const handleCopyFormat = () => {
    if (!selectedRow) return;
    const text = `INVOICE RECOMMENDATION:\nSupplier: ${selectedRow.supplierName}\nInvoice #: ${selectedRow.invoiceNumber}\nPO: ${selectedRow.poReference}\nAmount: ${formatSGD(selectedRow.totalAmount)}\nDue Date: ${selectedRow.dueDate}\nStatus: ${selectedRow.paymentStatus}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Get row index in the full master ledger
  const fullRowIndex = selectedRow ? rows.findIndex(r => r.id === selectedRow.id) + 2 : 2;

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start">
      
      {/* Left Column: Payment Queue Table (60% width) */}
      <div className="w-full lg:w-[60%] bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
        
        {/* Table Top Header */}
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-sm">Payment Queue</h3>
            <span className="bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-full font-bold text-[11px]">
              {sortedQueueRows.length} Invoices
            </span>
          </div>

          <button
            onClick={() => handleSort('priority_duedate')}
            className="text-slate-600 hover:text-slate-900 font-medium text-[11px] flex items-center gap-1.5 bg-slate-200/70 hover:bg-slate-200 px-2.5 py-1 rounded-md transition-colors"
            title="Click to toggle or reset sorting"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
            <span>Sorted by: <strong className="text-slate-900">{getSortLabel()}</strong></span>
          </button>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto max-h-[600px] scrollbar-thin scrollbar-thumb-slate-300">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/90 text-slate-600 text-[10px] uppercase font-bold tracking-wider border-b border-slate-200 sticky top-0 z-10 select-none">
                <th onClick={() => handleSort('supplierName')} className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/80 transition-colors">
                  <div className="flex items-center gap-1">
                    <span>SUPPLIER NAME</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th onClick={() => handleSort('invoiceNumber')} className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/80 transition-colors">
                  <div className="flex items-center gap-1">
                    <span>INVOICE NO.</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th onClick={() => handleSort('dueDate')} className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/80 transition-colors">
                  <div className="flex items-center gap-1">
                    <span>DUE DATE</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th onClick={() => handleSort('totalAmount')} className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-200/80 transition-colors">
                  <div className="flex items-center justify-end gap-1">
                    <span>TOTAL AMOUNT</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th onClick={() => handleSort('paymentPriority')} className="py-2.5 px-3 text-center cursor-pointer hover:bg-slate-200/80 transition-colors">
                  <div className="flex items-center justify-center gap-1">
                    <span>PAYMENT PRIORITY</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th onClick={() => handleSort('duplicateCheck')} className="py-2.5 px-3 text-center cursor-pointer hover:bg-slate-200/80 transition-colors">
                  <div className="flex items-center justify-center gap-1">
                    <span>DUPLICATE CHECK</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th onClick={() => handleSort('bankAccount')} className="py-2.5 px-3 text-center cursor-pointer hover:bg-slate-200/80 transition-colors">
                  <div className="flex items-center justify-center gap-1">
                    <span>BANK ACCOUNT</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th onClick={() => handleSort('paymentStatus')} className="py-2.5 px-3 text-center cursor-pointer hover:bg-slate-200/80 transition-colors">
                  <div className="flex items-center justify-center gap-1">
                    <span>STATUS</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sortedQueueRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-500 text-xs">
                    No pending invoices in Payment Queue.
                  </td>
                </tr>
              ) : (
                sortedQueueRows.map(r => {
                  const isSelected = r.id === (selectedRow?.id || '');
                  return (
                    <tr
                      key={r.id}
                      onClick={() => {
                        setSelectedRowId(r.id);
                        onSelectRow?.(r.id);
                        setReviewedRowIds(prev => new Set(prev).add(r.id));
                      }}
                      className={`cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-blue-50/80 border-l-4 border-l-blue-600' 
                          : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                      }`}
                    >
                      {/* Supplier Name & Item */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{r.supplierName}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                          {r.description}
                        </div>
                      </td>

                      {/* Invoice No & PO */}
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-slate-800">{r.invoiceNumber}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          PO: {r.poReference}
                        </div>
                      </td>

                      {/* Due Date */}
                      <td className="py-3 px-3 text-slate-700 font-medium whitespace-nowrap">
                        {r.dueDate}
                      </td>

                      {/* Total Amount */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatSGD(r.totalAmount)}
                      </td>

                      {/* Payment Priority Badge */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          r.paymentPriority === 'Urgent' || r.paymentPriority === 'High'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : r.paymentPriority === 'Medium'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}>
                          {r.paymentPriority || 'Low'}
                        </span>
                      </td>

                      {/* Duplicate Check Badge */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-semibold border ${
                          r.duplicateCheck === 'Possible Duplicate' || r.duplicateCheck.startsWith('Potential Duplicate')
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {r.duplicateCheck === 'Possible Duplicate' ? 'Possible Duplicate' : 'No Duplicate Found'}
                        </span>
                      </td>

                      {/* Bank Account */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 max-w-[140px] truncate" title={r.bankAccount}>
                          {r.bankAccount ? r.bankAccount.replace('Verified', '✅ Verified').trim() : 'Verified'}
                        </span>
                      </td>

                      {/* Status: Pending or Payment on Hold */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                          (r.paymentStatus === 'Paid' || r.paymentStatus === 'Approved')
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : (r.paymentStatus === 'On Hold' || r.paymentStatus === 'Payment on Hold' || r.paymentStatus === 'Payment On Hold' || r.duplicateCheck === 'Possible Duplicate' || isBankAccountMissing(r.bankAccount))
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-sky-100 text-sky-900 border-sky-300'
                        }`}>
                          {(r.paymentStatus === 'Paid' || r.paymentStatus === 'Approved') 
                            ? 'Paid' 
                            : (r.paymentStatus === 'On Hold' || r.paymentStatus === 'Payment on Hold' || r.paymentStatus === 'Payment On Hold' || r.duplicateCheck === 'Possible Duplicate' || isBankAccountMissing(r.bankAccount))
                            ? 'Payment On Hold' 
                            : 'Pending'}
                        </span>
                      </td>

                      {/* Action: Review or Review > */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setSelectedRowId(r.id);
                              setReviewedRowIds(prev => new Set(prev).add(r.id));
                              onOpenRowDetail(r);
                            }}
                            className={`px-2.5 py-1 font-bold text-[10px] rounded transition-all flex items-center gap-1 shadow-2xs ${
                              reviewedRowIds.has(r.id)
                                ? 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-700'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                            }`}
                            title="Review Invoice Details"
                          >
                            <span>{reviewedRowIds.has(r.id) ? 'Review >' : 'Review'}</span>
                          </button>
                          {currentUser?.isMadamLim && (
                            (() => {
                              const isRowMatched = r.matchStatus === 'Ready for Payment - No Issues Found';
                              const rowBankMissing = isBankAccountMissing(r.bankAccount);
                              const isRowDup = r.duplicateCheck === 'Possible Duplicate' || r.duplicateCheck?.startsWith('Potential Duplicate');
                              const isRowExtractionCompleted = r.extractionStatus === 'Completed';
                              const isRowHumanReviewCompleted = r.humanReview === 'Completed' || r.humanReview === 'Verified';
                              const isRowReady = isRowMatched && !rowBankMissing;
                              
                              if (isRowReady && r.paymentStatus !== 'Paid') {
                                return (
                                  <button
                                    onClick={() => onOpenMadamLimApproval([r])}
                                    className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[10px] rounded shadow-2xs transition-colors"
                                    title="Approve Payment"
                                  >
                                    Approve
                                  </button>
                                );
                              }
                              return null;
                            })()
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Column: Recommendation & Approval Output Panel (40% width) */}
      <div className="w-full lg:w-[40%] space-y-3">
        {selectedRow ? (
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
            
            {/* Top Dark Navy Header Card */}
            <div className="bg-[#0f172a] text-white p-4 flex items-center justify-between border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs">
                    ✓
                  </div>
                  <h3 className="font-bold text-sm text-white tracking-tight">
                    {selectedRow.supplierName}
                  </h3>
                </div>
                <p className="text-xs text-slate-300 mt-1 font-mono">
                  Invoice #{selectedRow.invoiceNumber} • PO: {selectedRow.poReference}
                </p>
              </div>

              <button
                onClick={handleCopyFormat}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded text-xs font-medium flex items-center gap-1 transition-colors"
                title="Copy formatted summary"
              >
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>{copied ? 'Copied!' : 'Copy Format'}</span>
              </button>
            </div>

            {/* Recommendation Output Body */}
            {(() => {
              const isExtractionCompleted = selectedRow.extractionStatus === 'Completed';
              const isMatched = selectedRow.matchStatus === 'Ready for Payment - No Issues Found';
              const isHumanReviewCompleted = selectedRow.humanReview === 'Completed' || selectedRow.humanReview === 'Verified';
              const bankMissing = isBankAccountMissing(selectedRow.bankAccount);
              const isDup = selectedRow.duplicateCheck === 'Possible Duplicate' || selectedRow.duplicateCheck?.startsWith('Potential Duplicate');
              const isReady = isMatched && !bankMissing;

              let holdReason = '';
              let actionRequired = '';

              if (!isExtractionCompleted) {
                holdReason = "Invoice extraction has not completed.";
                actionRequired = "Wait for the Invoice Extraction App to complete processing.";
              } else if (!isMatched) {
                if (selectedRow.matchStatus === 'Flagged - Goods Condition Issue') {
                  holdReason = "The Three-Way Match identified a goods condition issue.";
                  actionRequired = "Please review and resolve the goods condition issue before payment.";
                } else if (selectedRow.matchStatus === 'Flagged - Price Mismatch') {
                  holdReason = "The invoice price does not match the verified purchasing information.";
                  actionRequired = "Please review and resolve the price mismatch before payment.";
                } else if (selectedRow.matchStatus === 'Flagged - Quantity Mismatch') {
                  holdReason = "The invoice quantity does not match the verified quantity.";
                  actionRequired = "Please review and resolve the quantity mismatch before payment.";
                } else if (selectedRow.matchStatus === 'Flagged - Quantity Mismatch; Possible Duplicate Invoice') {
                  holdReason = "The invoice has a quantity mismatch and has also been identified as a possible duplicate invoice.";
                  actionRequired = "Please review both issues before payment.";
                } else if (selectedRow.matchStatus === 'Flagged - PO Not Found - Manual Review Required') {
                  holdReason = "The Purchase Order could not be found.";
                  actionRequired = "Madam Lim must manually review the invoice and verify the Purchase Order before payment.";
                } else {
                  holdReason = `discrepancy detected (Column K Match Status: ${selectedRow.matchStatus}).`;
                  actionRequired = "Please review and resolve the match status mismatch before payment.";
                }
              } else if (bankMissing) {
                holdReason = "Supplier bank account information is missing.";
                actionRequired = "Please verify the supplier's bank account details before payment.";
              } else if (!isHumanReviewCompleted) {
                holdReason = "The invoice has not completed the required human review.";
                actionRequired = "Madam Lim must review the invoice before payment.";
              } else if (isDup) {
                holdReason = "A possible duplicate invoice has been detected in the Accounts Payable records.";
                actionRequired = "Please review the possible duplicate before payment.";
              }

              return (
                <div className="p-4 space-y-4 text-xs">
                  
                  {/* Visual Warning Banner at the Top of the Invoice Recommendation */}
                  {!isReady ? (
                    <div className="bg-rose-50 border-2 border-rose-600 rounded-lg p-3.5 text-rose-950 space-y-2 shadow-xs">
                      <div className="font-extrabold text-sm tracking-wider text-rose-800 flex items-center gap-1.5 animate-pulse">
                        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                        <div>
                          <div className="text-xs font-black uppercase">PAYMENT ON HOLD</div>
                          <div className="text-[10px] font-black uppercase">PAYMENT MUST NOT PROCEED</div>
                        </div>
                      </div>
                      <div className="text-[11px] space-y-1 pt-1 border-t border-rose-200">
                        <div><strong className="text-rose-900">Reason:</strong> {holdReason}</div>
                        <div><strong className="text-rose-900">Action Required:</strong> {actionRequired}</div>
                        <div className="text-[10px] mt-1 font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded inline-block">
                          Current Payment Status: Payment On Hold
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border-2 border-emerald-600 rounded-lg p-3.5 text-emerald-950 space-y-1.5 shadow-xs">
                      <div className="font-extrabold text-sm tracking-tight text-emerald-800 flex items-center gap-1.5">
                        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span className="text-xs font-black uppercase">READY FOR PAYMENT APPROVAL</span>
                      </div>
                      <div className="text-[11px] pt-1 border-t border-emerald-200">
                        <div>All payment controls have passed.</div>
                        <div className="font-semibold text-emerald-800">Madam Lim must still approve the payment.</div>
                      </div>
                    </div>
                  )}

                  {/* Header Badge Row */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      PAYMENT RECOMMENDATION OUTPUT
                    </span>
                    <span className="bg-slate-100 border border-slate-200 text-slate-600 font-mono text-[10px] px-2 py-0.5 rounded">
                      Master Ledger Row #{fullRowIndex}
                    </span>
                  </div>

                  {/* Separate Transaction Amount Card */}
                  <div className="p-3 bg-slate-900 text-white rounded-lg border border-slate-800 flex items-center justify-between shadow-2xs">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Transaction Amount</div>
                      <div className="font-mono font-extrabold text-amber-300 text-lg">
                        {formatSGD(selectedRow.totalAmount)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Column K Match Status</div>
                      <span className={`inline-block font-extrabold text-xs px-2.5 py-0.5 rounded ${
                        isMatched ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        {selectedRow.matchStatus}
                      </span>
                    </div>
                  </div>

                  {/* Data Grid (2 columns) */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-50/80 p-3 rounded-lg border border-slate-200/80">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Supplier</div>
                      <div className="font-bold text-slate-900 mt-0.5">{selectedRow.supplierName}</div>
                    </div>

                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Invoice Number</div>
                      <div className="font-mono font-bold text-slate-900 mt-0.5">{selectedRow.invoiceNumber}</div>
                    </div>

                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Due Date</div>
                      <div className="font-medium text-slate-800 mt-0.5">{selectedRow.dueDate}</div>
                    </div>

                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">PO Reference</div>
                      <div className="font-mono font-semibold text-slate-800 mt-0.5">{selectedRow.poReference}</div>
                    </div>

                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Payment Priority</div>
                      <div className="font-semibold text-slate-800 mt-0.5">{selectedRow.paymentPriority || 'Low'}</div>
                    </div>

                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Duplicate Check</div>
                      <div className="font-semibold text-slate-800 mt-0.5">{selectedRow.duplicateCheck || 'No Duplicate Found'}</div>
                    </div>

                    <div className="col-span-2 pt-2 border-t border-slate-200/60 grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Bank Account</div>
                        <div className={`font-mono font-medium mt-0.5 flex items-center gap-1 ${bankMissing ? 'text-rose-700 font-bold' : 'text-emerald-800'}`}>
                          <CreditCard className="w-3 h-3 text-slate-500" />
                          {selectedRow.bankAccount || 'Not Found'}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Current Payment Status</div>
                        <div className="font-bold text-blue-700 mt-0.5">{selectedRow.paymentStatus}</div>
                      </div>
                    </div>
                  </div>

                  {/* AI Recommendation Callout Banner */}
                  {isReady ? (
                    <div className="bg-emerald-50/90 border border-emerald-300 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-extrabold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>AI Recommendation: READY FOR PAYMENT APPROVAL</span>
                        </div>
                        <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded">
                          Fair Supplier Standard
                        </span>
                      </div>
                      <div className="bg-white p-2.5 rounded border border-emerald-200 space-y-1.5 text-[11px] text-slate-800">
                        <div>
                          The invoice has passed the Three-Way Match, bank account, duplicate and human review checks.
                        </div>
                        <div>
                          <span className="font-bold text-slate-900">Recommended Action: </span>
                          <span className="text-blue-900 font-semibold">Madam Lim should review the invoice details and approve the payment if everything is correct.</span>
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-600 bg-emerald-100/60 p-1.5 rounded border border-emerald-200 font-medium">
                        <strong>Responsible AI Policy:</strong> All suppliers (newer and long-standing) are evaluated under identical rules. No technical AI jargon is used.
                      </div>
                    </div>
                  ) : (
                    <div className="bg-rose-50/90 border border-rose-300 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-extrabold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-rose-600" />
                          <span>AI Recommendation: PAYMENT ON HOLD</span>
                        </div>
                        <span className="text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded">
                          Action Required
                        </span>
                      </div>
                      <div className="bg-white p-2.5 rounded border border-rose-200 space-y-1.5 text-[11px] text-slate-800">
                        <div>
                          Payment must NOT proceed.
                        </div>
                        <div>
                          <span className="font-bold text-slate-900">Reason: </span>
                          <span className="text-slate-700 leading-relaxed">{holdReason}</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-900">Action Required: </span>
                          <span className="text-rose-900 font-semibold">{actionRequired}</span>
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-600 bg-rose-100/60 p-1.5 rounded border border-rose-200 font-medium">
                        <strong>Responsible AI Policy:</strong> All suppliers (newer and long-standing) are evaluated under identical rules. No technical AI jargon is used.
                      </div>
                    </div>
                  )}

                  {/* Bottom Dark Navy Approval Step Container */}
                  <div className="bg-[#0f172a] rounded-lg p-4 text-white space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs tracking-tight text-white flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-amber-400" />
                        Madam Lim's Approval & Ledger Recording
                      </span>
                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                        Strict Rule: Human Approval Required
                      </span>
                    </div>

                    {isReady ? (
                      <>
                        <p className="text-[11px] text-slate-300">
                          <strong className="text-amber-300">Awaiting Madam Lim's Payment Decision</strong> — Review all information above. Payments must never be approved automatically.
                        </p>

                        <button
                          onClick={() => onOpenMadamLimApproval([selectedRow])}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-md shadow-md transition-all flex items-center justify-center gap-2 group"
                        >
                          <CheckCircle2 className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                          <span>Approve Payment (Madam Lim)</span>
                        </button>
                      </>
                    ) : (
                      <div className="bg-slate-800 p-3 rounded border border-slate-700 text-xs text-slate-400 space-y-1">
                        <div className="font-bold text-rose-400">Payment Approval Locked</div>
                        <div>This invoice does not meet the final payment eligibility requirements. All payment controls must pass before Madam Lim can authorize this payment.</div>
                      </div>
                    )}
                  </div>

                </div>
              );
            })()}

          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
            Select an invoice row from the Payment Queue to view recommendations.
          </div>
        )}
      </div>

    </div>
  );
};
