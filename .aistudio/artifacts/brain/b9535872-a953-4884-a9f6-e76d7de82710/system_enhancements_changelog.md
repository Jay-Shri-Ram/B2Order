# Apex B2B Enterprise ERP - System Enhancements & Architecture Changelog

## Executive Summary
This document summarizes the comprehensive enterprise features, UI/UX upgrades, and architectural enhancements implemented in the **Apex B2B Order Hub & ERP** application.

---

## 1. Firebase Cloud Authentication & User Profile Management
* **Native Firebase Authentication**:
  * Implemented Firebase Email/Password authentication (`signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, and `sendPasswordResetEmail`).
  * `onAuthStateChanged` real-time listener maintains authenticated session across browser reloads.
* **Company Registration & Sign-Up Fields**:
  * **Company Name**: Enterprise entity branding name stored in user profile and settings.
  * **Business Owner Name**: Full name of registered representative.
  * **Mobile Number**: Indian standard format (`+91 XXXXX XXXXX`).
  * **Email & Password**: Minimum 6-character credentials with confirm-password validation.
  * **Role Selection**: Salesman, Manager, or Admin (Admin requires Master Security Key).
* **Forgot Password Recovery**:
  * Dedicated modal sending automated Firebase password reset links directly to the registered email.
* **Offline-First Fallback**:
  * Seamless demo accounts and local IndexedDB offline credentials remain operational if network is unreachable.

---

## 2. Dynamic Logged-in Company Name in App Header & Sidebar
* **Universal Desktop Header**:
  * Sticky glassmorphism header permanently displays the logged-in **Company Name** (e.g., `Apex B2B Order Hub`), Owner Name, and Indian Mobile phone.
  * Live status beacon indicating active enterprise session.
* **Vertical Sidebar & Mobile Navigation**:
  * Desktop vertical command bar and mobile top bar prominently feature the company name.
  * Updates instantly when company profile settings are edited in Admin Console.

---

## 3. Indian Standard Mobile Number Formatting (+91 XXXXX XXXXX)
* **Custom Phone Utility (`indianPhone.ts`)**:
  * `formatIndianPhone(input)`: Formats 10-digit mobile numbers into `+91 XXXXX XXXXX` standard, normalizing raw digits, 0-prefixed inputs, and `91` prefixes.
  * `isValidIndianPhone(input)`: Validates that mobile numbers contain 10 valid digits starting with `6, 7, 8, or 9`.
* **Universal Application**:
  * **Login & Sign-Up**: Formats and validates Indian contact numbers on typing.
  * **Customer Master**: Customer mobile numbers formatted to Indian standard.
  * **Staff Management**: Employee contact details standardized.
  * **SMS Dispatch Gateway**: Owner dispatch alerts routed to Indian format numbers.
  * **Admin Console**: Owner mobile number validation and formatting.

---

## 4. Admin Console 4 to 6 Digit Security PIN Protection
* **PIN Lock Screen**:
  * Restricts access to the Admin Console (`AdminSecurityView`) behind a dedicated 4 to 6 digit Security PIN.
  * Displays PIN keypad input with show/hide password toggle.
  * Default PINs supported: `1234`, `123456`, or `APEX99`.
* **In-Panel PIN Management**:
  * Authorized administrators can change the 4 to 6 digit PIN directly from inside the Admin Console at any time.
  * Enforces length boundaries (4 to 6 digits).
  * Automatically updates local IndexedDB `settings.adminPin` and mirrors to Firestore `/admin_config/security`.
  * Generates an immutable `ADMIN_PIN_CHANGED` audit log event.
* **Instant Re-Lock**:
  * Includes a "Lock Console" quick action button in the console header.

---

## 5. System Activity & Audit Trail Embedded in Admin Console
* **Dedicated Console Tab (`activity`)**:
  * Embedded live audit trail stream directly within the Admin Console.
  * Displays user action, actor role, timestamp, target entity, and audit parameters.
* **Multi-Format Export**:
  * One-click export to **CSV**, **Excel (.xlsx)**, and **PDF Report**.
* **Filter Matrix**:
  * Filter by category (Authentication/Logins, Security/PIN changes, Orders, Catalog) and Staff Role.

---

## 6. Real-Time System Activity & Security Monitoring (`SystemActivityView`)
* **Dedicated Security View**: Created a read-only audit log console accessible under **Reporting & Analytics** (`system-activity`).
* **KPI Metrics Strip**:
  * Total Security Events count
  * Authentication & Login count
  * Security & Permission mutations count
  * Financial & Catalog transactions count
* **Action Category Filters**: Filter by `All Logs`, `Security & RBAC`, `Staff Management`, `Orders & Commerce`, `Catalog & Inventory`, or `Data Backups`.
* **Search & Export**: Real-time keyword filter across actor, action, target entity, and event details. Full export to CSV, Multi-sheet Excel, and PDF formats.

---

## 7. Category & Unit Master - Full Add, Edit & Delete Operations (`CatalogMasterView`)
* **Category Management**:
  * **Add Category**: Modal form with Name, Code, Icon key, Description, and Active status.
  * **Edit Category**: Instant update with change propagation.
  * **Delete Category**: Safe deletion with confirmation prompt and audit logging.
* **Measurement Unit Management**:
  * **Add Unit**: Modal form with Name (e.g., Box, Kilogram, Pallet, Carton) and Code (e.g., BOX, KG, PLT).
  * **Edit Unit**: In-place renaming and symbol modification.
  * **Delete Unit**: Safe deletion with audit log generation.
* **Dropdown Category Filtering**: Categories render as a rich dropdown selector in addition to quick chip filters.

---

## 8. Multi-Worksheet Excel Order Export (`exportService.ts`)
* **Workbook Structure**:
  * **Worksheet 1: `Order Details`**: Order Number, Timestamp, Customer Name, Company, Area / Location, Salesman, Status, Payment Method, Subtotal, Discount, Tax, and Total Amount.
  * **Worksheet 2: `Order Items Breakdown`**: Order Number, Customer Name, Product SKU, Product Name, Unit of Measure, Unit Price, Quantity, and Line Item Total.
* Generated via `xlsx` library with auto-fit column widths and clean currency formatting.

---

## 9. Customer 360° Profile & Dual-Tier Orders History (`CustomerMasterView`)
* **"View" Button (Eye Icon)**: Added to each customer row in the Customer Master table.
* **Profile Header**: Account code, entity name, Indian mobile phone, email, delivery route, and active badge.
* **Credit & Financial Metrics**: Credit Limit, Outstanding Balance, Remaining Available Credit, and Lifetime Orders Count.
* **Segregated Orders Ledger**:
  * **New & Recent Orders (Last 30 Days)**: Displays order number, status badge, salesman name, total amount, and itemized product list.
  * **Older & Historical Orders**: Archived order history with date, order number, line item count, payment method, and total amount.

---

## 10. Live Firebase Synchronization & Security Rules Deployed
* **Provisioned Project ID**: `gen-lang-client-0838880698`
* **Firestore Database ID**: `ai-studio-apexb2borderhube-b9535872-a953-4884-a9f6-e76d7de82710`
* **Security Rules (`firestore.rules`)**:
  * Deployed to live Firebase project via `DeployRules` RPC.
  * Enforces user data ownership, immutable system activity audit logs, and authenticated admin configuration.
* All stores persist locally in IndexedDB and synchronize with Firebase Cloud.

---

## 11. OrderFlow Pro Design System Integration (Attachment A4d0af6be0db9f65f)
* **Color Palette & Design Tokens**:
  * **Canvas Background**: Deep dark navy `#070B14` (dark) / `#F7F7FF` (light).
  * **Surface Background**: `#0D1320` (semi-transparent `rgba(13, 19, 32, 0.72)`) with hairline borders `rgba(30, 41, 59, 0.85)` / `#1E293B`.
  * **Raised Surfaces**: `#202632` and `#111A2B`.
  * **Primary Accent**: `#6366F1` (Indigo), On-Primary `#FFFFFF`.
  * **Typography Scale**: Ink `#E2E8F0`, Body `#94A3B8`, Muted `#7C8CA5`.
* **Atmospheric Gradients & Micro-Elevation**:
  * Dual-radial hero atmospheric gradient (`.bg-orderflow-radial`) rendered on top containers.
  * Layered micro-shadows: `rgba(15, 23, 42, 0.04) 0px 1px 2px 0px, rgba(15, 23, 42, 0.18) 0px 8px 24px -12px`.
  * Indigo active glow: `rgba(99, 102, 241, 0.7) 0px 6px 18px -6px`.
* **Typographic Hierarchy**:
  * Inter display heading: `tracking-[-1.2px]`, font weight 800.
  * Section heading: `tracking-[-0.6px]`, font weight 800.
  * Uppercase micro-labels: font size `10.88px`, letter spacing `0.98px` (`.tracking-label-sm`).
  * Tabular figures (`tabular-nums font-mono`) for SKU codes, numeric metrics, and timestamps.
* **Component Variants & Micro-Interactions**:
  * `.btn-orderflow-primary`: `rgba(99, 102, 241, 0.1)` bg with `1px solid rgba(99, 102, 241, 0.28)`, `#6366F1` text, hover brightness, and `active:scale-[0.97]`.
  * `.btn-orderflow-glow`: `#6366F1` solid bg with `#FFFFFF` text and deep indigo elevation shadow.
  * `.btn-orderflow-filled`: `#334155` background with `#818CF8` text and `active:scale-[0.97]`.
  * `.orderflow-card` & `.orderflow-card-sm`: Rounded 20px / 16px with hairline borders and backdrop blur.
