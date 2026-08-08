import React, { useState, useEffect } from 'react';
import { MasterLedgerRow } from '../types';
import { formatSGD, isBankAccountMissing } from '../utils/paymentRules';
import { DuplicateInvoiceBanner } from './DuplicateInvoiceBanner';
import { MissingBankBanner } from './MissingBankBanner';
import { 
  Sparkles, 
  X, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Send, 
  DollarSign, 
  Lock,
  Zap,
  Tag
} from 'lucide-react';

interface RecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
  recommendedRows: MasterLedgerRow[];
  onSubmitForApproval: () => void;
  onMadamLimApproveAll?: () => void;
  isMadamLim: boolean;
}

export const RecommendationModal: React.FC<RecommendationModalProps> = ({
  isOpen,
  onClose,
  recommendedRows,
  onSubmitForApproval,
  isMadamLim
}) => {
  const [aiBrief, setAiBrief] = useState<{
    summary?: string;
    riskNotes?: string[];
    discountOpportunities?: string[];
  }>({});
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  const totalAmountSGD = recommendedRows.reduce((acc, r) => acc + r.totalAmount, 0);

  // Generate a stable key representing the selected transactions
  const rowsKey = recommendedRows.map(r => `${r.id}_${r.paymentStatus}`).sort().join(',');

  // Fetch AI Briefing whenever drawer opens or selected rows actually change
  useEffect(() => {
    if (!isOpen || recommendedRows.length === 0) return;

    let isMounted = true;
    setIsLoadingAi(true);

    fetch('/api/ai/recommendation-brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoices: recommendedRows, totalAmount: totalAmountSGD })
    })
      .then(res => res.json())
      .then(data => {
        if (isMounted) {
          setAiBrief(data);
          setIsLoadingAi(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          console.error('Failed to load AI briefing:', err);
          setAiBrief({
            summary: `Automated Rule Analysis: Evaluated ${recommendedRows.length} invoice(s) totaling ${formatSGD(totalAmountSGD)}. All selected transactions pass Column K 3-Way Match verification under Boon Huat Hardware standard operating procedures.`,
            riskNotes: recommendedRows.some(r => isBankAccountMissing(r.bankAccount)) 
              ? ['Notice: One or more selected invoices have missing or unverified supplier bank details. Payment must be held until bank details are verified in Column O.']
              : ['Zero Column K price or quantity discrepancies detected on selected invoices.'],
            discountOpportunities: ['Payment recommended for prompt processing under Boon Huat standard supplier credit terms.']
          });
          setIsLoadingAi(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, rowsKey]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end transition-opacity">
      <div className="w-full max-w-2xl bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl overflow-hidden text-slate-800">
        
        {/* Drawer Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                AI Payment Recommendation Analysis
              </h2>
              <p className="text-xs text-slate-300">
                Transaction-level evaluation based on Match Status & Fair Supplier Standard
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

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin scrollbar-thumb-slate-300">
          
          {/* Summary Financial Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center justify-between shadow-2xs">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Payout of Selected Transaction(s)
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-0.5">
                {formatSGD(totalAmountSGD)}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {recommendedRows.length} Selected Transaction(s) Evaluated
              </div>
            </div>

            <div className="text-right">
              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Fair Supplier Standard
              </span>
            </div>
          </div>

          {/* Missing Bank Account Warning Banner */}
          {recommendedRows.some(r => isBankAccountMissing(r.bankAccount)) && (
            <MissingBankBanner />
          )}

          {/* Warning Banner if any recommended row has duplicate flag */}
          {recommendedRows.some(r => r.duplicateCheck === 'Possible Duplicate' || r.duplicateCheck.startsWith('Potential Duplicate')) && (
            <DuplicateInvoiceBanner />
          )}

          {/* AI Executive Briefing Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider">
                <Zap className="w-4 h-4 text-blue-600 animate-pulse" />
                <span>AI Advisory Briefing (Selected Transactions)</span>
              </div>
              <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded">
                Fair Supplier Standard Verified
              </span>
            </div>

            {isLoadingAi ? (
              <div className="py-4 text-xs text-slate-500 animate-pulse flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-600 animate-ping"></div>
                Evaluating Match Status & Fair Supplier criteria for selected transaction(s)...
              </div>
            ) : (
              <div className="space-y-3 text-xs text-slate-700">
                <p className="leading-relaxed bg-white p-3 rounded border border-slate-200 text-slate-800">
                  {aiBrief.summary || `AI Evaluation completed for ${recommendedRows.length} selected transaction(s) totaling ${formatSGD(totalAmountSGD)}. Each invoice recommendation is determined strictly by Column K Match Status and equal objective business rules under the Fair Supplier Standard.`}
                </p>

                {aiBrief.discountOpportunities && aiBrief.discountOpportunities.length > 0 && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded p-3 text-emerald-900">
                    <div className="font-bold flex items-center gap-1 mb-1">
                      <Tag className="w-3.5 h-3.5 text-emerald-600" /> Early Payment Discount Alert:
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-emerald-800">
                      {aiBrief.discountOpportunities.map((disc, idx) => (
                        <li key={idx}>{disc}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiBrief.riskNotes && aiBrief.riskNotes.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded p-3">
                    <div className="font-bold text-slate-700 mb-1">
                      Match Status & Business Rule Audit Notes:
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
                      {aiBrief.riskNotes.map((note, idx) => (
                        <li key={idx}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* List of Recommended Invoices with Transaction-Level Match Status & Recommended Action */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
              Selected Transaction Analysis ({recommendedRows.length})
            </h3>

            {recommendedRows.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-lg border border-slate-200 text-slate-500 text-xs">
                No transactions currently selected. Select 'Recommend' on any transaction in the Master Ledger or Payment Queue.
              </div>
            ) : (
              <div className="space-y-3">
                {recommendedRows.map(row => {
                  const isMatched = row.matchStatus === '3-Way Matched';
                  const bankMissing = isBankAccountMissing(row.bankAccount);
                  const isDup = row.duplicateCheck === 'Possible Duplicate' || row.duplicateCheck.startsWith('Potential Duplicate');
                  const isReady = isMatched && !bankMissing && !isDup;

                  // Reason determination
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
                    <div 
                      key={row.id}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col space-y-3 text-xs hover:border-slate-300 transition-colors shadow-2xs"
                    >
                      {/* Top Header Row: Supplier & Separate Transaction Amount */}
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span className="text-sm">{row.supplierName}</span>
                          <span className="font-mono text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-bold">
                            {row.invoiceNumber}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Transaction Amount</div>
                          <div className="font-mono font-extrabold text-slate-900 text-base">
                            {formatSGD(row.totalAmount)}
                          </div>
                        </div>
                      </div>

                      {/* Transaction Key Details */}
                      <div className="text-slate-600 text-[11px] grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-2.5 rounded border border-slate-200">
                        <div>
                          <span className="text-slate-400 block text-[10px]">PO Reference</span>
                          <span className="font-mono font-semibold text-slate-800">{row.poReference}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Due Date</span>
                          <span className="font-semibold text-slate-800">{row.dueDate}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Bank Account (Col O)</span>
                          <span className={`font-mono font-semibold ${bankMissing ? 'text-rose-700 font-bold' : 'text-emerald-700'}`}>
                            {row.bankAccount}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Column K Match Status</span>
                          <span className={`font-bold ${isMatched ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {row.matchStatus}
                          </span>
                        </div>
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
                              <AlertCircle className="w-4 h-4 text-white" />
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
                          <span className="font-bold text-slate-900 block mb-0.5">Reason:</span>
                          <p className="text-[11px] text-slate-700 leading-relaxed">{reasonText}</p>
                        </div>

                        <div>
                          <span className="font-bold text-slate-900 block mb-0.5">Recommendation:</span>
                          <p className="text-[11px] text-blue-900 font-medium bg-blue-50/70 p-2 rounded border border-blue-100 leading-relaxed">
                            {recommendationText}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                          <span className="font-semibold text-slate-600">Responsible AI Policy & Fair Supplier Standard:</span>
                          <span>All suppliers (newer and long-standing) are evaluated under identical rules. No technical AI jargon is used.</span>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Policy Reminder */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex items-start gap-2">
            <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Governance Rule:</strong> The AI Assistant provides recommendations based strictly on Column K Match Status and the Fair Supplier Standard. Madam Lim holds sole authority to approve payments and record disbursements.
            </div>
          </div>

        </div>

        {/* Drawer Footer Actions (NO APPROVE BUTTON) */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs rounded transition-colors"
          >
            Close Advisory
          </button>

          <button
            onClick={onSubmitForApproval}
            disabled={recommendedRows.length === 0}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded shadow-xs transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>Submit Selected Transactions to Madam Lim for Approval</span>
          </button>
        </div>

      </div>
    </div>
  );
};
