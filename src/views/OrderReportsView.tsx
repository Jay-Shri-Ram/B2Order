import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Share2,
  Printer,
  Table,
  Cloud,
  Search,
  Filter,
  Calendar,
  MapPin,
  User,
  CheckCircle2,
  ExternalLink,
  MessageCircle,
  Mail,
  RefreshCw
} from 'lucide-react';
import { Order, Customer } from '../types';
import { ApexDB } from '../db/indexedDb';
import { useAuth } from '../context/AuthContext';
import { exportOrdersToCsv, exportOrdersToExcel, shareOrderViaWhatsApp, shareOrderViaEmail } from '../services/exportService';
import { exportOrdersToGoogleSheets, getGoogleAccessToken } from '../services/googleSheetsService';

export const OrderReportsView: React.FC = () => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeframe, setTimeframe] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [isExportingSheets, setIsExportingSheets] = useState(false);
  const [googleSheetResult, setGoogleSheetResult] = useState<{ id: string; url: string } | null>(null);

  const loadData = async () => {
    const ords = await ApexDB.getAll<Order>('orders');
    const custs = await ApexDB.getAll<Customer>('customers');
    ords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setOrders(ords);
    setCustomers(custs);
  };

  useEffect(() => {
    loadData();
    const unsub = ApexDB.subscribe((store) => {
      if (store === 'orders' || store === 'customers') {
        loadData();
      }
    });
    return unsub;
  }, []);

  // Locations list
  const locations = Array.from(new Set(customers.map((c) => c.location).filter(Boolean)));

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (locationFilter !== 'all' && o.customerLocation !== locationFilter) return false;

    if (search.trim()) {
      const s = search.toLowerCase();
      const match =
        o.orderNumber.toLowerCase().includes(s) ||
        o.customerName.toLowerCase().includes(s) ||
        (o.customerCompany && o.customerCompany.toLowerCase().includes(s)) ||
        o.salesmanName.toLowerCase().includes(s);
      if (!match) return false;
    }

    if (timeframe !== 'all') {
      const orderDate = new Date(o.createdAt).getTime();
      const now = Date.now();
      if (timeframe === 'today' && now - orderDate > 1000 * 60 * 60 * 24) return false;
      if (timeframe === 'week' && now - orderDate > 1000 * 60 * 60 * 24 * 7) return false;
      if (timeframe === 'month' && now - orderDate > 1000 * 60 * 60 * 24 * 30) return false;
    }

    return true;
  });

  const totalSales = filteredOrders.reduce((acc, o) => acc + o.totalAmount, 0);
  const totalItemsCount = filteredOrders.reduce((acc, o) => acc + o.items.reduce((s, i) => s + i.quantity, 0), 0);

  // Google Sheets Export
  const handleExportGoogleSheets = async () => {
    if (filteredOrders.length === 0) {
      alert('No orders to export based on current filters.');
      return;
    }

    setIsExportingSheets(true);
    setGoogleSheetResult(null);
    try {
      const settings = await ApexDB.getSettings();
      const res = await exportOrdersToGoogleSheets(filteredOrders, settings.companyName);
      setGoogleSheetResult({ id: res.spreadsheetId, url: res.spreadsheetUrl });
      window.open(res.spreadsheetUrl, '_blank');
    } catch (err: any) {
      alert(`Google Sheets Export: ${err.message || 'Error occurred'}`);
    } finally {
      setIsExportingSheets(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Order Reports & Multi-Format Exports
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Export to Google Sheets, Excel (.xls), CSV, PDF print reports, and WhatsApp/Email sharing.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => exportOrdersToCsv(filteredOrders)}
            className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          <button
            onClick={() => exportOrdersToExcel(filteredOrders)}
            className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Table className="w-3.5 h-3.5 text-emerald-600" />
            Export Excel
          </button>

          <button
            onClick={() => window.print()}
            className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            PDF / Print
          </button>

          <button
            onClick={handleExportGoogleSheets}
            disabled={isExportingSheets}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 flex items-center gap-1.5 shadow-md transition-colors disabled:opacity-50"
          >
            <Cloud className={`w-3.5 h-3.5 ${isExportingSheets ? 'animate-spin' : ''}`} />
            {isExportingSheets ? 'Syncing...' : 'Sync to Google Sheets'}
          </button>
        </div>
      </div>

      {googleSheetResult && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Google Spreadsheet created and updated successfully!</span>
          </div>
          <a
            href={googleSheetResult.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold underline flex items-center gap-1 text-emerald-700 dark:text-emerald-300"
          >
            Open Google Sheet <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total Filtered Sales</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums mt-1">
            ${totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Orders Count</span>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono tabular-nums mt-1">
            {filteredOrders.length}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Average Order Value</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums mt-1">
            ${filteredOrders.length > 0 ? (totalSales / filteredOrders.length).toFixed(2) : '0.00'}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Units Dispatched</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-1">
            {totalItemsCount}
          </div>
        </div>
      </div>

      {/* Filter Matrix */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
          {/* Search */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search order #, customer, or sales rep..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Location Filter */}
          <div className="sm:col-span-3">
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
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

          {/* Status Filter */}
          <div className="sm:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
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

          {/* Timeframe Filter */}
          <div className="sm:col-span-2">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as any)}
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

      {/* Orders Table with Sharing Actions */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Customer & Location</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Sales Rep</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-right">Direct Sharing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
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
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 tabular-nums">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{order.salesmanName}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {order.status}
                      </span>
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
  );
};
