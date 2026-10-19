import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Edit2,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  X,
  CreditCard,
  CheckCircle,
  AlertTriangle,
  Download,
  Upload,
  CheckCircle2
} from 'lucide-react';
import { Customer } from '../types';
import { ApexDB } from '../db/indexedDb';
import { useAuth } from '../context/AuthContext';
import { FirebaseSync } from '../services/firebaseSync';
import { downloadCustomerTemplate, parseCustomerCsv } from '../services/exportService';

export const CustomerMasterView: React.FC = () => {
  const { currentUser } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Payment Recording Modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);

  const [form, setForm] = useState({
    code: '',
    name: '',
    company: '',
    phone: '',
    email: '',
    address: '',
    location: 'Financial District',
    creditLimit: 20000,
    outstandingBalance: 0,
    active: true
  });

  const loadCustomers = async () => {
    const list = await ApexDB.getAll<Customer>('customers');
    setCustomers(list);
  };

  useEffect(() => {
    loadCustomers();
    const unsub = ApexDB.subscribe((store) => {
      if (store === 'customers') {
        loadCustomers();
      }
    });
    return unsub;
  }, []);

  const availableLocations = Array.from(new Set(customers.map((c) => c.location).filter(Boolean)));

  const openAddCustomer = () => {
    setEditingCustomer(null);
    setForm({
      code: `CUST-08${Math.floor(10 + Math.random() * 89)}`,
      name: '',
      company: '',
      phone: '+1 (555) ',
      email: '',
      address: '',
      location: availableLocations[0] || 'Financial District',
      creditLimit: 25000,
      outstandingBalance: 0,
      active: true
    });
    setCustomerModalOpen(true);
  };

  const openEditCustomer = (cust: Customer) => {
    setEditingCustomer(cust);
    setForm({
      code: cust.code,
      name: cust.name,
      company: cust.company,
      phone: cust.phone,
      email: cust.email,
      address: cust.address,
      location: cust.location || 'Financial District',
      creditLimit: cust.creditLimit,
      outstandingBalance: cust.outstandingBalance,
      active: cust.active
    });
    setCustomerModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.company.trim()) {
      alert('Name and Company are required.');
      return;
    }

    const saved: Customer = {
      id: editingCustomer ? editingCustomer.id : `cust-${Date.now()}`,
      code: form.code.trim(),
      name: form.name.trim(),
      company: form.company.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      location: form.location.trim() || 'Financial District',
      creditLimit: Number(form.creditLimit) || 10000,
      outstandingBalance: Number(form.outstandingBalance) || 0,
      active: form.active,
      createdAt: editingCustomer ? editingCustomer.createdAt : new Date().toISOString()
    };

    await ApexDB.put('customers', saved);
    await ApexDB.addAuditLog({
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: editingCustomer ? 'CUSTOMER_UPDATE' : 'CUSTOMER_CREATE',
      targetEntity: saved.code,
      details: `${editingCustomer ? 'Updated' : 'Created'} client ${saved.name} (${saved.company}) in ${saved.location}`
    });

    FirebaseSync.triggerSync().catch(() => {});
    setCustomerModalOpen(false);
    await loadCustomers();
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentCustomer || paymentAmount <= 0) return;

    const newBalance = Math.max(0, paymentCustomer.outstandingBalance - paymentAmount);
    const updated: Customer = {
      ...paymentCustomer,
      outstandingBalance: newBalance
    };

    await ApexDB.put('customers', updated);
    await ApexDB.addAuditLog({
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'PAYMENT_RECEIPT',
      targetEntity: paymentCustomer.code,
      details: `Payment receipt recorded for $${paymentAmount.toFixed(2)}. New ledger balance: $${newBalance.toFixed(2)}`
    });

    FirebaseSync.triggerSync().catch(() => {});
    setPaymentModalOpen(false);
    setPaymentAmount(0);
    setPaymentCustomer(null);
    await loadCustomers();
  };

  // CSV Import for Customers
  const handleCustomerImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        const { customers: parsed, errors } = parseCustomerCsv(text);
        if (errors.length > 0 && parsed.length === 0) {
          alert(`Customer import errors:\n${errors.join('\n')}`);
          return;
        }

        let count = 0;
        for (const c of parsed) {
          if (c.name && c.company) {
            const full: Customer = {
              id: `cust-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              code: c.code || `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
              name: c.name,
              company: c.company,
              phone: c.phone || '',
              email: c.email || '',
              address: c.address || '',
              location: c.location || 'Financial District',
              creditLimit: c.creditLimit || 20000,
              outstandingBalance: c.outstandingBalance || 0,
              active: true,
              createdAt: new Date().toISOString()
            };
            await ApexDB.put('customers', full);
            count++;
          }
        }

        setImportStatus(`Successfully imported ${count} customer accounts!`);
        setTimeout(() => setImportStatus(null), 4000);
        await loadCustomers();
      }
    };
    reader.readAsText(file);
  };

  const filteredCustomers = customers.filter((c) => {
    const s = search.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(s) ||
      c.company.toLowerCase().includes(s) ||
      c.code.toLowerCase().includes(s) ||
      c.phone.toLowerCase().includes(s) ||
      (c.location && c.location.toLowerCase().includes(s));

    const matchesLocation = locationFilter === 'all' || c.location === locationFilter;
    return matchesSearch && matchesLocation;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Customer Master & Geographic Accounts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Wholesale accounts, location routing, credit lines, and CSV customer import.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={downloadCustomerTemplate}
            className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Customer Template
          </button>

          <label className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shadow-xs cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-indigo-600" />
            Import Customers CSV
            <input type="file" accept=".csv" onChange={handleCustomerImport} className="hidden" />
          </label>

          <button
            onClick={openAddCustomer}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        </div>
      </div>

      {importStatus && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{importStatus}</span>
        </div>
      )}

      {/* Search & Location Filter */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name, company, account code, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-medium"
          >
            <option value="all">All Locations ({customers.length})</option>
            {availableLocations.map((loc) => (
              <option key={loc} value={loc}>
                {loc} ({customers.filter((c) => c.location === loc).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* High Density Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Account Code</th>
                <th className="py-3 px-4">Customer & Company</th>
                <th className="py-3 px-4">Geographic Area</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4 text-right">Credit Limit</th>
                <th className="py-3 px-4 text-right">Outstanding Balance</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCustomers.map((c) => {
                const nearLimit = c.outstandingBalance > c.creditLimit * 0.9;
                return (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {c.code}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{c.name}</div>
                      <div className="text-[11px] text-slate-400">{c.company}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                        {c.location || 'General Zone'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-slate-600 dark:text-slate-300">{c.phone}</div>
                      <div className="text-[11px] text-slate-400">{c.email}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                      ${c.creditLimit.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded text-[11px] tabular-nums ${
                          nearLimit
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {nearLimit && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                        ${c.outstandingBalance.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setPaymentCustomer(c);
                            setPaymentAmount(Math.min(c.outstandingBalance, 500));
                            setPaymentModalOpen(true);
                          }}
                          className="px-2 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-colors"
                          title="Record payment receipt"
                        >
                          Receive Payment
                        </button>
                        <button
                          onClick={() => openEditCustomer(c)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Edit details"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Modal */}
      {customerModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveCustomer}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {editingCustomer ? 'Edit Customer Account' : 'Register Customer Account'}
              </h3>
              <button
                type="button"
                onClick={() => setCustomerModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Account Code *</label>
                <input
                  type="text"
                  required
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Company / Entity *</label>
                <input
                  type="text"
                  required
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Contact Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Geographic Area / City *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Financial District, Harbour Bay"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Delivery Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Credit Limit ($)</label>
                <input
                  type="number"
                  value={form.creditLimit}
                  onChange={(e) => setForm({ ...form, creditLimit: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Outstanding Balance ($)</label>
                <input
                  type="number"
                  value={form.outstandingBalance}
                  onChange={(e) => setForm({ ...form, outstandingBalance: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCustomerModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Save Account
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Receive Payment Modal */}
      {paymentModalOpen && paymentCustomer && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleRecordPayment}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4"
          >
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Record Payment</h3>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs">
              <div className="font-bold text-slate-900 dark:text-white">{paymentCustomer.name}</div>
              <div className="text-slate-500">{paymentCustomer.company} · {paymentCustomer.location}</div>
              <div className="mt-1 font-mono text-slate-700 dark:text-slate-300 font-bold">
                Current Outstanding: ${paymentCustomer.outstandingBalance.toLocaleString()}
              </div>
            </div>

            <div className="text-xs">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Amount Received ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-slate-900 dark:text-slate-100 font-bold"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Record Receipt
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
