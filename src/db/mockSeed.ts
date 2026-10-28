import {
  Customer,
  Category,
  Unit,
  Product,
  StaffMember,
  Order,
  AuditLog,
  AppSettings,
  SmsMessage,
  RolePermissionsMap
} from '../types';

export const INITIAL_STAFF: StaffMember[] = [
  {
    id: 'staff-admin-01',
    name: 'Alexander Wright',
    email: 'admin@apexerp.internal',
    role: 'admin',
    phone: '+91 98765 43210',
    active: true,
    lastLoginAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    createdAt: '2026-01-10T08:00:00Z',
    tempPassword: 'ADMIN1',
    companyName: 'Apex B2B Order Hub',
    ownerName: 'Ashu Chauhan'
  },
  {
    id: 'staff-mgr-01',
    name: 'Elena Rostova',
    email: 'elena.rostova@apexerp.internal',
    role: 'manager',
    phone: '+91 98112 23344',
    active: true,
    lastLoginAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    createdAt: '2026-01-15T09:30:00Z',
    tempPassword: 'MGR123',
    companyName: 'Apex B2B Order Hub',
    ownerName: 'Ashu Chauhan'
  },
  {
    id: 'staff-sales-01',
    name: 'Marcus Vance',
    email: 'marcus.vance@apexerp.internal',
    role: 'salesman',
    phone: '+91 97123 45678',
    active: true,
    lastLoginAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    createdAt: '2026-02-01T10:15:00Z',
    tempPassword: 'SALE01',
    companyName: 'Apex B2B Order Hub',
    ownerName: 'Ashu Chauhan'
  },
  {
    id: 'staff-sales-02',
    name: 'Chloe Bennett',
    email: 'chloe.b@apexerp.internal',
    role: 'salesman',
    phone: '+91 99234 56789',
    active: false,
    lastLoginAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    createdAt: '2026-02-14T11:00:00Z',
    tempPassword: 'SALE02',
    companyName: 'Apex B2B Order Hub',
    ownerName: 'Ashu Chauhan'
  }
];

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-bev', name: 'Beverages & Syrups', code: 'BEV' },
  { id: 'cat-dry', name: 'Dry Provisions & Grains', code: 'DRY' },
  { id: 'cat-pack', name: 'Packaging & Disposables', code: 'PKG' },
  { id: 'cat-spices', name: 'Bulk Condiments & Oils', code: 'CDT' },
  { id: 'cat-clean', name: 'Sanitation & Industrial Supplies', code: 'IND' }
];

