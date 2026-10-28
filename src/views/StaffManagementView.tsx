import React, { useState, useEffect } from 'react';
import {
  Shield,
  UserPlus,
  KeyRound,
  UserCheck,
  UserX,
  Lock,
  Mail,
  Phone,
  Clock,
  Search,
  CheckCircle2,
  X,
  AlertTriangle,
  History
} from 'lucide-react';
import { StaffMember, UserRole, AuditLog } from '../types';
import { ApexDB } from '../db/indexedDb';
import { useAuth } from '../context/AuthContext';
import { SmsNotifier } from '../services/smsService';
import { FirebaseSync } from '../services/firebaseSync';
import { formatIndianPhone } from '../utils/indianPhone';

export const StaffManagementView: React.FC = () => {
  const { currentUser, refreshStaff } = useAuth();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [selectedStaffForReset, setSelectedStaffForReset] = useState<StaffMember | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [temporaryPassNotice, setTemporaryPassNotice] = useState<string | null>(null);

  // New staff form state
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '+91 ',
    role: 'salesman' as UserRole,
    initialPassword: ''
  });

  const loadData = async () => {
    const list = await ApexDB.getAll<StaffMember>('staff');
    const logs = await ApexDB.getAll<AuditLog>('auditLogs');
    setStaffList(list);
    setAuditLogs(
      logs
        .filter(
          (l) =>
            l.action.includes('STAFF') ||
            l.action.includes('LOGIN') ||
            l.action.includes('PASSWORD') ||
            l.action.includes('USER_')
        )
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    );
  };

  useEffect(() => {
    loadData();
    const unsub = ApexDB.subscribe((store) => {
      if (store === 'staff' || store === 'auditLogs') {
        loadData();
      }
    });
    return unsub;
  }, []);

  // Active / Inactive Toggle (Kill Switch)
  const handleToggleStatus = async (staff: StaffMember) => {
    if (staff.id === currentUser.id) {
      alert('Security Protection: You cannot deactivate your own active Administrator session.');
      return;
    }

    const updatedStatus = !staff.active;
    const updatedStaff: StaffMember = {
      ...staff,
      active: updatedStatus
    };

    await ApexDB.put('staff', updatedStaff);

    const actionText = updatedStatus ? 'STAFF_ACTIVATED' : 'STAFF_DEACTIVATED';
    const detailMsg = `Employee access for ${staff.name} (${staff.role.toUpperCase()}) was set to ${
      updatedStatus ? 'ACTIVE' : 'INACTIVE (DISABLED)'
    }.`;

    await ApexDB.addAuditLog({
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: actionText,
      targetEntity: staff.name,
      details: detailMsg
    });

    // Send owner SMS security alert if deactivated
    if (!updatedStatus) {
      await SmsNotifier.sendSecurityAlertSms('Employee Access Revoked', detailMsg);
    }

    FirebaseSync.triggerSync().catch(() => {});
    await refreshStaff();
    await loadData();
  };

  // Add New Staff Account
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      alert('Name and Email are required.');
      return;
    }

    const newStaff: StaffMember = {
      id: `staff-${form.role.slice(0, 3)}-${Date.now()}`,
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: formatIndianPhone(form.phone) || '+91 98765 43210',
      role: form.role,
      active: true,
      lastLoginAt: 'Never logged in',
      createdAt: new Date().toISOString(),
      tempPassword: form.initialPassword || 'ApexPass2026!'
    };

    await ApexDB.put('staff', newStaff);

    await ApexDB.addAuditLog({
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'STAFF_ACCOUNT_CREATED',
      targetEntity: newStaff.name,
      details: `Provisioned new ${newStaff.role.toUpperCase()} account for ${newStaff.email}`
    });

    // Send SMS security notice to owner
    await SmsNotifier.sendSecurityAlertSms(
      'New Staff Account Provisioned',
      `${newStaff.name} added as ${newStaff.role.toUpperCase()}`
    );

    FirebaseSync.triggerSync().catch(() => {});
    setAddModalOpen(false);
    setForm({
      name: '',
      email: '',
      phone: '+1 (555) ',
      role: 'salesman',
      initialPassword: ''
    });
    await refreshStaff();
    await loadData();
  };

  // Password Reset Directly from Admin Panel
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffForReset || !newPassword.trim()) {
      alert('Please specify a new temporary password.');
      return;
    }

    const updated: StaffMember = {
      ...selectedStaffForReset,
      tempPassword: newPassword.trim()
    };

    await ApexDB.put('staff', updated);

    await ApexDB.addAuditLog({
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'STAFF_PASSWORD_RESET',
      targetEntity: selectedStaffForReset.name,
      details: `Administrator performed credential reset for account ${selectedStaffForReset.email}`
    });

    await SmsNotifier.sendSecurityAlertSms(
      'Staff Credential Reset',
      `Password reset performed for ${selectedStaffForReset.name} (${selectedStaffForReset.email})`
    );

    setTemporaryPassNotice(`New credential issued for ${selectedStaffForReset.name}: "${newPassword.trim()}"`);
    setResetModalOpen(false);
    setNewPassword('');
    setSelectedStaffForReset(null);
    await loadData();
  };

  const filteredStaff = staffList.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || s.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 uppercase">
              Admin Exclusive
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Staff Management & Security Console
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            2-Tier / 3-Level Role-Based Access Control, credential lifecycle, and live kill-switch controls.
          </p>
        </div>

        <button
          onClick={() => setAddModalOpen(true)}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          Add Staff Account
        </button>
      </div>

      {/* Temporary Password Notice */}
      {temporaryPassNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{temporaryPassNotice}</span>
          </div>
          <button
            onClick={() => setTemporaryPassNotice(null)}
            className="text-emerald-600 hover:text-emerald-800 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search and Role Filter */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search staff by employee name, internal email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          {['all', 'admin', 'manager', 'salesman'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-2 rounded-lg font-medium capitalize transition-colors ${
                roleFilter === r
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {r === 'all' ? 'All Roles' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Role Tier</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">Status & Kill-Switch</th>
                <th className="py-3 px-4">Last Activity</th>
                <th className="py-3 px-4 text-right">Security Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStaff.map((staff) => {
                const roleBadge = {
                  admin: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
                  manager: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
                  salesman: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                }[staff.role];

                return (
                  <tr key={staff.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs uppercase">
                          {staff.name.slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            {staff.name}
                            {staff.id === currentUser.id && (
                              <span className="text-[10px] text-slate-400 font-normal">(You)</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">{staff.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold uppercase border ${roleBadge}`}>
                        {staff.role}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                      {staff.phone}
                    </td>

                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleStatus(staff)}
                        disabled={staff.id === currentUser.id}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                          staff.active
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                        } ${staff.id === currentUser.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        title={staff.id === currentUser.id ? 'Cannot deactivate yourself' : 'Toggle account access'}
                      >
                        {staff.active ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                        <span>{staff.active ? 'Active' : 'Disabled (Revoked)'}</span>
                      </button>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                      {staff.lastLoginAt.includes('T')
                        ? new Date(staff.lastLoginAt).toLocaleString()
                        : staff.lastLoginAt}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedStaffForReset(staff);
                          setNewPassword(`TempPass${Math.floor(100 + Math.random() * 900)}!`);
                          setResetModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 transition-colors"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
                        Reset Password
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff Audit Trail Stream */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Staff Security & Authentication Audit Log
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">{auditLogs.length} events logged</span>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {auditLogs.slice(0, 15).map((log) => (
            <div
              key={log.id}
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {log.action}
                </span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{log.details}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 shrink-0 font-mono">
                <span>By: {log.actorName}</span>
                <span>·</span>
                <span className="tabular-nums">{new Date(log.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Staff Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateStaff}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Provision New Staff Account</h3>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Liam Gallagher"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Work Email *</label>
                <input
                  type="email"
                  required
                  placeholder="name@apexerp.internal"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">Phone</label>
                  <span className="text-[10px] font-mono text-indigo-600 font-bold">+91 Format</span>
                </div>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: formatIndianPhone(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Designated Role *</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { r: 'salesman', desc: 'Order Entry Only' },
                  { r: 'manager', desc: 'Catalog & Orders' },
                  { r: 'admin', desc: 'Full Security' }
                ].map(({ r, desc }) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm({ ...form, role: r as UserRole })}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      form.role === r
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="capitalize">{r}</div>
                    <div className="text-[9px] text-slate-400 font-normal">{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Initial Access Password
              </label>
              <input
                type="text"
                placeholder="Default: ApexPass2026!"
                value={form.initialPassword}
                onChange={(e) => setForm({ ...form, initialPassword: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Create Account
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModalOpen && selectedStaffForReset && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleResetPassword}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4"
          >
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Direct Password Reset</h3>
            </div>

            <p className="text-xs text-slate-500">
              Reset login credentials for <strong>{selectedStaffForReset.name}</strong> ({selectedStaffForReset.email}).
            </p>

            <div className="text-xs">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                New Temporary Password *
              </label>
              <input
                type="text"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-slate-900 dark:text-slate-100 font-bold"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Update Password
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
