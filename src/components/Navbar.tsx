import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  History,
  Package,
  TrendingUp,
  Users,
  Shield,
  DollarSign,
  Settings,
  Sun,
  Moon,
  MessageSquare,
  Wifi,
  WifiOff,
  RefreshCw,
  Menu,
  X,
  ChevronDown,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { FirebaseSync, SyncStatus } from '../services/firebaseSync';
import { ApexDB } from '../db/indexedDb';
import { SmsMessage } from '../types';

interface NavbarProps {
  currentView: string;
  onNavigate: (viewId: string) => void;
  onOpenSmsDrawer: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, onOpenSmsDrawer }) => {
  const { currentUser, allStaff, switchUser, canAccess, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(FirebaseSync.getStatus());
  const [smsCount, setSmsCount] = useState<number>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [isSyncingManually, setIsSyncingManually] = useState(false);

  useEffect(() => {
    const unsubSync = FirebaseSync.onStatusChange((s) => setSyncStatus(s));

    const loadSmsCount = async () => {
      const logs = await ApexDB.getAll<SmsMessage>('smsLogs');
      setSmsCount(logs.length);
    };
    loadSmsCount();

    const handleSmsDispatched = () => {
      loadSmsCount();
    };

    window.addEventListener('apex-sms-dispatched', handleSmsDispatched);
    return () => {
      unsubSync();
      window.removeEventListener('apex-sms-dispatched', handleSmsDispatched);
    };
  }, []);

  const handleManualSync = async () => {
    setIsSyncingManually(true);
    try {
      await FirebaseSync.triggerSync();
    } finally {
      setIsSyncingManually(false);
    }
  };

  const navItems = [
    { id: 'order-entry', label: 'Order Entry', icon: ShoppingCart },
    { id: 'order-history', label: 'Order History', icon: History },
    { id: 'catalog', label: 'Catalog Master', icon: Package },
    { id: 'demand', label: 'Product Demand', icon: TrendingUp },
    { id: 'customers', label: 'Customer Master', icon: Users },
    { id: 'staff', label: 'Staff Console', icon: Shield, adminOnly: true },
    { id: 'profit-analysis', label: 'Profit Analysis', icon: DollarSign, adminOnly: true },
    { id: 'security', label: 'Admin Security', icon: Settings, adminOnly: true },
  ].filter((item) => canAccess(item.id));

  const roleBadgeColor = {
    admin: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    manager: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    salesman: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  }[currentUser.role];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4 h-16">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigate('order-entry')}
            className="flex items-center gap-2.5 text-left focus:outline-hidden"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-sm tracking-tighter shadow-xs">
              ▲
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                Apex B2B
              </span>
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 tracking-wider">
                ORDER HUB & ERP
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation Links (Desktop) */}
        <nav className="hidden lg:flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Actions & Role Session Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Cloud Sync State Button */}
          <button
            onClick={handleManualSync}
            title={`Sync status: ${syncStatus}. Click to force sync.`}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
          >
            {syncStatus === 'connected' ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-500" />
            ) : syncStatus === 'offline' ? (
              <WifiOff className="w-3.5 h-3.5 text-rose-500" />
            ) : (
              <RefreshCw className={`w-3.5 h-3.5 text-amber-500 ${isSyncingManually ? 'animate-spin' : ''}`} />
            )}
            <span className="capitalize">{isSyncingManually ? 'Syncing...' : syncStatus}</span>
          </button>

          {/* SMS Notification Center Trigger */}
          <button
            onClick={onOpenSmsDrawer}
            title="Owner SMS Activity Log"
            className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            {smsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-[10px] font-bold text-white flex items-center justify-center">
                {smsCount > 9 ? '9+' : smsCount}
              </span>
            )}
          </button>

          {/* Dark / Light Mode Switch */}
          <button
            onClick={toggleTheme}
            title="Toggle theme"
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Active Role & Persona Switcher */}
          <div className="relative">
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors text-left"
            >
              <div className="w-7 h-7 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center text-xs font-bold uppercase">
                {currentUser.name.slice(0, 2)}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight flex items-center gap-1.5">
                  {currentUser.name.split(' ')[0]}
                  <span className={`text-[10px] uppercase font-mono px-1.5 py-0.2 rounded border ${roleBadgeColor}`}>
                    {currentUser.role}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 leading-none truncate max-w-[100px]">
                  {currentUser.email}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {/* Persona Switcher Dropdown */}
            {roleMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-72 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 text-slate-500 font-medium">
                  Switch Active Persona & RBAC Role:
                </div>
                <div className="p-1 space-y-1">
                  {allStaff.map((staff) => (
                    <button
                      key={staff.id}
                      onClick={() => {
                        switchUser(staff.id);
                        setRoleMenuOpen(false);
                      }}
                      disabled={!staff.active}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                        currentUser.id === staff.id
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
                          : staff.active
                          ? 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                          : 'opacity-40 cursor-not-allowed text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-[10px]">
                          {staff.name.slice(0, 2)}
                        </div>
                        <div className="truncate">
                          <div className="font-medium text-slate-900 dark:text-white truncate">{staff.name}</div>
                          <div className="text-[10px] text-slate-400 capitalize">{staff.role} {!staff.active && '(Deactivated)'}</div>
                        </div>
                      </div>
                      {currentUser.id === staff.id && <UserCheck className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" />}
                    </button>
                  ))}
                </div>
                {isAdmin && (
                  <div className="pt-1 mt-1 border-t border-slate-100 dark:border-slate-800 px-2">
                    <button
                      onClick={() => {
                        onNavigate('staff');
                        setRoleMenuOpen(false);
                      }}
                      className="w-full text-center py-1.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Manage Staff Accounts & Security →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
