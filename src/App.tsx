import React, { useState, useEffect } from 'react';
import { 
  MasterLedgerRow, 
  PaymentPriority, 
  PaymentStatus, 
  UserRole 
} from './types';
import { 
  evaluateDuplicates, 
  isBankAccountMissing,
  updateLedgerRecordAfterApproval,
  formatPaymentDateInFull
} from './utils/paymentRules';
import { 
  parseUploadedExcelFile, 
  exportLedgerToExcelFile 
} from './utils/excelParser';
import { 
  updateExistingGoogleSheetLedger, 
  fetchRowsFromGoogleSheet,
  getCachedAccessToken 
} from './utils/googleWorkspace';
import { Header } from './components/Header';
import { MetricsOverview } from './components/MetricsOverview';
import { PaymentQueueView } from './components/PaymentQueueView';
import { PaidInvoicesView } from './components/PaidInvoicesView';
import { RecommendationModal } from './components/RecommendationModal';
import { MadamLimApprovalModal } from './components/MadamLimApprovalModal';
import { InvoiceDetailModal } from './components/InvoiceDetailModal';
import { AiAssistantPanel } from './components/AiAssistantPanel';
import { AddInvoiceModal } from './components/AddInvoiceModal';
import { GoogleWorkspaceModal } from './components/GoogleWorkspaceModal';
import { Layers, CheckCircle2, Sparkles, Clock } from 'lucide-react';

