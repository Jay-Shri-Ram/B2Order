import React, { useState } from 'react';
import { Shield, ShoppingCart, UserCheck, Lock, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { signInWithGoogleSheets } from '../services/googleSheetsService';

interface LoginViewProps {
  onLoginSuccess: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const { allStaff, switchUser, login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>('salesman');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const staffForRole = allStaff.filter((s) => s.role === selectedRole && s.active);
  const defaultStaff = staffForRole[0] || allStaff[0];
  const [selectedStaffId, setSelectedStaffId] = useState(defaultStaff?.id || '');

  const handleRoleTabChange = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage(null);
    setPassword('');
    const matching = allStaff.filter((s) => s.role === role && s.active);
    if (matching.length > 0) {
      setSelectedStaffId(matching[0].id);
    }
  };

  const handleFormLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const staff = allStaff.find((s) => s.id === selectedStaffId);
      if (!staff) {
        setErrorMessage('Please select a valid staff member account.');
        return;
      }

      if (selectedRole === 'admin') {
        if (!password.trim()) {
          setErrorMessage('Admin access requires the 6-character Master Password (Default: APEX99).');
          return;
        }
      }

      const res = await login(staff.email, password, selectedRole);
      if (res.success) {
        onLoginSuccess();
      } else {
        setErrorMessage(res.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectDemoLogin = async (role: UserRole) => {
    const staff = allStaff.find((s) => s.role === role && s.active);
    if (staff) {
      await switchUser(staff.id);
      onLoginSuccess();
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setErrorMessage(null);
    try {
      const res = await signInWithGoogleSheets();
      if (res?.user) {
        // Authenticate as Admin with Google
        const adminStaff = allStaff.find((s) => s.role === 'admin') || allStaff[0];
        await switchUser(adminStaff.id);
        onLoginSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Google Workspace sign-in was cancelled or encountered an error.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans transition-colors duration-200">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-xl shadow-lg mb-3">
          ▲
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Apex B2B Order Hub & ERP
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Enterprise Wholesale Portal · Offline-First Sync · Multi-Role Security
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          {/* Role-wise Selector Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
              Select Role Portal
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => handleRoleTabChange('salesman')}
                className={`py-2 rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${
                  selectedRole === 'salesman'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Salesman</span>
              </button>
              <button
                type="button"
                onClick={() => handleRoleTabChange('manager')}
                className={`py-2 rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${
                  selectedRole === 'manager'
                    ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Manager</span>
              </button>
              <button
                type="button"
                onClick={() => handleRoleTabChange('admin')}
                className={`py-2 rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${
                  selectedRole === 'admin'
                    ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Admin</span>
              </button>
            </div>
          </div>

          {/* Error Notice */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleFormLogin} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select {selectedRole.toUpperCase()} Account
              </label>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                {staffForRole.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name} ({staff.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  {selectedRole === 'admin' ? '6-Character Admin Master Password *' : 'Password / Access PIN'}
                </label>
                {selectedRole === 'admin' && (
                  <span className="font-mono text-[10px] text-slate-400">Default: APEX99</span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="password"
                  placeholder={selectedRole === 'admin' ? 'Enter 6-character password (APEX99)' : 'Enter PIN or password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono tracking-wider focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-md flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <span>Sign In to {selectedRole.toUpperCase()} Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            <span className="flex-shrink mx-3 text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Or Use Google Workspace
            </span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
          </div>

          {/* Official Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 font-semibold text-xs shadow-xs transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            <span>{googleLoading ? 'Connecting to Google...' : 'Sign in with Google (Sheets & Drive)'}</span>
          </button>

          {/* Quick Demo One-Click Access */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="block text-[11px] font-semibold text-slate-400 text-center mb-2">
              Instant 1-Click Role Testing (Bypass for Testing):
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDirectDemoLogin('salesman')}
                className="py-1.5 px-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold text-center transition-colors"
              >
                Demo Salesman
              </button>
              <button
                type="button"
                onClick={() => handleDirectDemoLogin('manager')}
                className="py-1.5 px-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-700 dark:text-amber-300 text-[11px] font-bold text-center transition-colors"
              >
                Demo Manager
              </button>
              <button
                type="button"
                onClick={() => handleDirectDemoLogin('admin')}
                className="py-1.5 px-2 rounded-lg bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-[11px] font-bold text-center transition-colors"
              >
                Demo Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
