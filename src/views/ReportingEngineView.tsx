import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Table,
  Printer,
  Cloud,
  Search,
  Filter,
  MapPin,
  Users,
  Package,
  ShoppingCart,
  CheckCircle2,
  ExternalLink,
  MessageCircle,
  Mail,
  AlertTriangle,
  Layers,
  TrendingUp,
  DollarSign,
  Calendar,
  Share2
} from 'lucide-react';
import { Order, Customer, Product, Category } from '../types';
import { ApexDB } from '../db/indexedDb';
import { useAuth } from '../context/AuthContext';
import {
  exportOrdersToCsv,
  exportOrdersToExcel,
  exportOrdersToPdf,
  exportCustomersToCsv,
  exportCustomersToExcel,
  exportCustomersToPdf,
  exportProductsToCsv,
  exportProductsToExcel,
  exportProductsToPdf,
  shareOrderViaWhatsApp,
  shareOrderViaEmail
} from '../services/exportService';
import {
  exportOrdersToGoogleSheets,
  exportCustomersToGoogleSheets,
  exportProductsToGoogleSheets,
  getGoogleAccessToken
} from '../services/googleSheetsService';

type ReportDataset = 'orders' | 'customers' | 'products';

export const ReportingEngineView: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeDataset, setActiveDataset] = useState<ReportDataset>('orders');

  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Filters for Orders
  const [orderSearch, setOrderSearch] = useState('');
  const [orderLocation, setOrderLocation] = useState('all');
  const [orderStatus, setOrderStatus] = useState('all');
  const [orderTimeframe, setOrderTimeframe] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Filters for Customers
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerLocation, setCustomerLocation] = useState('all');
  const [customerBalanceFilter, setCustomerBalanceFilter] = useState<'all' | 'with-balance' | 'near-limit'>('all');

  // Filters for Products
  const [productSearch, setProductSearch] = useState('');
  const [productCategory, setProductCategory] = useState('all');
  const [productStockFilter, setProductStockFilter] = useState<'all' | 'low-stock' | 'out-of-stock'>('all');

  // Cloud Export state
  const [isExportingSheets, setIsExportingSheets] = useState(false);
  const [googleSheetResult, setGoogleSheetResult] = useState<{ id: string; url: string; title: string } | null>(null);

  const loadAllData = async () => {
    const [ords, custs, prods, cats] = await Promise.all([
      ApexDB.getAll<Order>('orders'),
      ApexDB.getAll<Customer>('customers'),
      ApexDB.getAll<Product>('products'),
      ApexDB.getAll<Category>('categories')
    ]);

    ords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    custs.sort((a, b) => a.name.localeCompare(b.name));
    prods.sort((a, b) => a.name.localeCompare(b.name));

    setOrders(ords);
    setCustomers(custs);
    setProducts(prods);
    setCategories(cats);
  };

  useEffect(() => {
    loadAllData();
    const unsub = ApexDB.subscribe((store) => {
      if (store === 'orders' || store === 'customers' || store === 'products' || store === 'categories') {
        loadAllData();
      }
    });
    return unsub;
  }, []);

  // Unique Geographic Locations for dropdown
  const locations = Array.from(new Set(customers.map((c) => c.location).filter(Boolean)));

  // Filtered Orders
  const filteredOrders = orders.filter((o) => {
    if (orderStatus !== 'all' && o.status !== orderStatus) return false;
    if (orderLocation !== 'all' && o.customerLocation !== orderLocation) return false;

    if (orderSearch.trim()) {
      const s = orderSearch.toLowerCase();
      const match =
        o.orderNumber.toLowerCase().includes(s) ||
        o.customerName.toLowerCase().includes(s) ||
        (o.customerCompany && o.customerCompany.toLowerCase().includes(s)) ||
        o.salesmanName.toLowerCase().includes(s);
      if (!match) return false;
    }

    if (orderTimeframe !== 'all') {
      const orderDate = new Date(o.createdAt).getTime();
      const now = Date.now();
      if (orderTimeframe === 'today' && now - orderDate > 1000 * 60 * 60 * 24) return false;
      if (orderTimeframe === 'week' && now - orderDate > 1000 * 60 * 60 * 24 * 7) return false;
      if (orderTimeframe === 'month' && now - orderDate > 1000 * 60 * 60 * 24 * 30) return false;
    }

    return true;
  });

  // Filtered Customers
  const filteredCustomers = customers.filter((c) => {
    if (customerLocation !== 'all' && c.location !== customerLocation) return false;

    if (customerBalanceFilter === 'with-balance' && c.outstandingBalance <= 0) return false;
    if (customerBalanceFilter === 'near-limit' && c.outstandingBalance < c.creditLimit * 0.8) return false;

    if (customerSearch.trim()) {
      const s = customerSearch.toLowerCase();
      return (
        c.name.toLowerCase().includes(s) ||
        c.company.toLowerCase().includes(s) ||
        c.code.toLowerCase().includes(s) ||
        c.phone.toLowerCase().includes(s) ||
        c.location.toLowerCase().includes(s)
      );
    }
    return true;
  });

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    if (productCategory !== 'all' && p.categoryId !== productCategory) return false;

    if (productStockFilter === 'low-stock' && (p.stockQuantity > p.minStockAlert || p.stockQuantity <= 0)) return false;
    if (productStockFilter === 'out-of-stock' && p.stockQuantity > 0) return false;

    if (productSearch.trim()) {
      const s = productSearch.toLowerCase();
      return (
        p.name.toLowerCase().includes(s) ||
        p.sku.toLowerCase().includes(s) ||
        p.categoryName.toLowerCase().includes(s)
      );
    }
    return true;
  });

  // KPI Calculations
  const totalOrderSales = filteredOrders.reduce((acc, o) => acc + o.totalAmount, 0);
  const totalOrderProfit = filteredOrders.reduce((acc, o) => acc + (o.totalProfit || 0), 0);
  const totalUnitsDispatched = filteredOrders.reduce((acc, o) => acc + o.items.reduce((s, i) => s + i.quantity, 0), 0);

  const totalOutstandingBalance = filteredCustomers.reduce((acc, c) => acc + c.outstandingBalance, 0);
  const totalCreditExtended = filteredCustomers.reduce((acc, c) => acc + c.creditLimit, 0);

  const totalInventoryRetail = filteredProducts.reduce((acc, p) => acc + p.stockQuantity * p.wholesalePrice, 0);
  const totalInventoryCost = filteredProducts.reduce((acc, p) => acc + p.stockQuantity * p.costPrice, 0);
  const lowStockCount = filteredProducts.filter((p) => p.stockQuantity <= p.minStockAlert).length;

  // Multi-Format Export Handlers
  const handleExportPdf = () => {
    const timestamp = new Date().toISOString().slice(0, 10);
    if (activeDataset === 'orders') {
      exportOrdersToPdf(filteredOrders, 'Apex Logistics ERP', `Orders_Report_${timestamp}.pdf`);
    } else if (activeDataset === 'customers') {
      exportCustomersToPdf(filteredCustomers, 'Apex Logistics ERP', `Customers_Ledger_${timestamp}.pdf`);
    } else {
      exportProductsToPdf(filteredProducts, 'Apex Logistics ERP', `Product_Inventory_${timestamp}.pdf`);
    }
  };

  const handleExportExcel = () => {
    const timestamp = new Date().toISOString().slice(0, 10);
    if (activeDataset === 'orders') {
      exportOrdersToExcel(filteredOrders, `Orders_Report_${timestamp}.xlsx`);
    } else if (activeDataset === 'customers') {
      exportCustomersToExcel(filteredCustomers, `Customers_Report_${timestamp}.xlsx`);
    } else {
      exportProductsToExcel(filteredProducts, `Product_Inventory_${timestamp}.xlsx`);
    }
  };

  const handleExportCsv = () => {
    const timestamp = new Date().toISOString().slice(0, 10);
    if (activeDataset === 'orders') {
      exportOrdersToCsv(filteredOrders, `Orders_Report_${timestamp}.csv`);
    } else if (activeDataset === 'customers') {
      exportCustomersToCsv(filteredCustomers, `Customers_Report_${timestamp}.csv`);
    } else {
      exportProductsToCsv(filteredProducts, `Product_Inventory_${timestamp}.csv`);
    }
  };

  const handleExportGoogleSheets = async () => {
    setIsExportingSheets(true);
    setGoogleSheetResult(null);
    try {
      const settings = await ApexDB.getSettings();
      let res: { spreadsheetId: string; spreadsheetUrl: string };
      let title = '';

      if (activeDataset === 'orders') {
        if (filteredOrders.length === 0) throw new Error('No orders found to export with active filters.');
        res = await exportOrdersToGoogleSheets(filteredOrders, settings.companyName);
        title = 'Orders Report';
      } else if (activeDataset === 'customers') {
        if (filteredCustomers.length === 0) throw new Error('No customers found to export with active filters.');
        res = await exportCustomersToGoogleSheets(filteredCustomers, settings.companyName);
        title = 'Customers Directory';
      } else {
        if (filteredProducts.length === 0) throw new Error('No products found to export with active filters.');
        res = await exportProductsToGoogleSheets(filteredProducts, settings.companyName);
        title = 'Product Inventory Matrix';
      }

      setGoogleSheetResult({ id: res.spreadsheetId, url: res.spreadsheetUrl, title });
      window.open(res.spreadsheetUrl, '_blank');
    } catch (err: any) {
      alert(`Google Sheets Export: ${err.message || 'Error occurred during export'}`);
    } finally {
      setIsExportingSheets(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header and Dataset Selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 uppercase">
              Reporting Engine
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Enterprise Reports & Data Export
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Export Order Reports, Customer Ledgers, and Product Inventories into PDF, CSV, Excel (.xlsx), and Google Sheets.
          </p>
        </div>

        {/* Dataset Tabs */}
        <div className="flex items-center p-1 rounded-2xl bg-slate-200/80 dark:bg-slate-800/80 border border-slate-300/60 dark:border-slate-700/60 self-start md:self-auto shadow-xs">
          <button
            onClick={() => {
              setActiveDataset('orders');
              setGoogleSheetResult(null);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeDataset === 'orders'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Order Reports ({filteredOrders.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveDataset('customers');
              setGoogleSheetResult(null);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeDataset === 'customers'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Customers ({filteredCustomers.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveDataset('products');
              setGoogleSheetResult(null);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeDataset === 'products'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Products ({filteredProducts.length})</span>
          </button>
        </div>
      </div>

      {/* Export Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
          <Download className="w-4 h-4 text-indigo-500" />
          <span>Export Options for {activeDataset === 'orders' ? 'Orders' : activeDataset === 'customers' ? 'Customers' : 'Products'}:</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* PDF Export */}
          <button
            onClick={handleExportPdf}
            className="px-3 py-1.5 rounded-xl text-xs font-bold border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" />
            Export PDF
          </button>

          {/* Excel XLSX Export */}
          <button
            onClick={handleExportExcel}
            className="px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Table className="w-3.5 h-3.5 text-emerald-600" />
            Export Excel (.xlsx)
          </button>

          {/* CSV Export */}
          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export CSV
          </button>

          {/* Google Sheets Sync */}
          <button
            onClick={handleExportGoogleSheets}
            disabled={isExportingSheets}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 flex items-center gap-1.5 shadow-md transition-colors disabled:opacity-50"
          >
            <Cloud className={`w-3.5 h-3.5 ${isExportingSheets ? 'animate-spin' : ''}`} />
            {isExportingSheets ? 'Syncing...' : 'Sync to Google Sheets'}
          </button>

          {/* Print */}
          <button
            onClick={() => window.print()}
            className="p-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-600 dark:text-slate-400"
            title="Print View"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Google Sheets Success Banner */}
      {googleSheetResult && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Google Spreadsheet created successfully for <strong>{googleSheetResult.title}</strong>!
            </span>
          </div>
          <a
            href={googleSheetResult.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold underline flex items-center gap-1 text-emerald-700 dark:text-emerald-300 hover:text-emerald-900"
          >
            Open in Google Sheets <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DATASET 1: ORDER REPORTS */}
      {/* ========================================================================= */}
      {activeDataset === 'orders' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Filtered Revenue</span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums mt-1">
                ${totalOrderSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Gross Profit</span>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-1">
                ${totalOrderProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Orders Count</span>
              <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono tabular-nums mt-1">
                {filteredOrders.length}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Units Dispatched</span>
              <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 font-mono tabular-nums mt-1">
                {totalUnitsDispatched}
              </div>
            </div>
          </div>

          {/* Orders Filter Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
              <div className="sm:col-span-5 relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search order #, customer, company, or sales rep..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="sm:col-span-3">
                <select
                  value={orderLocation}
                  onChange={(e) => setOrderLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium"
                >
                  <option value="all">All Geographic Locations</option>
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <select
                  value={orderStatus}
                  onChange={(e) => setOrderStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium"
                >
                  <option value="all">All Statuses</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Processing">Processing</option>
                  <option value="Dispatched">Dispatched</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <select
                  value={orderTimeframe}
                  onChange={(e) => setOrderTimeframe(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium"
                >
                  <option value="all">All-Time</option>
                  <option value="today">Today</option>
                  <option value="week">Past 7 Days</option>
                  <option value="month">Past 30 Days</option>
                </select>
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Customer & Location</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Sales Rep</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Items</th>
                    <th className="py-3 px-4 text-right">Total ($)</th>
                    <th className="py-3 px-4 text-right">Direct Sharing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No orders match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {order.orderNumber}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">{order.customerName}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{order.customerLocation || 'General Location'}</span>
                            {order.customerCompany && <span>· {order.customerCompany}</span>}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500 tabular-nums">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{order.salesmanName}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                              order.status === 'Delivered'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : order.status === 'Cancelled'
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-300">
                          {order.items.reduce((acc, i) => acc + i.quantity, 0)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                          ${order.totalAmount.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => shareOrderViaWhatsApp(order)}
                              className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-colors"
                              title="Share via WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => shareOrderViaEmail(order)}
                              className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors"
                              title="Share via Email"
                            >
                              <Mail className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DATASET 2: CUSTOMERS DIRECTORY & LEDGER */}
      {/* ========================================================================= */}
      {activeDataset === 'customers' && (
        <div className="space-y-6">
          {/* Customer KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Client Accounts</span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums mt-1">
                {filteredCustomers.length}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Outstanding Balance</span>
              <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 font-mono tabular-nums mt-1">
                ${totalOutstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Credit Line Granted</span>
              <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono tabular-nums mt-1">
                ${totalCreditExtended.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Available Credit</span>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-1">
                ${(totalCreditExtended - totalOutstandingBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Customer Filter Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
              <div className="sm:col-span-6 relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search customer name, business, code, or phone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="sm:col-span-3">
                <select
                  value={customerLocation}
                  onChange={(e) => setCustomerLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium"
                >
                  <option value="all">All Locations / Cities</option>
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <select
                  value={customerBalanceFilter}
                  onChange={(e) => setCustomerBalanceFilter(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium"
                >
                  <option value="all">All Credit Statuses</option>
                  <option value="with-balance">With Outstanding Balance</option>
                  <option value="near-limit">Near Credit Limit (&gt;80%)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Customer Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Contact & Company</th>
                    <th className="py-3 px-4">Geographic Location</th>
                    <th className="py-3 px-4">Phone / Email</th>
                    <th className="py-3 px-4 text-right">Credit Limit</th>
                    <th className="py-3 px-4 text-right">Balance Due</th>
                    <th className="py-3 px-4 text-right">Available Credit</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No customers found matching the search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((c) => {
                      const avail = c.creditLimit - c.outstandingBalance;
                      return (
                        <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {c.code}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">{c.name}</div>
                            <div className="text-[11px] text-slate-400">{c.company}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span>{c.location}</span>
                            </div>
                            {c.address && <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{c.address}</div>}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                            <div>{c.phone}</div>
                            <div className="text-[11px] text-slate-400">{c.email}</div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                            ${c.creditLimit.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                            ${c.outstandingBalance.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            ${avail.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                c.active
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {c.active ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DATASET 3: PRODUCT CATALOG & INVENTORY MATRIX */}
      {/* ========================================================================= */}
      {activeDataset === 'products' && (
        <div className="space-y-6">
          {/* Products KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Active SKUs</span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums mt-1">
                {filteredProducts.length}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Retail Valuation</span>
              <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 font-mono tabular-nums mt-1">
                ${totalInventoryRetail.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Cost Valuation</span>
              <div className="text-xl sm:text-2xl font-black text-slate-700 dark:text-slate-300 font-mono tabular-nums mt-1">
                ${totalInventoryCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Low Stock Alerts</span>
              <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 font-mono tabular-nums mt-1">
                {lowStockCount}
              </div>
            </div>
          </div>

          {/* Products Filter Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
              <div className="sm:col-span-6 relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search product name, SKU, or brand..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Categories Dropdown List */}
              <div className="sm:col-span-3">
                <select
                  value={productCategory}
                  onChange={(e) => setProductCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium"
                >
                  <option value="all">All Categories ({categories.length})</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <select
                  value={productStockFilter}
                  onChange={(e) => setProductStockFilter(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium"
                >
                  <option value="all">All Inventory Levels</option>
                  <option value="low-stock">Low Stock (≤ Alert Level)</option>
                  <option value="out-of-stock">Out of Stock (0 units)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Packaging Unit</th>
                    <th className="py-3 px-4 text-right">Wholesale Price</th>
                    <th className="py-3 px-4 text-right">Cost Price</th>
                    <th className="py-3 px-4 text-right">Stock Level</th>
                    <th className="py-3 px-4 text-center">Alert Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No products match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const isLow = p.stockQuantity <= p.minStockAlert;
                      const isOut = p.stockQuantity <= 0;
                      return (
                        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                            {p.sku}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                            {p.name}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {p.categoryName}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500">{p.unitName}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                            ${p.wholesalePrice.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-500">
                            ${p.costPrice.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {p.stockQuantity}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isOut ? (
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                Out of Stock
                              </span>
                            ) : isLow ? (
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                Low ({p.stockQuantity}/{p.minStockAlert})
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                Healthy
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
