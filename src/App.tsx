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
    <div className="min-h-screen bg-[#F7F7FF] dark:bg-[#070B14] text-[#15151C] dark:text-[#E2E8F0] flex flex-col transition-colors duration-200 relative overflow-x-hidden">
      {/* OrderFlow Pro Atmospheric Radial Background Glow */}
      <div className="fixed inset-0 bg-orderflow-radial pointer-events-none opacity-40 dark:opacity-85 z-0" />

      {/* Vertical Navigation Bar on Desktop / Mobile Drawer */}
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenSmsDrawer={() => setSmsDrawerOpen(true)}
        onLogout={() => setShowAuthModal(true)}
      />

      {/* Main View Area (offset by 64px/256px on desktop for vertical sidebar) */}
      <div className="flex-1 flex flex-col lg:pl-64 relative z-10">
        {/* Universal Top Header with Logged-in Company Name & Session Status */}
        <header className="sticky top-0 z-30 bg-[#EDEDF5]/85 dark:bg-[#0D1320]/80 backdrop-blur-xl border-b border-[#D4D4DB]/70 dark:border-[#1E293B] px-4 sm:px-6 py-3 flex items-center justify-between transition-colors shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Connected to Sync Engine" />
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="text-sm sm:text-base font-extrabold text-[#15151C] dark:text-[#E2E8F0] tracking-[-0.6px] truncate" title={companyName}>
                  {companyName}
                </span>
                <span className="hidden md:inline-block text-[11px] font-mono text-[#6366F1] font-semibold px-2 py-0.5 rounded-md bg-[#6366F1]/10 border border-[#6366F1]/20 shrink-0">
                  {ownerName ? `Owner: ${ownerName}` : 'Enterprise Wholesale'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs shrink-0">
            {currentUser.phone && (
              <span className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[11px] text-[#6A6A71] dark:text-[#94A3B8] bg-white/70 dark:bg-[#111A2B] px-2.5 py-1 rounded-lg border border-[#D4D4DB] dark:border-[#1E293B]">
                <Phone className="w-3 h-3 text-emerald-500" />
                {currentUser.phone}
              </span>
            )}
            <div className="flex items-center gap-2">
              <span className="hidden md:inline text-[11px] text-[#7C8CA5]">User:</span>
              <span className="font-bold text-[#15151C] dark:text-[#E2E8F0] font-mono text-[11px]">
                {currentUser.name}
              </span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold bg-[#6366F1]/10 text-[#6366F1] border border-[#6366F1]/20">
                {currentUser.role}
              </span>
              <button
                onClick={() => setShowAuthModal(true)}
                title="Switch Account or Role"
                className="p-1.5 rounded-lg text-[#7C8CA5] hover:text-[#6366F1] hover:bg-black/5 dark:hover:bg-[#202632] active:scale-[0.97] transition-all ml-1"
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
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
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
        <footer className="border-t border-[#D4D4DB]/70 dark:border-[#1E293B] bg-[#EDEDF5]/70 dark:bg-[#0D1320]/70 py-4 px-6 text-center text-xs text-[#7C8CA5] flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#15151C] dark:text-[#E2E8F0]">Apex B2B Order Hub</span>
            <span>·</span>
            <span>OrderFlow Pro Architecture</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span>
              Active Role: <strong className="uppercase text-[#6366F1]">{currentUser.role}</strong>
            </span>
            <span>·</span>
            <button
              onClick={() => setShowAuthModal(true)}
              className="text-[#6366F1] hover:underline font-bold"
            >
              Switch Role / Sign In
            </button>
          </div>
        </footer>
      </div>

      {/* Floating System Toast */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm orderflow-card p-4 shadow-xl flex items-start gap-3 animate-in slide-in-from-bottom-5 duration-200">
          {toastMessage.type === 'restricted' ? (
            <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
          )}
          <div className="flex-1 text-xs">
            <div className="font-bold text-[#15151C] dark:text-[#E2E8F0]">{toastMessage.title}</div>
            <div className="text-[#6A6A71] dark:text-[#94A3B8] mt-0.5 line-clamp-2">{toastMessage.body}</div>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-[#7C8CA5] hover:text-[#15151C] dark:hover:text-white text-xs font-bold"
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
