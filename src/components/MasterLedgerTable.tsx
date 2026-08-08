import React, { useState } from 'react';
import { MasterLedgerRow, PaymentPriority, PaymentStatus, UserRole } from '../types';
import { formatSGD, isBankAccountMissing } from '../utils/paymentRules';
import { 
  Lock, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ShieldAlert, 
  ChevronDown, 
  Sparkles, 
  Eye, 
  ArrowUpDown,
  AlertTriangle,
  Send,
  Building,
  Check,
  FileCheck2,
  ListOrdered
} from 'lucide-react';

interface MasterLedgerTableProps {
  rows: MasterLedgerRow[];
  currentUser: UserRole;
  selectedRowIds: string[];
  onToggleSelectRow: (id: string) => void;
  onToggleSelectAll: () => void;
  onUpdateRowPaymentStatus: (id: string, status: PaymentStatus) => void;
  onUpdateRowPriority: (id: string, priority: PaymentPriority) => void;
  onOpenRowDetail: (row: MasterLedgerRow) => void;
  onOpenMadamLimApproval: (rows: MasterLedgerRow[]) => void;
  onRecommendSingleRow: (row: MasterLedgerRow) => void;
  onUpdateMasterLedger: (rowIds: string[]) => void;
  activeFilter: string;
}

