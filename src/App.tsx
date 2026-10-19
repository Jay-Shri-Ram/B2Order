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
import { SmsMessage } from './types';
import { Smartphone, CheckCircle, ShieldAlert } from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentUser, canAccess } = useAuth();
  const [currentView, setCurrentView] = useState<string>('order-entry');
  const [smsDrawerOpen, setSmsDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ title: string; body: string; type?: string } | null>(null);

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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenSmsDrawer={() => setSmsDrawerOpen(true)}
      />

      {/* Main View Area with Framer Motion Transition */}
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
            {currentView === 'staff' && <StaffManagementView />}
            {currentView === 'profit-analysis' && <ProfitAnalysisView />}
            {currentView === 'security' && <AdminSecurityView />}
          </motion.div>
        </AnimatePresence>
      </main>

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

      {/* Quiet Corporate Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 py-4 px-6 text-center text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700 dark:text-slate-300">Apex B2B Order Hub</span>
          <span>·</span>
          <span>Offline-First Enterprise ERP</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span>Active Role: <strong className="uppercase text-indigo-600 dark:text-indigo-400">{currentUser.role}</strong></span>
          <span>·</span>
          <span>256-bit AES Backup Encrypted</span>
        </div>
      </footer>
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
