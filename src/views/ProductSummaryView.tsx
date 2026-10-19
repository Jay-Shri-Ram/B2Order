import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  Package,
  Layers,
  RotateCcw,
  CheckCircle,
  PlusCircle,
  ClipboardCheck,
  Search,
  Filter,
  Truck,
  X
} from 'lucide-react';
import { Product, Order, Category, OrderReceiving } from '../types';
import { ApexDB } from '../db/indexedDb';
import { useAuth } from '../context/AuthContext';
import { FirebaseSync } from '../services/firebaseSync';

export const ProductSummaryView: React.FC = () => {
  const { currentUser } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [demandTierFilter, setDemandTierFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);

  // Quick Restock Modal
  const [replenishModalProduct, setReplenishModalProduct] = useState<Product | null>(null);
  const [addQty, setAddQty] = useState<number>(50);

  // Order Receiving Form Modal (Goods Receipt / GRN)
  const [receivingModalOpen, setReceivingModalOpen] = useState(false);
  const [grnForm, setGrnForm] = useState({
    poNumber: '',
    supplierName: '',
    receivedDate: new Date().toISOString().split('T')[0],
    productId: '',
    quantityReceived: 50,
    notes: ''
  });

  const loadData = async () => {
    const p = await ApexDB.getAll<Product>('products');
    const o = await ApexDB.getAll<Order>('orders');
    const c = await ApexDB.getAll<Category>('categories');
    setProducts(p);
    setOrders(o);
    setCategories(c);

    if (p.length > 0 && !grnForm.productId) {
      setGrnForm((prev) => ({ ...prev, productId: p[0].id }));
    }
  };

  useEffect(() => {
    loadData();
    const unsub = ApexDB.subscribe((store) => {
      if (store === 'products' || store === 'orders' || store === 'categories') {
        loadData();
      }
    });
    return unsub;
  }, []);

  // Compute demand metrics per product
  const demandStats = products.map((product) => {
    let unitsSold = 0;
    let revenueGenerated = 0;
    let orderAppearances = 0;

    orders.forEach((ord) => {
      if (ord.status !== 'Cancelled') {
        ord.items.forEach((item) => {
          if (item.productId === product.id) {
            unitsSold += item.quantity;
            revenueGenerated += item.totalPrice;
            orderAppearances++;
          }
        });
      }
    });

    const isLow = product.stockQuantity <= product.minStockAlert;
    const isCritical = product.stockQuantity <= 0;

    let tier: 'high' | 'moderate' | 'low' | 'zero' = 'zero';
    if (unitsSold >= 15) tier = 'high';
    else if (unitsSold >= 5) tier = 'moderate';
    else if (unitsSold > 0) tier = 'low';

    return {
      product,
      unitsSold,
      revenueGenerated,
      orderAppearances,
      isLow,
      isCritical,
      tier
    };
  });

  // Filter demand items
  const filteredStats = demandStats.filter((stat) => {
    if (selectedCategory !== 'all' && stat.product.categoryId !== selectedCategory) return false;
    if (demandTierFilter !== 'all' && stat.tier !== demandTierFilter) return false;
    if (lowStockFilter && !stat.isLow) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      const match =
        stat.product.name.toLowerCase().includes(s) ||
        stat.product.sku.toLowerCase().includes(s);
      if (!match) return false;
    }
    return true;
  });

  filteredStats.sort((a, b) => b.unitsSold - a.unitsSold);

  // Quick Restock Handler
  const handleReplenish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replenishModalProduct) return;

    const newStock = replenishModalProduct.stockQuantity + Number(addQty);
    const updatedProd: Product = {
      ...replenishModalProduct,
      stockQuantity: newStock,
      updatedAt: new Date().toISOString()
    };

    await ApexDB.put('products', updatedProd);
    await ApexDB.addAuditLog({
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'STOCK_REPLENISHMENT',
      targetEntity: replenishModalProduct.sku,
      details: `Restocked ${addQty} units. New level: ${newStock}`
    });

    FirebaseSync.triggerSync().catch(() => {});
    setReplenishModalProduct(null);
    setAddQty(50);
    await loadData();
  };

  // Order Receiving Form (GRN) Handler
  const handleProcessOrderReceiving = async (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find((p) => p.id === grnForm.productId);
    if (!prod) {
      alert('Please select a product.');
      return;
    }

    const qty = Number(grnForm.quantityReceived) || 0;
    if (qty <= 0) {
      alert('Please enter a valid received quantity.');
      return;
    }

    const receiptNumber = grnForm.poNumber || `GRN-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newStock = prod.stockQuantity + qty;

    // 1. Update product stock
    await ApexDB.put('products', {
      ...prod,
      stockQuantity: newStock,
      updatedAt: new Date().toISOString()
    });

    // 2. Save order receiving record
    const receivingRecord: OrderReceiving = {
      id: `rec-${Date.now()}`,
      receiptNumber,
      supplierName: grnForm.supplierName.trim() || 'Direct Supplier',
      receivedDate: grnForm.receivedDate,
      receivedBy: currentUser.id,
      receivedByName: currentUser.name,
      items: [
        {
          productId: prod.id,
          sku: prod.sku,
          name: prod.name,
          quantityReceived: qty,
          unit: prod.unitName
        }
      ],
      notes: grnForm.notes
    };
    await ApexDB.put('orderReceiving', receivingRecord);

    // 3. Log audit event
    await ApexDB.addAuditLog({
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'ORDER_RECEIVING_GRN',
      targetEntity: receiptNumber,
      details: `Received ${qty} units of ${prod.name} (${prod.sku}) from ${receivingRecord.supplierName}`
    });

    FirebaseSync.triggerSync().catch(() => {});
    alert(`Order Receiving Processed! Added ${qty} units of ${prod.name} to inventory.`);
    setReceivingModalOpen(false);
    setGrnForm({
      poNumber: '',
      supplierName: '',
      receivedDate: new Date().toISOString().split('T')[0],
      productId: products[0]?.id || '',
      quantityReceived: 50,
      notes: ''
    });
    await loadData();
  };

  const lowStockCount = demandStats.filter((d) => d.isLow).length;
  const totalVolume = demandStats.reduce((acc, d) => acc + d.unitsSold, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Product Demand & Goods Order Receiving
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Real-time aggregate consumption, runout forecasts, and warehouse order receiving (GRN) workflow.
          </p>
        </div>

        {/* Receiving Action Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setGrnForm({
                poNumber: `PO-${Math.floor(1000 + Math.random() * 9000)}`,
                supplierName: '',
                receivedDate: new Date().toISOString().split('T')[0],
                productId: products[0]?.id || '',
                quantityReceived: 50,
                notes: ''
              });
              setReceivingModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5 shadow-md transition-colors"
          >
            <Truck className="w-4 h-4" />
            + Receive Inbound Order (GRN)
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total Demand Volume</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums mt-1">
            {totalVolume} <span className="text-xs font-normal text-slate-400">units fulfilled</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Top Velocity SKU</span>
          <div className="text-sm font-bold text-slate-900 dark:text-white truncate mt-1">
            {demandStats[0]?.product.name || 'N/A'}
          </div>
          <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
            {demandStats[0]?.unitsSold || 0} units ordered
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Stock Reorder Alerts</span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono tabular-nums mt-1">
            {lowStockCount} <span className="text-xs font-normal text-slate-400">SKUs below safety stock</span>
          </div>
        </div>
      </div>

      {/* Filters Bar: Search, Category Dropdown, Demand Tier, Low Stock */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
          {/* Search */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search product SKU or title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400"
            />
          </div>

          {/* Category Dropdown List */}
          <div className="sm:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium"
            >
              <option value="all">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Demand Tier Filter */}
          <div className="sm:col-span-2">
            <select
              value={demandTierFilter}
              onChange={(e) => setDemandTierFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium"
            >
              <option value="all">All Demand Tiers</option>
              <option value="high">High Velocity (15+)</option>
              <option value="moderate">Moderate (5-14)</option>
              <option value="low">Low Demand (1-4)</option>
              <option value="zero">Zero Demand</option>
            </select>
          </div>

          {/* Low Stock Toggle */}
          <div className="sm:col-span-2 flex items-center">
            <button
              onClick={() => setLowStockFilter(!lowStockFilter)}
              className={`w-full py-2 px-3 rounded-xl font-medium border flex items-center justify-center gap-1.5 transition-colors ${
                lowStockFilter
                  ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Low Stock Only</span>
            </button>
          </div>
        </div>
      </div>

      {/* Demand Velocity Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">SKU Code</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Historical Demand</th>
                <th className="py-3 px-4 text-right">Gross Volume</th>
                <th className="py-3 px-4 text-right">In-Stock Level</th>
                <th className="py-3 px-4 text-right">Safety Threshold</th>
                <th className="py-3 px-4 text-right">Order Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStats.map((stat) => {
                const { product, unitsSold, revenueGenerated, isLow, isCritical, tier } = stat;

                return (
                  <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                      {product.sku}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{product.name}</div>
                      <div className="text-[11px] text-slate-400">{product.unitName}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{product.categoryName}</td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                          tier === 'high'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : tier === 'moderate'
                            ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        {unitsSold} units
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                      ${revenueGenerated.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                          isCritical
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                            : isLow
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {isLow && <AlertTriangle className="w-3 h-3" />}
                        {product.stockQuantity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400 tabular-nums">
                      {product.minStockAlert}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setGrnForm({
                              poNumber: `PO-${Math.floor(1000 + Math.random() * 9000)}`,
                              supplierName: '',
                              receivedDate: new Date().toISOString().split('T')[0],
                              productId: product.id,
                              quantityReceived: 50,
                              notes: ''
                            });
                            setReceivingModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 transition-colors inline-flex items-center gap-1"
                          title="Record received shipment for this SKU"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          Receive
                        </button>
                        <button
                          onClick={() => setReplenishModalProduct(product)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 transition-colors inline-flex items-center gap-1"
                          title="Quick restock"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          Restock
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Receiving Form Modal (GRN) */}
      {receivingModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleProcessOrderReceiving}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Inbound Order Receiving (GRN)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReceivingModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  PO / Delivery Note # *
                </label>
                <input
                  type="text"
                  required
                  value={grnForm.poNumber}
                  onChange={(e) => setGrnForm({ ...grnForm, poNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Received Date
                </label>
                <input
                  type="date"
                  required
                  value={grnForm.receivedDate}
                  onChange={(e) => setGrnForm({ ...grnForm, receivedDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Supplier / Manufacturer Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Apex Master Commissary, Valio Imports"
                value={grnForm.supplierName}
                onChange={(e) => setGrnForm({ ...grnForm, supplierName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="text-xs">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Product SKU to Receive *
              </label>
              <select
                value={grnForm.productId}
                onChange={(e) => setGrnForm({ ...grnForm, productId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} — {p.name} (Current: {p.stockQuantity})
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Quantity Received (Units / Cartons) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={grnForm.quantityReceived}
                onChange={(e) => setGrnForm({ ...grnForm, quantityReceived: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-slate-900 dark:text-slate-100 font-bold"
              />
            </div>

            <div className="text-xs">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Storage / Batch Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Lot #8821, stored in Zone B cold room"
                value={grnForm.notes}
                onChange={(e) => setGrnForm({ ...grnForm, notes: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setReceivingModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Process Goods Receipt
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Quick Replenish Modal */}
      {replenishModalProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleReplenish}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Replenish Inventory</h3>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs">
              <div className="font-bold text-slate-900 dark:text-white">{replenishModalProduct.name}</div>
              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                SKU: {replenishModalProduct.sku} · Current: {replenishModalProduct.stockQuantity} {replenishModalProduct.unitName}
              </div>
            </div>

            <div className="text-xs">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Quantity to Add to Inventory *
              </label>
              <input
                type="number"
                min="1"
                required
                value={addQty}
                onChange={(e) => setAddQty(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReplenishModalProduct(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Confirm Restock
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
