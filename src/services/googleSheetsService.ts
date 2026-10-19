import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, Auth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Order, Product, Customer } from '../types';

let app: FirebaseApp;
if (getApps().length > 0) {
  app = getApps()[0];
} else {
  app = initializeApp(firebaseConfig);
}

const auth: Auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedUser: User | null = null;

export const initGoogleAuth = (
  onSuccess?: (user: User, token: string) => void,
  onFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      cachedUser = user;
      if (cachedAccessToken) {
        if (onSuccess) onSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onFailure) onFailure();
      }
    } else {
      cachedUser = null;
      cachedAccessToken = null;
      if (onFailure) onFailure();
    }
  });
};

export const signInWithGoogleSheets = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Google authorization completed, but access token was not returned.');
    }
    cachedAccessToken = credential.accessToken;
    cachedUser = result.user;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getGoogleAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const getGoogleUser = (): User | null => {
  return cachedUser;
};

export const signOutGoogle = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  cachedUser = null;
};

/**
 * Creates a brand new Google Spreadsheet and exports the given Orders into it
 */
export async function exportOrdersToGoogleSheets(
  orders: Order[],
  companyName: string = 'Apex Logistics ERP'
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  let token = getGoogleAccessToken();
  if (!token) {
    const authResult = await signInWithGoogleSheets();
    if (!authResult) {
      throw new Error('Google Sheets authorization required. Please sign in with Google.');
    }
    token = authResult.accessToken;
  }

  const dateStr = new Date().toISOString().split('T')[0];
  const title = `${companyName} - Orders Report (${dateStr})`;

  // 1. Create spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title
      },
      sheets: [
        {
          properties: {
            title: 'Orders'
          }
        }
      ]
    })
  });

  if (!createRes.ok) {
    const errData = await createRes.json();
    throw new Error(errData.error?.message || 'Failed to create Google Spreadsheet');
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = sheetData.spreadsheetUrl;

  // 2. Prepare rows
  const headers = [
    'Order #',
    'Customer Name',
    'Company',
    'Location / Area',
    'Date',
    'Sales Rep',
    'Payment Method',
    'Status',
    'Items Count',
    'Subtotal ($)',
    'Discount ($)',
    'Tax ($)',
    'Total Amount ($)',
    'Delivery Notes'
  ];

  const rows = orders.map((o) => [
    o.orderNumber,
    o.customerName,
    o.customerCompany || '',
    o.customerLocation || '',
    new Date(o.createdAt).toLocaleDateString(),
    o.salesmanName,
    o.paymentMethod,
    o.status,
    o.items.reduce((acc, i) => acc + i.quantity, 0),
    o.subtotal.toFixed(2),
    o.discountAmount.toFixed(2),
    o.taxAmount.toFixed(2),
    o.totalAmount.toFixed(2),
    o.notes || ''
  ]);

  const values = [headers, ...rows];

  // 3. Write data to sheet
  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Orders!A1:N${values.length}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values
      })
    }
  );

  if (!appendRes.ok) {
    const appendErr = await appendRes.json();
    throw new Error(appendErr.error?.message || 'Failed to populate Google Sheets data');
  }

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Creates a Google Spreadsheet and exports the Product Catalog into it
 */
export async function exportProductsToGoogleSheets(
  products: Product[],
  companyName: string = 'Apex Logistics ERP'
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  let token = getGoogleAccessToken();
  if (!token) {
    const authResult = await signInWithGoogleSheets();
    if (!authResult) throw new Error('Google authorization required.');
    token = authResult.accessToken;
  }

  const dateStr = new Date().toISOString().split('T')[0];
  const title = `${companyName} - Product Catalog (${dateStr})`;

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [{ properties: { title: 'Products' } }]
    })
  });

  if (!createRes.ok) {
    const errData = await createRes.json();
    throw new Error(errData.error?.message || 'Failed to create spreadsheet');
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = sheetData.spreadsheetUrl;

  const headers = ['SKU', 'Product Name', 'Category', 'Unit', 'Wholesale Price ($)', 'Cost Price ($)', 'Stock Level', 'Min. Stock Alert', 'Status'];
  const rows = products.map((p) => [
    p.sku,
    p.name,
    p.categoryName,
    p.unitName,
    p.wholesalePrice.toFixed(2),
    p.costPrice.toFixed(2),
    p.stockQuantity,
    p.minStockAlert,
    p.active ? 'Active' : 'Archived'
  ]);

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Products!A1:I${rows.length + 1}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values: [headers, ...rows] })
    }
  );

  return { spreadsheetId, spreadsheetUrl };
}
