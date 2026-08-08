import React from 'react';
import { MasterLedgerRow } from '../types';
import { formatSGD } from '../utils/paymentRules';
import { CheckCircle2, ShieldCheck, Building } from 'lucide-react';

interface PaidInvoicesViewProps {
  rows: MasterLedgerRow[];
  onOpenRowDetail: (row: MasterLedgerRow) => void;
}

export const PaidInvoicesView: React.FC<PaidInvoicesViewProps> = ({
  rows,
  onOpenRowDetail
}) => {
  const paidRows = rows.filter(r => r.paymentStatus === 'Paid' || r.paymentStatus === 'paid');

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
      
      {/* Header Banner */}
      <div className="p-4 px-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Recorded Paid Invoices</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Invoices that have completed the Accounts Payable workflow with Master Ledger updated.
            </p>
          </div>
        </div>

        <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs px-3 py-1 rounded-full">
          {paidRows.length} Paid Records
        </span>
      </div>

      {/* Paid Invoices List */}
      <div className="p-4 space-y-3">
        {paidRows.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No paid invoices recorded in Master Ledger yet.
          </div>
        ) : (
          paidRows.map(r => (
            <div 
              key={r.id}
              onClick={() => onOpenRowDetail(r)}
              className="bg-slate-50/70 hover:bg-slate-100/80 border border-slate-200 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-colors"
            >
              {/* Left Details */}
              <div>
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span>{r.supplierName}</span>
                </div>
                <div className="text-xs text-slate-500 font-mono mt-0.5">
                  Invoice <strong className="text-slate-700">#{r.invoiceNumber}</strong> • PO: <strong className="text-slate-700">{r.poReference}</strong>
                </div>
              </div>

              {/* Right Details */}
              <div className="flex items-center gap-4 text-xs font-medium text-slate-600 flex-wrap sm:justify-end">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block font-semibold">Amount</span>
                  <strong className="text-slate-900 font-mono font-bold">{formatSGD(r.totalAmount)} SGD</strong>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px] uppercase block font-semibold">Paid On</span>
                  <strong className="text-emerald-700">{r.paymentDate || '3 Aug 2026'}</strong>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px] uppercase block font-semibold">Method</span>
                  <strong className="text-slate-800">{r.paymentMethod || 'Bank Transfer'}</strong>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px] uppercase block font-semibold">Approved By</span>
                  <strong className="text-slate-900 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    {r.approvedBy || 'Madam Lim'}
                  </strong>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};
