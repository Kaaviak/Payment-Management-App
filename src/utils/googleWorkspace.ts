import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { MasterLedgerRow, PaymentStatus } from '../types';
import { formatPaymentDateInFull } from './paymentRules';

// Initialize Firebase App lazily or safely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive');
provider.addScope('https://www.googleapis.com/auth/spreadsheets');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  if (token) {
    try {
      sessionStorage.setItem('boonhuat_google_access_token', token);
      localStorage.setItem('boonhuat_google_access_token', token);
    } catch (e) {
      console.warn('Unable to write token to storage', e);
    }
  } else {
    try {
      sessionStorage.removeItem('boonhuat_google_access_token');
      localStorage.removeItem('boonhuat_google_access_token');
    } catch (e) {
      console.warn('Unable to remove token from storage', e);
    }
  }
};

/**
 * Retrieve cached Google OAuth Access Token
 */
export const getCachedAccessToken = (): string | null => {
  if (!cachedAccessToken) {
    try {
      cachedAccessToken = sessionStorage.getItem('boonhuat_google_access_token') || 
                          localStorage.getItem('boonhuat_google_access_token');
    } catch (e) {
      console.warn('Unable to read token from storage', e);
    }
  }
  return cachedAccessToken;
};

/**
 * Initializes Google Auth state listener
 */
export const initGoogleAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    const token = getCachedAccessToken();
    if (user && token) {
      if (onAuthSuccess) onAuthSuccess(user, token);
    } else if (user) {
      if (onAuthSuccess && token) onAuthSuccess(user, token);
    } else {
      setCachedAccessToken(null);
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Trigger Google Sign-In with popup
 */
export const signInWithGoogle = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google Auth credentials');
    }

    setCachedAccessToken(credential.accessToken);
    return { user: result.user, accessToken: credential.accessToken };
  } catch (error: any) {
    if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
      console.warn('Google Sign-In popup closed by user.');
      return null;
    }
    console.error('Google Sign In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Sign out from Google Auth
 */
export const googleLogout = async () => {
  await signOut(auth);
  setCachedAccessToken(null);
};

// ==========================================
// GOOGLE SHEETS API INTEGRATION
// ==========================================

export interface GoogleSheetFile {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

const handleResponseError = async (res: Response, context: string) => {
  if (!res.ok) {
    const errText = await res.text();
    if (res.status === 401 || errText.includes('401') || errText.includes('UNAUTHENTICATED') || errText.includes('Invalid Credentials')) {
      setCachedAccessToken(null);
      throw new Error(`Google authorization token expired or invalid (401). Please sign in again with Google to refresh access.`);
    }
    throw new Error(`${context}: ${res.statusText} (${errText})`);
  }
};

/**
 * Exports current Master Ledger rows to a new or existing Google Sheet
 */
export const exportLedgerToGoogleSheets = async (
  rows: MasterLedgerRow[], 
  accessToken: string,
  customTitle: string = 'Boon Huat Hardware - Master Ledger'
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> => {
  // 1. Create Spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: `${customTitle} (${new Date().toLocaleDateString('en-GB')})`
      },
      sheets: [
        {
          properties: {
            title: 'Master Ledger',
            gridProperties: {
              frozenRowCount: 1
            }
          }
        }
      ]
    })
  });

  await handleResponseError(createRes, 'Failed to create Google Sheet');
  const createData = await createRes.json();
  const spreadsheetId = createData.spreadsheetId;
  const spreadsheetUrl = createData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Prepare headers (Columns A to T)
  const headers = [
    'Supplier Name (Col A)',
    'Invoice Number (Col B)',
    'PO Reference (Col C)',
    'Invoice Date (Col D)',
    'Due Date (Col E)',
    'Description of Goods (Col F)',
    'Quantity (Col G)',
    'Unit Price (Col H)',
    'Total Amount (Col I)',
    'Extraction Status (Col J)',
    'Match Status (Col K)',
    'Payment Status (Col L)',
    'Human Review (Col M)',
    'Confidence Level (Col N)',
    'Bank Account (Col O)',
    'Payment Date (Col P)',
    'Payment Method (Col Q)',
    'Approved By (Col R)',
    'Payment Priority (Col S)',
    'Duplicate Check (Col T)'
  ];

  const valueRows = rows.map(r => [
    r.supplierName,
    r.invoiceNumber,
    r.poReference,
    r.invoiceDate,
    r.dueDate,
    r.description,
    r.quantity,
    r.unitPrice,
    r.totalAmount,
    r.extractionStatus,
    r.matchStatus,
    r.paymentStatus,
    r.humanReview,
    r.confidenceLevel,
    r.bankAccount,
    r.paymentDate || '',
    r.paymentMethod || '',
    r.approvedBy || '',
    r.paymentPriority,
    r.duplicateCheck
  ]);

  const allValues = [headers, ...valueRows];

  // 3. Write data to Google Sheet
  const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Master Ledger!A1:T${allValues.length}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: allValues
    })
  });

  await handleResponseError(updateRes, 'Failed to write data to Google Sheet');

  return { spreadsheetId, spreadsheetUrl };
};

