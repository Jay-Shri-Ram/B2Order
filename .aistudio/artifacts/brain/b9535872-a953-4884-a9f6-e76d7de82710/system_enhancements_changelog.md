# Apex B2B Enterprise ERP - System Enhancements & Architecture Changelog

## Executive Summary
This document summarizes the comprehensive enterprise features, UI/UX upgrades, and architectural enhancements implemented in the **Apex B2B Order Hub & ERP** application.

---

## 1. Real-Time System Activity & Security Monitoring (`SystemActivityView`)
* **Dedicated Security View**: Created a read-only audit log console accessible under **Reporting & Analytics** (`system-activity`).
* **KPI Metrics Strip**:
  * Total Security Events count
  * Authentication & Login count
  * Security & Permission mutations count
  * Financial & Catalog transactions count
* **Action Category Filters**: Filter by `All Logs`, `Security & RBAC`, `Staff Management`, `Orders & Commerce`, `Catalog & Inventory`, or `Data Backups`.
* **Search & Export**: Real-time keyword filter across actor, action, target entity, and event details. Full export to CSV, Multi-sheet Excel, and PDF formats.

---

## 2. Category & Unit Master - Full Add, Edit & Delete Operations (`CatalogMasterView`)
* **Category Management**:
  * **Add Category**: Modal form with Name, Code, Icon key, Description, and Active status.
  * **Edit Category**: Instant update with change propagation.
  * **Delete Category**: Safe deletion with confirmation prompt and audit logging.
* **Measurement Unit Management**:
  * **Add Unit**: Modal form with Name (e.g., Box, Kilogram, Pallet, Carton) and Code (e.g., BOX, KG, PLT).
  * **Edit Unit**: In-place renaming and symbol modification.
  * **Delete Unit**: Safe deletion with audit log generation.
* **Dropdown Category Filtering**: Categories now render as a rich dropdown selector in addition to quick chip filters.

---

## 3. Multi-Worksheet Excel Order Export (`exportService.ts`)
* **Workbook Structure**:
  * **Worksheet 1: `Order Details`**: Order Number, Timestamp, Customer Name, Company, Area / Location, Salesman, Status, Payment Method, Subtotal ($), Discount ($), Tax ($), and Total Amount ($).
  * **Worksheet 2: `Order Items Breakdown`**: Order Number, Customer Name, Product SKU, Product Name, Unit of Measure, Unit Price ($), Quantity, and Line Item Total ($).
* Generated via `xlsx` library with auto-fit column widths and clean currency formatting.

---

## 4. Master Admin Console Password Protection (`AdminSecurityView`)
* **6-Word / Character Master Password**:
  * Enforced minimum length of 6 characters / words for master administrator credential.
  * Protected Admin Security Console and Admin account registration.
  * In-panel updating form allows authorized administrators to change the master PIN directly, updating `settings.adminPassword` in IndexedDB with immediate audit trail recording.

---

## 5. Assigned Geographic Territories & Delivery Route Management
* **Dual Location Mode**:
  * **Free-Text Typing**: Sales representatives can type any custom delivery dock, area, or city in `OrderEntryView` and `CustomerMasterView` with smart `<datalist>` auto-suggestions.
  * **Admin Panel Route Manager**: Administrators can Add, Edit (rename), or Delete official delivery routes directly in `AdminSecurityView`.
* **Location-Dependent Customer Selection**: In `OrderEntryView`, selecting or typing an area filters the customer dropdown to only clients situated in that geographic route.

---

## 6. Optional Sales Tax & Tax Cut (`OrderEntryView`)
* **Removed Mandatory Estimated Tax**: Cut forced 8.5% tax calculation.
* **Optional Tax Toggle**: Added an explicit `[ ] Apply Tax (Optional)` checkbox in the cart summary.
* **Customizable Tax Rate**: Defaulted to `0%`. When enabled, users can select quick presets (`5%`, `12%`, `18%`) or type any custom decimal tax percentage. Orders dispatch with the exact chosen tax or `$0.00` if unchecked.

---

## 7. Customer 360° Profile & Dual-Tier Orders History (`CustomerMasterView`)
* **"View" Button (Eye Icon)**: Added to each customer row in the Customer Master table.
* **Profile Header**: Account code, entity name, phone, email, delivery route, and active badge.
* **Credit & Financial Metrics**:
  * Credit Limit ($)
  * Outstanding Balance ($)
  * Remaining Available Credit ($)
  * Lifetime Orders Count
* **Segregated Orders Ledger**:
  * **New & Recent Orders (Last 30 Days)**: Displays order number, status badge, salesman name, total amount ($), and itemized product list.
  * **Older & Historical Orders**: Archived order history with date, order number, line item count, payment method, and total amount.

---

## 8. Glassmorphism, Glow Themes & Dark Mode Integrity
* **Tailwind CSS v4 Dark Mode Fix**: Added `@custom-variant dark (&:where(.dark, .dark *));` in `src/index.css` to enable class-based dark mode toggling.
* **Glass & Glow UI Utilities**:
  * `.glass-panel`: Translucent backdrop blur with high-density subtle borders.
  * `.glass-card`: Semi-opaque card styling with elevation.
  * `.glow-indigo`, `.glow-emerald`, `.glow-rose`: Subtle radial glows for badges, buttons, and status indicators.
* **Custom Scrollbars**: Clean, slim custom scrollbars for dark and light modes.

---

## 9. Live Firebase Synchronization & Offline-First Persistence
* **User Project Configured**:
  * Project ID: `gen-lang-client-0838880698`
  * App ID: `1:529817740631:web:4b55969795a62111ea0a12`
  * API Key: `AIzaSyDYTf49nLP5fNTp7NjsGZ2mayISdSHI3ds`
  * Auth Domain: `gen-lang-client-0838880698.firebaseapp.com`
  * Storage Bucket: `gen-lang-client-0838880698.firebasestorage.app`
* All 10 IndexedDB stores persist locally and sync bidirectionally when cloud connectivity is active.
