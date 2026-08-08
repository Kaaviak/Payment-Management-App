import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { 
  Building2, 
  ShieldCheck, 
  UserCheck, 
  FileSpreadsheet, 
  RotateCcw, 
  Download, 
  PlusCircle,
  Search,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Clock
} from 'lucide-react';

interface HeaderProps {
  currentUser: UserRole;
  onToggleUserRole: () => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  onOpenRecommendationModal: () => void;
  onOpenAddInvoiceModal: () => void;
  onOpenGoogleWorkspace: () => void;
  onSyncExcelSheet: () => void;
  onExportExcel: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onResetData: () => void;
  onOpenAiAssistant: () => void;
  recommendedCount: number;
  pendingApprovalCount: number;
  syncedSheetId?: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onToggleUserRole,
  searchTerm,
  onSearchChange,
  onOpenRecommendationModal,
  onOpenAddInvoiceModal,
  onOpenGoogleWorkspace,
  onSyncExcelSheet,
  onExportExcel,
  onFileUpload,
  onResetData,
  onOpenAiAssistant,
  recommendedCount,
  pendingApprovalCount,
  syncedSheetId
}) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <header className="bg-[#0b1329] text-white sticky top-0 z-30 shrink-0 border-b border-slate-800/80 shadow-md">
      {/* Top Header Navigation Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap justify-between items-center gap-3">
        
        {/* Left Company Identity */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-amber-500 text-slate-950 flex items-center justify-center font-black text-lg rounded shadow-sm shrink-0">
            <Building2 className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap">
              <h1 className="text-base font-bold tracking-tight text-white">
                Boon Huat Hardware & Supplies Pte Ltd
              </h1>
              <span className="bg-amber-500/15 text-amber-400 border border-amber-500/40 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                SG AP Assistant
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap">
              <span className="text-slate-300 font-medium">Accounts Payable Workflow</span>
              <button
                onClick={onToggleUserRole}
                className="ml-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-amber-300 text-[11px] font-semibold rounded-full transition-colors"
                title="Active Approver in workflow"
              >
                <ShieldCheck className="w-3 h-3 text-amber-400" />
                <span>Approver: <strong className="text-white font-bold">{currentUser.name}</strong></span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center space-x-2 flex-wrap">
          
          {/* Sync Excel Sheet Button */}
          <button
            onClick={onSyncExcelSheet}
            className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-1.5 rounded-md text-xs font-extrabold shadow-sm cursor-pointer transition-colors"
            title="Sync latest data with connected Google Sheet / Excel file"
          >
            <FileSpreadsheet className="w-4 h-4 text-slate-950" />
            <span>Sync Excel Sheet</span>
          </button>

          {/* Upload File (.xlsx/.csv) Option */}
          <label className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1.5 rounded-md text-xs font-semibold shadow-xs cursor-pointer transition-colors" title="Upload local Excel or CSV file">
            <span>Upload File</span>
            <input 
              type="file" 
              accept=".xlsx,.xls,.csv" 
              onChange={onFileUpload} 
              className="hidden" 
            />
          </label>

          {/* Sign in with Google Pill */}
          <button
            onClick={onOpenGoogleWorkspace}
            className="flex items-center space-x-1.5 bg-white hover:bg-slate-100 text-slate-800 px-3 py-1.5 rounded-md text-xs font-semibold shadow-xs border border-slate-200 transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Google Sheets</span>
          </button>

          {/* Export Updated Excel */}
          <button
            onClick={onExportExcel}
            className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-md transition-colors"
            title="Download Updated Excel Sheet"
          >
            <Download className="w-3.5 h-3.5 text-emerald-200" />
            <span>Export Excel</span>
          </button>

          {/* Clear / Reset Data Button */}
          <button
            onClick={onResetData}
            className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold rounded-md transition-colors"
            title="Clear Ledger Data"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Clear</span>
          </button>

        </div>
      </div>
    </header>
  );
};