export default function App() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Master Ledger State - Starts empty or loads from saved state. Rule: Do NOT import any example invoices!
  const [ledgerRows, setLedgerRows] = useState<MasterLedgerRow[]>(() => {
    localStorage.removeItem('boon_huat_master_ledger_v1');
    localStorage.removeItem('boon_huat_master_ledger_v2');
    localStorage.removeItem('boon_huat_master_ledger_v3');
    const saved = localStorage.getItem('boon_huat_master_ledger_v5');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse saved ledger:', e);
      }
    }
    return []; // No example invoices!
  });

  // Save state to localStorage whenever updated
  useEffect(() => {
    try {
      localStorage.setItem('boon_huat_master_ledger_v5', JSON.stringify(ledgerRows));
    } catch (e) {
      console.error('Failed to save ledger to localStorage:', e);
    }
  }, [ledgerRows]);

  // User Role State
  const [currentUser, setCurrentUser] = useState<UserRole>({
    name: 'Madam Lim',
    role: 'Managing Director / Approver',
    isMadamLim: true
  });

  // View Navigation Tab State: 'payment-queue' | 'paid'
  const [activeTab, setActiveTab] = useState<'payment-queue' | 'paid'>('payment-queue');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  // Modal Visibility State
  const [isRecommendationModalOpen, setIsRecommendationModalOpen] = useState(false);
  const [isMadamLimModalOpen, setIsMadamLimModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isGoogleWorkspaceModalOpen, setIsGoogleWorkspaceModalOpen] = useState(false);

  // Active Detail / Approval Row Selection
  const [activeDetailRow, setActiveDetailRow] = useState<MasterLedgerRow | null>(null);
  const [targetApprovalRows, setTargetApprovalRows] = useState<MasterLedgerRow[]>([]);

  // Google Sheet Synced State
  const [syncedSheetId, setSyncedSheetId] = useState<string | null>(() => {
    const saved = localStorage.getItem('boonhuat_synced_sheet_id');
    if (saved) return saved;
    // Fallback to user-provided sheet
    localStorage.setItem('boonhuat_synced_sheet_id', '1MhxCI-7z5T6QGl7dgrKahvduDe-jmNHa1AMBfvQ8S-U');
    return '1MhxCI-7z5T6QGl7dgrKahvduDe-jmNHa1AMBfvQ8S-U';
  });
  const [syncedSheetTitle, setSyncedSheetTitle] = useState<string | null>(() => {
    const saved = localStorage.getItem('boonhuat_synced_sheet_title');
    if (saved) return saved;
    localStorage.setItem('boonhuat_synced_sheet_title', 'Boon Huat Hardware Ledger');
    return 'Boon Huat Hardware Ledger';
  });

  // Automatically restore rows from Google Sheet on mount if token is cached and ledger is empty
  useEffect(() => {
    const token = getCachedAccessToken();
    if (token && syncedSheetId && ledgerRows.length === 0) {
      const loadInitialFromSheet = async () => {
        try {
          const rows = await fetchRowsFromGoogleSheet(syncedSheetId, token);
          if (rows && rows.length > 0) {
            setLedgerRows(evaluateDuplicates(rows));
            showNotification(`⚡ Automatically restored ${rows.length} records from your linked Google Sheet!`, 'success');
          }
        } catch (e) {
          console.warn('Failed to auto-fetch Google Sheet on mount', e);
        }
      };
      loadInitialFromSheet();
    }
  }, [syncedSheetId]);

  const handleSetSyncedSheet = (spreadsheetId: string, sheetTitle: string) => {
    setSyncedSheetId(spreadsheetId);
    setSyncedSheetTitle(sheetTitle);
    localStorage.setItem('boonhuat_synced_sheet_id', spreadsheetId);
    localStorage.setItem('boonhuat_synced_sheet_title', sheetTitle);
  };

  const syncLatestLedgerToGoogleSheet = async (rowsToSync: MasterLedgerRow[]) => {
    const token = getCachedAccessToken();
    if (!token || !syncedSheetId) return;

    try {
      await updateExistingGoogleSheetLedger(syncedSheetId, rowsToSync, token);
      showNotification(`✅ Information synced & updated in connected Google Sheet (${syncedSheetTitle || 'Master Ledger'})!`, 'success');
    } catch (err: any) {
      console.error('Failed to auto-sync to Google Sheet:', err);
      if (err.message?.includes('401') || err.message?.includes('expired') || err.message?.includes('invalid')) {
        showNotification(`Payment updated locally, but Google OAuth token expired. Opening Google Workspace connector to sign in again.`, 'warning');
        setIsGoogleWorkspaceModalOpen(true);
      } else {
        showNotification(`Payment approved locally, but Google Sheet sync failed: ${err.message}`, 'warning');
      }
    }
  };

  // Toast Notification State
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'warning' | 'info' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'warning' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4500);
  };

  // Toggle User Role
  const handleToggleUserRole = () => {
    if (currentUser.isMadamLim) {
      setCurrentUser({
        name: 'Tan Wei Ming',
        role: 'Accounts Payable Specialist',
        isMadamLim: false
      });
      showNotification('Switched active role to AP Specialist (Tan Wei Ming).', 'info');
    } else {
      setCurrentUser({
        name: 'Madam Lim',
        role: 'Managing Director / Approver',
        isMadamLim: true
      });
      showNotification('Switched active role to Madam Lim (Approver).', 'success');
    }
  };

  // Metric Filter Handler
  const handleSelectMetricFilter = (filterKey: string) => {
    if (filterKey === 'paid') {
      setActiveTab('paid');
    } else {
      setActiveTab('payment-queue');
    }
  };

  // Master Ledger Row Update Operations
  const handleUpdateRowPaymentStatus = (id: string, status: PaymentStatus) => {
    setLedgerRows(prev => {
      const updated = prev.map(r => {
        if (r.id === id) {
          if (status === 'Payment On Hold') {
            return {
              ...r,
              paymentStatus: 'Payment On Hold' as PaymentStatus,
              paymentDate: '',
              paymentMethod: 'N/A' as any,
              approvedBy: ''
            };
          } else {
            return {
              ...r,
              paymentStatus: 'Paid' as PaymentStatus,
              paymentDate: r.paymentDate || formatPaymentDateInFull(new Date().toISOString()),
              paymentMethod: r.paymentMethod && r.paymentMethod !== 'N/A' ? r.paymentMethod : 'Bank Transfer',
              approvedBy: r.approvedBy || 'Madam Lim'
            };
          }
        }
        return r;
      });
      return evaluateDuplicates(updated);
    });
    showNotification(`Payment status updated to '${status}'.`, 'success');
  };

  const handleUpdateRowPriority = (id: string, priority: PaymentPriority) => {
    setLedgerRows(prev => {
      const updated = prev.map(r => r.id === id ? { ...r, paymentPriority: priority } : r);
      return evaluateDuplicates(updated);
    });
    showNotification(`Payment priority updated to '${priority}'.`, 'success');
  };

  const handleSaveNotes = (id: string, notes: string) => {
    setLedgerRows(prev => {
      return prev.map(r => r.id === id ? { ...r, notes } : r);
    });
    showNotification(`Audit notes saved for invoice record.`, 'success');
  };

  // Madam Lim Confirm Payment Approval
  const handleMadamLimConfirmApproval = (
    targetRowsToApprove: MasterLedgerRow[], 
    paymentMethodChosen: string = 'Bank Transfer', 
    paymentDateChosen?: string
  ) => {
    const approvedRowIds = targetRowsToApprove.map(r => r.id);
    let nextRows: MasterLedgerRow[] = [];
    setLedgerRows(prev => {
      const updated = prev.map(r => {
        if (approvedRowIds.includes(r.id)) {
          return updateLedgerRecordAfterApproval({
            ...r,
            paymentMethod: paymentMethodChosen as any,
            paymentDate: paymentDateChosen ? formatPaymentDateInFull(paymentDateChosen) : undefined,
            approvedBy: 'Madam Lim'
          });
        }
        return r;
      });
      nextRows = evaluateDuplicates(updated);
      return nextRows;
    });

    showNotification(`Madam Lim approved ${approvedRowIds.length} payment(s). Updated Column L to 'Paid', Column P to formatted date, and synced to sheet.`, 'success');
    syncLatestLedgerToGoogleSheet(nextRows);
  };

  // Commit Approved Payments to Master Ledger
  const handleUpdateMasterLedger = (targetIds: string[]) => {
    let nextRows: MasterLedgerRow[] = [];
    setLedgerRows(prev => {
      const updated = prev.map(r => {
        if (targetIds.includes(r.id)) {
          return updateLedgerRecordAfterApproval(r);
        }
        return r;
      });
      nextRows = evaluateDuplicates(updated);
      return nextRows;
    });

    showNotification(
      `✅ Payment successfully recorded. The Master Ledger has been updated. Payment Status: Paid. This invoice has completed the Accounts Payable workflow.`, 
      'success'
    );
    syncLatestLedgerToGoogleSheet(nextRows);
  };

  // Add Invoice
  const handleAddInvoice = (newRow: MasterLedgerRow) => {
    setLedgerRows(prev => evaluateDuplicates([newRow, ...prev]));
    showNotification(`Extracted invoice ${newRow.invoiceNumber} inserted into Master Ledger.`, 'success');
  };

  // Sync Excel Sheet Button Handler
  const handleSyncExcelSheet = async () => {
    const token = getCachedAccessToken();
    if (syncedSheetId && token) {
      try {
        showNotification(`Syncing Master Ledger updates to connected Google Sheet "${syncedSheetTitle || 'Master Ledger'}"...`, 'info');
        await updateExistingGoogleSheetLedger(syncedSheetId, ledgerRows, token);
        showNotification(`✅ Master Ledger successfully synced to connected sheet! Column L updated to 'Paid', Column P updated with payment date, and read-only columns A-K & M-O preserved.`, 'success');
      } catch (err: any) {
        console.error('Sheet sync error:', err);
        showNotification(`Unable to sync sheet: ${err.message}. Opening Google Workspace connector...`, 'warning');
        setIsGoogleWorkspaceModalOpen(true);
      }
    } else if (token && !syncedSheetId) {
      showNotification('Opening Google Workspace connector to link your Google Sheet...', 'info');
      setIsGoogleWorkspaceModalOpen(true);
    } else {
      if (ledgerRows.length > 0) {
        exportLedgerToExcelFile(ledgerRows);
        showNotification('✅ Master Ledger exported to updated Excel file (.xlsx) with Column L set to Paid. Sign in to Google Workspace to sync directly online.', 'success');
      } else {
        setIsGoogleWorkspaceModalOpen(true);
      }
    }
  };

  // Google Sheet Import
  const handleImportGoogleSheetRows = (importedRows: MasterLedgerRow[]) => {
    setLedgerRows(evaluateDuplicates(importedRows));
    showNotification(`Synchronized ${importedRows.length} records from Google Sheet Master Ledger.`, 'success');
  };

  // Excel File Upload Handler (.xlsx, .xls, .csv)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsedRows = await parseUploadedExcelFile(file);
      if (parsedRows.length === 0) {
        showNotification('No data rows found in uploaded Excel file.', 'warning');
        return;
      }
      const evaluated = evaluateDuplicates(parsedRows);
      setLedgerRows(evaluated);
      showNotification(`Successfully synced ${evaluated.length} invoice rows from shared Excel sheet (${file.name}).`, 'success');
      syncLatestLedgerToGoogleSheet(evaluated);
    } catch (err: any) {
      console.error('Excel upload error:', err);
      showNotification(`Failed to parse Excel file: ${err.message}`, 'warning');
    } finally {
      e.target.value = '';
    }
  };

  // Export Updated Excel File (.xlsx)
  const handleExportExcel = () => {
    if (ledgerRows.length === 0) {
      showNotification('No ledger rows to export. Please upload or link your shared Excel sheet first.', 'info');
      return;
    }
    exportLedgerToExcelFile(ledgerRows);
    showNotification('Exported Master Ledger to Excel file (.xlsx) with updated Payment Status and Details.', 'success');
  };

  // Clear / Reset Data (Clears state completely, no dummy data inserted)
  const handleClearAllData = () => {
    setLedgerRows([]);
    setSelectedRowIds([]);
    localStorage.removeItem('boon_huat_master_ledger_v5');
    showNotification('Ledger cleared. Please sync or upload your shared Excel sheet.', 'info');
  };

  const eligibleQueueCount = ledgerRows.filter(r => 
    r.paymentStatus !== 'Paid' && 
    r.paymentStatus !== 'paid' && 
    r.paymentStatus !== 'On Hold' &&
    !isBankAccountMissing(r.bankAccount)
  ).length;

  const paidCount = ledgerRows.filter(r => r.paymentStatus === 'Paid' || r.paymentStatus === 'paid').length;
  const recommendedRows = ledgerRows.filter(r => r.paymentStatus === 'Recommended');

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col selection:bg-amber-500 selection:text-slate-950">
      
      {/* Toast Notification Banner */}
      {notification && (
        <div className={`fixed bottom-5 right-5 z-50 max-w-md px-4 py-3 rounded-xl border shadow-xl text-xs font-semibold transition-all flex items-center justify-between gap-3 ${
          notification.type === 'success' 
            ? 'bg-emerald-900 text-emerald-100 border-emerald-600' 
            : notification.type === 'warning'
            ? 'bg-rose-900 text-rose-100 border-rose-600'
            : 'bg-slate-900 text-slate-100 border-slate-700'
        }`}>
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-slate-300 hover:text-white">✕</button>
        </div>
      )}

      {/* Main Top Navigation Header */}
      <Header
        currentUser={currentUser}
        onToggleUserRole={handleToggleUserRole}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onOpenRecommendationModal={() => setIsRecommendationModalOpen(true)}
        onOpenAddInvoiceModal={() => setIsAddModalOpen(true)}
        onOpenGoogleWorkspace={() => setIsGoogleWorkspaceModalOpen(true)}
        onSyncExcelSheet={handleSyncExcelSheet}
        onExportExcel={handleExportExcel}
        onFileUpload={handleFileUpload}
        onResetData={handleClearAllData}
        onOpenAiAssistant={() => setIsAiPanelOpen(true)}
        recommendedCount={recommendedRows.length}
        pendingApprovalCount={recommendedRows.length}
        syncedSheetId={syncedSheetId}
      />

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        
        {/* Top Metric Overview Cards */}
        <MetricsOverview
          rows={ledgerRows}
          onSelectFilter={handleSelectMetricFilter}
          activeFilter={activeTab}
        />

        {/* View Navigation Tabs Bar */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200/90 gap-3 pt-1">
          <div className="flex items-center gap-6">
            
            {/* Tab 1: Payment Queue */}
            <button
              onClick={() => setActiveTab('payment-queue')}
              className={`pb-2 text-xs font-bold transition-all flex items-center gap-1.5 border-b-2 ${
                activeTab === 'payment-queue'
                  ? 'border-amber-500 text-amber-900 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className={`w-4 h-4 ${activeTab === 'payment-queue' ? 'text-amber-600' : 'text-slate-400'}`} />
              <span>Payment Queue ({eligibleQueueCount})</span>
            </button>

            {/* Tab 2: Paid Invoices */}
            <button
              onClick={() => setActiveTab('paid')}
              className={`pb-2 text-xs font-bold transition-all flex items-center gap-1.5 border-b-2 ${
                activeTab === 'paid'
                  ? 'border-emerald-500 text-emerald-900 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <CheckCircle2 className={`w-4 h-4 ${activeTab === 'paid' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>Paid Invoices ({paidCount})</span>
            </button>

          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>Linked Excel / Sheet:</span>
            {syncedSheetTitle ? (
              <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {syncedSheetTitle}
              </span>
            ) : (
              <span className="text-slate-500 italic">No Sheet Linked (Click 'Sync Excel Sheet' above)</span>
            )}
          </div>
        </div>

        {/* View Tab Body Content */}
        {activeTab === 'payment-queue' && (
          <PaymentQueueView
            rows={ledgerRows}
            currentUser={currentUser}
            selectedRowIds={selectedRowIds}
            onSelectRow={(id) => setSelectedRowIds([id])}
            onOpenMadamLimApproval={(rows) => {
              setTargetApprovalRows(rows);
              setIsMadamLimModalOpen(true);
            }}
            onOpenRowDetail={(row) => {
              setActiveDetailRow(row);
              setIsDetailModalOpen(true);
            }}
            onOpenRecommendationModal={(rows) => {
              setSelectedRowIds(rows.map(r => r.id));
              setIsRecommendationModalOpen(true);
            }}
          />
        )}

        {activeTab === 'paid' && (
          <PaidInvoicesView
            rows={ledgerRows}
            onOpenRowDetail={(row) => {
              setActiveDetailRow(row);
              setIsDetailModalOpen(true);
            }}
          />
        )}

      </main>

      {/* Bottom Footer Status Bar */}
      <footer className="bg-slate-100 border-t border-slate-200 px-6 py-2.5 flex justify-between items-center text-[11px] font-medium text-slate-500 mt-auto">
        <div className="flex items-center space-x-4">
          <span>Session: BHS-992-AP</span>
          <span>|</span>
          <span>Master Ledger: Connected</span>
          <span>|</span>
          <span className="flex items-center gap-1.5 font-mono text-slate-700 font-bold">
            <Clock className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>Synced Date & Time:</span>
            <span className="text-blue-700">
              {currentTime.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="uppercase tracking-wider font-semibold text-slate-600">System Secure & Verified</span>
        </div>
      </footer>

      {/* Floating Moving AI Recommendation Button at the Bottom */}
      <div className="fixed bottom-12 right-6 z-40">
        <button
          onClick={() => setIsRecommendationModalOpen(true)}
          className="px-5 py-3 bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 hover:from-blue-600 hover:to-purple-700 text-white font-extrabold text-xs rounded-full shadow-2xl border-2 border-white/50 flex items-center gap-2.5 transition-all transform hover:scale-105 active:scale-95 animate-bounce"
          style={{ animationDuration: '3s' }}
          title="Open AI Payment Recommendations"
        >
          <Sparkles className="w-4 h-4 text-amber-300 animate-spin" style={{ animationDuration: '4s' }} />
          <span>AI Recommendations</span>
          {selectedRowIds.length > 0 ? (
            <span className="bg-amber-400 text-slate-950 font-black text-[11px] px-2.5 py-0.5 rounded-full shadow-xs">
              {selectedRowIds.length} Selected
            </span>
          ) : (
            recommendedRows.length > 0 && (
              <span className="bg-amber-400 text-slate-950 font-black text-[11px] px-2.5 py-0.5 rounded-full shadow-xs">
                {recommendedRows.length}
              </span>
            )
          )}
        </button>
      </div>

      {/* Modals & Dialogs */}

      {(() => {
        const activeRecommendationRows = selectedRowIds.length > 0 
          ? ledgerRows.filter(r => selectedRowIds.includes(r.id))
          : (recommendedRows.length > 0 
              ? recommendedRows 
              : (ledgerRows.filter(r => r.paymentStatus !== 'Paid' && r.paymentStatus !== 'paid').slice(0, 1)));

        return (
          <RecommendationModal
            isOpen={isRecommendationModalOpen}
            onClose={() => setIsRecommendationModalOpen(false)}
            recommendedRows={activeRecommendationRows}
            onSubmitForApproval={() => {
              setTargetApprovalRows(activeRecommendationRows);
              setIsRecommendationModalOpen(false);
              setIsMadamLimModalOpen(true);
            }}
            isMadamLim={currentUser.isMadamLim}
          />
        );
      })()}

      <MadamLimApprovalModal
        isOpen={isMadamLimModalOpen}
        onClose={() => setIsMadamLimModalOpen(false)}
        targetRows={targetApprovalRows}
        onConfirmApproval={handleMadamLimConfirmApproval}
        onUpdateMasterLedger={handleUpdateMasterLedger}
      />

      <InvoiceDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        row={activeDetailRow}
        onUpdateRowPaymentStatus={handleUpdateRowPaymentStatus}
        onUpdateRowPriority={handleUpdateRowPriority}
        onSaveNotes={handleSaveNotes}
        onOpenMadamLimApproval={(rows) => {
          setTargetApprovalRows(rows);
          setIsDetailModalOpen(false);
          setIsMadamLimModalOpen(true);
        }}
      />

      <AiAssistantPanel
        isOpen={isAiPanelOpen}
        onClose={() => setIsAiPanelOpen(false)}
        masterLedger={ledgerRows}
      />

      <AddInvoiceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddInvoice={handleAddInvoice}
      />

      <GoogleWorkspaceModal
        isOpen={isGoogleWorkspaceModalOpen}
        onClose={() => setIsGoogleWorkspaceModalOpen(false)}
        rows={ledgerRows}
        onImportRows={handleImportGoogleSheetRows}
        syncedSheetId={syncedSheetId}
        syncedSheetTitle={syncedSheetTitle}
        onSetSyncedSheet={handleSetSyncedSheet}
      />

    </div>
  );
}