export const MasterLedgerTable: React.FC<MasterLedgerTableProps> = ({
  rows,
  currentUser,
  selectedRowIds,
  onToggleSelectRow,
  onToggleSelectAll,
  onUpdateRowPaymentStatus,
  onUpdateRowPriority,
  onOpenRowDetail,
  onOpenMadamLimApproval,
  onRecommendSingleRow,
  onUpdateMasterLedger,
  activeFilter
}) => {
  const [sortField, setSortField] = useState<keyof MasterLedgerRow>('dueDate');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Sorting handler
  const handleSort = (field: keyof MasterLedgerRow) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const getPriorityRank = (p: string | undefined): number => {
    const val = (p || '').toLowerCase();
    if (val === 'urgent' || val === 'high') return 1;
    if (val === 'medium') return 2;
    if (val === 'low') return 3;
    return 4;
  };

  const sortedRows = [...rows].sort((a, b) => {
    // If active view is payment-queue OR sortField is paymentPriority, sort strictly by Priority then Due Date
    if (activeFilter === 'payment-queue' || sortField === 'paymentPriority') {
      const rankA = getPriorityRank(a.paymentPriority);
      const rankB = getPriorityRank(b.paymentPriority);
      if (rankA !== rankB) {
        return sortAsc ? rankA - rankB : rankB - rankA;
      }
      // Secondary sort: Due Date (Ascending date)
      const dateA = new Date(a.dueDate).getTime() || 0;
      const dateB = new Date(b.dueDate).getTime() || 0;
      return dateA - dateB;
    }

    let valA = a[sortField];
    let valB = b[sortField];

    if (typeof valA === 'string') {
      valA = (valA as string).toLowerCase();
      valB = (valB as string).toLowerCase();
    }

    if (valA! < valB!) return sortAsc ? -1 : 1;
    if (valA! > valB!) return sortAsc ? 1 : -1;
    return 0;
  });

  const allSelected = sortedRows.length > 0 && selectedRowIds.length === sortedRows.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
      
      {/* Table Section Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        
        {/* Active Payment Queue Special Banner */}
        {activeFilter === 'payment-queue' && (
          <div className="bg-slate-900 text-white px-5 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg text-white font-bold shrink-0">
                <ListOrdered className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm text-white tracking-tight uppercase">Payment Queue (Eligible Invoices)</h3>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded font-bold uppercase">
                    3-Way Match & Bank Verified
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Sorted by: <strong className="text-blue-300 underline font-bold">1. Payment Priority</strong> then <strong className="text-blue-300 underline font-bold">2. Due Date</strong>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Queue Invoices</span>
                <span className="font-bold text-white text-sm">{sortedRows.length} Items</span>
              </div>
              <div className="text-right border-l border-slate-700 pl-4">
                <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Queue Total Value</span>
                <span className="font-bold text-blue-300 text-sm font-mono">{formatSGD(sortedRows.reduce((acc, r) => acc + r.totalAmount, 0))}</span>
              </div>
            </div>
          </div>
        )}

        {/* Madam Lim Approved Invoices Banner */}
        {rows.some(r => r.paymentStatus === 'Approved') && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span className="font-bold text-emerald-900">
                Madam Lim Payment Authorization Active:
              </span>
              <span className="text-emerald-800">
                {rows.filter(r => r.paymentStatus === 'Approved').length} invoice(s) approved by Madam Lim. Click to finalize and save updates to Master Ledger.
              </span>
            </div>
            <button
              onClick={() => {
                const approvedIds = rows.filter(r => r.paymentStatus === 'Approved').map(r => r.id);
                onUpdateMasterLedger(approvedIds);
              }}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded shadow-xs transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Update Master Ledger ({rows.filter(r => r.paymentStatus === 'Approved').length})</span>
            </button>
          </div>
        )}

        {/* Table Top Legend Banner */}
        <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between text-xs gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <span className="h-2 w-2 rounded-full bg-blue-600"></span>
              Worksheet: Master Ledger
            </span>

            <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-medium">
                <Lock className="w-3 h-3 text-slate-400" /> Cols A-K, M-O: Read Only (Extraction & Match System)
              </span>
              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded text-[11px] font-semibold">
                <Edit3 className="w-3 h-3 text-blue-600" /> Cols L, P-T: Managed by Payment Assistant
              </span>
            </div>
          </div>

          <div className="text-slate-500 text-xs">
            Showing <strong className="text-slate-800">{sortedRows.length}</strong> of {rows.length} records
          </div>
        </div>

        {/* Scrollable Container */}
        <div className="overflow-x-auto max-h-[620px] scrollbar-thin scrollbar-thumb-slate-300">
          <table className="w-full text-left text-xs border-collapse">
            
            {/* Header Group Row */}
            <thead>
              <tr className="bg-slate-100 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-200">
                <th className="py-2 px-3 text-center border-r border-slate-200" colSpan={1}>
                  Select
                </th>
                <th className="py-2 px-3 bg-slate-100/90 text-slate-600 border-r border-slate-200" colSpan={10}>
                  <div className="flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" /> READ ONLY — Extraction & 3-Way Match Data (Cols A - K)
                  </div>
                </th>
                <th className="py-2 px-3 bg-blue-100/70 text-blue-900 border-r border-blue-200" colSpan={1}>
                  <div className="flex items-center gap-1">
                    <Edit3 className="w-3 h-3 text-blue-700" /> Col L: Payment Status
                  </div>
                </th>
                <th className="py-2 px-3 bg-slate-100/90 text-slate-600 border-r border-slate-200" colSpan={3}>
                  <div className="flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" /> READ ONLY — Verification (Cols M - O)
                  </div>
                </th>
                <th className="py-2 px-3 bg-blue-100/70 text-blue-900 border-r border-slate-200" colSpan={5}>
                  <div className="flex items-center gap-1">
                    <Edit3 className="w-3 h-3 text-blue-700" /> MANAGED BY APP — Payment Details (Cols P - T)
                  </div>
                </th>
                <th className="py-2 px-3 text-right">Actions</th>
              </tr>

              {/* Main Column Header Row */}
              <tr className="bg-slate-50 text-slate-600 text-[11px] font-bold uppercase border-b border-slate-200 sticky top-0 z-10">
                
                {/* Select All Checkbox */}
                <th className="py-3 px-3 text-center border-r border-slate-200">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onToggleSelectAll}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 bg-white"
                  />
                </th>

                {/* Col A: Supplier Name */}
                <th 
                  onClick={() => handleSort('supplierName')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 border-r border-slate-200 whitespace-nowrap text-slate-700"
                >
                  <div className="flex items-center gap-1">
                    <span>A: Supplier Name</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                {/* Col B: Invoice Number */}
                <th 
                  onClick={() => handleSort('invoiceNumber')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 border-r border-slate-200 whitespace-nowrap text-slate-700"
                >
                  <div className="flex items-center gap-1">
                    <span>B: Inv #</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                {/* Col C: PO Reference */}
                <th className="py-3 px-3 border-r border-slate-200 whitespace-nowrap">C: PO Ref</th>

                {/* Col D: Invoice Date */}
                <th className="py-3 px-3 border-r border-slate-200 whitespace-nowrap">D: Inv Date</th>

                {/* Col E: Due Date */}
                <th 
                  onClick={() => handleSort('dueDate')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 border-r border-slate-200 whitespace-nowrap text-blue-700"
                >
                  <div className="flex items-center gap-1">
                    <span>E: Due Date</span>
                    <ArrowUpDown className="w-3 h-3 text-blue-600" />
                  </div>
                </th>

                {/* Col F: Description */}
                <th className="py-3 px-3 border-r border-slate-200 min-w-[170px]">F: Description</th>

                {/* Col G: Qty */}
                <th className="py-3 px-3 border-r border-slate-200 text-right">G: Qty</th>

                {/* Col H: Unit Price */}
                <th className="py-3 px-3 border-r border-slate-200 text-right">H: Unit Price</th>

                {/* Col I: Total Amount */}
                <th 
                  onClick={() => handleSort('totalAmount')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 border-r border-slate-200 text-right whitespace-nowrap font-bold text-slate-900"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>I: Total Amount</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                {/* Col J: Extraction Status */}
                <th className="py-3 px-3 border-r border-slate-200 whitespace-nowrap">J: Extraction</th>

                {/* Col K: Match Status */}
                <th className="py-3 px-3 border-r border-slate-200 whitespace-nowrap">K: Match Status</th>

                {/* Col L: Payment Status (Managed) */}
                <th className="py-3 px-3 bg-blue-100/50 border-r border-blue-200 whitespace-nowrap text-blue-900 font-bold">
                  L: Payment Status
                </th>

                {/* Col M: Human Review */}
                <th className="py-3 px-3 border-r border-slate-200 whitespace-nowrap">M: Review</th>

                {/* Col N: Confidence */}
                <th className="py-3 px-3 border-r border-slate-200 whitespace-nowrap text-right">N: Conf %</th>

                {/* Col O: Bank Account */}
                <th className="py-3 px-3 border-r border-slate-200 whitespace-nowrap">O: Bank Account</th>

                {/* Col P: Payment Date */}
                <th className="py-3 px-3 bg-blue-50/50 border-r border-slate-200 whitespace-nowrap">P: Pay Date</th>

                {/* Col Q: Payment Method */}
                <th className="py-3 px-3 bg-blue-50/50 border-r border-slate-200 whitespace-nowrap">Q: Pay Method</th>

                {/* Col R: Approved By */}
                <th className="py-3 px-3 bg-blue-50/50 border-r border-slate-200 whitespace-nowrap font-semibold text-emerald-700">R: Approved By</th>

                {/* Col S: Payment Priority */}
                <th className="py-3 px-3 bg-blue-50/50 border-r border-slate-200 whitespace-nowrap">S: Priority</th>

                {/* Col T: Duplicate Check */}
                <th className="py-3 px-3 bg-blue-50/50 border-r border-slate-200 whitespace-nowrap">T: Duplicate Check</th>

                {/* Action Column */}
                <th className="py-3 px-3 text-right whitespace-nowrap">Action</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={21} className="py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <FileCheck2 className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-700 text-sm">No Invoice Records In Master Ledger</p>
                        <p className="text-xs text-slate-400 mt-1">
                          No invoices have been uploaded or matched yet. Use 'Simulate Extracted Invoice' to insert pre-extracted invoice data.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedRows.map((row) => {
                  const isSelected = selectedRowIds.includes(row.id);
                  const isDuplicate = row.duplicateCheck === 'Possible Duplicate' || row.duplicateCheck.startsWith('Potential Duplicate');
                  const isMissingBank = isBankAccountMissing(row.bankAccount);
                  const isMatched = row.matchStatus === '3-Way Matched';

                  // Row background styling according to status
                  let rowBg = 'hover:bg-slate-50/90';
                  if (isSelected) rowBg = 'bg-blue-50/80';
                  else if (isDuplicate) rowBg = 'bg-rose-50/40';
                  else if (row.paymentPriority === 'Urgent') rowBg = 'bg-amber-50/30';
                  else if (row.paymentStatus === 'Recommended') rowBg = 'bg-blue-50/20';

                  return (
                    <tr 
                      key={row.id}
                      className={`transition-colors ${rowBg}`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center border-r border-slate-100">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleSelectRow(row.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 bg-white"
                        />
                      </td>

                      {/* Col A: Supplier Name */}
                      <td className="py-3 px-3 font-semibold text-slate-900 border-r border-slate-100 whitespace-nowrap">
                        {row.supplierName}
                      </td>

                      {/* Col B: Invoice Number */}
                      <td className="py-3 px-3 font-mono text-xs font-medium text-slate-600 border-r border-slate-100 whitespace-nowrap">
                        {row.invoiceNumber}
                      </td>

                      {/* Col C: PO Reference */}
                      <td className="py-3 px-3 font-mono text-xs text-slate-500 border-r border-slate-100 whitespace-nowrap">
                        {row.poReference}
                      </td>

                      {/* Col D: Invoice Date */}
                      <td className="py-3 px-3 text-slate-500 border-r border-slate-100 whitespace-nowrap">
                        {row.invoiceDate}
                      </td>

                      {/* Col E: Due Date & Priority styling */}
                      <td className="py-3 px-3 border-r border-slate-100 whitespace-nowrap">
                        <span className={
                          row.paymentPriority === 'Urgent' 
                            ? 'font-bold text-rose-600' 
                            : row.paymentPriority === 'High'
                            ? 'font-semibold text-amber-600'
                            : 'text-slate-700'
                        }>
                          {row.dueDate}
                        </span>
                      </td>

                      {/* Col F: Description */}
                      <td className="py-3 px-3 border-r border-slate-100 text-slate-600 max-w-[200px] truncate" title={row.description}>
                        {row.description}
                      </td>

                      {/* Col G: Quantity */}
                      <td className="py-3 px-3 border-r border-slate-100 text-right font-mono text-slate-600">
                        {row.quantity}
                      </td>

                      {/* Col H: Unit Price */}
                      <td className="py-3 px-3 border-r border-slate-100 text-right font-mono text-slate-600">
                        ${row.unitPrice.toFixed(2)}
                      </td>

                      {/* Col I: Total Amount */}
                      <td className="py-3 px-3 border-r border-slate-100 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatSGD(row.totalAmount)}
                      </td>

                      {/* Col J: Extraction Status */}
                      <td className="py-3 px-3 border-r border-slate-100 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {row.extractionStatus}
                        </span>
                      </td>

                      {/* Col K: Match Status Badge */}
                      <td className="py-3 px-3 border-r border-slate-100 whitespace-nowrap">
                        {row.matchStatus === '3-Way Matched' ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                            3-WAY OK
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px]">
                            {row.matchStatus}
                          </span>
                        )}
                      </td>

                      {/* Col L: Payment Status (Editable Dropdown) */}
                      <td className="py-3 px-3 bg-blue-50/30 border-r border-blue-100 whitespace-nowrap">
                        <select
                          value={row.paymentStatus}
                          onChange={(e) => onUpdateRowPaymentStatus(row.id, e.target.value as PaymentStatus)}
                          className={`text-xs font-bold px-2 py-1 rounded border focus:outline-none transition-colors ${
                            row.paymentStatus === 'Paid'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}
                        >
                          <option value="Paid">Paid</option>
                          <option value="Payment on Hold">Payment on Hold</option>
                        </select>
                      </td>

                      {/* Col M: Human Review */}
                      <td className="py-3 px-3 border-r border-slate-100 whitespace-nowrap">
                        <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                          row.humanReview === 'Verified' 
                            ? 'text-emerald-700 bg-emerald-50' 
                            : 'text-amber-700 bg-amber-50'
                        }`}>
                          {row.humanReview}
                        </span>
                      </td>

                      {/* Col N: Confidence Level */}
                      <td className="py-3 px-3 border-r border-slate-100 text-right font-mono text-slate-600 font-semibold">
                        {row.confidenceLevel}%
                      </td>

                      {/* Col O: Bank Account */}
                      <td className="py-3 px-3 border-r border-slate-100 whitespace-nowrap font-mono text-xs">
                        {isMissingBank ? (
                          <span className="text-rose-900 font-bold bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300 text-[10px] inline-flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            {row.bankAccount && row.bankAccount.trim() !== '' ? row.bankAccount : 'Not Found'} (On Hold)
                          </span>
                        ) : (
                          <span className="text-slate-600">{row.bankAccount}</span>
                        )}
                      </td>

                      {/* Col P: Payment Date */}
                      <td className="py-3 px-3 bg-slate-50/50 border-r border-slate-100 whitespace-nowrap font-mono text-slate-600">
                        {row.paymentDate || '—'}
                      </td>

                      {/* Col Q: Payment Method */}
                      <td className="py-3 px-3 bg-slate-50/50 border-r border-slate-100 whitespace-nowrap text-slate-600 font-medium">
                        {row.paymentMethod}
                      </td>

                      {/* Col R: Approved By */}
                      <td className="py-3 px-3 bg-slate-50/50 border-r border-slate-100 whitespace-nowrap font-semibold">
                        {row.approvedBy === 'Madam Lim' ? (
                          <span className="text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" /> Madam Lim
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">{row.approvedBy}</span>
                        )}
                      </td>

                      {/* Col S: Payment Priority Badge */}
                      <td className="py-3 px-3 bg-slate-50/50 border-r border-slate-100 whitespace-nowrap">
                        {row.paymentPriority === 'Urgent' ? (
                          <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-bold text-[10px]">URGENT</span>
                        ) : row.paymentPriority === 'High' ? (
                          <span className="px-2 py-0.5 rounded bg-amber-500 text-white font-bold text-[10px]">HIGH</span>
                        ) : row.paymentPriority === 'Medium' ? (
                          <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold text-[10px]">MED</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-400 text-white font-bold text-[10px]">LOW</span>
                        )}
                      </td>

                      {/* Col T: Duplicate Check */}
                      <td className="py-3 px-3 bg-slate-50/50 border-r border-slate-100 whitespace-nowrap">
                        {isDuplicate ? (
                          <span className="px-2 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-900 font-bold text-[10px] inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Possible Duplicate
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-[10px]">
                            {row.duplicateCheck || 'No Duplicate Found'}
                          </span>
                        )}
                      </td>

                      {/* Row Action Buttons */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* Single Row Recommendation Button */}
                          {row.paymentStatus === 'Payment on Hold' && isMatched && !isDuplicate && !isMissingBank && (
                            <button
                              onClick={() => onOpenMadamLimApproval([row])}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded shadow-xs transition-colors flex items-center gap-1"
                              title="Madam Lim Sign-off & Approve Payment"
                            >
                              <Lock className="w-3 h-3" /> Approve Payment
                            </button>
                          )}

                          {/* View Audit Details */}
                          <button
                            onClick={() => onOpenRowDetail(row)}
                            className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded transition-colors"
                            title="Inspect row details & audit trail"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination / Sync Bar Style */}
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex justify-between items-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Master Ledger Sync Active</p>
          <div className="flex items-center space-x-3 text-xs">
            {selectedRowIds.length > 0 && (
              <button
                onClick={() => {
                  const selectedRows = rows.filter(r => selectedRowIds.includes(r.id));
                  onOpenMadamLimApproval(selectedRows);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-bold shadow-xs"
              >
                Batch Approve Selected ({selectedRowIds.length})
              </button>
            )}
            <p className="text-[10px] text-slate-500 italic">Displaying only invoices with 'Match Status: Verified'</p>
          </div>
        </div>

      </div>
    </div>
  );
};
