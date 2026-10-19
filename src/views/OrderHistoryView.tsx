import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  Truck,
  PackageCheck,
  XCircle,
  Trash2,
  FileText,
  Printer,
  X,
  AlertCircle,
  Share2,
  MessageCircle,
  Mail,
  Download,
  Table,
  MapPin
} from 'lucide-react';
import { Order, OrderStatus, DeletedOrder } from '../types';
import { ApexDB } from '../db/indexedDb';
import { useAuth } from '../context/AuthContext';
import { FirebaseSync } from '../services/firebaseSync';
import { exportOrdersToCsv, exportOrdersToExcel, shareOrderViaWhatsApp, shareOrderViaEmail } from '../services/exportService';

export const OrderHistoryView: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [deleteModalOrder, setDeleteModalOrder] = useState<Order | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const loadOrders = async () => {
    const list = await ApexDB.getAll<Order>('orders');
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setOrders(list);
  };

  useEffect(() => {
    loadOrders();
    const unsub = ApexDB.subscribe((store) => {
      if (store === 'orders' || store === 'deletedOrders') {
        loadOrders();
      }
    });
    return unsub;
  }, []);

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    const updated: Order = {
      ...order,
      status: newStatus,
      updatedAt: new Date().toISOString(),
      synced: false
    };

    await ApexDB.put('orders', updated);
    await ApexDB.addAuditLog({
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'ORDER_STATUS_UPDATE',
      targetEntity: order.orderNumber,
      details: `Status transitioned from ${order.status} to ${newStatus}`
    });

    FirebaseSync.triggerSync().catch(() => {});
    if (selectedOrder?.id === orderId) {
      setSelectedOrder(updated);
    }
    await loadOrders();
  };

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteModalOrder || !deleteReason.trim()) {
      alert('Please state a reason for cancelling / deleting this order.');
      return;
    }

    setIsDeleting(true);
    try {
      const deletedRecord: DeletedOrder = {
        id: `del-${Date.now()}`,
        orderId: deleteModalOrder.id,
        orderNumber: deleteModalOrder.orderNumber,
        deletedBy: currentUser.id,
        deletedByName: currentUser.name,
        deletedByRole: currentUser.role,
        reason: deleteReason.trim(),
        deletedAt: new Date().toISOString(),
        snapshot: { ...deleteModalOrder }
      };

      await ApexDB.put('deletedOrders', deletedRecord);
      await ApexDB.delete('orders', deleteModalOrder.id);

      await ApexDB.addAuditLog({
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        action: 'ORDER_DELETE',
        targetEntity: deleteModalOrder.orderNumber,
        details: `Order removed. Reason: "${deleteReason.trim()}"`
      });

      FirebaseSync.triggerSync().catch(() => {});
      setDeleteModalOrder(null);
      setDeleteReason('');
      if (selectedOrder?.id === deleteModalOrder.id) {
        setSelectedOrder(null);
      }
      await loadOrders();
    } finally {
      setIsDeleting(false);
    }
  };

  const statusIcons: Record<OrderStatus, any> = {
    Pending: Clock,
    Confirmed: CheckCircle2,
    Processing: Clock,
    Dispatched: Truck,
    Delivered: PackageCheck,
    Cancelled: XCircle
  };

  const statusColors: Record<OrderStatus, string> = {
    Pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    Confirmed: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    Processing: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    Dispatched: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    Delivered: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    Cancelled: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (o.customerCompany && o.customerCompany.toLowerCase().includes(search.toLowerCase())) ||
      (o.customerLocation && o.customerLocation.toLowerCase().includes(search.toLowerCase())) ||
      o.salesmanName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Order History & Fulfillment
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Real-time fulfillment tracking, WhatsApp/Email order sharing, and instant invoice generation.
          </p>
        </div>

        {/* Export / Total Summary */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => exportOrdersToCsv(filteredOrders)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
          <button
            onClick={() => exportOrdersToExcel(filteredOrders)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shadow-xs"
          >
            <Table className="w-3.5 h-3.5 text-emerald-600" />
            Excel
          </button>
          <span className="text-xs font-mono px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-semibold">
            {orders.length} Total Orders
          </span>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by order #, customer, area, or sales rep..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {['all', 'Pending', 'Confirmed', 'Processing', 'Dispatched', 'Delivered', 'Cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {st === 'all' ? 'All Orders' : st}
            </button>
          ))}
        </div>
      </div>

      {/* High Density Orders Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Customer & Location</th>
                <th className="py-3 px-4">Date / Time</th>
                <th className="py-3 px-4">Sales Rep</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Items</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-right">Share & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No orders match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const Icon = statusIcons[order.status] || Clock;
                  const badgeColor = statusColors[order.status];

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {order.orderNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{order.customerName}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <span>{order.customerCompany || 'Direct Client'}</span>
                          {order.customerLocation && (
                            <span className="text-[10px] text-indigo-500 font-medium">({order.customerLocation})</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 tabular-nums">
                        {new Date(order.createdAt).toLocaleDateString()} ·{' '}
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {order.salesmanName}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-[11px] border ${badgeColor}`}>
                          <Icon className="w-3 h-3" />
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        {order.items.reduce((a, b) => a + b.quantity, 0)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                        ${order.totalAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* WhatsApp Direct Share */}
                          <button
                            onClick={() => shareOrderViaWhatsApp(order)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                            title="Share on WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          {/* Email Share */}
                          <button
                            onClick={() => shareOrderViaEmail(order)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                            title="Share via Email"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                          {/* View Detail Modal */}
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="View Invoice"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {/* Cancel Order */}
                          <button
                            onClick={() => setDeleteModalOrder(order)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Cancel / Delete Order"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail & Printable Invoice Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Order Invoice: {selectedOrder.orderNumber}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {/* WhatsApp button */}
                <button
                  onClick={() => shareOrderViaWhatsApp(selectedOrder)}
                  className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                  title="Share on WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => window.print()}
                  className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Print invoice"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 text-xs">
              {/* Meta information */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 block font-semibold uppercase text-[10px]">Client</span>
                  <div className="font-bold text-slate-900 dark:text-white">{selectedOrder.customerName}</div>
                  <div className="text-slate-500">{selectedOrder.customerCompany}</div>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase text-[10px]">Location Area</span>
                  <div className="font-bold text-indigo-600 dark:text-indigo-400">{selectedOrder.customerLocation || 'Standard'}</div>
                  <div className="text-slate-500">{selectedOrder.salesmanName}</div>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase text-[10px]">Payment Method</span>
                  <div className="font-bold text-slate-900 dark:text-white">{selectedOrder.paymentMethod}</div>
                  <div className="text-slate-500">Net 30 Invoicing</div>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase text-[10px]">Current Status</span>
                  <div className="font-bold text-indigo-600 dark:text-indigo-400">{selectedOrder.status}</div>
                </div>
              </div>

              {/* Status transition picker */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-600 dark:text-slate-400">Update Status:</span>
                {(['Confirmed', 'Processing', 'Dispatched', 'Delivered', 'Cancelled'] as OrderStatus[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleUpdateStatus(selectedOrder.id, st)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                      selectedOrder.status === st
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Line Items Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[10px] font-semibold text-slate-400 uppercase">
                    <tr>
                      <th className="p-3">SKU / Item</th>
                      <th className="p-3">Unit</th>
                      <th className="p-3 text-right">Quantity</th>
                      <th className="p-3 text-right">Unit Price</th>
                      <th className="p-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedOrder.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-3">
                          <div className="font-bold text-slate-900 dark:text-white">{item.name}</div>
                          <div className="text-[10px] font-mono text-slate-400">{item.sku}</div>
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{item.unit}</td>
                        <td className="p-3 text-right font-mono tabular-nums font-semibold">{item.quantity}</td>
                        <td className="p-3 text-right font-mono tabular-nums">${item.unitPrice.toFixed(2)}</td>
                        <td className="p-3 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                          ${item.totalPrice.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex flex-col items-end space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 font-mono text-xs">
                <div className="flex justify-between w-48 text-slate-500">
                  <span>Subtotal:</span>
                  <span className="tabular-nums">${selectedOrder.subtotal.toFixed(2)}</span>
                </div>
                {selectedOrder.discountAmount > 0 && (
                  <div className="flex justify-between w-48 text-emerald-600">
                    <span>Discount:</span>
                    <span className="tabular-nums">-${selectedOrder.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between w-48 text-slate-500">
                  <span>Tax (8.5%):</span>
                  <span className="tabular-nums">${selectedOrder.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between w-48 text-sm font-bold text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-800">
                  <span>Grand Total:</span>
                  <span className="tabular-nums text-indigo-600 dark:text-indigo-400">
                    ${selectedOrder.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete / Cancel Reason Modal */}
      {deleteModalOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmDelete}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4"
          >
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Delete Order Record</h3>
                <p className="text-xs text-slate-500">Order #{deleteModalOrder.orderNumber}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Deleting an order archives it to the <code className="font-mono text-indigo-600">deletedOrders</code> ledger.
              Please provide a cancellation reason.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Cancellation / Removal *
              </label>
              <textarea
                required
                rows={3}
                placeholder="e.g. Duplicate order entry, Customer requested cancellation before dispatch..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOrder(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Keep Order
              </button>
              <button
                type="submit"
                disabled={isDeleting || !deleteReason.trim()}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white shadow-xs"
              >
                {isDeleting ? 'Archiving...' : 'Confirm Deletion'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