export const INITIAL_UNITS: Unit[] = [
  { id: 'unit-crt', name: 'Carton (24 units)', shortCode: 'CRT-24', multiplier: 24 },
  { id: 'unit-box', name: 'Box (12 units)', shortCode: 'BOX-12', multiplier: 12 },
  { id: 'unit-case', name: 'Master Case (48 units)', shortCode: 'CASE-48', multiplier: 48 },
  { id: 'unit-bag', name: 'Bulk Bag (25 kg)', shortCode: 'BAG-25K', multiplier: 1 },
  { id: 'unit-ea', name: 'Individual Unit', shortCode: 'EA', multiplier: 1 }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-101',
    code: 'CUST-0841',
    name: 'Robert Hastings',
    company: 'Metropolitan Bistro Group',
    phone: '+91 98220 11223',
    email: 'purchasing@metrobistro.com',
    address: '840 Market Street, Suite 400',
    location: 'Financial District',
    creditLimit: 25000,
    outstandingBalance: 6420,
    active: true,
    createdAt: '2026-01-20T10:00:00Z'
  },
  {
    id: 'cust-102',
    code: 'CUST-0842',
    name: 'Siddharth Patel',
    company: 'Apex Artisan Roasters',
    phone: '+91 97330 22334',
    email: 'orders@apexroasters.co',
    address: '124 Industrial Way, Pier 18',
    location: 'Westside Industrial',
    creditLimit: 15000,
    outstandingBalance: 12150,
    active: true,
    createdAt: '2026-02-02T11:20:00Z'
  },
  {
    id: 'cust-103',
    code: 'CUST-0843',
    name: 'Samantha Lee',
    company: 'Pacific Harbour Hotel & Suites',
    phone: '+91 98440 33445',
    email: 'inventory@pacificharbour.org',
    address: '99 Marina Boulevard, Tower East',
    location: 'Harbour Bay',
    creditLimit: 50000,
    outstandingBalance: 4200,
    active: true,
    createdAt: '2026-02-18T14:45:00Z'
  },
  {
    id: 'cust-104',
    code: 'CUST-0844',
    name: 'David Kowalski',
    company: 'Summit Gourmet Grocers',
    phone: '+91 99550 44556',
    email: 'd.kowalski@summitgrocers.com',
    address: '310 Crestview Avenue',
    location: 'North Suburbs',
    creditLimit: 18000,
    outstandingBalance: 17850,
    active: true,
    createdAt: '2026-02-25T09:10:00Z'
  },
  {
    id: 'cust-105',
    code: 'CUST-0845',
    name: 'Nadia Thorne',
    company: 'Verdant Cafe & Catering',
    phone: '+91 98660 55667',
    email: 'nadia@verdantcatering.com',
    address: '45 Greenpoint Lane, Warehouse B',
    location: 'Downtown District',
    creditLimit: 10000,
    outstandingBalance: 1100,
    active: true,
    createdAt: '2026-03-05T13:00:00Z'
  },
  {
    id: 'cust-106',
    code: 'CUST-0846',
    name: 'Victor Vance',
    company: 'Bayfront Yacht Club Dining',
    phone: '+1 (555) 321-9876',
    email: 'catering@bayfrontyc.com',
    address: '12 Marina Promenade',
    location: 'Harbour Bay',
    creditLimit: 30000,
    outstandingBalance: 2400,
    active: true,
    createdAt: '2026-03-08T11:00:00Z'
  }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    sku: 'APX-BEV-001',
    name: 'Organic Madagascar Vanilla Extract (Pure)',
    categoryId: 'cat-bev',
    categoryName: 'Beverages & Syrups',
    unitId: 'unit-box',
    unitName: 'Box (12 units)',
    wholesalePrice: 185.00,
    costPrice: 112.50,
    stockQuantity: 48,
    minStockAlert: 15,
    active: true,
    updatedAt: '2026-03-10T10:00:00Z'
  },
  {
    id: 'prod-002',
    sku: 'APX-BEV-002',
    name: 'Cold-Pressed Valencia Orange Juice Concentrate',
    categoryId: 'cat-bev',
    categoryName: 'Beverages & Syrups',
    unitId: 'unit-crt',
    unitName: 'Carton (24 units)',
    wholesalePrice: 94.50,
    costPrice: 58.00,
    stockQuantity: 120,
    minStockAlert: 25,
    active: true,
    updatedAt: '2026-03-11T12:00:00Z'
  },
  {
    id: 'prod-003',
    sku: 'APX-DRY-001',
    name: 'Arborio Superfino Italian Rice (Bulk Bag)',
    categoryId: 'cat-dry',
    categoryName: 'Dry Provisions & Grains',
    unitId: 'unit-bag',
    unitName: 'Bulk Bag (25 kg)',
    wholesalePrice: 76.00,
    costPrice: 44.00,
    stockQuantity: 8,
    minStockAlert: 12,
    active: true,
    updatedAt: '2026-03-12T08:30:00Z'
  },
  {
    id: 'prod-004',
    sku: 'APX-DRY-002',
    name: 'Semolina Tipo 00 Unbleached Flour',
    categoryId: 'cat-dry',
    categoryName: 'Dry Provisions & Grains',
    unitId: 'unit-bag',
    unitName: 'Bulk Bag (25 kg)',
    wholesalePrice: 52.50,
    costPrice: 31.00,
    stockQuantity: 64,
    minStockAlert: 20,
    active: true,
    updatedAt: '2026-03-12T09:15:00Z'
  },
  {
    id: 'prod-005',
    sku: 'APX-CDT-001',
    name: 'Extra Virgin Greek Kalamata Olive Oil (Cold Infused)',
    categoryId: 'cat-spices',
    categoryName: 'Bulk Condiments & Oils',
    unitId: 'unit-box',
    unitName: 'Box (12 units)',
    wholesalePrice: 220.00,
    costPrice: 145.00,
    stockQuantity: 32,
    minStockAlert: 10,
    active: true,
    updatedAt: '2026-03-14T11:00:00Z'
  },
  {
    id: 'prod-006',
    sku: 'APX-CDT-002',
    name: 'Aged Balsamic Glaze of Modena PGI',
    categoryId: 'cat-spices',
    categoryName: 'Bulk Condiments & Oils',
    unitId: 'unit-crt',
    unitName: 'Carton (24 units)',
    wholesalePrice: 168.00,
    costPrice: 98.00,
    stockQuantity: 5,
    minStockAlert: 15,
    active: true,
    updatedAt: '2026-03-14T11:45:00Z'
  },
  {
    id: 'prod-007',
    sku: 'APX-PKG-001',
    name: 'Heavy-Duty Biodegradable Kraft Takeout Containers',
    categoryId: 'cat-pack',
    categoryName: 'Packaging & Disposables',
    unitId: 'unit-case',
    unitName: 'Master Case (48 units)',
    wholesalePrice: 88.00,
    costPrice: 42.00,
    stockQuantity: 180,
    minStockAlert: 30,
    active: true,
    updatedAt: '2026-03-15T14:10:00Z'
  },
  {
    id: 'prod-008',
    sku: 'APX-IND-001',
    name: 'Commercial Food-Grade Surface Sanitizer (5L Jugs)',
    categoryId: 'cat-clean',
    categoryName: 'Sanitation & Industrial Supplies',
    unitId: 'unit-box',
    unitName: 'Box (12 units)',
    wholesalePrice: 115.00,
    costPrice: 65.00,
    stockQuantity: 44,
    minStockAlert: 15,
    active: true,
    updatedAt: '2026-03-15T16:00:00Z'
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-9021',
    orderNumber: 'ORD-2026-9021',
    customerId: 'cust-101',
    customerName: 'Robert Hastings',
    customerPhone: '+1 (555) 702-9912',
    customerCompany: 'Metropolitan Bistro Group',
    customerAddress: '840 Market Street, Suite 400',
    customerLocation: 'Financial District',
    salesmanId: 'staff-sales-01',
    salesmanName: 'Marcus Vance',
    items: [
      {
        productId: 'prod-001',
        sku: 'APX-BEV-001',
        name: 'Organic Madagascar Vanilla Extract (Pure)',
        unit: 'Box (12 units)',
        quantity: 3,
        unitPrice: 185.00,
        costPrice: 112.50,
        totalPrice: 555.00
      },
      {
        productId: 'prod-005',
        sku: 'APX-CDT-001',
        name: 'Extra Virgin Greek Kalamata Olive Oil (Cold Infused)',
        unit: 'Box (12 units)',
        quantity: 2,
        unitPrice: 220.00,
        costPrice: 145.00,
        totalPrice: 440.00
      }
    ],
    subtotal: 995.00,
    taxRate: 8.5,
    taxAmount: 84.58,
    discountRate: 5,
    discountAmount: 49.75,
    totalAmount: 1029.83,
    totalCost: 627.50,
    totalProfit: 402.33,
    status: 'Delivered',
    paymentMethod: 'Credit',
    notes: 'Gate access code #4490. Deliver to back kitchen dock.',
    createdAt: '2026-03-18T08:30:00Z',
    updatedAt: '2026-03-18T14:15:00Z',
    synced: true
  },
  {
    id: 'ord-9022',
    orderNumber: 'ORD-2026-9022',
    customerId: 'cust-103',
    customerName: 'Samantha Lee',
    customerPhone: '+1 (555) 412-8876',
    customerCompany: 'Pacific Harbour Hotel & Suites',
    customerAddress: '99 Marina Boulevard, Tower East',
    customerLocation: 'Harbour Bay',
    salesmanId: 'staff-sales-01',
    salesmanName: 'Marcus Vance',
    items: [
      {
        productId: 'prod-002',
        sku: 'APX-BEV-002',
        name: 'Cold-Pressed Valencia Orange Juice Concentrate',
        unit: 'Carton (24 units)',
        quantity: 10,
        unitPrice: 94.50,
        costPrice: 58.00,
        totalPrice: 945.00
      },
      {
        productId: 'prod-007',
        sku: 'APX-PKG-001',
        name: 'Heavy-Duty Biodegradable Kraft Takeout Containers',
        unit: 'Master Case (48 units)',
        quantity: 5,
        unitPrice: 88.00,
        costPrice: 42.00,
        totalPrice: 440.00
      }
    ],
    subtotal: 1385.00,
    taxRate: 8.5,
    taxAmount: 117.73,
    discountRate: 0,
    discountAmount: 0,
    totalAmount: 1502.73,
    totalCost: 790.00,
    totalProfit: 712.73,
    status: 'Dispatched',
    paymentMethod: 'Bank Transfer',
    notes: 'Direct delivery to main culinary commissary.',
    createdAt: '2026-03-19T09:15:00Z',
    updatedAt: '2026-03-19T11:00:00Z',
    synced: true
  },
  {
    id: 'ord-9023',
    orderNumber: 'ORD-2026-9023',
    customerId: 'cust-102',
    customerName: 'Siddharth Patel',
    customerPhone: '+1 (555) 881-4432',
    customerCompany: 'Apex Artisan Roasters',
    customerAddress: '124 Industrial Way, Pier 18',
    customerLocation: 'Westside Industrial',
    salesmanId: 'staff-sales-01',
    salesmanName: 'Marcus Vance',
    items: [
      {
        productId: 'prod-004',
        sku: 'APX-DRY-002',
        name: 'Semolina Tipo 00 Unbleached Flour',
        unit: 'Bulk Bag (25 kg)',
        quantity: 4,
        unitPrice: 52.50,
        costPrice: 31.00,
        totalPrice: 210.00
      }
    ],
    subtotal: 210.00,
    taxRate: 8.5,
    taxAmount: 17.85,
    discountRate: 0,
    discountAmount: 0,
    totalAmount: 227.85,
    totalCost: 124.00,
    totalProfit: 103.85,
    status: 'Confirmed',
    paymentMethod: 'Cash',
    notes: 'Urgent restocking for weekend bakery run.',
    createdAt: '2026-03-19T10:45:00Z',
    updatedAt: '2026-03-19T10:46:00Z',
    synced: true
  }
];

