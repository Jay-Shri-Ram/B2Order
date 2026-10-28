import React, { useState } from 'react';
import {
  Shield,
  ShoppingCart,
  UserCheck,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  LogIn,
  Mail,
  Phone,
  User,
  MapPin,
  KeyRound,
  Eye,
  EyeOff,
  Building2,
  HelpCircle,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { signInWithGoogleSheets } from '../services/googleSheetsService';
import { formatIndianPhone, isValidIndianPhone } from '../utils/indianPhone';

interface LoginViewProps {
  onLoginSuccess: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const { allStaff, switchUser, firebaseLogin, firebaseSignUp, resetPassword, companyName } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot'>('login');

  // Sign In form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRoleTab, setSelectedRoleTab] = useState<UserRole>('salesman');

  // Sign Up form state
  const [signupForm, setSignupForm] = useState({
    companyName: 'Apex B2B Order Hub',
    ownerName: '',
    mobileNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'salesman' as UserRole,
    location: 'Downtown District',
    adminMasterKey: ''
  });

  // Forgot password form state
  const [forgotEmail, setForgotEmail] = useState('');

  // UI feedback states
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Handle phone change with Indian format
  const handlePhoneChange = (val: string) => {
    const formatted = formatIndianPhone(val);
    setSignupForm((prev) => ({ ...prev, mobileNumber: formatted }));
  };

  // Sign In Handler
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setErrorMessage('Please enter both Email and Password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await firebaseLogin(loginEmail, loginPassword);
      if (res.success) {
        setSuccessMessage(res.message);
        setTimeout(() => onLoginSuccess(), 400);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication error.');
    } finally {
      setIsLoading(false);
    }
  };

  // Sign Up Handler
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!signupForm.companyName.trim()) {
      setErrorMessage('Company Name is required.');
      return;
    }
    if (!signupForm.ownerName.trim()) {
      setErrorMessage('Owner / Contact Name is required.');
      return;
    }
    if (!isValidIndianPhone(signupForm.mobileNumber)) {
      setErrorMessage('Please enter a valid 10-digit Indian Mobile Number (+91 XXXXX XXXXX).');
      return;
    }
    if (!signupForm.email.trim() || !signupForm.email.includes('@')) {
      setErrorMessage('Valid email address is required.');
      return;
    }
    if (signupForm.password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (signupForm.password !== signupForm.confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await firebaseSignUp({
        companyName: signupForm.companyName,
        ownerName: signupForm.ownerName,
        mobileNumber: signupForm.mobileNumber,
        email: signupForm.email,
        password: signupForm.password,
        role: signupForm.role,
        location: signupForm.location,
        adminMasterKey: signupForm.adminMasterKey
      });

      if (res.success) {
        setSuccessMessage(res.message);
        setTimeout(() => onLoginSuccess(), 700);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot Password Handler
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!forgotEmail.trim() || !forgotEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await resetPassword(forgotEmail);
      if (res.success) {
        setSuccessMessage(res.message);
      } else {
        setErrorMessage(res.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Quick 1-Click Demo Logins
  const handleDemoLogin = async (role: UserRole) => {
    const staff = allStaff.find((s) => s.role === role && s.active) || allStaff[0];
    if (staff) {
      await switchUser(staff.id);
      onLoginSuccess();
    }
  };

  // Google Workspace Sign-In
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setErrorMessage(null);
    try {
      const res = await signInWithGoogleSheets();
      if (res?.user) {
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      {/* Background Glow Effect */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header & Logo */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white font-black text-2xl shadow-xl shadow-indigo-500/25 mb-3 border border-indigo-400/30">
          ▲
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center justify-center gap-2">
          <span>{companyName || 'Apex B2B Order Hub'}</span>
        </h1>
        <p className="mt-1.5 text-xs text-slate-400 font-mono tracking-wide">
          Firebase Cloud Auth · Indian Standard (+91) · Enterprise ERP
        </p>

        {/* Mode Switcher Tabs */}
        {authMode !== 'forgot' && (
          <div className="mt-6 flex items-center justify-center">
            <div className="inline-flex p-1 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs font-bold shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`px-6 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                  authMode === 'login'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`px-6 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                  authMode === 'signup'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Register Company</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Form Container */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800/80 bg-slate-900/80 backdrop-blur-xl space-y-5">
          {/* Status Notices */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-xs text-rose-300 flex items-center gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-xs text-emerald-300 flex items-center gap-2.5 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 1: SIGN IN */}
          {/* ========================================================================= */}
          {authMode === 'login' && (
            <form onSubmit={handleSignIn} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950/80 text-white placeholder-slate-500 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-semibold text-slate-300">
                    Password *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('forgot');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                      setForgotEmail(loginEmail);
                    }}
                    className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter account password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-700 bg-slate-950/80 text-white placeholder-slate-500 font-mono tracking-wider focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to {companyName}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Quick Demo 1-Click Role Accounts */}
              <div className="pt-3 border-t border-slate-800">
                <span className="block text-[11px] font-semibold text-slate-400 text-center mb-2">
                  Or Instant 1-Click Role Test:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDemoLogin('salesman')}
                    className="py-1.5 px-2 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-800/40 text-[11px] font-bold text-center transition-colors"
                  >
                    Salesman
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDemoLogin('manager')}
                    className="py-1.5 px-2 rounded-lg bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-800/40 text-[11px] font-bold text-center transition-colors"
                  >
                    Manager
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDemoLogin('admin')}
                    className="py-1.5 px-2 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-[11px] font-bold text-center transition-colors"
                  >
                    Admin
                  </button>
                </div>
              </div>

              {/* Google Workspace */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-950/60 hover:bg-slate-800 text-slate-300 font-semibold text-xs transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>{googleLoading ? 'Connecting to Google...' : 'Sign in with Google'}</span>
              </button>
            </form>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: SIGN UP / REGISTER COMPANY */}
          {/* ========================================================================= */}
          {authMode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-3.5 text-xs">
              {/* Company Name */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Company Name (Header Display) *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex B2B Traders Pvt Ltd"
                    value={signupForm.companyName}
                    onChange={(e) => setSignupForm({ ...signupForm, companyName: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950/80 text-white placeholder-slate-500 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Owner Name */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Owner / Representative Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ashu Chauhan"
                    value={signupForm.ownerName}
                    onChange={(e) => setSignupForm({ ...signupForm, ownerName: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950/80 text-white placeholder-slate-500 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Indian Mobile Number */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-300">
                    Mobile Number (Indian Format) *
                  </label>
                  <span className="font-mono text-[10px] text-indigo-400 font-bold">+91 Indian Standard</span>
                </div>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={signupForm.mobileNumber}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950/80 text-white placeholder-slate-500 font-mono tracking-wider focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Format: 10 digits starting with 6, 7, 8, or 9 (auto-formatted to +91 XXXXX XXXXX)
                </p>
              </div>

              {/* Email Address */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Email Address (Firebase Login) *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="owner@company.com"
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950/80 text-white placeholder-slate-500 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Account Role *
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setSignupForm({ ...signupForm, role: 'salesman' })}
                    className={`py-1.5 rounded-lg transition-all ${
                      signupForm.role === 'salesman'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400'
                    }`}
                  >
                    Salesman
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignupForm({ ...signupForm, role: 'manager' })}
                    className={`py-1.5 rounded-lg transition-all ${
                      signupForm.role === 'manager'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-400'
                    }`}
                  >
                    Manager
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignupForm({ ...signupForm, role: 'admin' })}
                    className={`py-1.5 rounded-lg transition-all ${
                      signupForm.role === 'admin'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-400'
                    }`}
                  >
                    Admin
                  </button>
                </div>
              </div>

              {/* Passwords */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Password (Min. 6) *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="Min. 6 chars"
                      value={signupForm.password}
                      onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-700 bg-slate-950/80 text-white font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="Re-enter password"
                      value={signupForm.confirmPassword}
                      onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-700 bg-slate-950/80 text-white font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Admin Master Key if admin selected */}
              {signupForm.role === 'admin' && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 space-y-1">
                  <div className="flex items-center gap-1.5 text-rose-300 font-bold">
                    <KeyRound className="w-3.5 h-3.5 text-rose-400" />
                    <span>Admin Master Security Key Required</span>
                  </div>
                  <input
                    type="password"
                    placeholder="Enter Security PIN (Default: APEX99 or 1234)"
                    value={signupForm.adminMasterKey}
                    onChange={(e) => setSignupForm({ ...signupForm, adminMasterKey: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-rose-800 bg-slate-950 text-white font-mono text-xs focus:ring-1 focus:ring-rose-500 focus:outline-hidden"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Registering with Firebase...</span>
                  </>
                ) : (
                  <>
                    <span>Create Company Account & Login</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: FORGOT PASSWORD */}
          {/* ========================================================================= */}
          {authMode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4 text-xs">
              <div className="text-center space-y-1">
                <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-2 border border-indigo-500/20">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Reset Account Password</h3>
                <p className="text-slate-400 text-xs">
                  Enter your registered email address to receive a secure Firebase password reset link.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Registered Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="owner@company.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950/80 text-white placeholder-slate-500 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-500 shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  <>
                    <span>Send Password Reset Link</span>
                    <Mail className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="w-full py-2 text-center text-xs text-slate-400 hover:text-white font-semibold transition-colors"
              >
                ← Back to Primary Sign In
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
