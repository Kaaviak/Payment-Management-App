import React, { useState, useEffect } from 'react';
import { MasterLedgerRow } from '../types';
import { 
  exportLedgerToGoogleSheets, 
  fetchRowsFromGoogleSheet, 
  listDriveFiles, 
  uploadFileToDrive,
  signInWithGoogle,
  googleLogout,
  GoogleSheetFile,
  getCachedAccessToken,
  setCachedAccessToken
} from '../utils/googleWorkspace';
import { exportLedgerToCSV } from '../utils/paymentRules';
import { 
  FileSpreadsheet, 
  HardDrive, 
  ExternalLink, 
  Download, 
  Upload, 
  RefreshCw, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  LogOut,
  FolderOpen,
  Sparkles,
  ShieldCheck,
  FileText
} from 'lucide-react';

interface GoogleWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  rows: MasterLedgerRow[];
  onImportRows: (importedRows: MasterLedgerRow[]) => void;
  syncedSheetId?: string | null;
  syncedSheetTitle?: string | null;
  onSetSyncedSheet?: (spreadsheetId: string, sheetTitle: string) => void;
}

export const GoogleWorkspaceModal: React.FC<GoogleWorkspaceModalProps> = ({
  isOpen,
  onClose,
  rows,
  onImportRows,
  syncedSheetId,
  syncedSheetTitle,
  onSetSyncedSheet
}) => {
  const [accessToken, setAccessToken] = useState<string | null>(getCachedAccessToken());
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [driveFiles, setDriveFiles] = useState<GoogleSheetFile[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState<boolean>(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  // Statuses & Actions
  const [exportingSheet, setExportingSheet] = useState<boolean>(false);
  const [exportedSheetUrl, setExportedSheetUrl] = useState<string | null>(null);
  
  const [uploadingDrive, setUploadingDrive] = useState<boolean>(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);

  const [importingSheetId, setImportingSheetId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const [customSheetUrl, setCustomSheetUrl] = useState<string>(() => {
    return 'https://docs.google.com/spreadsheets/d/1MhxCI-7z5T6QGl7dgrKahvduDe-jmNHa1AMBfvQ8S-U/edit?gid=718668068#gid=718668068';
  });

  const extractSpreadsheetId = (urlOrId: string): string => {
    const trimmed = urlOrId.trim();
    if (!trimmed) return '';
    // If it's already an ID
    if (!trimmed.includes('/') && trimmed.length >= 25) {
      return trimmed;
    }
    // Match spreadsheets/d/([a-zA-Z0-9-_]+)
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return match[1];
    }
    return trimmed;
  };

  const handleConnectCustomUrl = async () => {
    if (!accessToken) {
      setStatusMessage({ type: 'error', text: 'Please sign in with Google first.' });
      return;
    }

    const id = extractSpreadsheetId(customSheetUrl);
    if (!id) {
      setStatusMessage({ type: 'error', text: 'Invalid URL or Spreadsheet ID. Please make sure it is a valid Google Sheets URL or a clean 44-character spreadsheet ID.' });
      return;
    }

    setImportingSheetId(id);
    setStatusMessage(null);

    try {
      setStatusMessage({ type: 'info', text: 'Connecting to spreadsheet and extracting rows...' });
      const imported = await fetchRowsFromGoogleSheet(id, accessToken);
      
      if (imported.length === 0) {
        setStatusMessage({ type: 'info', text: 'Successfully connected, but no records were found in the sheet. Ensure the active tab contains data rows.' });
        return;
      }

      let title = 'Boon Huat Hardware Ledger';
      try {
        const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}?fields=properties.title`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        if (metaRes.ok) {
          const meta = await metaRes.json();
          if (meta?.properties?.title) {
            title = meta.properties.title;
          }
        }
      } catch (err) {
        console.warn('Failed to fetch spreadsheet title, using fallback:', err);
      }

      onImportRows(imported);
      if (onSetSyncedSheet) {
        onSetSyncedSheet(id, title);
      }

      setStatusMessage({
        type: 'success',
        text: `Successfully linked & extracted ${imported.length} rows from Google Sheet: "${title}"!`
      });

      loadDriveFiles(accessToken);
    } catch (err: any) {
      console.error('Failed to connect to custom sheet:', err);
      setStatusMessage({ type: 'error', text: `Failed to link custom spreadsheet: ${err.message || err}` });
    } finally {
      setImportingSheetId(null);
    }
  };

  const loadDriveFiles = async (token: string) => {
    setIsLoadingDrive(true);
    try {
      const files = await listDriveFiles(token);
      setDriveFiles(files);
      if (files.length > 0 && !selectedFileId) {
        setSelectedFileId(files[0].id);
      }
    } catch (err: any) {
      console.error('Error loading drive files:', err);
      if (err.message?.includes('401') || err.message?.includes('expired') || err.message?.includes('invalid') || err.message?.includes('UNAUTHENTICATED')) {
        setAccessToken(null);
        setCachedAccessToken(null);
        setDriveFiles([]);
        setStatusMessage({ type: 'error', text: 'Google authorization token expired or invalid (401). Please click "Sign in with Google" to re-authenticate.' });
      } else {
        setStatusMessage({ type: 'error', text: err.message || 'Unable to access Google Drive files.' });
      }
    } finally {
      setIsLoadingDrive(false);
    }
  };

  useEffect(() => {
    const token = getCachedAccessToken();
    setAccessToken(token);
    if (token) {
      loadDriveFiles(token);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setIsAuthenticating(true);
    setStatusMessage(null);
    try {
      const result = await signInWithGoogle();
      if (result) {
        setAccessToken(result.accessToken);
        setUserEmail(result.user.email);
        setStatusMessage({ type: 'success', text: `Successfully signed in as ${result.user.email}` });
        loadDriveFiles(result.accessToken);
      } else {
        setStatusMessage({ type: 'info', text: 'Sign-in popup was closed.' });
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        setStatusMessage({ type: 'info', text: 'Sign-in popup was closed.' });
      } else {
        setStatusMessage({ type: 'error', text: err.message || 'Failed to authenticate with Google' });
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    await googleLogout();
    setAccessToken(null);
    setUserEmail(null);
    setDriveFiles([]);
    setExportedSheetUrl(null);
    setUploadedFileUrl(null);
    setSelectedFileId(null);
    setStatusMessage({ type: 'info', text: 'Signed out from Google Workspace' });
  };

  const handleExportToSheets = async () => {
    if (!accessToken) {
      setStatusMessage({ type: 'error', text: 'Please sign in with Google first.' });
      return;
    }

    setExportingSheet(true);
    setStatusMessage(null);
    try {
      const result = await exportLedgerToGoogleSheets(rows, accessToken);
      setExportedSheetUrl(result.spreadsheetUrl);
      if (onSetSyncedSheet) {
        onSetSyncedSheet(result.spreadsheetId, 'Boon Huat Hardware - Master Ledger');
      }
      setStatusMessage({ 
        type: 'success', 
        text: `Master Ledger successfully exported to Google Sheets & connected for real-time payment updates!` 
      });
      loadDriveFiles(accessToken);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to export to Google Sheets' });
    } finally {
      setExportingSheet(false);
    }
  };

  const handleUploadCsvToDrive = async () => {
    if (!accessToken) {
      setStatusMessage({ type: 'error', text: 'Please sign in with Google first.' });
      return;
    }

    setUploadingDrive(true);
    setStatusMessage(null);
    try {
      const csvContent = exportLedgerToCSV(rows, false);
      const fileName = `BoonHuat_AP_MasterLedger_${new Date().toISOString().slice(0, 10)}.csv`;
      const result = await uploadFileToDrive(accessToken, fileName, csvContent, 'text/csv');
      setUploadedFileUrl(result.webViewLink || `https://drive.google.com/file/d/${result.fileId}/view`);
      setStatusMessage({ 
        type: 'success', 
        text: `CSV Master Ledger report uploaded directly to Google Drive!` 
      });
      loadDriveFiles(accessToken);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to upload CSV to Google Drive' });
    } finally {
      setUploadingDrive(false);
    }
  };

  const handleImportSheet = async (file: GoogleSheetFile) => {
    if (!accessToken) return false;

    setImportingSheetId(file.id);
    setStatusMessage(null);
    try {
      const imported = await fetchRowsFromGoogleSheet(file.id, accessToken);
      if (imported.length === 0) {
        setStatusMessage({ type: 'info', text: 'No rows found in selected Google Sheet.' });
        return false;
      } else {
        onImportRows(imported);
        if (onSetSyncedSheet) {
          onSetSyncedSheet(file.id, file.name);
        }
        setStatusMessage({ 
          type: 'success', 
          text: `Successfully extracted ${imported.length} invoice row(s) from "${file.name}" with zero example data added!` 
        });
        return true;
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to import from Google Sheet' });
      return false;
    } finally {
      setImportingSheetId(null);
    }
  };

  const handleDoneAndExtract = async () => {
    if (selectedFileId && accessToken) {
      const selectedFile = driveFiles.find(f => f.id === selectedFileId);
      if (selectedFile) {
        await handleImportSheet(selectedFile);
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-600 rounded-lg text-white font-bold shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight flex items-center gap-2">
                <span>Google Drive & Sheets Integration</span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-bold">
                  Live Workspace
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Sync Master Ledger directly with Google Sheets and Google Drive
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 scrollbar-thin">

          {/* Status Message Alert */}
          {statusMessage && (
            <div className={`p-3.5 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
              statusMessage.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                : statusMessage.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}>
              <div className="flex items-start gap-2.5">
                {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
                {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
                {statusMessage.type === 'info' && <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />}
                <div className="flex-1 font-medium leading-relaxed">{statusMessage.text}</div>
              </div>
              {!accessToken && (
                <button
                  onClick={handleSignIn}
                  disabled={isAuthenticating}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs shrink-0 flex items-center gap-1.5 shadow-2xs transition-colors self-start sm:self-auto"
                >
                  {isAuthenticating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  <span>Sign in with Google</span>
                </button>
              )}
            </div>
          )}

          {/* Connected Synced Google Sheet Banner */}
          {syncedSheetId && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 flex items-center justify-between text-xs text-emerald-950 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600 text-white rounded-lg shadow-xs shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-emerald-900">Active Synced Google Sheet:</span>
                    <span className="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-bold text-[11px]">
                      {syncedSheetTitle || 'Master Ledger'}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800 mt-0.5 font-medium">
                    ⚡ Approved payments automatically sync updates (Cols L, P, Q, R, S, T) directly to this sheet in real-time.
                  </p>
                </div>
              </div>
              <a
                href={`https://docs.google.com/spreadsheets/d/${syncedSheetId}/edit`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shrink-0 shadow-2xs transition-colors"
              >
                <span>Open Sheet</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Google Connection Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-2xs">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800">
                  {accessToken ? 'Connected to Google Workspace' : 'Connect Google Workspace Account'}
                </h3>
                <p className="text-xs text-slate-500">
                  {accessToken 
                    ? `Authenticated ${userEmail ? `(${userEmail})` : ''} • Drive & Sheets Read/Write Access` 
                    : 'Sign in to sync Master Ledger and manage Google Drive files directly'}
                </p>
              </div>
            </div>

            {accessToken ? (
              <button
                onClick={handleSignOut}
                className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-500" />
                <span>Sign Out</span>
              </button>
            ) : (
              <button
                onClick={handleSignIn}
                disabled={isAuthenticating}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
              >
                {isAuthenticating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                <span>Sign in with Google</span>
              </button>
            )}
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Export to Google Sheets Card */}
            <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs hover:border-emerald-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-emerald-100 rounded-lg text-emerald-800">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Google Sheets Sync
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-900">Export Ledger to Google Sheets</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Generates a live, fully-formatted Google Spreadsheet containing all 20 columns (Cols A-T) of the Master Ledger.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={handleExportToSheets}
                  disabled={exportingSheet || !accessToken}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {exportingSheet ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  <span>{exportingSheet ? 'Creating Sheet...' : 'Export to Sheets'}</span>
                </button>

                {exportedSheetUrl && (
                  <a
                    href={exportedSheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    <span>Open Sheet</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Save CSV Report to Google Drive Card */}
            <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs hover:border-blue-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-800">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] uppercase font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Google Drive Backup
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-900">Save Backup to Google Drive</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Uploads an audit-ready AP Master Ledger CSV file directly into your primary Google Drive storage.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={handleUploadCsvToDrive}
                  disabled={uploadingDrive || !accessToken}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {uploadingDrive ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileText className="w-3.5 h-3.5" />
                  )}
                  <span>{uploadingDrive ? 'Saving to Drive...' : 'Save CSV to Drive'}</span>
                </button>

                {uploadedFileUrl && (
                  <a
                    href={uploadedFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1"
                  >
                    <span>View File</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

          </div>

          {/* Connect Custom Google Sheet URL/ID Section */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-100 rounded text-emerald-800">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm text-slate-900">Connect Custom Google Sheet</h4>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Paste your Google Sheets URL or spreadsheet ID below to instantly link it as the active Master Ledger. Approved payments will sync directly in real-time.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={customSheetUrl}
                onChange={(e) => setCustomSheetUrl(e.target.value)}
                placeholder="Paste Google Sheets URL or Spreadsheet ID..."
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white transition-all"
              />
              <button
                onClick={handleConnectCustomUrl}
                disabled={!customSheetUrl.trim() || !accessToken || importingSheetId !== null}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-lg text-xs shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0"
              >
                {importingSheetId ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>{importingSheetId ? 'Connecting...' : 'Connect & Import'}</span>
              </button>
            </div>
            {!accessToken && (
              <p className="text-[10px] text-amber-600 font-semibold flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>Please sign in with Google above to activate custom sheet connection.</span>
              </p>
            )}
          </div>

          {/* Drive Spreadsheets Browser / Import */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-amber-600" />
                <h4 className="font-bold text-sm text-slate-900">Browse Google Drive Spreadsheets</h4>
              </div>
              
              {accessToken && (
                <button
                  onClick={() => loadDriveFiles(accessToken)}
                  disabled={isLoadingDrive}
                  className="p-1 text-slate-500 hover:text-slate-800 rounded transition-colors"
                  title="Refresh Drive files"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDrive ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>

            {!accessToken ? (
              <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <Lock className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">Google Workspace Sign-In Required</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-0.5">
                  Sign in above to browse your Google Drive spreadsheets and import invoice rows directly.
                </p>
              </div>
            ) : isLoadingDrive ? (
              <div className="text-center py-6 text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                <span>Loading Google Drive files...</span>
              </div>
            ) : driveFiles.length === 0 ? (
              <div className="text-center py-6 bg-slate-50 rounded-lg text-xs text-slate-500">
                No recent Google Spreadsheets found in your Drive account.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto border border-slate-200 rounded-lg">
                  {driveFiles.map((file) => {
                    const isSelected = selectedFileId === file.id;
                    return (
                      <div 
                        key={file.id} 
                        onClick={() => setSelectedFileId(file.id)}
                        className={`p-3 flex items-center justify-between cursor-pointer transition-colors text-xs ${
                          isSelected ? 'bg-amber-50/80 border-l-4 border-l-amber-500 font-medium' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <input 
                            type="radio" 
                            name="selectedDriveFile"
                            checked={isSelected}
                            onChange={() => setSelectedFileId(file.id)}
                            className="w-4 h-4 text-amber-600 focus:ring-amber-500 accent-amber-600"
                          />
                          <FileSpreadsheet className={`w-4 h-4 shrink-0 ${isSelected ? 'text-amber-700' : 'text-emerald-600'}`} />
                          <div className="truncate">
                            <p className={`truncate font-semibold ${isSelected ? 'text-amber-950 font-bold' : 'text-slate-800'}`}>
                              {file.name}
                            </p>
                            {file.modifiedTime && (
                              <p className="text-[10px] text-slate-400">
                                Modified: {new Date(file.modifiedTime).toLocaleDateString('en-GB')}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                          {file.id === syncedSheetId ? (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[10px] font-extrabold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Active Synced Sheet</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                if (onSetSyncedSheet) {
                                  onSetSyncedSheet(file.id, file.name);
                                  setStatusMessage({ type: 'success', text: `Set "${file.name}" as active synced Google Sheet for payment updates!` });
                                }
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded text-[10px] font-semibold transition-colors"
                              title="Connect this Google Sheet for payment updates"
                            >
                              Connect Sync
                            </button>
                          )}

                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 text-slate-400 hover:text-slate-700"
                              title="Open in Google Sheets"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}

                          <button
                            onClick={() => handleImportSheet(file)}
                            disabled={importingSheetId === file.id}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded text-[11px] flex items-center gap-1 transition-colors shadow-2xs disabled:opacity-50"
                          >
                            {importingSheetId === file.id ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Download className="w-3 h-3" />
                            )}
                            <span>Extract Sheet</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {selectedFileId && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-center justify-between text-xs text-amber-950">
                    <div className="flex items-center gap-2 font-semibold">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>Selected Sheet:</span>
                      <strong className="text-amber-900 font-extrabold">
                        {driveFiles.find(f => f.id === selectedFileId)?.name}
                      </strong>
                    </div>
                    <button
                      onClick={() => {
                        const fileToExtract = driveFiles.find(f => f.id === selectedFileId);
                        if (fileToExtract) handleImportSheet(fileToExtract);
                      }}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-extrabold rounded text-xs shadow-2xs transition-colors"
                    >
                      Extract & Load Sheet
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Boon Huat Hardware & Supplies • Accounts Payable</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDoneAndExtract}
              className="px-5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-extrabold shadow-sm transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Done & Extract Selected Sheet</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
