import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Percent,
  PieChart,
  Users,
  Package,
  ArrowUpRight,
  Shield,
  Layers,
  Calendar
} from 'lucide-react';
import { Order, Product, StaffMember } from '../types';
import { ApexDB } from '../db/indexedDb';
import { useAuth } from '../context/AuthContext';

export const ProfitAnalysisView: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [timeframe, setTimeframe] = useState<'all' | 'today' | 'week' | 'month'>('all');

  const loadData = async () => {
    const o = await ApexDB.getAll<Order>('orders');
    const p = await ApexDB.getAll<Product>('products');
    const s = await ApexDB.getAll<StaffMember>('staff');
    setOrders(o);
    setProducts(p);
    setStaff(s);
  };

  useEffect(() => {
    loadData();
    const unsub = ApexDB.subscribe((store) => {
      if (store === 'orders' || store === 'products') {
        loadData();
      }
    });
    return unsub;
  }, []);

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 text-center">
        <Shield className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Restricted Access</h2>
        <p className="text-sm text-slate-500 mt-1">
          Financial cost sheets and profit margins are restricted strictly to executive Administrators.
        </p>
      </div>
    );
  }

  // Filter orders by timeframe
  const filteredOrders = orders.filter((o) => {
    if (o.status === 'Cancelled') return false;
    if (timeframe === 'all') return true;

    const orderDate = new Date(o.createdAt).getTime();
    const now = Date.now();
    if (timeframe === 'today') {
      return now - orderDate <= 1000 * 60 * 60 * 24;
    }
    if (timeframe === 'week') {
      return now - orderDate <= 1000 * 60 * 60 * 24 * 7;
    }
    if (timeframe === 'month') {
      return now - orderDate <= 1000 * 60 * 60 * 24 * 30;
    }
    return true;
  });

  const totalRevenue = filteredOrders.reduce((acc, o) => acc + o.totalAmount, 0);
  const totalCost = filteredOrders.reduce((acc, o) => acc + o.totalCost, 0);
  const grossProfit = totalRevenue - totalCost;
  const marginPercentage = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  // SKU profitability calculation
  const productProfits = products.map((prod) => {
    let unitsSold = 0;
    let revenue = 0;
    let cost = 0;

    filteredOrders.forEach((o) => {
      o.items.forEach((item) => {
        if (item.productId === prod.id) {
          unitsSold += item.quantity;
          revenue += item.totalPrice;
          cost += item.costPrice * item.quantity;
        }
      });
    });

    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return {
      product: prod,
      unitsSold,
      revenue,
      cost,
      profit,
      margin
    };
  });

  productProfits.sort((a, b) => b.profit - a.profit);

  // Sales rep contribution
  const salesReps = staff.filter((s) => s.role === 'salesman');
  const repStats = salesReps.map((rep) => {
    const repOrders = filteredOrders.filter((o) => o.salesmanId === rep.id);
    const repRev = repOrders.reduce((acc, o) => acc + o.totalAmount, 0);
    const repCost = repOrders.reduce((acc, o) => acc + o.totalCost, 0);
    const repProfit = repRev - repCost;
    return {
      rep,
      orderCount: repOrders.length,
      revenue: repRev,
      profit: repProfit,
      margin: repRev > 0 ? (repProfit / repRev) * 100 : 0
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 uppercase">
              Admin Financial Confidential
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Executive Profit & Margin Analysis
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gross margins, cost of goods sold (COGS), and sales rep profitability matrix.
          </p>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
          {[
            { id: 'all', label: 'All-Time' },
            { id: 'month', label: 'Last 30 Days' },
            { id: 'week', label: 'Last 7 Days' },
            { id: 'today', label: 'Today' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTimeframe(t.id as any)}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                timeframe === t.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Gross Sales Revenue</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums mt-1">
            ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">From {filteredOrders.length} active orders</div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Cost of Goods Sold (COGS)</span>
          <div className="text-2xl font-black text-slate-600 dark:text-slate-300 font-mono tabular-nums mt-1">
            ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Supplier procurement baseline</div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Net Gross Profit</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-1">
            ${grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 font-semibold mt-1">
            Direct margin yield
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Overall Profit Margin %</span>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono tabular-nums mt-1">
            {marginPercentage.toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Margin efficiency across catalogue</div>
        </div>
      </div>

      {/* Grid: SKU Profitability (Left) & Sales Rep Margins (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SKU Profitability Table */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-600" />
              SKU Profit Contribution Matrix
            </h2>
            <span className="text-[11px] text-slate-400 font-mono">Ranked by gross margin $</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">SKU & Item</th>
                  <th className="py-2.5 px-3 text-right">Wholesale / Cost</th>
                  <th className="py-2.5 px-3 text-right">Sold</th>
                  <th className="py-2.5 px-3 text-right">Total Revenue</th>
                  <th className="py-2.5 px-3 text-right">Gross Profit</th>
                  <th className="py-2.5 px-3 text-right">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {productProfits.map((item) => (
                  <tr key={item.product.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 dark:text-white">{item.product.name}</div>
                      <div className="font-mono text-[10px] text-slate-400">{item.product.sku}</div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                      ${item.product.wholesalePrice.toFixed(2)} /{' '}
                      <span className="text-slate-400">${item.product.costPrice.toFixed(2)}</span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold">
                      {item.unitsSold}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-900 dark:text-white font-bold">
                      ${item.revenue.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                      ${item.profit.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-indigo-600 dark:text-indigo-400">
                      {item.margin.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sales Rep Contribution */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="pb-2 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              Rep Margin Performance
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Profit contribution by field sales staff</p>
          </div>

          <div className="space-y-3">
            {repStats.map((item) => (
              <div
                key={item.rep.id}
                className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-slate-900 dark:text-white">{item.rep.name}</div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold">
                    {item.margin.toFixed(1)}% Margin
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/50 dark:border-slate-800/50 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Revenue</span>
                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">${item.revenue.toFixed(2)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-sans">Net Profit</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      ${item.profit.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
