import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  Layers,
  Box,
  X,
  Upload,
  Download,
  CheckCircle2
} from 'lucide-react';
import { Product, Category, Unit } from '../types';
import { ApexDB } from '../db/indexedDb';
import { useAuth } from '../context/AuthContext';
import { SmsNotifier } from '../services/smsService';
import { FirebaseSync } from '../services/firebaseSync';
import {
  downloadProductTemplate,
  downloadCategoryTemplate,
  parseProductCsv,
  parseCategoryCsv
} from '../services/exportService';

export const CatalogMasterView: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'units'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Modals
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Product Form State
  const [prodForm, setProdForm] = useState({
    sku: '',
    name: '',
    categoryId: '',
    unitId: '',
    wholesalePrice: 0,
    costPrice: 0,
    stockQuantity: 0,
    minStockAlert: 10,
    active: true
  });

  const loadAll = async () => {
    const prods = await ApexDB.getAll<Product>('products');
    const cats = await ApexDB.getAll<Category>('categories');
    const u = await ApexDB.getAll<Unit>('units');
    setProducts(prods);
    setCategories(cats);
    setUnits(u);
  };

  useEffect(() => {
    loadAll();
    const unsub = ApexDB.subscribe((store) => {
      if (store === 'products' || store === 'categories' || store === 'units') {
        loadAll();
      }
    });
    return unsub;
  }, []);

  const openAddProduct = () => {
    setEditingProduct(null);
    setProdForm({
      sku: `APX-PROD-${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      categoryId: categories[0]?.id || '',
      unitId: units[0]?.id || '',
      wholesalePrice: 50,
      costPrice: 30,
      stockQuantity: 25,
      minStockAlert: 10,
      active: true
    });
    setProductModalOpen(true);
  };

  const openEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setProdForm({
      sku: prod.sku,
      name: prod.name,
      categoryId: prod.categoryId,
      unitId: prod.unitId,
      wholesalePrice: prod.wholesalePrice,
      costPrice: prod.costPrice,
      stockQuantity: prod.stockQuantity,
      minStockAlert: prod.minStockAlert,
      active: prod.active
    });
    setProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodForm.name.trim() || !prodForm.sku.trim()) {
      alert('SKU and Product Name are required.');
      return;
    }

    const cat = categories.find((c) => c.id === prodForm.categoryId);
    const unt = units.find((u) => u.id === prodForm.unitId);

    const savedProduct: Product = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      sku: prodForm.sku.trim(),
      name: prodForm.name.trim(),
      categoryId: prodForm.categoryId,
      categoryName: cat ? cat.name : 'General',
      unitId: prodForm.unitId,
      unitName: unt ? unt.name : 'Standard Unit',
      wholesalePrice: Number(prodForm.wholesalePrice) || 0,
      costPrice: Number(prodForm.costPrice) || 0,
      stockQuantity: Number(prodForm.stockQuantity) || 0,
      minStockAlert: Number(prodForm.minStockAlert) || 5,
      active: prodForm.active,
      updatedAt: new Date().toISOString()
    };

    await ApexDB.put('products', savedProduct);

    if (savedProduct.stockQuantity <= savedProduct.minStockAlert) {
      await SmsNotifier.sendStockAlertSms(savedProduct);
    }

    await ApexDB.addAuditLog({
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: editingProduct ? 'PRODUCT_UPDATE' : 'PRODUCT_CREATE',
      targetEntity: savedProduct.sku,
      details: `${editingProduct ? 'Updated' : 'Created'} product "${savedProduct.name}". Stock: ${savedProduct.stockQuantity}`
    });

    FirebaseSync.triggerSync().catch(() => {});
    setProductModalOpen(false);
    await loadAll();
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to deactivate or remove "${name}" from the active catalog?`)) return;
    await ApexDB.delete('products', id);
    await ApexDB.addAuditLog({
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'PRODUCT_DELETE',
      targetEntity: id,
      details: `Removed product: ${name}`
    });
    await loadAll();
  };

  // CSV Import for Products
  const handleProductImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        const { products: parsed, errors } = parseProductCsv(text, categories);
        if (errors.length > 0 && parsed.length === 0) {
          alert(`Import errors:\n${errors.join('\n')}`);
          return;
        }

        let importedCount = 0;
        for (const item of parsed) {
          if (item.sku && item.name) {
            const full: Product = {
              id: `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              sku: item.sku,
              name: item.name,
              categoryId: item.categoryId || categories[0]?.id || 'cat-gen',
              categoryName: item.categoryName || 'General',
              unitId: 'unit-ea',
              unitName: item.unitName || 'Standard Unit',
              wholesalePrice: item.wholesalePrice || 0,
              costPrice: item.costPrice || 0,
              stockQuantity: item.stockQuantity || 0,
              minStockAlert: item.minStockAlert || 5,
              active: true,
              updatedAt: new Date().toISOString()
            };
            await ApexDB.put('products', full);
            importedCount++;
          }
        }

        setImportStatus(`Successfully imported ${importedCount} product SKUs into catalog!`);
        setTimeout(() => setImportStatus(null), 4000);
        await loadAll();
      }
    };
    reader.readAsText(file);
  };

  // CSV Import for Categories
  const handleCategoryImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        const { categories: parsed, errors } = parseCategoryCsv(text);
        if (errors.length > 0 && parsed.length === 0) {
          alert(`Category import errors:\n${errors.join('\n')}`);
          return;
        }

        let count = 0;
        for (const c of parsed) {
          if (c.name) {
            await ApexDB.put('categories', {
              id: `cat-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              name: c.name,
              code: c.code || c.name.slice(0, 3).toUpperCase()
            });
            count++;
          }
        }
        setImportStatus(`Imported ${count} new product categories!`);
        setTimeout(() => setImportStatus(null), 4000);
        await loadAll();
      }
    };
    reader.readAsText(file);
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchesStock = !filterLowStockOnly || p.stockQuantity <= p.minStockAlert;
    return matchesSearch && matchesCat && matchesStock;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Catalog & Inventory Master
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Enterprise wholesale product matrix, categories dropdown, and bulk CSV import/export.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === 'products' && (
            <>
              <button
                onClick={downloadProductTemplate}
                className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shadow-xs"
                title="Download CSV import template"
              >
                <Download className="w-3.5 h-3.5" />
                Download Template
              </button>

              <label className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shadow-xs cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                Import Products CSV
                <input type="file" accept=".csv" onChange={handleProductImport} className="hidden" />
              </label>

              <button
                onClick={openAddProduct}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>
            </>
          )}

          {activeTab === 'categories' && (
            <>
              <button
                onClick={downloadCategoryTemplate}
                className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                Category Template
              </button>

              <label className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shadow-xs cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                Import Categories CSV
                <input type="file" accept=".csv" onChange={handleCategoryImport} className="hidden" />
              </label>
            </>
          )}
        </div>
      </div>

      {importStatus && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{importStatus}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-semibold gap-4">
        <button
          onClick={() => setActiveTab('products')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'products'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Package className="w-4 h-4" />
          Product Catalog ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'categories'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          Category Master ({categories.length})
        </button>
        <button
          onClick={() => setActiveTab('units')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'units'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Box className="w-4 h-4" />
          Unit Master ({units.length})
        </button>
      </div>

      {/* Tab 1: Products */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          {/* Search & Categories Dropdown List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search products by SKU or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              {/* Category Dropdown List */}
              <div className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-medium"
                >
                  <option value="all">All Categories ({categories.length})</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
                className={`px-3 py-2 rounded-xl font-medium border flex items-center gap-1.5 transition-colors ${
                  filterLowStockOnly
                    ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Low Stock Only</span>
              </button>
            </div>
          </div>

          {/* High Density Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Packaging Unit</th>
                    <th className="py-3 px-4 text-right">Wholesale Price</th>
                    {isAdmin && <th className="py-3 px-4 text-right">Cost Price (Admin)</th>}
                    <th className="py-3 px-4 text-right">Stock Level</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredProducts.map((p) => {
                    const isLow = p.stockQuantity <= p.minStockAlert;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                          {p.sku}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {p.name}
                        </td>
                        <td className="py-3 px-4 text-slate-500">{p.categoryName}</td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{p.unitName}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                          ${p.wholesalePrice.toFixed(2)}
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-400">
                            ${p.costPrice.toFixed(2)}
                          </td>
                        )}
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded-md text-[11px] ${
                              isLow
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {isLow && <AlertTriangle className="w-3 h-3" />}
                            {p.stockQuantity}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditProduct(p)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Edit product"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id, p.name)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              title="Delete product"
                            >
                              <Trash2 className="w-4 h-4" />
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
        </div>
      )}

      {/* Tab 2: Categories */}
      {activeTab === 'categories' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Product Categories</h3>
              <p className="text-[11px] text-slate-400">Manage categories and bulk import via CSV</p>
            </div>
            <button
              onClick={() => {
                const name = prompt('Enter new category name:');
                if (name) {
                  const code = name.slice(0, 3).toUpperCase();
                  ApexDB.put('categories', { id: `cat-${Date.now()}`, name, code });
                  loadAll();
                }
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700"
            >
              + Add Category
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map((c) => (
              <div
                key={c.id}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white">{c.name}</div>
                  <div className="text-[10px] font-mono text-slate-400">Code: {c.code}</div>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {products.filter((p) => p.categoryId === c.id).length} products
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Units */}
      {activeTab === 'units' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Packaging Units & Multipliers</h3>
            <button
              onClick={() => {
                const name = prompt('Enter unit name:');
                const shortCode = prompt('Enter short code:') || 'UNIT';
                if (name) {
                  ApexDB.put('units', { id: `unit-${Date.now()}`, name, shortCode, multiplier: 1 });
                  loadAll();
                }
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700"
            >
              + Add Unit
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {units.map((u) => (
              <div
                key={u.id}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white">{u.name}</div>
                  <div className="text-[10px] font-mono text-slate-400">Code: {u.shortCode}</div>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {products.filter((p) => p.unitId === u.id).length} items
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveProduct}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {editingProduct ? 'Edit Product SKU' : 'Register New Product'}
              </h3>
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">SKU Code *</label>
                <input
                  type="text"
                  required
                  value={prodForm.sku}
                  onChange={(e) => setProdForm({ ...prodForm, sku: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                <select
                  value={prodForm.categoryId}
                  onChange={(e) => setProdForm({ ...prodForm, categoryId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-xs">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Product Description / Title *</label>
              <input
                type="text"
                required
                value={prodForm.name}
                onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Unit Specification</label>
                <select
                  value={prodForm.unitId}
                  onChange={(e) => setProdForm({ ...prodForm, unitId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                >
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Wholesale Price ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={prodForm.wholesalePrice}
                  onChange={(e) => setProdForm({ ...prodForm, wholesalePrice: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {isAdmin && (
              <div className="grid grid-cols-2 gap-3 text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cost Price ($) <span className="text-[10px] text-rose-500">(Admin Only)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={prodForm.costPrice}
                    onChange={(e) => setProdForm({ ...prodForm, costPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Unit Margin</label>
                  <div className="font-mono text-sm font-bold text-emerald-600 pt-1">
                    ${(prodForm.wholesalePrice - prodForm.costPrice).toFixed(2)}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Current Stock *</label>
                <input
                  type="number"
                  required
                  value={prodForm.stockQuantity}
                  onChange={(e) => setProdForm({ ...prodForm, stockQuantity: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Min. Alert Threshold</label>
                <input
                  type="number"
                  value={prodForm.minStockAlert}
                  onChange={(e) => setProdForm({ ...prodForm, minStockAlert: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Save Product
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
