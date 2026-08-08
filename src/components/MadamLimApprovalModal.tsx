import React, { useState } from 'react';
import { MasterLedgerRow, PaymentMethod, PaymentStatus } from '../types';
import { formatSGD, CURRENT_DATE, isBankAccountMissing } from '../utils/paymentRules';
import { DuplicateInvoiceBanner } from './DuplicateInvoiceBanner';
import { MissingBankBanner } from './MissingBankBanner';
import { 
  ShieldCheck, 
  X, 
  Lock, 
  CheckCircle2, 
  KeyRound, 
  Calendar, 
  CreditCard,
  Building,
  AlertTriangle
} from 'lucide-react';

interface MadamLimApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRows: MasterLedgerRow[];
  onConfirmApproval: (
    rowsToApprove: MasterLedgerRow[], 
    paymentMethod: PaymentMethod, 
    paymentDate: string,
    markAsPaidImmediately: boolean
  ) => void;
  onUpdateMasterLedger: (rowIds: string[]) => void;
}

export const MadamLimApprovalModal: React.FC<MadamLimApprovalModalProps> = ({
  isOpen,
  onClose,
  targetRows,
  onConfirmApproval,
  onUpdateMasterLedger
}) => {
  const getTodayDateStr = () => new Date().toISOString().split('T')[0];
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank Transfer');
  const [paymentDate, setPaymentDate] = useState(getTodayDateStr);
  const [markAsPaidImmediately, setMarkAsPaidImmediately] = useState(true);
  const [isApprovedStep, setIsApprovedStep] = useState(false);
  const [isCompletedStep, setIsCompletedStep] = useState(false);

  const ineligibleRows = targetRows.filter(row => {
    const isExtractionCompleted = row.extractionStatus === 'Completed';
    const isMatched = row.matchStatus === 'Ready for Payment - No Issues Found';
    const isHumanReviewCompleted = row.humanReview === 'Completed' || row.humanReview === 'Verified';
    const bankMissing = isBankAccountMissing(row.bankAccount);
    const isDup = row.duplicateCheck === 'Possible Duplicate' || row.duplicateCheck?.startsWith('Potential Duplicate');
    const isReady = isMatched && !bankMissing;
    return !isReady;
  });

  const hasIneligible = ineligibleRows.length > 0;

  if (!isOpen || targetRows.length === 0) return null;

  const totalAmountSGD = targetRows.reduce((acc, r) => acc + r.totalAmount, 0);

  const handleAuthorize = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasIneligible) return;
    onConfirmApproval(targetRows, paymentMethod, paymentDate || getTodayDateStr(), markAsPaidImmediately);
    setIsApprovedStep(true);
  };

  const handleExecuteMasterLedgerUpdate = () => {
    onUpdateMasterLedger(targetRows.map(r => r.id));
    setIsApprovedStep(false);
    setIsCompletedStep(true);
  };

  const handleResetAndClose = () => {
    setIsApprovedStep(false);
    setIsCompletedStep(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-lg shadow-2xl overflow-hidden flex flex-col text-slate-800">
        
        {/* Modal Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded bg-emerald-600 flex items-center justify-center text-white">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Madam Lim Payment Authorization
              </h2>
              <p className="text-xs text-slate-300">
                Boon Huat Hardware & Supplies Pte Ltd — AP Governance Protocol
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

        {/* Body Content */}
        {isCompletedStep ? (
          <div className="p-6 space-y-5 bg-emerald-50/70 border-t border-emerald-200">
            <div className="bg-white border-2 border-emerald-500 rounded-xl p-5 shadow-md space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg shrink-0">
                  ✅
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Payment successfully recorded.
                  </h3>
                  <p className="text-xs text-emerald-800 font-semibold mt-0.5">
                    The Master Ledger has been updated.
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-200/80 pt-3 space-y-2">
                <div className="flex items-center justify-between font-mono bg-slate-50 p-2.5 rounded border border-slate-200 text-xs">
                  <span className="text-slate-600 font-bold">Payment Status:</span>
                  <span className="bg-emerald-600 text-white px-3 py-1 rounded font-extrabold">Paid</span>
                </div>
                <p className="text-xs text-slate-700 font-medium leading-relaxed pt-1">
                  This invoice has completed the Accounts Payable workflow.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-sm transition-colors"
              >
                Close & Return to Master Ledger
              </button>
            </div>
          </div>
        ) : isApprovedStep ? (
          <div className="p-6 space-y-5 bg-emerald-50/50">
            <div className="bg-emerald-100 border border-emerald-300 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-700 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-emerald-900">Madam Lim Approval Granted</h3>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Payment sign-off successfully recorded by Madam Lim. You can now finalize and update the Master Ledger.
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Target Record Updates (Cols L, P, Q, R, S, T)
              </div>
              <ul className="text-xs space-y-1.5 text-slate-600 font-mono">
                <li>• <strong className="text-slate-900">Column L (Payment Status):</strong> Paid</li>
                <li>• <strong className="text-slate-900">Column P (Payment Date):</strong> {paymentDate || getTodayDateStr()}</li>
                <li>• <strong className="text-slate-900">Column Q (Payment Method):</strong> Bank Transfer</li>
                <li>• <strong className="text-slate-900">Column R (Approved By):</strong> Madam Lim</li>
                <li>• <strong className="text-slate-900">Column S (Payment Priority):</strong> High / Medium / Low</li>
                <li>• <strong className="text-slate-900">Column T (Duplicate Check):</strong> No Duplicate Found or Possible Duplicate</li>
              </ul>
              <div className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-100">
                Note: Columns A-K, M-O are read-only and will remain untouched.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs rounded transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleExecuteMasterLedgerUpdate}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded shadow-md transition-all flex items-center gap-2 animate-pulse hover:animate-none"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Update Master Ledger</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleAuthorize} className="p-6 space-y-5">
            
            {/* Target Amount Banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center justify-between shadow-2xs">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Total Payment Authorization Amount
                </div>
                <div className="text-2xl font-bold text-slate-900 mt-0.5">
                  {formatSGD(totalAmountSGD)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Authorizing {targetRows.length} Supplier Invoice(s)
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-semibold text-slate-700 bg-white border border-slate-300 px-2.5 py-1 rounded shadow-2xs">
                  Approver: Madam Lim
                </span>
              </div>
            </div>

            {/* Ineligible Lock Banner */}
            {hasIneligible && (
              <div className="bg-rose-50 border-2 border-rose-600 rounded-lg p-4 space-y-2 text-rose-950">
                <div className="font-extrabold text-xs uppercase text-rose-800 flex items-center gap-1.5 animate-pulse">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>PAYMENT CONTROL FAILED: APPROVAL LOCKED</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  One or more of the selected invoices have failed critical payment controls (Match Status, missing bank account, duplicate check, or incomplete human review). You must resolve these issues before Madam Lim can authorize this payment.
                </p>
                <div className="text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded inline-block">
                  Current Payment Status: Payment On Hold
                </div>
              </div>
            )}

            {/* Missing Bank Account Warning Banner */}
            {!hasIneligible && targetRows.some(r => isBankAccountMissing(r.bankAccount)) && (
              <MissingBankBanner />
            )}

            {/* Warning Banner if any target row has duplicate flag */}
            {!hasIneligible && targetRows.some(r => r.duplicateCheck === 'Possible Duplicate' || r.duplicateCheck.startsWith('Potential Duplicate')) && (
              <DuplicateInvoiceBanner />
            )}

            {/* List of items being approved */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 max-h-36 overflow-y-auto space-y-1.5 text-xs scrollbar-thin scrollbar-thumb-slate-300">
              {targetRows.map(r => (
                <div key={r.id} className="flex items-center justify-between py-1 border-b border-slate-200/80 last:border-0">
                  <div className="font-medium text-slate-800">
                    {r.supplierName} <span className="text-blue-700 font-mono">({r.invoiceNumber})</span>
                  </div>
                  <div className="font-mono font-bold text-slate-900">
                    {formatSGD(r.totalAmount)}
                  </div>
                </div>
              ))}
            </div>

            {/* Payment Method & Date Controls */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                  Column Q: Payment Method
                </label>
                <select
                  value={paymentMethod}
                  disabled={hasIneligible}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:opacity-50"
                >
                  <option value="Bank Transfer">Bank Transfer (Standard)</option>
                  <option value="GIRO">Corporate GIRO</option>
                  <option value="FAST">FAST Bank Transfer</option>
                  <option value="Cheque">Company Cheque</option>
                  <option value="Telegraphic Transfer">Telegraphic Transfer (TT)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  Column P: Payment Date
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  disabled={hasIneligible}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Footer Submit Button */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs rounded transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={hasIneligible}
                className={`px-5 py-2.5 text-white font-bold text-xs rounded shadow-xs transition-colors flex items-center gap-2 ${
                  hasIneligible 
                    ? 'bg-slate-400 cursor-not-allowed border border-slate-500' 
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Authorize Payment as Madam Lim</span>
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