/**
 * Syncs/Updates an existing Google Sheet's Master Ledger values (A1:T)
 */
export const updateExistingGoogleSheetLedger = async (
  spreadsheetId: string,
  rows: MasterLedgerRow[],
  accessToken: string
): Promise<void> => {
  const headers = [
    'Supplier Name (Col A)',
    'Invoice Number (Col B)',
    'PO Reference (Col C)',
    'Invoice Date (Col D)',
    'Due Date (Col E)',
    'Description of Goods (Col F)',
    'Quantity (Col G)',
    'Unit Price (Col H)',
    'Total Amount (Col I)',
    'Extraction Status (Col J)',
    'Match Status (Col K)',
    'Payment Status (Col L)',
    'Human Review (Col M)',
    'Confidence Level (Col N)',
    'Bank Account (Col O)',
    'Payment Date (Col P)',
    'Payment Method (Col Q)',
    'Approved By (Col R)',
    'Payment Priority (Col S)',
    'Duplicate Check (Col T)'
  ];

  // 1. Fetch current rows from the Google Sheet to preserve other columns
  let currentValues: string[][] = [];
  try {
    let fetchRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Master%20Ledger!A1:T1000`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    if (!fetchRes.ok) {
      // Try default range / fallback sheet name
      fetchRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:T1000`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
    }
    if (fetchRes.ok) {
      const data = await fetchRes.json();
      currentValues = data.values || [];
    }
  } catch (e) {
    console.warn('Failed to pre-fetch existing sheet values, using local fallback', e);
  }

  let allValues: string[][] = [];

  if (currentValues.length > 0) {
    // We have existing rows from the sheet. Let's merge columns L, P, Q, R, S, T
    const headerRow = currentValues[0];
    allValues.push(headerRow);

    // Keep track of which local rows have been matched and merged
    const mergedLocalIds = new Set<string>();

    for (let i = 1; i < currentValues.length; i++) {
      const sheetRow = [...currentValues[i]];
      // ensure sheetRow has at least 20 elements
      while (sheetRow.length < 20) {
        sheetRow.push('');
      }

      const sheetSupplier = String(sheetRow[0] || '').trim().toLowerCase();
      const sheetInvoice = String(sheetRow[1] || '').trim().toLowerCase();

      // Find the corresponding local row
      const localMatch = rows.find(r => 
        String(r.supplierName || '').trim().toLowerCase() === sheetSupplier &&
        String(r.invoiceNumber || '').trim().toLowerCase() === sheetInvoice
      );

      if (localMatch) {
        // Update ONLY columns L, P, Q, R, S, T
        sheetRow[11] = localMatch.paymentStatus || 'Payment On Hold';
        sheetRow[15] = localMatch.paymentDate || '';
        sheetRow[16] = localMatch.paymentMethod || '';
        sheetRow[17] = localMatch.approvedBy || '';
        sheetRow[18] = localMatch.paymentPriority || 'Medium';
        sheetRow[19] = localMatch.duplicateCheck || 'No Duplicate Found';
        
        mergedLocalIds.add(localMatch.id);
      }
      allValues.push(sheetRow);
    }

    // Append any newly added local rows that are NOT on the sheet
    for (const localRow of rows) {
      if (!mergedLocalIds.has(localRow.id)) {
        const newRowArray = [
          localRow.supplierName,
          localRow.invoiceNumber,
          localRow.poReference,
          localRow.invoiceDate,
          localRow.dueDate,
          localRow.description || '',
          String(localRow.quantity),
          String(localRow.unitPrice),
          String(localRow.totalAmount),
          localRow.extractionStatus || 'Completed',
          localRow.matchStatus || 'Ready for Payment - No Issues Found',
          localRow.paymentStatus || 'Payment On Hold',
          localRow.humanReview || 'Verified',
          String(localRow.confidenceLevel || 98),
          localRow.bankAccount || '',
          localRow.paymentDate || '',
          localRow.paymentMethod || '',
          localRow.approvedBy || '',
          localRow.paymentPriority || 'Medium',
          localRow.duplicateCheck || 'No Duplicate Found'
        ];
        allValues.push(newRowArray);
      }
    }
  } else {
    // Fallback: If sheet is empty or can't be read, construct the whole grid
    allValues.push(headers);
    rows.forEach(r => {
      allValues.push([
        r.supplierName,
        r.invoiceNumber,
        r.poReference,
        r.invoiceDate,
        r.dueDate,
        r.description,
        String(r.quantity),
        String(r.unitPrice),
        String(r.totalAmount),
        r.extractionStatus,
        r.matchStatus,
        r.paymentStatus,
        r.humanReview,
        String(r.confidenceLevel),
        r.bankAccount,
        r.paymentDate || '',
        r.paymentMethod || '',
        r.approvedBy || '',
        r.paymentPriority,
        r.duplicateCheck
      ]);
    });
  }

  // First try updating 'Master Ledger!A1:T...'
  let updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Master%20Ledger!A1:T${allValues.length}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: allValues
    })
  });

  if (!updateRes.ok) {
    // Fallback to Sheet1 or default tab
    updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:T${allValues.length}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: allValues
      })
    });
  }

  await handleResponseError(updateRes, 'Failed to sync updated rows to Google Sheet');
};

