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
  const { currentUser, allStaff, switchUser, canAccess, isAdmin, logout, companyName, ownerName } = useAuth();
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
      <aside className="hidden lg:flex fixed top-0 left-0 bottom-0 w-64 bg-[#EDEDF5] dark:bg-[#0D1320] border-r border-[#D4D4DB] dark:border-[#1E293B] flex-col z-40 select-none transition-colors">
        {/* Brand Header */}
        <div className="p-4 border-b border-[#D4D4DB]/70 dark:border-[#1E293B] flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-[#6366F1] text-white flex items-center justify-center font-black text-base shadow-[0_4px_14px_-2px_rgba(99,102,241,0.5)] shrink-0">
              ▲
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-sm font-black text-[#15151C] dark:text-[#E2E8F0] tracking-tight leading-tight block truncate" title={companyName}>
                {companyName || 'Apex B2B Order Hub'}
              </span>
              <span className="text-[10px] font-mono text-[#6366F1] tracking-wider uppercase font-semibold block truncate">
                {ownerName ? `Owner: ${ownerName}` : 'ERP COMMAND CENTER'}
              </span>
            </div>
          </div>
        </div>

        {/* Admin Vertical Status Tag */}
        <div className="px-5 pt-3 pb-2">
          <div className="px-3 py-1.5 rounded-xl bg-[#F7F7FF] dark:bg-[#070B14] border border-[#D4D4DB] dark:border-[#1E293B] flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-[0.98px] text-[#7C8CA5] font-bold">
              Nav Position
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#6366F1]/10 text-[#6366F1] border border-[#6366F1]/20">
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
                <div className="px-3 text-[10px] font-bold text-[#7C8CA5] uppercase tracking-[0.98px]">
                  {section.title}
                </div>
                {accessibleSectionItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.97] ${
                        isActive
                          ? 'bg-[#6366F1] text-white shadow-[0_6px_18px_-6px_rgba(99,102,241,0.7)] font-bold'
                          : 'text-[#6A6A71] dark:text-[#94A3B8] hover:text-[#15151C] dark:hover:text-[#E2E8F0] hover:bg-black/5 dark:hover:bg-[#202632]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#7C8CA5]'}`} />
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
        <div className="p-4 border-t border-[#D4D4DB]/70 dark:border-[#1E293B] space-y-3 bg-[#F7F7FF]/60 dark:bg-[#070B14]/60">
          {/* Real-time Status and Utility bar */}
          <div className="flex items-center justify-between text-xs">
            {/* Sync status */}
            <button
              onClick={handleManualSync}
              title={`Sync state: ${syncStatus}. Click to test sync.`}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#D4D4DB] dark:border-[#1E293B] bg-white dark:bg-[#0D1320] text-[11px] font-mono text-[#6A6A71] dark:text-[#94A3B8] active:scale-[0.97] transition-all"
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
                className="relative p-1.5 rounded-lg border border-[#D4D4DB] dark:border-[#1E293B] bg-white dark:bg-[#0D1320] text-[#6A6A71] dark:text-[#94A3B8] hover:bg-black/5 dark:hover:bg-[#202632] active:scale-[0.97] transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                {smsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#6366F1] text-[9px] font-bold text-white flex items-center justify-center">
                    {smsCount > 9 ? '9+' : smsCount}
                  </span>
                )}
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                title="Toggle Dark / Light Mode"
                className="p-1.5 rounded-lg border border-[#D4D4DB] dark:border-[#1E293B] bg-white dark:bg-[#0D1320] text-[#6A6A71] dark:text-[#94A3B8] hover:bg-black/5 dark:hover:bg-[#202632] active:scale-[0.97] transition-all"
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* User Profile & Switcher */}
          <div className="pt-2 border-t border-[#D4D4DB]/70 dark:border-[#1E293B]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <div className="w-7 h-7 rounded-lg bg-[#6366F1] text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
                  {currentUser.name.slice(0, 2)}
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-[#15151C] dark:text-[#E2E8F0] truncate">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-[#7C8CA5] uppercase font-mono">
                    {currentUser.role}
                  </div>
                </div>
              </div>

              <button
                onClick={handleUserLogout}
                title="Switch Account / Sign Out"
                className="p-1.5 rounded-lg text-[#7C8CA5] hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
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
      <header className="lg:hidden sticky top-0 z-40 w-full bg-[#EDEDF5]/90 dark:bg-[#0D1320]/90 backdrop-blur-md border-b border-[#D4D4DB] dark:border-[#1E293B] px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#6366F1] text-white flex items-center justify-center font-black text-sm shrink-0">
            ▲
          </div>
          <div className="min-w-0">
            <span className="text-sm font-black text-[#15151C] dark:text-[#E2E8F0] tracking-tight truncate block max-w-[150px]">
              {companyName || 'Apex B2B'}
            </span>
            <span className="text-[10px] font-mono text-[#6366F1] block -mt-0.5 truncate">
              {ownerName || 'ERP PORTAL'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* SMS drawer trigger */}
          <button
            onClick={onOpenSmsDrawer}
            className="p-2 rounded-lg text-[#6A6A71] dark:text-[#94A3B8] hover:bg-black/5 dark:hover:bg-[#202632]"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-[#6A6A71] dark:text-[#94A3B8] hover:bg-black/5 dark:hover:bg-[#202632]"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Hamburger Menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-[#6A6A71] dark:text-[#94A3B8] hover:bg-black/5 dark:hover:bg-[#202632]"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Vertical Slide-Out Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex">
          <div className="w-72 bg-[#EDEDF5] dark:bg-[#0D1320] h-full flex flex-col p-4 shadow-2xl animate-in slide-in-from-left duration-200 border-r border-[#D4D4DB] dark:border-[#1E293B]">
            <div className="flex items-center justify-between pb-4 border-b border-[#D4D4DB]/70 dark:border-[#1E293B]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#6366F1] text-white flex items-center justify-center font-black text-sm">
                  ▲
                </div>
                <span className="font-bold text-sm text-[#15151C] dark:text-[#E2E8F0]">Apex Navigation</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-[#7C8CA5] hover:text-[#15151C] dark:hover:text-white"
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
                    <div className="px-2 text-[10px] font-bold text-[#7C8CA5] uppercase tracking-[0.98px]">
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
                              ? 'bg-[#6366F1] text-white font-bold shadow-[0_6px_18px_-6px_rgba(99,102,241,0.7)]'
                              : 'text-[#6A6A71] dark:text-[#94A3B8] hover:bg-black/5 dark:hover:bg-[#202632]'
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

            <div className="pt-3 border-t border-[#D4D4DB]/70 dark:border-[#1E293B] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#7C8CA5]">Logged in as:</span>
                <span className="font-bold text-[#6366F1] uppercase">{currentUser.role}</span>
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleUserLogout();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center gap-1.5"
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