export const INITIAL_ROLE_PERMISSIONS: RolePermissionsMap = {
  admin: {
    'order-entry': true,
    'order-history': true,
    'catalog': true,
    'demand': true,
    'customers': true,
    'reports': true,
    'sheets': true,
    'staff': true,
    'profit-analysis': true,
    'security': true,
    'system-activity': true
  },
  manager: {
    'order-entry': true,
    'order-history': true,
    'catalog': true,
    'demand': true,
    'customers': true,
    'reports': true,
    'sheets': true,
    'staff': false,
    'profit-analysis': false,
    'security': false,
    'system-activity': true
  },
  salesman: {
    'order-entry': true,
    'order-history': false,
    'catalog': false,
    'demand': false,
    'customers': false,
    'reports': false,
    'sheets': false,
    'staff': false,
    'profit-analysis': false,
    'security': false,
    'system-activity': false
  }
};

export const INITIAL_TERRITORIES: string[] = [
  'Downtown District',
  'Financial District',
  'Westside Industrial',
  'Harbour Bay',
  'North Suburbs',
  'East Bay Corridor',
  'Metro Commercial Zone'
];

export const INITIAL_SETTINGS: AppSettings = {
  companyName: 'Apex B2B Order Hub',
  ownerName: 'Ashu Chauhan',
  companyAddress: 'Plot 42, Sector 18, Commercial Industrial Area',
  companyPhone: '+91 98765 43210',
  ownerMobileNumber: '+91 98765 43210',
  ownerEmail: 'aashuchauhan12042004@gmail.com',
  currency: '₹',
  taxPercentage: 0, // Cut estimated tax by default, optional
  smsNotificationsEnabled: true,
  autoSyncEnabled: true,
  firebaseConfig: {
    apiKey: 'AIzaSyDYTf49nLP5fNTp7NjsGZ2mayISdSHI3ds',
    authDomain: 'gen-lang-client-0838880698.firebaseapp.com',
    projectId: 'gen-lang-client-0838880698',
    storageBucket: 'gen-lang-client-0838880698.firebasestorage.app',
    messagingSenderId: '529817740631',
    appId: '1:529817740631:web:4b55969795a62111ea0a12',
    firestoreDatabaseId: 'ai-studio-apexb2borderhube-b9535872-a953-4884-a9f6-e76d7de82710'
  },
  isFirebaseConnected: true,
  lastSyncTimestamp: new Date().toISOString(),
  adminPassword: 'APEX99', // 6-character master Admin password
  adminPin: '1234', // 4-6 digit Admin Console PIN (Default: 1234, editable from Admin Console)
  rolePermissions: INITIAL_ROLE_PERMISSIONS,
  territories: INITIAL_TERRITORIES
};

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud-001',
    timestamp: '2026-03-19T07:45:10Z',
    actorId: 'staff-admin-01',
    actorName: 'Ashu Chauhan',
    actorRole: 'admin',
    action: 'SYSTEM_BOOT',
    targetEntity: 'ApexDB',
    details: 'System initialized with Indian mobile formatting, 4-6 digit PIN protection, and Firebase Cloud integration.'
  }
];

export const INITIAL_SMS_LOGS: SmsMessage[] = [
  {
    id: 'sms-001',
    timestamp: '2026-03-19T08:31:06Z',
    recipientPhone: '+91 98765 43210',
    recipientName: 'Ashu Chauhan (Owner)',
    orderNumber: 'ORD-2026-9021',
    type: 'order_confirmation',
    message: '📦 [Apex ERP] New Order #ORD-2026-9021 received for Metropolitan Bistro Group. Total: ₹1,029.83.',
    status: 'delivered',
    gateway: 'Apex Cloud Telecom Gateway'
  }
];