/**
 * Imports rows from an existing Google Sheet into Master Ledger format accurately
 */
export const fetchRowsFromGoogleSheet = async (
  spreadsheetId: string,
  accessToken: string
): Promise<MasterLedgerRow[]> => {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:T1000`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  await handleResponseError(res, 'Failed to read Google Sheet');

  const data = await res.json();
  const values: string[][] = data.values || [];

  if (values.length <= 1) {
    return [];
  }

  // Header is row 0, filter out any blank rows
  const dataRows = values.slice(1).filter(r => Array.isArray(r) && r.some(cell => String(cell).trim() !== ''));

  const rowsData: MasterLedgerRow[] = dataRows.map((row, index) => {
    const supplierName = String(row[0] || '').trim();
    const invoiceNumber = String(row[1] || '').trim();
    const poReference = String(row[2] || '').trim();
    const invoiceDate = String(row[3] || '').trim();
    const dueDate = String(row[4] || '').trim();
    const description = String(row[5] || '').trim();

    const qtyNum = parseFloat(row[6]);
    const quantity = isNaN(qtyNum) ? 1 : qtyNum;

    const priceNum = parseFloat(row[7]);
    const unitPrice = isNaN(priceNum) ? 0 : priceNum;

    const amtNum = parseFloat(row[8]);
    const totalAmount = isNaN(amtNum) ? quantity * unitPrice : amtNum;

    const extractionStatus = (String(row[9] || '').trim() || 'Completed') as any;
    const matchStatus = (String(row[10] || '').trim() || '3-Way Matched') as any;
    let rawPaymentStatus = String(row[11] || '').trim();
    let approvedBy = String(row[17] || '').trim();
    let paymentDate = String(row[15] || '').trim();
    let paymentMethod = (String(row[16] || '').trim() || 'N/A') as any;

    let paymentStatus: PaymentStatus = 'Payment On Hold';
    if (rawPaymentStatus === 'Paid' || rawPaymentStatus === 'paid' || rawPaymentStatus === 'Approved') {
      paymentStatus = 'Paid';
    } else if (rawPaymentStatus === 'Pending' || rawPaymentStatus === 'pending') {
      paymentStatus = 'Pending';
    } else {
      paymentStatus = 'Payment On Hold';
    }

    if (paymentStatus === 'Payment On Hold') {
      paymentDate = '';
      paymentMethod = 'N/A';
      approvedBy = '';
    } else if (paymentStatus === 'Paid') {
      if (!paymentDate) paymentDate = formatPaymentDateInFull(new Date().toISOString());
      if (!paymentMethod || paymentMethod === 'N/A') paymentMethod = 'Bank Transfer';
      if (!approvedBy) approvedBy = 'Madam Lim';
    }
    const humanReview = (String(row[12] || '').trim() || 'Verified') as any;

    const confNum = parseFloat(row[13]);
    const confidenceLevel = isNaN(confNum) ? 98 : confNum;

    const bankAccount = String(row[14] || '').trim() || 'NOT FOUND';

    const prioStr = String(row[18] || '').trim();
    const paymentPriority = (prioStr || 'Medium') as any;

    const dupStr = String(row[19] || '').trim();
    const duplicateCheck = (dupStr || 'No Duplicate Found') as any;

    return {
      id: `GSHEET-ROW-${index + 1}-${Date.now().toString().slice(-4)}`,
      supplierName,
      invoiceNumber,
      poReference,
      invoiceDate,
      dueDate,
      description,
      quantity,
      unitPrice,
      totalAmount,
      extractionStatus,
      matchStatus,
      paymentStatus,
      humanReview,
      confidenceLevel,
      bankAccount,
      paymentDate,
      paymentMethod,
      approvedBy,
      paymentPriority,
      duplicateCheck,
      auditTrail: [
        {
          id: `audit-${index}-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
          user: 'Google Sheets Sync',
          action: 'Extracted Google Sheet Record',
          details: `Extracted record from connected Google Sheet.`
        }
      ]
    };
  });

  return rowsData;
};

// ==========================================
// GOOGLE DRIVE API INTEGRATION
// ==========================================

/**
 * Lists Google Spreadsheets and documents from user's Google Drive
 */
export const listDriveFiles = async (accessToken: string): Promise<GoogleSheetFile[]> => {
  const q = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' or mimeType='text/csv' and trashed=false");
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime,webViewLink)&pageSize=20&orderBy=modifiedTime desc`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  await handleResponseError(res, 'Failed to list Drive files');

  const data = await res.json();
  return data.files || [];
};

/**
 * Uploads a text/CSV or JSON AP summary report directly to Google Drive
 */
export const uploadFileToDrive = async (
  accessToken: string,
  fileName: string,
  fileContent: string,
  mimeType: string = 'text/csv'
): Promise<{ fileId: string; webViewLink?: string }> => {
  const metadata = {
    name: fileName,
    mimeType: mimeType
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([fileContent], { type: mimeType }));

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    body: form
  });

  await handleResponseError(res, 'Failed to upload file to Google Drive');

  const data = await res.json();
  return { fileId: data.id, webViewLink: data.webViewLink };
};
