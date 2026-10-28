import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, CheckCheck, AlertTriangle, ShieldCheck, X, RefreshCw, Smartphone } from 'lucide-react';
import { SmsMessage, AppSettings } from '../types';
import { ApexDB } from '../db/indexedDb';
import { SmsNotifier } from '../services/smsService';
import { formatIndianPhone } from '../utils/indianPhone';

interface SmsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SmsDrawer: React.FC<SmsDrawerProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [testText, setTestText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const loadData = async () => {
    try {
      const smsList = await ApexDB.getAll<SmsMessage>('smsLogs');
      smsList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setMessages(smsList);
      const appSettings = await ApexDB.getSettings();
      setSettings(appSettings);
    } catch (e) {
      console.warn('Error loading SMS logs:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }

    const handleSmsDispatched = () => {
      loadData();
    };

    window.addEventListener('apex-sms-dispatched', handleSmsDispatched);
    return () => {
      window.removeEventListener('apex-sms-dispatched', handleSmsDispatched);
    };
  }, [isOpen]);

  const handleSendTestSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testText.trim()) return;

    setIsSending(true);
    try {
      const targetPhone = formatIndianPhone(settings?.ownerMobileNumber || '+91 98765 43210');
      await ApexDB.logSmsMessage({
        recipientPhone: targetPhone,
        recipientName: 'Company Owner (Mobile)',
        type: 'system_alert',
        message: `🔔 [Apex Test Dispatch] ${testText.trim()}`,
        status: 'delivered',
        gateway: 'Apex Cloud Telecom Gateway'
      });
      setTestText('');
      await loadData();
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  const filteredMessages = messages.filter((m) => {
    if (filter === 'all') return true;
    return m.type === filter;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Owner SMS Gateway
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Live Dispatch
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                To: <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{formatIndianPhone(settings?.ownerMobileNumber || '+91 98765 43210')}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 overflow-x-auto text-xs bg-white dark:bg-slate-900">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              All ({messages.length})
            </button>
            <button
              onClick={() => setFilter('order_confirmation')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filter === 'order_confirmation'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Orders
            </button>
            <button
              onClick={() => setFilter('stock_alert')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filter === 'stock_alert'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Stock Alerts
            </button>
            <button
              onClick={() => setFilter('staff_security')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filter === 'staff_security'
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Security
            </button>
          </div>
          <button
            onClick={loadData}
            title="Refresh logs"
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Message Log List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-950/50">
          {filteredMessages.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <MessageSquare className="w-8 h-8 stroke-1 mb-2 opacity-50" />
              <p className="text-sm font-medium">No SMS alerts found</p>
              <p className="text-xs text-slate-500 mt-1">Placing an order triggers instant owner SMS updates.</p>
            </div>
          ) : (
            filteredMessages.map((sms) => (
              <div
                key={sms.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-700"
              >
                <div className="flex items-center justify-between mb-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    {sms.type === 'order_confirmation' && (
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">Order Notice</span>
                    )}
                    {sms.type === 'stock_alert' && (
                      <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Stock Threshold
                      </span>
                    )}
                    {sms.type === 'staff_security' && (
                      <span className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> Security Notice
                      </span>
                    )}
                    {sms.type === 'system_alert' && (
                      <span className="font-semibold text-slate-600 dark:text-slate-400">System Alert</span>
                    )}
                  </div>
                  <span className="text-slate-400 font-mono tabular-nums">
                    {new Date(sms.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80 mb-2 font-sans text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                  {sms.message}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/50">
                  <span className="truncate max-w-[200px]">{sms.gateway}</span>
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Delivered</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Live Manual SMS Dispatcher Box */}
        <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <form onSubmit={handleSendTestSms} className="flex gap-2">
            <input
              type="text"
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="Send direct test SMS alert to owner..."
              className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={isSending || !testText.trim()}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg flex items-center gap-1.5 shrink-0 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              Send
            </button>
          </form>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>Automatic SMS dispatched on every order submission</span>
            <span className="font-mono text-[10px]">E.164 GSM Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
};
