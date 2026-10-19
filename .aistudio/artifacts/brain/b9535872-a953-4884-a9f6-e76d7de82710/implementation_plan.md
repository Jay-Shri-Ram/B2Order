# Enterprise B2B Order Hub & Staff Management ERP

A high-performance, mobile-first, enterprise-grade B2B order entry, catalog, inventory, and staff management system with multi-role access control, offline-first IndexedDB persistence, live Firebase Cloud synchronization, and real-time SMS notifications for company owners.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions have been confirmed and will guide the build:

- **Confirmed Decision 1 (Storage & Sync Strategy)**: Hybrid Offline-First architecture. All core entities (`orders`, `deletedOrders`, `customers`, `products`, `categories`, `units`, `staff`, `settings`, `auditLogs`) are indexed in Dexie/IndexedDB for sub-millisecond local operations and zero-latency offline performance, with bidirectional real-time synchronization to Firebase Firestore when online or configured.
- **Confirmed Decision 2 (Live Firebase Credential Manager)**: Built-in dynamic Firebase credential installer and project switcher in the Admin Security Console with real-time connection status validation, alongside simulated local cloud sync mode for immediate out-of-the-box operation.
- **Confirmed Decision 3 (SMS & Alert Dispatch Engine)**: Interactive SMS dispatch system that instantly generates order confirmations and inventory threshold warnings sent to the company owner mobile number, complete with a live SMS activity log, gateway webhook tester, and carrier preview simulation.
- **Confirmed Decision 4 (Domain & Brand Identity)**: "Apex Logistics & B2B Commerce Hub" — an enterprise wholesale distribution platform equipped with realistic catalog presets (FMCG, Industrial Parts, and Consumer Goods), unit masteries, and order lifecycle states.

---

### 1. Overview & Core Concept

Apex B2B Order Hub provides a unified, role-segmented enterprise operating platform designed for field sales reps, warehouse managers, and executive administrators:

- **Salesman Role**: Focused, streamlined order entry interface optimized for fast mobile/tablet entry in the field. Rapid barcode/SKU search, live cart calculations, tiered pricing, customer selection, credit limit warnings, and instant order dispatch.
- **Manager Role**: Comprehensive operational oversight. Access to Order History, Product Demand & Summary, Catalog Master, Customer Master, Unit Master, and inventory replenishment indicators. Restrained from staff credential management, admin consoles, and underlying cost/profit calculations.
- **Admin Role**: Unrestricted executive command. Full permissions across all operational modules, Admin Security Console, Staff Management (provisioning, role assignment, active/inactive kill-switch, password resets), profit margin analytics, encrypted backup export/restore, audit trail logging, and dynamic Firebase credentials installation.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Authentication & Session Switcher**:
   - Secure login with email/password or fast role switcher for demonstration and multi-tenant testing.
   - Comprehensive audit logging on every authentication attempt, role escalation, and permission check.
2. **Order Entry (Mobile-First / Field Optimized)**:
   - Dynamic customer selector with outstanding credit balances and shipping addresses.
   - Categorized product search with live inventory chips, unit multipliers (boxes, cartons, units), and instant line-item addition.
   - Order summary with automatic subtotal, tax breakdown, discount application, and 1-click submit.
   - Automated trigger: Dispatches SMS confirmation payload to company owner mobile number and creates audit log.
3. **Product & Customer Master Catalog**:
   - High-density data grid with sorting, search, category filtering, and inline inventory level tracking.
   - Manager/Admin modal to create and update products, set min/max reorder thresholds, wholesale price, and unit definitions.
4. **Staff Management Console (Admin Only)**:
   - Staff member directory displaying assigned role, status badge (Active/Inactive), email, phone, and last active timestamp.
   - Add new staff modal with role assignment (`Salesman`, `Manager`, `Admin`).
   - Instant active/inactive switch and direct password reset modal with temporary credential issuance and audit logging.
5. **Real-Time Analytics & Profit Margin Monitor**:
   - Revenue, order volume, average ticket size, and profit margin KPI cards (Admin only for profit/cost analytics).
   - Category demand visualization and high-velocity product rankings.
6. **Admin Security & Firebase Credentials Installer**:
   - Live Firestore connection prober (`getDocFromServer` validation).
   - Form to input or switch Firebase project credentials (`apiKey`, `projectId`, `appId`, etc.) stored securely with connection status indicators.
   - Encrypted data backup export (JSON) and restore capability with schema validation.
   - Owner mobile number configuration for instant SMS dispatches.

#### Visual Identity & Theme
- **Aesthetic Direction**: High-density Swiss-inspired enterprise ERP with crisp technical typography, dark and light mode support, and razor-sharp borders.
- **Color Palette**:
  - Dominant Canvas: Crisp neutral slate (`bg-slate-50` light, `bg-slate-950` dark).
  - Structural Surfaces: Pure white cards with hairline borders (`bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800`).
  - Brand Accent: Deep Cobalt & Electric Indigo (`bg-indigo-600 hover:bg-indigo-700 text-white`).
  - Semantic Status: Emerald (`#16A34A` Active/Delivered), Amber (`#D97706` Pending/Low Stock), Crimson (`#DC2626` Inactive/Cancelled/Overdue).
- **Typography & Hierarchy**:
  - Primary UI & Display: `Plus Jakarta Sans` / `Inter` fallback for headers and navigation.
  - Telemetry & Financials: Monospace tabular numerals (`font-mono tabular-nums`) for currency, quantities, SKUs, timestamps, and order reference codes.
