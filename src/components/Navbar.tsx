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
  UserCheck,
  FileText,
  LogOut,
  ChevronRight,
  Sliders,
  Database,
  Activity
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
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenSmsDrawer,
  onLogout
}) => {
  const { currentUser, allStaff, switchUser, canAccess, isAdmin, logout } = useAuth();
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

  const handleUserLogout = async () => {
    await logout();
    if (onLogout) onLogout();
  };

  // Grouped navigation modules
  const navSections = [
    {
      title: 'Operations',
      items: [
        { id: 'order-entry', label: 'Order Entry (Cart)', icon: ShoppingCart },
        { id: 'order-history', label: 'Order History', icon: History },
        { id: 'demand', label: 'Product Demand', icon: TrendingUp }
      ]
    },
    {
      title: 'Master Catalog',
      items: [
        { id: 'catalog', label: 'Catalog Master', icon: Package },
        { id: 'customers', label: 'Customer Master', icon: Users }
      ]
    },
    {
      title: 'Reporting & Analytics',
      items: [
        { id: 'reports', label: 'Reporting Engine', icon: FileText },
        { id: 'profit-analysis', label: 'Profit Analysis', icon: DollarSign },
        { id: 'system-activity', label: 'System Activity', icon: Activity }
      ]
    },
    {
      title: 'Admin Console',
      items: [
        { id: 'staff', label: 'Staff Management', icon: Shield },
        { id: 'security', label: 'Admin Security', icon: Settings }
      ]
    }
  ];

  // Flat list of accessible items
  const allAccessibleItems = navSections.flatMap((s) => s.items).filter((item) => canAccess(item.id));

  const roleBadgeColor = {
    admin: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    manager: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    salesman: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
  }[currentUser.role];

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. DESKTOP VERTICAL NAVIGATION SIDEBAR (Admin layout in vertical position) */}
      {/* ========================================================================= */}
      <aside className="hidden lg:flex fixed top-0 left-0 bottom-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col z-40 select-none">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-base shadow-sm">
              ▲
            </div>
            <div>
              <span className="text-base font-black text-slate-900 dark:text-white tracking-tight leading-none block">
                Apex B2B
              </span>
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 tracking-wider uppercase font-semibold">
                ERP Command Center
              </span>
            </div>
          </div>
        </div>

        {/* Admin Vertical Status Tag */}
        <div className="px-5 pt-3 pb-2">
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
              Nav Position
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              Vertical (Left)
            </span>
          </div>
        </div>

        {/* Grouped Vertical Nav Items */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4 scrollbar-thin">
          {navSections.map((section) => {
            const accessibleSectionItems = section.items.filter((item) => canAccess(item.id));
            if (accessibleSectionItems.length === 0) return null;

            return (
              <div key={section.title} className="space-y-1">
                <div className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {section.title}
                </div>
                {accessibleSectionItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-xs font-bold'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-200" />}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Bottom Panel: Utilities, Status & Profile */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-950/40">
          {/* Real-time Status and Utility bar */}
          <div className="flex items-center justify-between text-xs">
            {/* Sync status */}
            <button
              onClick={handleManualSync}
              title={`Sync state: ${syncStatus}. Click to test sync.`}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[11px] font-mono text-slate-600 dark:text-slate-300"
            >
              {syncStatus === 'connected' ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-500" />
              ) : syncStatus === 'offline' ? (
                <WifiOff className="w-3.5 h-3.5 text-rose-500" />
              ) : (
                <RefreshCw className={`w-3.5 h-3.5 text-amber-500 ${isSyncingManually ? 'animate-spin' : ''}`} />
              )}
              <span className="capitalize">{syncStatus}</span>
            </button>

            <div className="flex items-center gap-1">
              {/* SMS Drawer Button */}
              <button
                onClick={onOpenSmsDrawer}
                title="Owner SMS Activity Log"
                className="relative p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                {smsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-indigo-600 text-[9px] font-bold text-white flex items-center justify-center">
                    {smsCount > 9 ? '9+' : smsCount}
                  </span>
                )}
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                title="Toggle Dark / Light Mode"
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* User Profile & Switcher */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
                  {currentUser.name.slice(0, 2)}
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-400 capitalize">
                    {currentUser.role.toUpperCase()}
                  </div>
                </div>
              </div>

              <button
                onClick={handleUserLogout}
                title="Switch Account / Sign Out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MOBILE TOP BAR (With Slide-out Vertical Drawer for Mobile) */}
      {/* ========================================================================= */}
      <header className="lg:hidden sticky top-0 z-40 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-sm">
            ▲
          </div>
          <div>
            <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">Apex B2B</span>
            <span className="text-[10px] font-mono text-slate-400 block -mt-0.5">ERP PORTAL</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* SMS drawer trigger */}
          <button
            onClick={onOpenSmsDrawer}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Hamburger Menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Vertical Slide-Out Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex">
          <div className="w-72 bg-white dark:bg-slate-900 h-full flex flex-col p-4 shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-sm">
                  ▲
                </div>
                <span className="font-bold text-sm text-slate-900 dark:text-white">Apex Navigation</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-4">
              {navSections.map((section) => {
                const accessibleSectionItems = section.items.filter((item) => canAccess(item.id));
                if (accessibleSectionItems.length === 0) return null;

                return (
                  <div key={section.title} className="space-y-1">
                    <div className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {section.title}
                    </div>
                    {accessibleSectionItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentView === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            onNavigate(item.id);
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold ${
                            isActive
                              ? 'bg-indigo-600 text-white font-bold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Logged in as:</span>
                <span className="font-bold text-indigo-600 uppercase">{currentUser.role}</span>
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleUserLogout();
                }}
                className="w-full py-2 px-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out / Switch Role
              </button>
            </div>
          </div>

          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}
    </>
  );
};
