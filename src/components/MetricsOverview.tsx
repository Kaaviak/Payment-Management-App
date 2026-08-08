import React from 'react';
import { MasterLedgerRow } from '../types';
import { formatSGD, isBankAccountMissing } from '../utils/paymentRules';
import { 
  ShieldCheck, 
  Clock, 
  AlertTriangle, 
  Building, 
  DollarSign, 
  CheckCircle2,
  Sliders,
  Layers
} from 'lucide-react';

interface MetricsOverviewProps {
  rows: MasterLedgerRow[];
  onSelectFilter: (filterKey: string) => void;
  activeFilter: string;
}

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({
  rows,
  onSelectFilter,
  activeFilter
}) => {
  // Aggregate Counts from Rows
  const eligibleQueueRows = rows.filter(r => 
    r.paymentStatus?.toLowerCase() !== 'paid' && 
    r.paymentStatus !== 'On Hold' &&
    !isBankAccountMissing(r.bankAccount)
  );

  const highPriorityCount = rows.filter(r => r.paymentPriority === 'High' && r.paymentStatus?.toLowerCase() !== 'paid').length;
  
  const duplicateCount = rows.filter(r => 
    r.duplicateCheck === 'Possible Duplicate' || 
    r.duplicateCheck.startsWith('Potential Duplicate')
  ).length;

  const bankMissingCount = rows.filter(r => isBankAccountMissing(r.bankAccount)).length;

  const pendingRows = rows.filter(r => r.paymentStatus?.toLowerCase() !== 'paid');
  const pendingValueSGD = pendingRows.reduce((acc, r) => acc + r.totalAmount, 0);

  const paidRows = rows.filter(r => r.paymentStatus?.toLowerCase() === 'paid');
  const totalPaidSGD = paidRows.reduce((acc, r) => acc + r.totalAmount, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2 space-y-3">
      
      {/* Accounts Payable Stage 3 Banner Card */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 px-5 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-full bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Accounts Payable: Payment Management & Master Ledger Recording
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review ready invoices • Prioritise by due date • Flag duplicates • Verify bank details • Record Madam Lim approved payments
            </p>
          </div>
        </div>
      </div>

      {/* 6 KPI Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        
        {/* Card 1: ELIGIBLE QUEUE */}
        <button
          onClick={() => onSelectFilter('payment-queue')}
          className={`text-left p-3.5 rounded-xl border transition-all ${
            activeFilter === 'payment-queue' || activeFilter === 'all'
              ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-300/50 shadow-xs'
              : 'bg-white hover:bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            <span>ELIGIBLE QUEUE</span>
            <Layers className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {eligibleQueueRows.length}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
            Ready for Payment Review
          </div>
        </button>

        {/* Card 2: HIGH PRIORITY */}
        <button
          onClick={() => onSelectFilter('high-priority')}
          className={`text-left p-3.5 rounded-xl border transition-all ${
            activeFilter === 'high-priority'
              ? 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-300/50 shadow-xs'
              : 'bg-white hover:bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            <span className="text-rose-700">HIGH PRIORITY</span>
            <Clock className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-extrabold text-rose-700 tracking-tight">
            {highPriorityCount}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
            Overdue or Due today
          </div>
        </button>

        {/* Card 3: DUPLICATES */}
        <button
          onClick={() => onSelectFilter('duplicates')}
          className={`text-left p-3.5 rounded-xl border transition-all ${
            activeFilter === 'duplicates'
              ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-300/50 shadow-xs'
              : 'bg-white hover:bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            <span className="text-amber-800">DUPLICATES</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-amber-800 tracking-tight">
            {duplicateCount}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
            Flagged for Verification
          </div>
        </button>

        {/* Card 4: BANK MISSING */}
        <button
          onClick={() => onSelectFilter('bank-missing')}
          className={`text-left p-3.5 rounded-xl border transition-all ${
            activeFilter === 'bank-missing'
              ? 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-300/50 shadow-xs'
              : 'bg-white hover:bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            <span className="text-rose-800">BANK MISSING</span>
            <Building className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-extrabold text-rose-800 tracking-tight">
            {bankMissingCount}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
            Payment On Hold
          </div>
        </button>

        {/* Card 5: PENDING VALUE */}
        <button
          onClick={() => onSelectFilter('payment-queue')}
          className={`text-left p-3.5 rounded-xl border transition-all ${
            activeFilter === 'pending-value'
              ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-300/50 shadow-xs'
              : 'bg-white hover:bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            <span>PENDING VALUE</span>
            <DollarSign className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-extrabold text-slate-900 tracking-tight">
            {formatSGD(pendingValueSGD)}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
            SGD Total Pending
          </div>
        </button>

        {/* Card 6: TOTAL PAID */}
        <button
          onClick={() => onSelectFilter('paid')}
          className={`text-left p-3.5 rounded-xl border transition-all ${
            activeFilter === 'paid'
              ? 'bg-emerald-100/70 border-emerald-500 ring-2 ring-emerald-400/50 shadow-xs'
              : 'bg-emerald-50/40 hover:bg-emerald-50/70 border-emerald-300/80'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-1">
            <span>TOTAL PAID</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-extrabold text-emerald-700 tracking-tight">
            {formatSGD(totalPaidSGD)}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
            Master Ledger Updated
          </div>
        </button>

      </div>
    </div>
  );
};
