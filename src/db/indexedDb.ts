import {
  Customer,
  Category,
  Unit,
  Product,
  StaffMember,
  Order,
  DeletedOrder,
  AuditLog,
  AppSettings,
  SmsMessage,
  OrderReceiving
} from '../types';
import {
  INITIAL_STAFF,
  INITIAL_CATEGORIES,
  INITIAL_UNITS,
  INITIAL_CUSTOMERS,
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
  INITIAL_SETTINGS,
  INITIAL_AUDIT_LOGS,
  INITIAL_SMS_LOGS
} from './mockSeed';

const DB_NAME = 'ApexB2BOrderHub_DB';
const DB_VERSION = 3;

export type StoreName =
  | 'orders'
  | 'deletedOrders'
  | 'customers'
  | 'products'
  | 'categories'
  | 'units'
  | 'staff'
  | 'auditLogs'
  | 'settings'
  | 'smsLogs'
  | 'orderReceiving';

type ChangeListener = (store: StoreName) => void;

class ApexDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private listeners: Set<ChangeListener> = new Set();
  private isFallbackMode = false;

  constructor() {
    this.init();
  }

  public subscribe(listener: ChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(store: StoreName) {
    this.listeners.forEach((fn) => {
      try {
        fn(store);
      } catch (err) {
        console.error('Error in listener notification:', err);
      }
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('apex-db-change', { detail: { store } }));
    }
  }

  private async init(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    if (typeof window === 'undefined' || !window.indexedDB) {
      this.isFallbackMode = true;
      return null as any;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const storeNames: StoreName[] = [
            'orders',
            'deletedOrders',
            'customers',
            'products',
            'categories',
            'units',
            'staff',
            'auditLogs',
            'settings',
            'smsLogs',
            'orderReceiving'
          ];

          storeNames.forEach((name) => {
            if (!db.objectStoreNames.contains(name)) {
              if (name === 'settings') {
                db.createObjectStore(name, { keyPath: 'key' });
              } else {
                db.createObjectStore(name, { keyPath: 'id' });
              }
            }
          });
        };

        request.onsuccess = async () => {
          const db = request.result;
          await this.seedInitialData(db);
          resolve(db);
        };

        request.onerror = (e) => {
          console.warn('IndexedDB open error, falling back to LocalStorage:', e);
          this.isFallbackMode = true;
          this.seedLocalStorage();
          resolve(null as any);
        };
      } catch (err) {
        console.warn('IndexedDB initialization failed, falling back:', err);
        this.isFallbackMode = true;
        this.seedLocalStorage();
        resolve(null as any);
      }
    });

    return this.dbPromise;
  }

  private async seedInitialData(db: IDBDatabase) {
    try {
      const tx = db.transaction(['staff', 'products', 'settings', 'customers'], 'readonly');
      const staffStore = tx.objectStore('staff');
      const countReq = staffStore.count();

      const hasData = await new Promise<boolean>((resolve) => {
        countReq.onsuccess = () => resolve(countReq.result > 0);
        countReq.onerror = () => resolve(false);
      });

      if (!hasData) {
        const seedTx = db.transaction(
          ['staff', 'categories', 'units', 'customers', 'products', 'orders', 'auditLogs', 'settings', 'smsLogs'],
          'readwrite'
        );

        INITIAL_STAFF.forEach((item) => seedTx.objectStore('staff').put(item));
        INITIAL_CATEGORIES.forEach((item) => seedTx.objectStore('categories').put(item));
        INITIAL_UNITS.forEach((item) => seedTx.objectStore('units').put(item));
        INITIAL_CUSTOMERS.forEach((item) => seedTx.objectStore('customers').put(item));
        INITIAL_PRODUCTS.forEach((item) => seedTx.objectStore('products').put(item));
        INITIAL_ORDERS.forEach((item) => seedTx.objectStore('orders').put(item));
        INITIAL_AUDIT_LOGS.forEach((item) => seedTx.objectStore('auditLogs').put(item));
        INITIAL_SMS_LOGS.forEach((item) => seedTx.objectStore('smsLogs').put(item));
        seedTx.objectStore('settings').put({ key: 'main', ...INITIAL_SETTINGS });

        await new Promise((resolve) => {
          seedTx.oncomplete = () => resolve(true);
        });
      } else {
        // Ensure settings has rolePermissions and adminPassword if upgrading
        const settingsTx = db.transaction(['settings'], 'readwrite');
        const settingsStore = settingsTx.objectStore('settings');
        const req = settingsStore.get('main');
        req.onsuccess = () => {
          if (req.result && (!req.result.rolePermissions || !req.result.adminPassword)) {
            settingsStore.put({
              ...req.result,
              rolePermissions: req.result.rolePermissions || INITIAL_SETTINGS.rolePermissions,
              adminPassword: req.result.adminPassword || 'APEX99'
            });
          }
        };
      }
    } catch (err) {
      console.warn('Seeding initial data encountered error:', err);
    }
  }

  private seedLocalStorage() {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem('apex_staff')) {
      localStorage.setItem('apex_staff', JSON.stringify(INITIAL_STAFF));
      localStorage.setItem('apex_categories', JSON.stringify(INITIAL_CATEGORIES));
      localStorage.setItem('apex_units', JSON.stringify(INITIAL_UNITS));
      localStorage.setItem('apex_customers', JSON.stringify(INITIAL_CUSTOMERS));
      localStorage.setItem('apex_products', JSON.stringify(INITIAL_PRODUCTS));
      localStorage.setItem('apex_orders', JSON.stringify(INITIAL_ORDERS));
      localStorage.setItem('apex_deletedOrders', JSON.stringify([]));
      localStorage.setItem('apex_auditLogs', JSON.stringify(INITIAL_AUDIT_LOGS));
      localStorage.setItem('apex_smsLogs', JSON.stringify(INITIAL_SMS_LOGS));
      localStorage.setItem('apex_orderReceiving', JSON.stringify([]));
      localStorage.setItem('apex_settings', JSON.stringify({ key: 'main', ...INITIAL_SETTINGS }));
    }
  }

  public async getAll<T>(storeName: StoreName): Promise<T[]> {
    await this.init();
    if (this.isFallbackMode || typeof window === 'undefined' || !window.indexedDB) {
      const data = localStorage.getItem(`apex_${storeName}`);
      return data ? JSON.parse(data) : [];
    }

    const db = await this.dbPromise!;
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result as T[]);
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async getById<T>(storeName: StoreName, id: string): Promise<T | null> {
    await this.init();
    if (this.isFallbackMode || typeof window === 'undefined' || !window.indexedDB) {
      const items = await this.getAll<any>(storeName);
      const key = storeName === 'settings' ? 'key' : 'id';
      return items.find((item) => item[key] === id) || null;
    }

    const db = await this.dbPromise!;
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async put<T extends { id?: string; key?: string }>(storeName: StoreName, item: T): Promise<T> {
    await this.init();
    if (this.isFallbackMode || typeof window === 'undefined' || !window.indexedDB) {
      const items = await this.getAll<any>(storeName);
      const key = storeName === 'settings' ? 'key' : 'id';
      const itemKey = (item as any)[key];
      const index = items.findIndex((existing) => existing[key] === itemKey);
      if (index >= 0) {
        items[index] = item;
      } else {
        items.push(item);
      }
      localStorage.setItem(`apex_${storeName}`, JSON.stringify(items));
      this.notify(storeName);
      return item;
    }

    const db = await this.dbPromise!;
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put(item);
        req.onsuccess = () => {
          this.notify(storeName);
          resolve(item);
        };
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async delete(storeName: StoreName, id: string): Promise<boolean> {
    await this.init();
    if (this.isFallbackMode || typeof window === 'undefined' || !window.indexedDB) {
      const items = await this.getAll<any>(storeName);
      const key = storeName === 'settings' ? 'key' : 'id';
      const filtered = items.filter((item) => item[key] !== id);
      localStorage.setItem(`apex_${storeName}`, JSON.stringify(filtered));
      this.notify(storeName);
      return true;
    }

    const db = await this.dbPromise!;
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(id);
        req.onsuccess = () => {
          this.notify(storeName);
          resolve(true);
        };
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async getSettings(): Promise<AppSettings> {
    const res = await this.getById<any>('settings', 'main');
    if (!res) {
      await this.put('settings', { key: 'main', ...INITIAL_SETTINGS });
      return INITIAL_SETTINGS;
    }
    const { key, ...settings } = res;
    // ensure rolePermissions exists
    if (!settings.rolePermissions) {
      settings.rolePermissions = INITIAL_SETTINGS.rolePermissions;
    }
    if (!settings.adminPassword) {
      settings.adminPassword = INITIAL_SETTINGS.adminPassword;
    }
    if (!settings.adminPin) {
      settings.adminPin = INITIAL_SETTINGS.adminPin || '1234';
    }
    return settings as AppSettings;
  }

  public async saveSettings(settings: AppSettings): Promise<AppSettings> {
    await this.put('settings', { key: 'main', ...settings });
    return settings;
  }

  public async addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
    const fullLog: AuditLog = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      ...log
    };
    await this.put('auditLogs', fullLog);
    return fullLog;
  }

  public async logSmsMessage(sms: Omit<SmsMessage, 'id' | 'timestamp'>): Promise<SmsMessage> {
    const fullSms: SmsMessage = {
      id: `sms-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      ...sms
    };
    await this.put('smsLogs', fullSms);
    return fullSms;
  }

  public async exportCompleteDatabase(): Promise<string> {
    const data: Record<string, any> = {
      version: DB_VERSION,
      exportTimestamp: new Date().toISOString(),
      system: 'Apex B2B Order Hub',
      stores: {}
    };

    const stores: StoreName[] = [
      'orders',
      'deletedOrders',
      'customers',
      'products',
      'categories',
      'units',
      'staff',
      'auditLogs',
      'settings',
      'smsLogs',
      'orderReceiving'
    ];

    for (const store of stores) {
      data.stores[store] = await this.getAll(store);
    }

    return JSON.stringify(data, null, 2);
  }

  public async restoreDatabase(jsonString: string): Promise<{ success: boolean; message: string }> {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.stores || !parsed.system) {
        return { success: false, message: 'Invalid backup file structure.' };
      }

      for (const [storeName, items] of Object.entries(parsed.stores)) {
        if (Array.isArray(items)) {
          for (const item of items) {
            await this.put(storeName as StoreName, item);
          }
        }
      }

      await this.addAuditLog({
        actorId: 'admin-recovery',
        actorName: 'Admin Security',
        actorRole: 'admin',
        action: 'DATABASE_RESTORE',
        targetEntity: 'ApexDB',
        details: 'System database backup was successfully imported.'
      });

      return { success: true, message: 'Database successfully restored.' };
    } catch (err: any) {
      return { success: false, message: `Restore error: ${err.message || 'Corrupt JSON data'}` };
    }
  }

  public async resetToFactoryData(): Promise<void> {
    const stores: StoreName[] = [
      'orders',
      'deletedOrders',
      'customers',
      'products',
      'categories',
      'units',
      'staff',
      'auditLogs',
      'settings',
      'smsLogs',
      'orderReceiving'
    ];

    for (const store of stores) {
      const all = await this.getAll<any>(store);
      for (const item of all) {
        const id = store === 'settings' ? item.key : item.id;
        if (id) await this.delete(store, id);
      }
    }

    INITIAL_STAFF.forEach((item) => this.put('staff', item));
    INITIAL_CATEGORIES.forEach((item) => this.put('categories', item));
    INITIAL_UNITS.forEach((item) => this.put('units', item));
    INITIAL_CUSTOMERS.forEach((item) => this.put('customers', item));
    INITIAL_PRODUCTS.forEach((item) => this.put('products', item));
    INITIAL_ORDERS.forEach((item) => this.put('orders', item));
    INITIAL_AUDIT_LOGS.forEach((item) => this.put('auditLogs', item));
    INITIAL_SMS_LOGS.forEach((item) => this.put('smsLogs', item));
    await this.put('settings', { key: 'main', ...INITIAL_SETTINGS });
  }
}

export const ApexDB = new ApexDatabase();
