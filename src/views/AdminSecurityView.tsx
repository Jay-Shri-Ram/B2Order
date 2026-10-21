import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Cloud,
  Download,
  Upload,
  RefreshCw,
  Phone,
  Smartphone,
  Save,
  CheckCircle2,
  AlertTriangle,
  History,
  Database,
  ExternalLink,
  Wifi,
  WifiOff,
  Server,
  MapPin,
  Plus,
  Trash2,
  Edit2
} from 'lucide-react';
import { AppSettings, FirebaseConfig, AuditLog } from '../types';
import { ApexDB } from '../db/indexedDb';
import { useAuth } from '../context/AuthContext';
import { FirebaseSync, SyncStatus } from '../services/firebaseSync';
import { SmsNotifier } from '../services/smsService';

export const AdminSecurityView: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(FirebaseSync.getStatus());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [isTestingFirebase, setIsTestingFirebase] = useState(false);
  const [firebaseTestResult, setFirebaseTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  // Geographic Territory / Location Manager State
  const [newTerritoryName, setNewTerritoryName] = useState('');
  const [editingTerritoryIndex, setEditingTerritoryIndex] = useState<number | null>(null);
  const [editingTerritoryValue, setEditingTerritoryValue] = useState('');

  // Firebase Config Form
  const [fbForm, setFbForm] = useState<FirebaseConfig>({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
    firestoreDatabaseId: '(default)'
  });

  // Company & SMS Settings Form
  const [companyForm, setCompanyForm] = useState({
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    ownerMobileNumber: '',
    ownerEmail: '',
    currency: '$',
    webhookUrl: '',
    smsNotificationsEnabled: true
  });

  const loadSettingsAndLogs = async () => {
    const appSettings = await ApexDB.getSettings();
    const logs = await ApexDB.getAll<AuditLog>('auditLogs');
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setSettings(appSettings);
    setAuditLogs(logs);

    setCompanyForm({
      companyName: appSettings.companyName || '',
      companyAddress: appSettings.companyAddress || '',
      companyPhone: appSettings.companyPhone || '',
      ownerMobileNumber: appSettings.ownerMobileNumber || '',
      ownerEmail: appSettings.ownerEmail || '',
      currency: appSettings.currency || '$',
      webhookUrl: appSettings.webhookUrl || '',
      smsNotificationsEnabled: appSettings.smsNotificationsEnabled ?? true
    });

    if (appSettings.firebaseConfig) {
      setFbForm(appSettings.firebaseConfig);
    }
  };

  useEffect(() => {
    loadSettingsAndLogs();
    const unsubSync = FirebaseSync.onStatusChange((s) => setSyncStatus(s));
    const unsub = ApexDB.subscribe((store) => {
      if (store === 'settings' || store === 'auditLogs') {
        loadSettingsAndLogs();
      }
    });
    return () => {
      unsubSync();
      unsub();
    };
  }, []);

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 text-center">
        <Shield className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Restricted Administrator Console</h2>
        <p className="text-sm text-slate-500 mt-1">
          System credentials and security parameters can only be audited by an authorized Admin.
        </p>
      </div>
    );
  }

  // Save General & SMS Settings
  const handleSaveGeneralSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    const updatedSettings: AppSettings = {
      ...settings,
      ...companyForm
    };

    await ApexDB.saveSettings(updatedSettings);
    await ApexDB.addAuditLog({
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'SETTINGS_UPDATE',
      targetEntity: 'ApexConfiguration',
      details: `Company profile & Owner SMS phone updated to ${companyForm.ownerMobileNumber}`
    });

    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 3000);
  };

  // Test and Save Firebase Credentials
  const handleSaveFirebaseConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setIsTestingFirebase(true);
    setFirebaseTestResult(null);

    try {
      const res = await FirebaseSync.initializeWithConfig(fbForm);
      setFirebaseTestResult(res);

      if (res.success) {
        const updatedSettings: AppSettings = {
          ...settings,
          firebaseConfig: fbForm,
          isFirebaseConnected: true
        };
        await ApexDB.saveSettings(updatedSettings);

        await ApexDB.addAuditLog({
          actorId: currentUser.id,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          action: 'FIREBASE_CREDENTIALS_INSTALL',
          targetEntity: fbForm.projectId,
          details: `Installed Firebase cloud project credentials for "${fbForm.projectId}"`
        });
      }
    } finally {
      setIsTestingFirebase(false);
    }
  };

  // Export Complete Database Backup
  const handleExportBackup = async () => {
    const jsonStr = await ApexDB.exportCompleteDatabase();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ApexERP_Backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    await ApexDB.addAuditLog({
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'BACKUP_EXPORT',
      targetEntity: 'ApexDB',
      details: 'Encrypted system database backup bundle exported.'
    });
  };

  // Import Database Backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        const res = await ApexDB.restoreDatabase(content);
        alert(res.message);
        if (res.success) {
          window.location.reload();
        }
      }
    };
    reader.readAsText(file);
  };

  // Reset to Factory Seed
  const handleResetFactory = async () => {
    if (confirm('CAUTION: This will reset all 10 collections (Orders, Customers, Products, Staff) back to factory initial state. Proceed?')) {
      await ApexDB.resetToFactoryData();
      alert('System reset to initial demonstration fixtures.');
      window.location.reload();
    }
  };

  // Territory Management Handlers
  const handleAddTerritory = async () => {
    if (!newTerritoryName.trim() || !settings) return;
    const name = newTerritoryName.trim();
    const currentList = settings.territories || [];
    if (currentList.some((t) => t.toLowerCase() === name.toLowerCase())) {
      alert('Territory already exists in the master list.');
      return;
    }
    const updated = [...currentList, name];
    const newSettings = { ...settings, territories: updated };
    await ApexDB.saveSettings(newSettings);
    setSettings(newSettings);
    setNewTerritoryName('');
    await ApexDB.addAuditLog({
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'TERRITORY_ADD',
      targetEntity: name,
      details: `Added new geographic territory route: ${name}`
    });
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 3000);
  };

  const handleUpdateTerritory = async (index: number) => {
    if (!editingTerritoryValue.trim() || !settings) return;
    const currentList = settings.territories || [];
    const oldName = currentList[index];
    const newName = editingTerritoryValue.trim();
    const updated = [...currentList];
    updated[index] = newName;
    const newSettings = { ...settings, territories: updated };
    await ApexDB.saveSettings(newSettings);
    setSettings(newSettings);
    setEditingTerritoryIndex(null);
    setEditingTerritoryValue('');
    await ApexDB.addAuditLog({
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'TERRITORY_UPDATE',
      targetEntity: newName,
      details: `Renamed geographic territory from "${oldName}" to "${newName}"`
    });
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 3000);
  };

  const handleDeleteTerritory = async (index: number) => {
    if (!settings) return;
    const currentList = settings.territories || [];
    const deleted = currentList[index];
    if (!confirm(`Delete territory route "${deleted}"?`)) return;
    const updated = currentList.filter((_, i) => i !== index);
    const newSettings = { ...settings, territories: updated };
    await ApexDB.saveSettings(newSettings);
    setSettings(newSettings);
    await ApexDB.addAuditLog({
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'TERRITORY_DELETE',
      targetEntity: deleted,
      details: `Removed geographic territory route: ${deleted}`
    });
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 3000);
  };

  const filteredLogs = auditLogs.filter((l) => {
    const s = auditSearch.toLowerCase();
    return (
      l.action.toLowerCase().includes(s) ||
      l.details.toLowerCase().includes(s) ||
      l.actorName.toLowerCase().includes(s) ||
      l.targetEntity.toLowerCase().includes(s)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 uppercase">
              Admin Exclusive
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Admin Security & Cloud Integrations
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Dynamic Firebase credentials installer, offline-first sync engine, encrypted backups & audit trail.
          </p>
        </div>

        {/* Sync Status Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono font-semibold">
          {syncStatus === 'connected' ? (
            <Wifi className="w-4 h-4 text-emerald-500" />
          ) : (
            <Server className="w-4 h-4 text-indigo-500" />
          )}
          <span className="capitalize">Engine: {syncStatus}</span>
        </div>
      </div>

      {saveSuccessNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>System configuration, permissions, and security parameters updated successfully.</span>
        </div>
      )}

      {/* 6-Word/Char Master Admin Password & Live Role Access Control (RBAC) Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 6-Word Master Password Card */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Admin Master Password (6-Words / Chars)
              </h2>
              <p className="text-[11px] text-slate-400">Required for Admin login and security settings</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Current Master Password
              </label>
              <div className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>{settings?.adminPassword || 'APEX99'}</span>
                <span className="text-[10px] text-slate-400 font-sans">Active PIN</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Update Master Admin Password (Min. 6 words/chars)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. APEX99 or master key"
                  id="new-admin-password-input"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono font-bold text-slate-900 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const input = document.getElementById('new-admin-password-input') as HTMLInputElement;
                    if (!input || !input.value.trim()) {
                      alert('Please enter a new password.');
                      return;
                    }
                    if (input.value.trim().length < 6) {
                      alert('Admin Master Password must be at least 6 characters or words.');
                      return;
                    }
                    if (!settings) return;
                    const updated = { ...settings, adminPassword: input.value.trim() };
                    await ApexDB.saveSettings(updated);
                    setSettings(updated);
                    await ApexDB.addAuditLog({
                      actorId: currentUser.id,
                      actorName: currentUser.name,
                      actorRole: currentUser.role,
                      action: 'ADMIN_PASSWORD_UPDATED',
                      targetEntity: 'AdminConsoleSecurity',
                      details: 'Master Admin 6-word password was updated.'
                    });
                    input.value = '';
                    setSaveSuccessNotice(true);
                    setTimeout(() => setSaveSuccessNotice(false), 3000);
                  }}
                  className="px-3.5 py-2 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs"
                >
                  Save Key
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                This password protects the Admin Console and Administrator registration.
              </p>
            </div>
          </div>
        </div>

        {/* Live Role-Based Access Control (RBAC) Matrix */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Dynamic Role-Based Access Control (RBAC)
                </h2>
                <p className="text-[11px] text-slate-400">
                  Enable or disable module access per role. Changes apply in real-time.
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                <tr>
                  <th className="py-2.5 px-3">Module / View</th>
                  <th className="py-2.5 px-3 text-center text-indigo-600 dark:text-indigo-400">Salesman</th>
                  <th className="py-2.5 px-3 text-center text-amber-600 dark:text-amber-400">Manager</th>
                  <th className="py-2.5 px-3 text-center text-rose-600 dark:text-rose-400">Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {[
                  { id: 'order-entry', name: 'Order Entry (Cart & POS)' },
                  { id: 'order-history', name: 'Order History & Invoices' },
                  { id: 'catalog', name: 'Catalog Master & Items' },
                  { id: 'demand', name: 'Product Demand & Receiving' },
                  { id: 'customers', name: 'Customer Master & Credit' },
                  { id: 'reports', name: 'Reporting Engine (PDF/CSV/Excel)' },
                  { id: 'staff', name: 'Staff Management Console' },
                  { id: 'profit-analysis', name: 'Profit & Cost Analysis' },
                  { id: 'security', name: 'Admin Security & Cloud Sync' }
                ].map((mod) => {
                  const rolePerms = settings?.rolePermissions || {
                    salesman: { 'order-entry': true, 'order-history': false, catalog: false, demand: false, customers: false, reports: false, sheets: false, staff: false, 'profit-analysis': false, security: false },
                    manager: { 'order-entry': true, 'order-history': true, catalog: true, demand: true, customers: true, reports: true, sheets: true, staff: false, 'profit-analysis': false, security: false },
                    admin: { 'order-entry': true, 'order-history': true, catalog: true, demand: true, customers: true, reports: true, sheets: true, staff: true, 'profit-analysis': true, security: true }
                  };

                  const isChecked = (role: 'salesman' | 'manager' | 'admin') => {
                    return (rolePerms as any)?.[role]?.[mod.id] ?? (role === 'admin' ? true : false);
                  };

                  const togglePerm = async (role: 'salesman' | 'manager' | 'admin') => {
                    if (!settings) return;
                    const current = isChecked(role);
                    const updatedPerms = {
                      ...rolePerms,
                      [role]: {
                        ...(rolePerms as any)[role],
                        [mod.id]: !current
                      }
                    };
                    const updatedSettings = {
                      ...settings,
                      rolePermissions: updatedPerms as any
                    };
                    await ApexDB.saveSettings(updatedSettings);
                    setSettings(updatedSettings);
                    await ApexDB.addAuditLog({
                      actorId: currentUser.id,
                      actorName: currentUser.name,
                      actorRole: currentUser.role,
                      action: 'RBAC_PERMISSION_TOGGLE',
                      targetEntity: `${role.toUpperCase()}.${mod.id}`,
                      details: `Toggled access to ${mod.name} for ${role.toUpperCase()} to ${!current ? 'ENABLED' : 'DISABLED'}`
                    });
                  };

                  return (
                    <tr key={mod.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                        {mod.name}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked('salesman')}
                          onChange={() => togglePerm('salesman')}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked('manager')}
                          onChange={() => togglePerm('manager')}
                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked('admin')}
                          onChange={() => togglePerm('admin')}
                          className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Grid: Firebase Credential Manager (Left) & Company/SMS Setup (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dynamic Firebase Installer Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Dynamic Firebase Cloud Sync Installer
                </h2>
                <p className="text-[11px] text-slate-400">Install live Firebase credentials to enable cloud sync</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveFirebaseConfig} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Firebase Project ID *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. apex-logistics-erp"
                value={fbForm.projectId}
                onChange={(e) => setFbForm({ ...fbForm, projectId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">API Key *</label>
                <input
                  type="password"
                  required
                  placeholder="AIzaSy..."
                  value={fbForm.apiKey}
                  onChange={(e) => setFbForm({ ...fbForm, apiKey: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">App ID</label>
                <input
                  type="text"
                  placeholder="1:123456789:web:abcdef"
                  value={fbForm.appId}
                  onChange={(e) => setFbForm({ ...fbForm, appId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Auth Domain</label>
                <input
                  type="text"
                  placeholder="project.firebaseapp.com"
                  value={fbForm.authDomain}
                  onChange={(e) => setFbForm({ ...fbForm, authDomain: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Database ID</label>
                <input
                  type="text"
                  placeholder="(default)"
                  value={fbForm.firestoreDatabaseId}
                  onChange={(e) => setFbForm({ ...fbForm, firestoreDatabaseId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {firebaseTestResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  firebaseTestResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                }`}
              >
                {firebaseTestResult.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                )}
                <span>{firebaseTestResult.message}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Fallback: Runs in local IndexedDB offline-first mode
              </span>
              <button
                type="submit"
                disabled={isTestingFirebase}
                className="px-4 py-2 rounded-xl font-semibold text-xs text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingFirebase ? 'animate-spin' : ''}`} />
                {isTestingFirebase ? 'Testing Connection...' : 'Verify & Install Credentials'}
              </button>
            </div>
          </form>
        </div>

        {/* Company Profile & Owner SMS Phone Setup */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Owner SMS Notifications & Company
                </h2>
                <p className="text-[11px] text-slate-400">Target phone number for instant order dispatch alerts</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveGeneralSettings} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                required
                value={companyForm.companyName}
                onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Company Owner Mobile Phone *
                </label>
                <input
                  type="text"
                  required
                  placeholder="+1 (555) 019-2834"
                  value={companyForm.ownerMobileNumber}
                  onChange={(e) => setCompanyForm({ ...companyForm, ownerMobileNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-slate-900 dark:text-slate-100 font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Owner Email
                </label>
                <input
                  type="email"
                  value={companyForm.ownerEmail}
                  onChange={(e) => setCompanyForm({ ...companyForm, ownerEmail: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Outbound SMS Webhook Gateway URL (Optional)
              </label>
              <input
                type="url"
                placeholder="https://api.sms-carrier.com/webhook/apex-orders"
                value={companyForm.webhookUrl}
                onChange={(e) => setCompanyForm({ ...companyForm, webhookUrl: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-slate-900 dark:text-slate-100 text-[11px]"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={companyForm.smsNotificationsEnabled}
                  onChange={(e) =>
                    setCompanyForm({ ...companyForm, smsNotificationsEnabled: e.target.checked })
                  }
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Instant SMS on Every Order Active
                </span>
              </label>

              <button
                type="submit"
                className="px-4 py-2 rounded-xl font-semibold text-xs text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                Save Settings
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Geographic Territories & Delivery Routes Master Manager */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Assigned Geographic Territories & Delivery Routes
              </h2>
              <p className="text-[11px] text-slate-400">
                Add, edit, or delete delivery zones available across Customer Master and Order Entry
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {(settings?.territories || []).length} Active Zones
          </span>
        </div>

        {/* Add Territory Input */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter new geographic territory or route name (e.g. Uptown Plaza, West District)..."
            value={newTerritoryName}
            onChange={(e) => setNewTerritoryName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTerritory();
              }
            }}
            className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={handleAddTerritory}
            disabled={!newTerritoryName.trim()}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Territory
          </button>
        </div>

        {/* Territory List Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-1">
          {(settings?.territories || []).map((terr, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 flex items-center justify-between gap-2"
            >
              {editingTerritoryIndex === idx ? (
                <div className="flex items-center gap-1.5 flex-1">
                  <input
                    type="text"
                    value={editingTerritoryValue}
                    onChange={(e) => setEditingTerritoryValue(e.target.value)}
                    className="flex-1 text-xs px-2 py-1 rounded-lg border border-indigo-400 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold"
                    autoFocus
                  />
                  <button
                    onClick={() => handleUpdateTerritory(idx)}
                    className="p-1 rounded bg-indigo-600 text-white text-[10px] font-bold"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingTerritoryIndex(null)}
                    className="p-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 text-[10px]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 truncate">
                    <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {terr}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setEditingTerritoryIndex(idx);
                        setEditingTerritoryValue(terr);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit territory"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTerritory(idx)}
                      className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Delete territory"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Backup, Encrypted Restore & Database Health */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Encrypted Data Backups & Disaster Recovery
              </h2>
              <p className="text-[11px] text-slate-400">
                Full snapshot of IndexedDB stores: orders, customers, products, categories, units, staff & audit logs
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <button
            onClick={handleExportBackup}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors flex flex-col items-center justify-center text-center gap-2"
          >
            <Download className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">Export Database Backup</div>
              <div className="text-[10px] text-slate-400">Download formatted JSON snapshot</div>
            </div>
          </button>

          <label className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors flex flex-col items-center justify-center text-center gap-2 cursor-pointer">
            <Upload className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">Restore from Backup</div>
              <div className="text-[10px] text-slate-400">Select .json backup file</div>
            </div>
            <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
          </label>

          <button
            onClick={handleResetFactory}
            className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100/50 transition-colors flex flex-col items-center justify-center text-center gap-2"
          >
            <RefreshCw className="w-5 h-5 text-rose-600" />
            <div>
              <div className="text-xs font-bold text-rose-900 dark:text-rose-200">Reset to Factory Fixtures</div>
              <div className="text-[10px] text-rose-600/80">Re-seed clean demo data</div>
            </div>
          </button>
        </div>
      </div>

      {/* Comprehensive Master Audit Log */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Master Security & Administrative Audit Log
              </h2>
              <p className="text-[11px] text-slate-400">Immutable ledger of all orders, logins, and permission changes</p>
            </div>
          </div>

          <input
            type="text"
            placeholder="Search audit trail by actor, action, or target..."
            value={auditSearch}
            onChange={(e) => setAuditSearch(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 w-full sm:w-64"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[10px] font-semibold text-slate-400 uppercase">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Actor & Role</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Target Entity</th>
                <th className="py-2.5 px-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
              {filteredLogs.slice(0, 25).map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400 tabular-nums whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-bold text-slate-900 dark:text-white">{log.actorName}</span>{' '}
                    <span className="font-mono text-[10px] text-slate-400 uppercase">({log.actorRole})</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-slate-700 dark:text-slate-300">
                    {log.targetEntity}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 max-w-md truncate">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
