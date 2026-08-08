import React, { useState } from 'react';
import { MasterLedgerRow, PaymentPriority, PaymentStatus, UserRole } from '../types';
import { formatSGD, isBankAccountMissing } from '../utils/paymentRules';
import { 
  Lock, 
  Edit3, 
  CheckCircle2, 
  Search, 
  ExternalLink,
  ArrowUpDown,
  Filter,
  ShieldCheck
} from 'lucide-react';

interface MasterLedgerWorksheetViewProps {
  rows: MasterLedgerRow[];
  currentUser: UserRole;
  selectedRowIds: string[];
  onToggleSelectRow: (id: string) => void;
  onToggleSelectAll: () => void;
  onUpdateRowPaymentStatus: (id: string, status: PaymentStatus) => void;
  onUpdateRowPriority: (id: string, priority: PaymentPriority) => void;
  onOpenRowDetail: (row: MasterLedgerRow) => void;
  onOpenMadamLimApproval: (rows: MasterLedgerRow[]) => void;
  onOpenGoogleWorkspace: () => void;
}

export const MasterLedgerWorksheetView: React.FC<MasterLedgerWorksheetViewProps> = ({
  rows,
  currentUser,
  selectedRowIds,
  onToggleSelectRow,
  onToggleSelectAll,
  onUpdateRowPaymentStatus,
  onUpdateRowPriority,
  onOpenRowDetail,
  onOpenMadamLimApproval,
  onOpenGoogleWorkspace
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [recordFilter, setRecordFilter] = useState('all');
  const [sortField, setSortField] = useState<keyof MasterLedgerRow>('dueDate');
  const [sortAsc, setSortAsc] = useState(true);

  // Filter rows
  const filtered = rows.filter(r => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const match = 
        r.supplierName.toLowerCase().includes(term) ||
        r.invoiceNumber.toLowerCase().includes(term) ||
        r.poReference.toLowerCase().includes(term) ||
        r.description.toLowerCase().includes(term);
      if (!match) return false;
    }

    if (recordFilter === 'pending') return r.paymentStatus !== 'Paid';
    if (recordFilter === 'paid') return r.paymentStatus === 'Paid';
    if (recordFilter === 'flagged') return r.matchStatus !== '3-Way Matched' || r.duplicateCheck === 'Possible Duplicate';

    return true;
  });

  // Sort rows
  const sorted = [...filtered].sort((a, b) => {
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

  const handleSort = (field: keyof MasterLedgerRow) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
      
      {/* Top Header Controls Bar */}
      <div className="p-3.5 px-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <h3 className="font-bold text-slate-900 text-sm">Master Ledger Worksheet</h3>
          <span className="bg-slate-200/80 text-slate-700 px-2.5 py-0.5 rounded-full font-bold text-xs">
            {rows.length} Records
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Search bar */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search supplier, invoice #, PO..."
              className="w-full bg-white border border-slate-300 rounded-md pl-8 pr-3 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          {/* Filter Dropdown */}
          <select
            value={recordFilter}
            onChange={(e) => setRecordFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded-md px-3 py-1 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="all">All Records</option>
            <option value="pending">Pending Payments</option>
            <option value="paid">Paid Records</option>
            <option value="flagged">Flagged Records</option>
          </select>

          {/* Open Google Sheet Button */}
          <button
            onClick={onOpenGoogleWorkspace}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-md shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Google Sheet</span>
          </button>
        </div>
      </div>

      {/* Yellow Notice Bar */}
      <div className="bg-amber-50/90 border-b border-amber-200 px-4 py-2 flex flex-wrap items-center justify-between text-xs text-amber-900">
        <div className="flex items-center gap-3 font-semibold flex-wrap">
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-amber-700" />
            Columns A-K, M-O: Read-Only
          </span>
          <span>|</span>
          <span className="flex items-center gap-1">
            <Edit3 className="w-3 h-3 text-amber-700" />
            Columns L, P-T: Managed by AI Payment Assistant
          </span>
        </div>

        <span className="text-[11px] text-amber-800 italic">
          Row index matches Google Sheets row number
        </span>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto max-h-[620px] scrollbar-thin scrollbar-thumb-slate-300">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="text-white text-[10px] font-bold uppercase tracking-wider sticky top-0 z-10">
              
              {/* Dark Navy Headers for Read-Only Columns A-K */}
              <th className="py-2.5 px-3 bg-[#0f172a] text-center border-r border-slate-700">ROW</th>
              <th onClick={() => handleSort('supplierName')} className="py-2.5 px-3 bg-[#0f172a] border-r border-slate-700 cursor-pointer hover:bg-slate-800">
                SUPPLIER (COL A)
              </th>
              <th onClick={() => handleSort('invoiceNumber')} className="py-2.5 px-3 bg-[#0f172a] border-r border-slate-700 cursor-pointer hover:bg-slate-800">
                INVOICE # (COL B)
              </th>
              <th onClick={() => handleSort('poReference')} className="py-2.5 px-3 bg-[#0f172a] border-r border-slate-700 cursor-pointer hover:bg-slate-800">
                PO REF (COL C)
              </th>
              <th onClick={() => handleSort('dueDate')} className="py-2.5 px-3 bg-[#0f172a] border-r border-slate-700 cursor-pointer hover:bg-slate-800">
                DUE DATE (COL E)
              </th>
              <th onClick={() => handleSort('totalAmount')} className="py-2.5 px-3 bg-[#0f172a] border-r border-slate-700 text-right cursor-pointer hover:bg-slate-800">
                AMOUNT (COL I)
              </th>
              <th className="py-2.5 px-3 bg-[#0f172a] border-r border-slate-700 text-center">
                EXTRACTION (COL J)
              </th>
              <th className="py-2.5 px-3 bg-[#0f172a] border-r border-slate-700 text-center">
                MATCH STATUS (COL K)
              </th>

              {/* Rust/Brown Headers for Managed Columns L, P-T */}
              <th className="py-2.5 px-3 bg-[#8a3b00] border-r border-amber-900 text-center">
                PAYMENT STATUS (COL L)
              </th>
              <th className="py-2.5 px-3 bg-[#8a3b00] border-r border-amber-900 text-center">
                PAYMENT PRIORITY (COL S)
              </th>
              <th className="py-2.5 px-3 bg-[#8a3b00] border-r border-amber-900 text-center">
                DUPLICATE CHECK (COL T)
              </th>
              <th className="py-2.5 px-3 bg-[#8a3b00] border-r border-amber-900 text-center">
                PAYMENT DATE (COL P)
              </th>
              <th className="py-2.5 px-3 bg-[#8a3b00] border-r border-amber-900 text-center">
                PAYMENT METHOD (COL Q)
              </th>
              <th className="py-2.5 px-3 bg-[#8a3b00] text-center">
                APPROVED BY (COL R)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sorted.map((r, idx) => {
              const rowNum = `#${idx + 2}`;
              return (
                <tr 
                  key={r.id}
                  onClick={() => onOpenRowDetail(r)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-3 text-center font-mono text-slate-500 font-bold border-r border-slate-200">
                    {rowNum}
                  </td>

                  <td className="py-3 px-3 font-bold text-slate-900 border-r border-slate-200">
                    {r.supplierName}
                  </td>

                  <td className="py-3 px-3 font-mono font-bold text-slate-800 border-r border-slate-200 whitespace-nowrap">
                    {r.invoiceNumber}
                  </td>

                  <td className="py-3 px-3 font-mono text-slate-600 border-r border-slate-200 whitespace-nowrap">
                    {r.poReference}
                  </td>

                  <td className="py-3 px-3 text-slate-700 border-r border-slate-200 whitespace-nowrap">
                    {r.dueDate}
                  </td>

                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap">
                    {formatSGD(r.totalAmount)}
                  </td>

                  <td className="py-3 px-3 text-center border-r border-slate-200 whitespace-nowrap">
                    <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] px-2 py-0.5 rounded font-medium">
                      {r.extractionStatus || 'Completed'}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-center border-r border-slate-200 whitespace-nowrap">
                    <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded border ${
                      r.matchStatus.includes('Flagged') || r.matchStatus.includes('Discrepancy')
                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    }`}>
                      {r.matchStatus}
                    </span>
                  </td>

                  {/* Managed Cols L, P-T */}
                  <td className="py-3 px-3 text-center border-r border-slate-200 whitespace-nowrap">
                    <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded ${
                      r.paymentStatus === 'Paid'
                        ? 'bg-emerald-600 text-white'
                        : r.paymentStatus === 'Approved'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-400 font-extrabold'
                        : 'bg-blue-100 text-blue-900 border border-blue-300'
                    }`}>
                      {r.paymentStatus}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-center border-r border-slate-200 whitespace-nowrap font-medium text-slate-700">
                    {r.paymentPriority || 'Low'}
                  </td>

                  <td className="py-3 px-3 text-center border-r border-slate-200 whitespace-nowrap">
                    <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded ${
                      r.duplicateCheck === 'Possible Duplicate'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'text-slate-600'
                    }`}>
                      {r.duplicateCheck === 'Possible Duplicate' ? 'Possible Duplicate' : 'No Duplicate Found'}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-center border-r border-slate-200 whitespace-nowrap font-mono text-slate-700">
                    {r.paymentDate || '-'}
                  </td>

                  <td className="py-3 px-3 text-center border-r border-slate-200 whitespace-nowrap text-slate-700">
                    {r.paymentMethod || '-'}
                  </td>

                  <td className="py-3 px-3 text-center whitespace-nowrap font-semibold text-slate-800">
                    {r.approvedBy || '-'}
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
};
