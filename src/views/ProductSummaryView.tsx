import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  Package,
  Layers,
  RotateCcw,
  CheckCircle,
  PlusCircle
} from 'lucide-react';
import { Product, Order } from '../types';
import { ApexDB } from '../db/indexedDb';
import { useAuth } from '../context/AuthContext';
import { FirebaseSync } from '../services/firebaseSync';

export const ProductSummaryView: React.FC = () => {
  const { currentUser } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [replenishModalProduct, setReplenishModalProduct] = useState<Product | null>(null);
  const [addQty, setAddQty] = useState<number>(50);

  const loadData = async () => {
    const p = await ApexDB.getAll<Product>('products');
    const o = await ApexDB.getAll<Order>('orders');
    setProducts(p);
    setOrders(o);
  };

  useEffect(() => {
    loadData();
    const unsub = ApexDB.subscribe((store) => {
      if (store === 'products' || store === 'orders') {
        loadData();
      }
    });
    return unsub;
  }, []);

  // Compute demand metrics
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

    return {
      product,
      unitsSold,
      revenueGenerated,
      orderAppearances,
      isLow,
      isCritical
    };
  });

  // Sort by units sold descending (Highest demand first)
  demandStats.sort((a, b) => b.unitsSold - a.unitsSold);

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

  const lowStockCount = demandStats.filter((d) => d.isLow).length;
  const totalVolume = demandStats.reduce((acc, d) => acc + d.unitsSold, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Product Summary & Demand Analysis
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Real-time aggregate consumption, runout forecasts, and inventory replenishment control.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lowStockCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4" />
              <span>{lowStockCount} SKUs Below Threshold</span>
            </div>
          )}
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
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Top Selling Product</span>
          <div className="text-sm font-bold text-slate-900 dark:text-white truncate mt-1">
            {demandStats[0]?.product.name || 'N/A'}
          </div>
          <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
            {demandStats[0]?.unitsSold || 0} units ordered
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Critical Stock Alerts</span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono tabular-nums mt-1">
            {lowStockCount} <span className="text-xs font-normal text-slate-400">items need reordering</span>
          </div>
        </div>
      </div>

      {/* High Density Demand Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            SKU Velocity & Stock Depletion Matrix
          </h2>
          <span className="text-[11px] text-slate-400 font-mono">Sorted by historical sales volume</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">SKU Code</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Units Sold</th>
                <th className="py-3 px-4 text-right">Revenue Generated</th>
                <th className="py-3 px-4 text-right">Current In-Stock</th>
                <th className="py-3 px-4 text-right">Reorder Threshold</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {demandStats.map((stat) => {
                const { product, unitsSold, revenueGenerated, isLow, isCritical } = stat;

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
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                      {unitsSold}
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
                      <button
                        onClick={() => setReplenishModalProduct(product)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 transition-colors inline-flex items-center gap-1"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        Restock
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Replenish Stock Modal */}
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
