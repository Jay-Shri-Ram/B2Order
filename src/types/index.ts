export type UserRole = 'admin' | 'manager' | 'salesman';

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  active: boolean;
  avatar?: string;
  lastLoginAt: string;
  createdAt: string;
  tempPassword?: string;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  address: string;
  location: string; // Location / City / Area for geographic filtering
  creditLimit: number;
  outstandingBalance: number;
  active: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  code: string;
  iconName?: string;
}

export interface Unit {
  id: string;
  name: string;
  shortCode: string;
  multiplier: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  categoryName: string;
  unitId: string;
  unitName: string;
  wholesalePrice: number;
  costPrice: number;
  stockQuantity: number;
  minStockAlert: number;
  active: boolean;
  imageUrl?: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  sku: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  totalPrice: number;
}

export type OrderStatus = 'Pending' | 'Confirmed' | 'Processing' | 'Dispatched' | 'Delivered' | 'Cancelled';
export type PaymentMethod = 'Cash' | 'Credit' | 'Bank Transfer';

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerCompany?: string;
  customerAddress?: string;
  customerLocation?: string;
  salesmanId: string;
  salesmanName: string;
  items: OrderItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountRate: number;
  discountAmount: number;
  totalAmount: number;
  totalCost: number;
  totalProfit: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  synced: boolean;
}

export interface DeletedOrder {
  id: string;
  orderId: string;
  orderNumber: string;
  deletedBy: string;
  deletedByName: string;
  deletedByRole: UserRole;
  reason: string;
  deletedAt: string;
  snapshot: Order;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  targetEntity: string;
  details: string;
  ipAddress?: string;
}

export interface OrderReceiving {
  id: string;
  receiptNumber: string;
  supplierName: string;
  receivedDate: string;
  receivedBy: string;
  receivedByName: string;
  items: {
    productId: string;
    sku: string;
    name: string;
    quantityReceived: number;
    unit: string;
  }[];
  notes?: string;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  firestoreDatabaseId?: string;
}

export type ViewPermissionId =
  | 'order-entry'
  | 'order-history'
  | 'catalog'
  | 'demand'
  | 'customers'
  | 'reports'
  | 'system-activity'
  | 'sheets'
  | 'staff'
  | 'profit-analysis'
  | 'security';

export type RolePermissionsMap = {
  [role in UserRole]: {
    [viewId in ViewPermissionId]: boolean;
  };
};

export interface AppSettings {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  ownerMobileNumber: string;
  ownerEmail: string;
  currency: string;
  taxPercentage: number;
  smsNotificationsEnabled: boolean;
  webhookUrl?: string;
  autoSyncEnabled: boolean;
  firebaseConfig?: FirebaseConfig;
  isFirebaseConnected?: boolean;
  lastSyncTimestamp?: string;
  adminPassword?: string; // 6-character / 6-word password for Admin Console
  rolePermissions?: RolePermissionsMap; // Dynamic module access toggles per role
  googleSpreadsheetId?: string;
  googleSpreadsheetUrl?: string;
  territories?: string[]; // Manageable list of geographic territories/locations
}

export interface SmsMessage {
  id: string;
  timestamp: string;
  recipientPhone: string;
  recipientName: string;
  orderNumber?: string;
  type: 'order_confirmation' | 'stock_alert' | 'staff_security' | 'system_alert';
  message: string;
  status: 'delivered' | 'sent' | 'queued' | 'failed';
  gateway: string;
}
