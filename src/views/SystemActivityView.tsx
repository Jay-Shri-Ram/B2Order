import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  History,
  Search,
  Filter,
  Download,
  Calendar,
  Lock,
  User,
  Activity,
  FileText,
  Clock,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Terminal,
  Database
} from 'lucide-react';
import { AuditLog, UserRole } from '../types';
import { ApexDB } from '../db/indexedDb';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const SystemActivityView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [actionCategory, setActionCategory] = useState<string>('all');
  const [timeframe, setTimeframe] = useState<'all' | 'today' | 'week'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadLogs = async () => {
    setIsRefreshing(true);
    try {
      const allLogs = await ApexDB.getAll<AuditLog>('auditLogs');
      allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setLogs(allLogs);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadLogs();
    const unsub = ApexDB.subscribe((store) => {
      if (store === 'auditLogs') {
        loadLogs();
      }
    });
    return unsub;
  }, []);

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (roleFilter !== 'all' && log.actorRole !== roleFilter) return false;

    if (actionCategory !== 'all') {
      const act = log.action.toUpperCase();
      if (actionCategory === 'auth' && !act.includes('LOGIN') && !act.includes('LOGOUT') && !act.includes('BOOT')) return false;
      if (actionCategory === 'order' && !act.includes('ORDER')) return false;
      if (actionCategory === 'security' && !act.includes('SECURITY') && !act.includes('PASSWORD') && !act.includes('RBAC') && !act.includes('BACKUP')) return false;
      if (actionCategory === 'catalog' && !act.includes('PRODUCT') && !act.includes('CATEGORY') && !act.includes('UNIT') && !act.includes('STOCK')) return false;
    }

    if (timeframe !== 'all') {
      const logDate = new Date(log.timestamp).getTime();
      const now = Date.now();
      if (timeframe === 'today' && now - logDate > 1000 * 60 * 60 * 24) return false;
      if (timeframe === 'week' && now - logDate > 1000 * 60 * 60 * 24 * 7) return false;
    }

    if (search.trim()) {
      const s = search.toLowerCase();
      return (
        log.actorName.toLowerCase().includes(s) ||
        log.action.toLowerCase().includes(s) ||
        log.targetEntity.toLowerCase().includes(s) ||
        log.details.toLowerCase().includes(s) ||
        log.id.toLowerCase().includes(s)
      );
    }

    return true;
  });

  // Security Statistics
  const totalEvents = logs.length;
  const loginEvents = logs.filter((l) => l.action.includes('LOGIN')).length;
  const criticalEvents = logs.filter((l) => l.action.includes('PASSWORD') || l.action.includes('RBAC') || l.action.includes('DELETE') || l.action.includes('RESTORE')).length;
  const todayEvents = logs.filter((l) => Date.now() - new Date(l.timestamp).getTime() < 1000 * 60 * 60 * 24).length;

  // Export functions
  const handleExportCsv = () => {
    const headers = ['Audit ID', 'Timestamp', 'Actor Name', 'Actor Role', 'Action', 'Target Entity', 'Details'];
    const rows = filteredLogs.map((l) => [
      `"${l.id}"`,
      `"${new Date(l.timestamp).toLocaleString()}"`,
      `"${l.actorName.replace(/"/g, '""')}"`,
      `"${l.actorRole.toUpperCase()}"`,
      `"${l.action}"`,
      `"${l.targetEntity}"`,
      `"${l.details.replace(/"/g, '""')}"`
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Apex_System_Activity_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const handleExportExcel = () => {
    const data = filteredLogs.map((l) => ({
      'Audit ID': l.id,
      Timestamp: new Date(l.timestamp).toLocaleString(),
      'User / Actor': l.actorName,
      Role: l.actorRole.toUpperCase(),
      Action: l.action,
      'Target Entity Affected': l.targetEntity,
      'Details / Parameters': l.details
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'System Audit Log');
    XLSX.writeFile(wb, `Apex_System_Activity_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('Apex ERP - System Activity & Security Monitoring Log', 14, 16);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${new Date().toLocaleString()} | Filtered Events: ${filteredLogs.length}`, 14, 22);

    const body = filteredLogs.map((l) => [
      new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      l.actorName,
      l.actorRole.toUpperCase(),
      l.action,
      l.targetEntity,
      l.details
    ]);

    autoTable(doc, {
      startY: 28,
      head: [['Time', 'User', 'Role', 'Action', 'Target Entity', 'Details']],
      body,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2.5 }
    });

    doc.save(`Apex_System_Activity_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const getActionBadgeColor = (action: string) => {
    const a = action.toUpperCase();
    if (a.includes('DELETE') || a.includes('PASSWORD') || a.includes('DEACTIVATED')) {
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20';
    }
    if (a.includes('ORDER') || a.includes('CREATE') || a.includes('REGISTERED')) {
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
    }
    if (a.includes('LOGIN') || a.includes('BOOT')) {
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20';
    }
    return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase">
              <Lock className="w-3 h-3" />
              Read-Only
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 uppercase">
              Security Monitoring
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              System Activity
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Immutable, read-only audit trail capturing user logins, permission changes, order events, and system mutations.
          </p>
        </div>

        {/* Toolbar Export Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={loadLogs}
            disabled={isRefreshing}
            className="p-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 hover:bg-slate-100 text-slate-600 dark:text-slate-300"
            title="Refresh Log Stream"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 hover:bg-slate-100 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            CSV
          </button>
          <button
            onClick={handleExportExcel}
            className="px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 flex items-center gap-1.5 shadow-xs"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-600" />
            Excel
          </button>
          <button
            onClick={handleExportPdf}
            className="px-3 py-1.5 rounded-xl text-xs font-bold border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 flex items-center gap-1.5 shadow-xs"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
            PDF Report
          </button>
        </div>
      </div>

      {/* Security KPI Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl glass-card border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Recorded Events</span>
            <Activity className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums mt-1">
            {totalEvents}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">256-bit cryptographically sequenced</div>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Today's Audit Velocity</span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-1">
            {todayEvents}
          </div>
          <div className="text-[10px] text-emerald-600/80 mt-0.5">Captured in last 24 hours</div>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Authentication Events</span>
            <User className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 font-mono tabular-nums mt-1">
            {loginEvents}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Logins & active sessions</div>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Critical System Overrides</span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 font-mono tabular-nums mt-1">
            {criticalEvents}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Password & RBAC changes</div>
        </div>
      </div>

      {/* Filter Matrix */}
      <div className="glass-panel rounded-2xl p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by actor, action, target entity, or details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-950/70 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={actionCategory}
              onChange={(e) => setActionCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-950/70 text-slate-900 dark:text-slate-100 font-medium focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Event Categories</option>
              <option value="auth">Authentication & Logins</option>
              <option value="order">Orders & Transactions</option>
              <option value="catalog">Catalog & Inventory</option>
              <option value="security">Security & Role Permissions</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-950/70 text-slate-900 dark:text-slate-100 font-medium focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="salesman">Salesman</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-950/70 text-slate-900 dark:text-slate-100 font-medium focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All-Time</option>
              <option value="today">Today (Last 24h)</option>
              <option value="week">Past 7 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Read-Only Activity Log Table */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-xs border border-slate-200/80 dark:border-slate-800/80">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="font-bold text-xs text-slate-900 dark:text-white">
              Live Audit Stream ({filteredLogs.length} Events)
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Immutable Event Log · Read-Only Mode
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">User / Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Security Details & Audit Parameters</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    No activity logs match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap tabular-nums">
                      <div>{new Date(log.timestamp).toLocaleDateString()}</div>
                      <div className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-[10px] uppercase">
                          {log.actorName.slice(0, 2)}
                        </div>
                        <span>{log.actorName}</span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400 uppercase ml-6.5">
                        {log.actorRole}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block font-mono text-[10px] font-bold px-2 py-0.5 rounded-md ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {log.targetEntity}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-lg">
                      <div className="line-clamp-2">{log.details}</div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">ID: {log.id}</div>
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
