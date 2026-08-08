import React, { useState, useEffect } from 'react';
import { MasterLedgerRow, PaymentPriority, PaymentStatus } from '../types';
import { formatSGD, checkRecommendationEligibility, isBankAccountMissing } from '../utils/paymentRules';
import { DuplicateInvoiceBanner } from './DuplicateInvoiceBanner';
import { MissingBankBanner } from './MissingBankBanner';
import { 
  X, 
  Lock, 
  Edit3, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  FileText, 
  CreditCard, 
  ShieldCheck, 
  History, 
  Sparkles,
  DollarSign
} from 'lucide-react';

interface InvoiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  row: MasterLedgerRow | null;
  onUpdateRowPaymentStatus: (id: string, status: PaymentStatus) => void;
  onUpdateRowPriority: (id: string, priority: PaymentPriority) => void;
  onSaveNotes: (id: string, notes: string) => void;
  onOpenMadamLimApproval: (rows: MasterLedgerRow[]) => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  isOpen,
  onClose,
  row,
  onUpdateRowPaymentStatus,
  onUpdateRowPriority,
  onSaveNotes,
  onOpenMadamLimApproval
}) => {
  const [notesText, setNotesText] = useState('');
  const [aiAuditReport, setAiAuditReport] = useState<{
    auditOpinion?: string;
    complianceCheckPassed?: boolean;
    recommendationAdvice?: string;
  }>({});
  const [loadingAudit, setLoadingAudit] = useState(false);

  useEffect(() => {
    if (row) {
      setNotesText(row.notes || '');
      setLoadingAudit(true);
      fetch('/api/ai/invoice-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice: row })
      })
        .then(res => res.json())
        .then(data => {
          setAiAuditReport(data);
          setLoadingAudit(false);
        })
        .catch(() => {
          setLoadingAudit(false);
        });
    }
  }, [row]);

  if (!isOpen || !row) return null;

  const eligibility = checkRecommendationEligibility(row);

  const handleSaveNotes = () => {
    onSaveNotes(row.id, notesText);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-800">
        
        {/* Modal Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded text-white font-mono font-bold text-sm">
              {row.invoiceNumber}
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>{row.supplierName}</span>
                <span className="text-xs bg-slate-800 text-slate-300 font-normal px-2 py-0.5 rounded border border-slate-700">
                  PO: {row.poReference}
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Master Ledger Record Inspection
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-md bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin scrollbar-thumb-slate-300">
          
          {/* Missing Bank Account Warning Banner */}
          {isBankAccountMissing(row.bankAccount) && (
            <MissingBankBanner />
          )}

          {/* Possible Duplicate Warning Banner */}
          {(row.duplicateCheck === 'Possible Duplicate' || row.duplicateCheck.startsWith('Potential Duplicate')) && (
            <DuplicateInvoiceBanner supplierName={row.supplierName} invoiceNumber={row.invoiceNumber} />
          )}

          {/* Readiness & Audit Banner */}
          {(() => {
            const isMatched = row.matchStatus === '3-Way Matched';
            const bankMissing = isBankAccountMissing(row.bankAccount);
            const isDup = row.duplicateCheck === 'Possible Duplicate' || row.duplicateCheck.startsWith('Potential Duplicate');
            const isReady = isMatched && !bankMissing && !isDup;

            let reasonText = '';
            let recommendationText = '';
            if (isReady) {
              reasonText = "Invoice verified against Purchase Order and Goods Received Note with bank account confirmed. Payment recommendation is based strictly on objective due date and 3-way match rules without supplier bias.";
              recommendationText = "Ready for Madam Lim's payment approval.";
            } else {
              const holdReasons: string[] = [];
              if (bankMissing) holdReasons.push("Supplier bank account information is missing.");
              if (!isMatched) holdReasons.push(`Invoice details do not match Purchase Order and Goods Received Note (Column K Match Status: ${row.matchStatus}).`);
              if (isDup) holdReasons.push("Possible duplicate invoice detected in Master Ledger.");
              reasonText = holdReasons.join(' ');

              if (bankMissing) {
                recommendationText = "Please verify the supplier's payment details before approving payment.";
              } else if (isDup) {
                recommendationText = "Please resolve potential duplicate before approving payment.";
              } else {
                recommendationText = "Please resolve matching discrepancies with procurement before approving payment.";
              }
            }

            return (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">AI Payment Audit Analysis (Selected Transaction)</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Transaction Amount</span>
                    <span className="font-mono font-extrabold text-slate-900 text-sm">{formatSGD(row.totalAmount)}</span>
                  </div>
                </div>

                {/* Match status */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-600 font-semibold">Column K Match Status:</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[11px] border ${
                    isMatched 
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}>
                    {row.matchStatus}
                  </span>
                  <span className="text-slate-500 font-semibold text-[11px]">
                    • Fair Supplier Standard: Applied
                  </span>
                </div>

                {/* STRICT RECOMMENDED ACTION BADGE */}
                <div>
                  {isReady ? (
                    <div className="px-3 py-2 bg-emerald-600 text-white rounded font-extrabold text-xs flex items-center justify-between shadow-2xs">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-white" />
                        RECOMMENDED ACTION: Ready for Payment Approval
                      </span>
                      <span className="text-[10px] bg-emerald-700 px-2 py-0.5 rounded text-emerald-100 font-bold">
                        Fair Supplier Standard
                      </span>
                    </div>
                  ) : (
                    <div className="px-3 py-2 bg-amber-600 text-white rounded font-extrabold text-xs flex items-center justify-between shadow-2xs">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-white" />
                        RECOMMENDED ACTION: Payment On Hold
                      </span>
                      <span className="text-[10px] bg-amber-700 px-2 py-0.5 rounded text-amber-100 font-bold">
                        Action Required
                      </span>
                    </div>
                  )}
                </div>

                {/* Reason & Recommendation Block */}
                <div className="bg-white border border-slate-200 rounded p-3 space-y-2 text-slate-800">
                  <div>
                    <span className="font-bold text-slate-900 block mb-0.5 text-xs">Reason:</span>
                    <p className="text-[11px] text-slate-700 leading-relaxed">{reasonText}</p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-900 block mb-0.5 text-xs">Recommendation:</span>
                    <p className="text-[11px] text-blue-900 font-medium bg-blue-50/70 p-2 rounded border border-blue-100 leading-relaxed">
                      {recommendationText}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="font-semibold text-slate-600">Responsible AI Policy:</span>
                    <span>All suppliers (newer and long-standing) are evaluated under identical rules. No technical AI jargon is used.</span>
                  </div>
                </div>

              </div>
            );
          })()}

          {/* READ-ONLY Section (Cols A - K, M - O) */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                Read-Only System Data (Columns A - K, M - O)
              </span>
              <span className="text-[10px] text-slate-500">From Extraction & 3-Way Match Systems</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">Col A: Supplier</span>
                <span className="font-semibold text-slate-900">{row.supplierName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Col B: Invoice Number</span>
                <span className="font-mono text-blue-700 font-bold">{row.invoiceNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Col C: PO Reference</span>
                <span className="font-mono text-slate-700">{row.poReference}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Col D: Invoice Date</span>
                <span className="text-slate-800">{row.invoiceDate}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Col E: Due Date</span>
                <span className="text-slate-900 font-semibold">{row.dueDate}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Col I: Total Amount</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{formatSGD(row.totalAmount)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Col J: Extraction Status</span>
                <span className="text-emerald-700 font-semibold">{row.extractionStatus} ({row.confidenceLevel}%)</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Col K: Match Status</span>
                <span className={row.matchStatus === '3-Way Matched' ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                  {row.matchStatus}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Col O: Bank Account</span>
                {isBankAccountMissing(row.bankAccount) ? (
                  <span className="font-mono text-rose-800 font-bold bg-rose-100 border border-rose-300 px-1.5 py-0.5 rounded text-[11px] inline-block mt-0.5">
                    {row.bankAccount || 'Not Found'} (Payment On Hold)
                  </span>
                ) : (
                  <span className="font-mono text-slate-800 font-semibold">{row.bankAccount}</span>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 text-xs">
              <span className="text-slate-500 block text-[10px]">Col F: Line Items / Description</span>
              <p className="text-slate-800 mt-0.5">{row.quantity} x {row.description} @ ${row.unitPrice.toFixed(2)} / unit</p>
            </div>
          </div>

          {/* MANAGED BY THIS APPLICATION (Cols L, P - T) */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                Managed Payment Information (Columns L, P - T)
              </span>
              <span className="text-[10px] text-blue-700 font-medium">Editable by Payment App</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              
              {/* Col L: Payment Status */}
              <div>
                <label className="block text-slate-500 text-[10px] mb-1 font-medium">Col L: Payment Status</label>
                <select
                  value={row.paymentStatus}
                  onChange={(e) => onUpdateRowPaymentStatus(row.id, e.target.value as PaymentStatus)}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 font-semibold"
                >
                  <option value="Paid">Paid</option>
                  <option value="Payment on Hold">Payment on Hold</option>
                </select>
              </div>

              {/* Col S: Priority */}
              <div>
                <label className="block text-slate-500 text-[10px] mb-1 font-medium">Col S: Priority</label>
                <select
                  value={row.paymentPriority}
                  onChange={(e) => onUpdateRowPriority(row.id, e.target.value as PaymentPriority)}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 font-semibold"
                >
                  <option value="Urgent">Urgent</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              {/* Col R: Approved By */}
              <div>
                <span className="text-slate-500 block text-[10px]">Col R: Approved By</span>
                <span className="font-bold text-emerald-700 block mt-1">{row.approvedBy}</span>
              </div>

              {/* Col P: Payment Date */}
              <div>
                <span className="text-slate-500 block text-[10px]">Col P: Payment Date</span>
                <span className="font-mono text-slate-800 block mt-1">{row.paymentDate || 'Not Paid Yet'}</span>
              </div>

              {/* Col Q: Payment Method */}
              <div>
                <span className="text-slate-500 block text-[10px]">Col Q: Payment Method</span>
                <span className="text-slate-800 font-medium block mt-1">{row.paymentMethod}</span>
              </div>

              {/* Col T: Duplicate Check */}
              <div>
                <span className="text-slate-500 block text-[10px]">Col T: Duplicate Check</span>
                {(row.duplicateCheck === 'Possible Duplicate' || row.duplicateCheck.startsWith('Potential Duplicate')) ? (
                  <span className="text-amber-800 font-bold bg-amber-100 border border-amber-300 px-2 py-0.5 rounded text-[11px] inline-block mt-1">
                    Possible Duplicate
                  </span>
                ) : (
                  <span className="text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px] inline-block mt-1">
                    {row.duplicateCheck || 'No Duplicate Found'}
                  </span>
                )}
              </div>

            </div>
          </div>

          {/* Notes & Audit Log Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* AP Notes */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
              <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">AP Notes & Directives</label>
              <textarea
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                rows={3}
                className="w-full bg-white border border-slate-300 rounded p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                placeholder="Add payment notes or instructions for Madam Lim..."
              />
              <button
                onClick={handleSaveNotes}
                className="px-3 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs rounded transition-colors"
              >
                Save Notes
              </button>
            </div>

            {/* Audit Trail Timeline */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
              <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                <History className="w-3.5 h-3.5 text-blue-600" />
                <span>Audit Trail Timeline</span>
              </div>
              <div className="max-h-28 overflow-y-auto space-y-1.5 text-[11px] scrollbar-thin scrollbar-thumb-slate-300">
                {row.auditTrail && row.auditTrail.length > 0 ? (
                  row.auditTrail.map(log => (
                    <div key={log.id} className="border-b border-slate-200 pb-1">
                      <div className="flex items-center justify-between text-slate-500 text-[10px]">
                        <span>{log.timestamp}</span>
                        <span className="text-blue-700 font-bold">{log.user}</span>
                      </div>
                      <div className="text-slate-800">{log.action}: {log.details}</div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-[11px]">No audit logs recorded yet.</p>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs rounded transition-colors"
          >
            Close
          </button>

          {row.paymentStatus === 'Payment on Hold' && (
            <button
              onClick={() => {
                onClose();
                onOpenMadamLimApproval([row]);
              }}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded shadow-xs transition-colors flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Approve as Madam Lim</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