- **Interactive Feedback & Motion**:
  - Framer Motion transitions between role views and active tabs (`opacity` and `y` transformations).
  - Floating action sheet on mobile for order review and cart drawer.
  - Toast notification engine for immediate feedback on order submissions, staff updates, and sync events.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dual-Layer Persistence (Dexie/IndexedDB + Firebase Firestore)**
  - *Chosen Approach*: Write-first to local IndexedDB, followed by an asynchronous background sync worker to Firestore. If offline or Firebase is unconfigured, the app continues to operate flawlessly with 100% feature availability and queues outbound mutations.
  - *Why*: In field sales environments, intermittent cellular connection is guaranteed. Offline-first prevents dropped orders while retaining real-time cloud capabilities.
- **Decision 2: 2-Tier / 3-Level Role-Based Access Control Architecture**
  - *Chosen Approach*: Strict in-app permission matrix (`RolePermissions`) enforced at both navigation router level and individual component/action buttons. Salesman sees only Order Entry; Manager sees Catalog, History, Demand, Customers; Admin sees everything including Staff Console, Profit Costs, Security Settings, and Firebase config.
  - *Why*: Protects sensitive wholesale purchase costs, profit margins, and employee access keys from unauthorized sales reps and store clerks.
- **Decision 3: Multi-Mode SMS Engine (Simulated Drawer + Real Webhook Gateway)**
  - *Chosen Approach*: Instant mobile owner alert dispatch with an interactive SMS Notification Center drawer showing live delivery receipts, formatted SMS text, recipient phone number, and webhook URL dispatch.
  - *Why*: Allows immediate visual verification and end-to-end testing without mandatory external SMS vendor charges while supporting real webhook forwarders.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Apex B2B Order Hub UI                           │
├────────────────────────────────┬───────────────────────────────────────┤
│ Salesman Portal (Order Entry)  │ Manager Portal (Catalog/Demand)       │
├────────────────────────────────┴───────────────────────────────────────┤
│ Admin Console (Staff Management, Security, Profit Analysis, Settings)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│            RBAC Controller & Application State (Context API)           │
│  - Active User & Session (Salesman, Manager, Admin)                    │
│  - Role Permission Guard & Audit Trail Dispatcher                      │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
                   ▼                                 ▼
┌─────────────────────────────────────┐  ┌───────────────────────────────┐
│       IndexedDB Persistence         │  │   SMS Dispatch & Event Bus    │
│  - Orders & DeletedOrders           │  │   - Owner Mobile Alerts       │
│  - Customers & Products             │  │   - Inventory Low-Stock Alerts│
│  - Staff, Categories, Units         │  │   - Webhook & Preview Gateway │
└──────────────────┬──────────────────┘  └───────────────────────────────┘
                   │ (Bidirectional Sync)
                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│     Firebase Firestore Cloud Sync Engine (Real-Time Synchronizer)      │
│  - Configurable Firebase Credentials (Admin Console)                   │
│  - Firestore Collections: orders, products, customers, staff, audit    │
└────────────────────────────────────────────────────────────────────────┘
```

#### Data Entities & Collections:
1. `orders`: `id`, `orderNumber`, `customerId`, `customerName`, `salesmanId`, `salesmanName`, `items: [{productId, name, sku, unit, quantity, unitPrice, costPrice, totalPrice}]`, `subtotal`, `tax`, `discount`, `totalAmount`, `profitAmount`, `status`, `notes`, `createdAt`, `updatedAt`, `synced`.
2. `deletedOrders`: `id`, `orderId`, `orderNumber`, `deletedBy`, `reason`, `deletedAt`.
3. `products`: `id`, `sku`, `name`, `categoryId`, `categoryName`, `unitId`, `unitName`, `wholesalePrice`, `costPrice`, `stockQuantity`, `minStockAlert`, `active`, `updatedAt`.
4. `customers`: `id`, `code`, `name`, `company`, `phone`, `email`, `address`, `creditLimit`, `outstandingBalance`, `active`.
5. `staff`: `id`, `name`, `email`, `role` (`'admin' | 'manager' | 'salesman'`), `phone`, `active`, `lastLoginAt`, `createdAt`.
6. `categories` & `units`: standard taxonomy definitions (Beverages, Staples, Industrial, Pack, Carton, Kg, Unit).
7. `auditLogs`: `id`, `timestamp`, `actorId`, `actorName`, `actorRole`, `action`, `targetEntity`, `details`, `ipAddress`.
8. `settings`: `ownerPhoneNumber`, `companyName`, `smsNotificationsEnabled`, `firebaseConfig`, `offlineModeEnabled`, `currency`.

#### Implementation Phasing:
1. **Core Data Store & Mock Data**: IndexedDB database layer (`src/db/indexedDb.ts`) with pre-populated enterprise demo fixtures for products, customers, units, categories, and initial staff credentials.
2. **Auth & RBAC Matrix**: Security context providing active user switching, session persistence, role-based route/view gates, and automated audit logging.
3. **Views Implementation**:
   - Order Entry View (Salesman/Manager/Admin) with real-time cart, customer selection, credit check, and mobile order review sheet.
   - Order History & Management with status updates, filtering, and invoice modal.
   - Catalog & Inventory Master with category filters and product modal.
   - Customer Master with credit limit and balance tracking.
   - Staff Management Console (Admin only) with new account modal, status toggle, password reset, and audit trail.
   - Profit Margin & Analytics Dashboard (Admin & Manager with cost redactions).
   - Admin Security & Firebase Connection Installer with encrypted backup exporter.
   - Interactive SMS Dispatch Simulator Drawer with owner mobile dispatching.
4. **Dark Mode & Styling**: Full responsive mobile and desktop styling with Framer Motion transitions and Tailwind dark theme.
5. **Verification**: Run `compile_applet` and verify zero errors.
