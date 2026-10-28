/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { SmsDrawer } from './components/SmsDrawer';
import { OrderEntryView } from './views/OrderEntryView';
import { OrderHistoryView } from './views/OrderHistoryView';
import { CatalogMasterView } from './views/CatalogMasterView';
import { ProductSummaryView } from './views/ProductSummaryView';
import { CustomerMasterView } from './views/CustomerMasterView';
import { StaffManagementView } from './views/StaffManagementView';
import { ProfitAnalysisView } from './views/ProfitAnalysisView';
import { AdminSecurityView } from './views/AdminSecurityView';
import { ReportingEngineView } from './views/ReportingEngineView';
import { SystemActivityView } from './views/SystemActivityView';
import { LoginView } from './views/LoginView';
import { SmsMessage } from './types';
import { Smartphone, CheckCircle, ShieldAlert, Building2, Phone, LogOut } from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentUser, canAccess, isAuthenticated, companyName, ownerName, logout } = useAuth();
  const [currentView, setCurrentView] = useState<string>('order-entry');
  const [smsDrawerOpen, setSmsDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ title: string; body: string; type?: string } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  // Guard routing if user switches role
  useEffect(() => {
    if (!canAccess(currentView)) {
      setCurrentView('order-entry');
    }
  }, [currentUser, currentView, canAccess]);

  // Listen to SMS dispatch events for real-time floating toast
  useEffect(() => {
    const handleSmsDispatched = (e: any) => {
      const sms = e.detail as SmsMessage;
      setToastMessage({
        title: 'SMS Alert Delivered to Owner',
        body: sms.message.split('\n')[0],
        type: sms.type
      });
      setTimeout(() => setToastMessage(null), 4500);
    };

    window.addEventListener('apex-sms-dispatched', handleSmsDispatched);
    return () => {
      window.removeEventListener('apex-sms-dispatched', handleSmsDispatched);
    };
  }, []);

  const handleNavigate = (viewId: string) => {
    if (canAccess(viewId)) {
      setCurrentView(viewId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setToastMessage({
        title: 'Access Restricted',
        body: `Your role (${currentUser.role.toUpperCase()}) does not have permission to view that module.`,
        type: 'restricted'
      });
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // If user signed out, display Login & Sign-up page
  if (!isAuthenticated || showAuthModal) {
    return (
      <LoginView
        onLoginSuccess={() => {
          setShowAuthModal(false);
          setCurrentView('order-entry');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* Vertical Navigation Bar on Desktop / Mobile Drawer */}
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenSmsDrawer={() => setSmsDrawerOpen(true)}
        onLogout={() => setShowAuthModal(true)}
      />

      {/* Main View Area (offset by 64px/256px on desktop for vertical sidebar) */}
      <div className="flex-1 flex flex-col lg:pl-64">
        {/* Universal Top Header with Logged-in Company Name & Session Status */}
        <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-6 py-2.5 flex items-center justify-between transition-colors shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight truncate" title={companyName}>
                  {companyName}
                </span>
                <span className="hidden md:inline-block text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 shrink-0">
                  {ownerName ? `Owner: ${ownerName}` : 'Enterprise Wholesale'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs shrink-0">
            {currentUser.phone && (
              <span className="hidden sm:inline-flex items-center gap-1 font-mono text-[11px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                <Phone className="w-3 h-3 text-emerald-500" />
                {currentUser.phone}
              </span>
            )}
            <div className="flex items-center gap-2">
              <span className="hidden md:inline text-[11px] text-slate-400">User:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                {currentUser.name}
              </span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                {currentUser.role}
              </span>
              <button
                onClick={() => setShowAuthModal(true)}
                title="Switch Account or Role"
                className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-1"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 pb-16">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {currentView === 'order-entry' && <OrderEntryView />}
              {currentView === 'order-history' && <OrderHistoryView />}
              {currentView === 'catalog' && <CatalogMasterView />}
              {currentView === 'demand' && <ProductSummaryView />}
              {currentView === 'customers' && <CustomerMasterView />}
              {currentView === 'reports' && <ReportingEngineView />}
              {currentView === 'system-activity' && <SystemActivityView />}
              {currentView === 'staff' && <StaffManagementView />}
              {currentView === 'profit-analysis' && <ProfitAnalysisView />}
              {currentView === 'security' && <AdminSecurityView />}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Quiet Corporate Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 py-4 px-6 text-center text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-300">Apex B2B Order Hub</span>
            <span>·</span>
            <span>Offline-First Enterprise ERP</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span>
              Active Role: <strong className="uppercase text-indigo-600 dark:text-indigo-400">{currentUser.role}</strong>
            </span>
            <span>·</span>
            <button
              onClick={() => setShowAuthModal(true)}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
            >
              Switch Role / Sign In
            </button>
          </div>
        </footer>
      </div>

      {/* Floating System Toast */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xl flex items-start gap-3 animate-in slide-in-from-bottom-5 duration-200">
          {toastMessage.type === 'restricted' ? (
            <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
          )}
          <div className="flex-1 text-xs">
            <div className="font-bold text-slate-900 dark:text-white">{toastMessage.title}</div>
            <div className="text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{toastMessage.body}</div>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-slate-600 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Interactive SMS Activity & Carrier Simulation Drawer */}
      <SmsDrawer isOpen={smsDrawerOpen} onClose={() => setSmsDrawerOpen(false)} />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
