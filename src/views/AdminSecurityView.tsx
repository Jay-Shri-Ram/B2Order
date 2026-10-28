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
  Edit2,
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  Activity,
  FileText,
  Search,
  Filter,
  Terminal,
  Clock,
  User,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import { AppSettings, FirebaseConfig, AuditLog } from '../types';
import { ApexDB } from '../db/indexedDb';
import { useAuth } from '../context/AuthContext';
import { FirebaseSync, SyncStatus } from '../services/firebaseSync';
import { formatIndianPhone, isValidIndianPhone } from '../utils/indianPhone';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const AdminSecurityView: React.FC = () => {
  const {
    currentUser,
    isAdmin,
    adminPin,
    isAdminUnlocked,
    unlockAdminConsole,
    lockAdminConsole,
    updateAdminPin,
    logSystemActivity
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'territories' | 'backup'>('overview');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(FirebaseSync.getStatus());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditRoleFilter, setAuditRoleFilter] = useState('all');
  const [auditActionFilter, setAuditActionFilter] = useState('all');
  const [isTestingFirebase, setIsTestingFirebase] = useState(false);
  const [firebaseTestResult, setFirebaseTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // PIN Unlock screen state
  const [enteredPin, setEnteredPin] = useState('');
  const [pinUnlockError, setPinUnlockError] = useState<string | null>(null);
  const [showUnlockPin, setShowUnlockPin] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Change PIN state
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [showPinChange, setShowPinChange] = useState(false);
  const [pinChangeError, setPinChangeError] = useState<string | null>(null);
  const [pinChangeSuccess, setPinChangeSuccess] = useState<string | null>(null);

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
    ownerName: '',
    companyAddress: '',
    companyPhone: '',
    ownerMobileNumber: '',
    ownerEmail: '',
    currency: '₹',
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
      ownerName: appSettings.ownerName || '',
      companyAddress: appSettings.companyAddress || '',
      companyPhone: appSettings.companyPhone ? formatIndianPhone(appSettings.companyPhone) : '+91 98765 43210',
      ownerMobileNumber: appSettings.ownerMobileNumber ? formatIndianPhone(appSettings.ownerMobileNumber) : '+91 98765 43210',
      ownerEmail: appSettings.ownerEmail || '',
      currency: appSettings.currency || '₹',
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

  // Handle PIN Unlock Submission
  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinUnlockError(null);
    if (!enteredPin.trim()) {
      setPinUnlockError('Please enter your 4 to 6 digit Admin PIN.');
      return;
    }

    setIsUnlocking(true);
    try {
      const res = await unlockAdminConsole(enteredPin);
      if (!res.success) {
        setPinUnlockError(res.message);
      }
    } finally {
      setIsUnlocking(false);
    }
  };

  // Handle Changing 4-6 Digit PIN
  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeError(null);
    setPinChangeSuccess(null);

    const clean = newPinInput.trim();
    if (clean.length < 4 || clean.length > 6) {
      setPinChangeError('Admin PIN must be between 4 and 6 digits/characters.');
      return;
    }

    if (newPinInput !== confirmPinInput) {
      setPinChangeError('New PINs do not match. Please re-enter.');
      return;
    }

    const res = await updateAdminPin(clean);
    if (res.success) {
      setPinChangeSuccess('Admin Console PIN updated successfully!');
      setNewPinInput('');
      setConfirmPinInput('');
      setTimeout(() => setPinChangeSuccess(null), 4000);
    } else {
      setPinChangeError(res.message);
    }
  };

  // Save General & SMS Settings
  const handleSaveGeneralSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    const formattedOwnerPhone = formatIndianPhone(companyForm.ownerMobileNumber);
    if (!isValidIndianPhone(companyForm.ownerMobileNumber)) {
      alert('Please enter a valid 10-digit Indian mobile number (+91 XXXXX XXXXX).');
      return;
    }

    const updatedSettings: AppSettings = {
      ...settings,
      ...companyForm,
      ownerMobileNumber: formattedOwnerPhone,
      companyPhone: formatIndianPhone(companyForm.companyPhone)
    };

    await ApexDB.saveSettings(updatedSettings);
    await logSystemActivity(
      'SETTINGS_UPDATE',
      'ApexConfiguration',
      `Company profile & Owner SMS phone updated to ${formattedOwnerPhone}`
    );

    setSaveSuccessNotice('Settings and Indian contact details saved successfully.');
    setTimeout(() => setSaveSuccessNotice(null), 3000);
  };

  // Test & Install Firebase Credentials
  const handleInstallFirebase = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTestingFirebase(true);
    setFirebaseTestResult(null);

    try {
      const res = await FirebaseSync.initializeWithConfig(fbForm);
      setFirebaseTestResult(res);

      if (res.success && settings) {
        const updated: AppSettings = {
          ...settings,
          firebaseConfig: fbForm,
          isFirebaseConnected: true
        };
        await ApexDB.saveSettings(updated);
        await logSystemActivity(
          'FIREBASE_CREDENTIALS_UPDATED',
          fbForm.projectId,
          `Firebase cloud project credentials updated for ${fbForm.projectId}`
        );
      }
    } finally {
      setIsTestingFirebase(false);
    }
  };

  // Territory Management
  const handleAddTerritory = async () => {
    if (!newTerritoryName.trim() || !settings) return;
    const current = settings.territories || [];
    if (current.includes(newTerritoryName.trim())) {
      alert('This territory is already in the list.');
      return;
    }
    const updated = { ...settings, territories: [...current, newTerritoryName.trim()] };
    await ApexDB.saveSettings(updated);
    setSettings(updated);
    await logSystemActivity(
      'TERRITORY_ADDED',
      newTerritoryName.trim(),
      `New geographic delivery territory "${newTerritoryName.trim()}" added.`
    );
    setNewTerritoryName('');
  };

  const handleUpdateTerritory = async (index: number) => {
    if (!editingTerritoryValue.trim() || !settings) return;
    const current = [...(settings.territories || [])];
    const oldVal = current[index];
    current[index] = editingTerritoryValue.trim();
    const updated = { ...settings, territories: current };
    await ApexDB.saveSettings(updated);
    setSettings(updated);
    await logSystemActivity(
      'TERRITORY_UPDATED',
      editingTerritoryValue.trim(),
      `Geographic territory changed from "${oldVal}" to "${editingTerritoryValue.trim()}".`
    );
    setEditingTerritoryIndex(null);
    setEditingTerritoryValue('');
  };

  const handleDeleteTerritory = async (index: number) => {
    if (!settings) return;
    const current = [...(settings.territories || [])];
    const removed = current.splice(index, 1)[0];
    const updated = { ...settings, territories: current };
    await ApexDB.saveSettings(updated);
    setSettings(updated);
    await logSystemActivity(
      'TERRITORY_DELETED',
      removed,
      `Geographic delivery territory "${removed}" removed.`
    );
  };

  // Export Audit Logs to Excel / CSV / PDF
  const filteredAuditLogs = auditLogs.filter((log) => {
    if (auditRoleFilter !== 'all' && log.actorRole !== auditRoleFilter) return false;
    if (auditActionFilter !== 'all') {
      const act = log.action.toUpperCase();
      if (auditActionFilter === 'auth' && !act.includes('LOGIN') && !act.includes('LOGOUT')) return false;
      if (auditActionFilter === 'security' && !act.includes('PIN') && !act.includes('PASSWORD') && !act.includes('SECURITY')) return false;
      if (auditActionFilter === 'order' && !act.includes('ORDER')) return false;
    }
    if (auditSearch.trim()) {
      const s = auditSearch.toLowerCase();
      return (
        log.actorName.toLowerCase().includes(s) ||
        log.action.toLowerCase().includes(s) ||
        log.targetEntity.toLowerCase().includes(s) ||
        log.details.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const exportAuditCsv = () => {
    const headers = ['Timestamp', 'Actor', 'Role', 'Action', 'Target Entity', 'Details'];
    const rows = filteredAuditLogs.map((l) => [
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
    a.download = `Admin_System_Activity_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const exportAuditExcel = () => {
    const data = filteredAuditLogs.map((l) => ({
      Timestamp: new Date(l.timestamp).toLocaleString(),
      'User / Actor': l.actorName,
      Role: l.actorRole.toUpperCase(),
      Action: l.action,
      'Target Entity Affected': l.targetEntity,
      'Details / Parameters': l.details
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'System Activity');
    XLSX.writeFile(wb, `Admin_System_Activity_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportAuditPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('Apex ERP - Administrator System Activity & Audit Trail', 14, 16);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${new Date().toLocaleString()} | Events: ${filteredAuditLogs.length}`, 14, 22);

    const body = filteredAuditLogs.map((l) => [
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

    doc.save(`Admin_System_Activity_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // Non-Admin Role Check
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

  // =========================================================================
  // PIN LOCK SCREEN (Protects Admin Console with 4 to 6 digit password)
  // =========================================================================
  if (!isAdminUnlocked) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center animate-in fade-in duration-200">
        <div className="glass-panel rounded-3xl p-8 border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-rose-500 px-2 py-0.5 rounded-full bg-rose-500/10">
              PIN-Protected Area
            </span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mt-2">
              Admin Console Security Lock
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Enter your 4 to 6 digit Master PIN to unlock system parameters, database credentials, and audit logs.
            </p>
          </div>

          {pinUnlockError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{pinUnlockError}</span>
            </div>
          )}

          <form onSubmit={handleUnlockSubmit} className="space-y-4">
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type={showUnlockPin ? 'text' : 'password'}
                maxLength={6}
                autoFocus
                placeholder="Enter 4-6 digit PIN"
                value={enteredPin}
                onChange={(e) => setEnteredPin(e.target.value)}
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono text-center tracking-widest text-lg font-bold focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => setShowUnlockPin(!showUnlockPin)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
              >
                {showUnlockPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono">
              <span>Standard Default: 1234 or 123456</span>
              <span className="text-indigo-500">APEX99</span>
            </div>

            <button
              type="submit"
              disabled={isUnlocking || !enteredPin.trim()}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Unlock className="w-4 h-4" />
              <span>{isUnlocking ? 'Validating PIN...' : 'Unlock Admin Console'}</span>
            </button>
          </form>

          <p className="text-[10px] text-slate-400">
            Note: You can easily change this 4 to 6 digit PIN from inside the Admin Panel after first unlock.
          </p>
        </div>
      </div>
    );
  }

  // =========================================================================
  // UNLOCKED ADMIN CONSOLE VIEW
  // =========================================================================
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Console Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 uppercase">
              <ShieldCheck className="w-3 h-3" />
              Unlocked
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 uppercase">
              Master Admin
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Admin Console & Security
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            System activity auditing, 4-6 digit security PIN management, company profile, and Firebase cloud sync.
          </p>
        </div>

        {/* Lock Console Button & Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={lockAdminConsole}
            title="Lock Admin Console immediately"
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock Console</span>
          </button>
        </div>
      </div>

      {/* Global Success Notification */}
      {saveSuccessNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{saveSuccessNotice}</span>
        </div>
      )}

      {/* Console Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white/60 dark:bg-slate-900/60'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>General & Security PIN</span>
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'activity'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white/60 dark:bg-slate-900/60'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>System Activity ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('territories')}
          className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'territories'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white/60 dark:bg-slate-900/60'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Territories & Zones ({(settings?.territories || []).length})</span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'backup'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white/60 dark:bg-slate-900/60'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Backups & Cloud Database</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & 4-6 DIGIT PIN MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* 4 to 6 Digit Admin PIN Card */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Admin Console Security PIN (4–6 Digits)
                  </h2>
                  <p className="text-[11px] text-slate-400">Protects this console; editable anytime after login</p>
                </div>
              </div>

              {pinChangeError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{pinChangeError}</span>
                </div>
              )}

              {pinChangeSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{pinChangeSuccess}</span>
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Current Active PIN
                  </label>
                  <div className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-white flex items-center justify-between">
                    <span className="tracking-widest">{showPinChange ? (settings?.adminPin || adminPin || '1234') : '••••'}</span>
                    <button
                      type="button"
                      onClick={() => setShowPinChange(!showPinChange)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      {showPinChange ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <form onSubmit={handleChangePin} className="space-y-3 pt-1">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      New 4 to 6 Digit PIN *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={4}
                      maxLength={6}
                      placeholder="Enter 4-6 digit PIN (e.g. 5678)"
                      value={newPinInput}
                      onChange={(e) => setNewPinInput(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono tracking-widest text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Confirm New PIN *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={4}
                      maxLength={6}
                      placeholder="Re-enter 4-6 digit PIN"
                      value={confirmPinInput}
                      onChange={(e) => setConfirmPinInput(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono tracking-widest text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-3.5 rounded-xl font-bold text-xs text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Update Admin Console PIN</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Company Profile & Indian Phone Setup */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Company Header Profile & Indian Contact Setup
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    App header company branding and Indian mobile phone (+91)
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveGeneralSettings} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Company Name (Header Display) *
                    </label>
                    <input
                      type="text"
                      required
                      value={companyForm.companyName}
                      onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Business Owner Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={companyForm.ownerName}
                      onChange={(e) => setCompanyForm({ ...companyForm, ownerName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-semibold text-slate-700 dark:text-slate-300">
                        Owner Mobile Phone *
                      </label>
                      <span className="text-[10px] font-mono font-bold text-indigo-600">+91 Indian Format</span>
                    </div>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={companyForm.ownerMobileNumber}
                      onChange={(e) => setCompanyForm({ ...companyForm, ownerMobileNumber: formatIndianPhone(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-slate-900 dark:text-slate-100 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Owner Primary Email
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
                    Company Registered Address
                  </label>
                  <input
                    type="text"
                    value={companyForm.companyAddress}
                    onChange={(e) => setCompanyForm({ ...companyForm, companyAddress: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-mono">
                    Currency: {companyForm.currency} · SMS Alerts: {companyForm.smsNotificationsEnabled ? 'Active' : 'Off'}
                  </span>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Company Settings</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SYSTEM ACTIVITY AUDIT LOG (Directly inside Admin Console!) */}
      {/* ========================================================================= */}
      {activeTab === 'activity' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Live System Activity & Audit Trail ({filteredAuditLogs.length} Events)
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Capturing user logins, role switches, password updates, and order changes
                  </p>
                </div>
              </div>

              {/* Export Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={loadSettingsAndLogs}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300"
                  title="Refresh Audit Logs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={exportAuditCsv}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 text-slate-700 dark:text-slate-300 flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  CSV
                </button>
                <button
                  onClick={exportAuditExcel}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Excel
                </button>
                <button
                  onClick={exportAuditPdf}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 flex items-center gap-1"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  PDF Report
                </button>
              </div>
            </div>

            {/* Filter Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
              <div className="sm:col-span-6 relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by actor, action, target entity, or details..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="sm:col-span-3">
                <select
                  value={auditActionFilter}
                  onChange={(e) => setAuditActionFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium"
                >
                  <option value="all">All Action Categories</option>
                  <option value="auth">Logins & Sessions</option>
                  <option value="security">PIN & Security Updates</option>
                  <option value="order">Order Activities</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <select
                  value={auditRoleFilter}
                  onChange={(e) => setAuditRoleFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium"
                >
                  <option value="all">All Staff Roles</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="salesman">Salesman</option>
                </select>
              </div>
            </div>

            {/* Log Table */}
            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Actor</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Target Entity</th>
                    <th className="py-2.5 px-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No activity records found matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                          <span>{log.actorName}</span>
                          <span className="font-mono text-[10px] text-slate-400 ml-1 uppercase">({log.actorRole})</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300 font-bold whitespace-nowrap">
                          {log.targetEntity}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 max-w-md">
                          {log.details}
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
      {/* TAB 3: TERRITORIES & DELIVERY ROUTES */}
      {/* ========================================================================= */}
      {activeTab === 'territories' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Assigned Geographic Territories & Delivery Zones
                </h2>
                <p className="text-[11px] text-slate-400">
                  Manage territories used across Customer Master and Order Entry
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
              placeholder="Enter new geographic territory or route name (e.g. Connaught Place, Whitefield)..."
              value={newTerritoryName}
              onChange={(e) => setNewTerritoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTerritory();
                }
              }}
              className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={handleAddTerritory}
              disabled={!newTerritoryName.trim()}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Zone
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
                        className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Edit zone"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTerritory(idx)}
                        className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Delete zone"
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
      )}

      {/* ========================================================================= */}
      {/* TAB 4: BACKUPS & CLOUD FIREBASE CONFIG */}
      {/* ========================================================================= */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          {/* Firebase Cloud Sync Panel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Firebase Cloud Database & Sync
                  </h2>
                  <p className="text-[11px] text-slate-400">Connected to Google Cloud Firestore database</p>
                </div>
              </div>
              <span className="font-mono text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold capitalize">
                Status: {syncStatus}
              </span>
            </div>

            <form onSubmit={handleInstallFirebase} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Project ID</label>
                  <input
                    type="text"
                    required
                    value={fbForm.projectId}
                    onChange={(e) => setFbForm({ ...fbForm, projectId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">API Key</label>
                  <input
                    type="text"
                    required
                    value={fbForm.apiKey}
                    onChange={(e) => setFbForm({ ...fbForm, apiKey: e.target.value })}
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
                <span className="text-[11px] text-slate-400">Offline-first: Syncs with IndexedDB seamlessly</span>
                <button
                  type="submit"
                  disabled={isTestingFirebase}
                  className="px-4 py-2 rounded-xl font-semibold text-xs text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingFirebase ? 'animate-spin' : ''}`} />
                  {isTestingFirebase ? 'Testing Connection...' : 'Verify Cloud Sync'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
