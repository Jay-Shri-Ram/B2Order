import React, { useState, useEffect } from 'react';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Send,
  User,
  DollarSign,
  FileText,
  CreditCard,
  Building,
  Smartphone,
  ChevronRight,
  ShieldAlert,
  MapPin,
  Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Product, Customer, OrderItem, Order, Category } from '../types';
import { ApexDB } from '../db/indexedDb';
import { useAuth } from '../context/AuthContext';
import { SmsNotifier } from '../services/smsService';
import { FirebaseSync } from '../services/firebaseSync';

export const OrderEntryView: React.FC = () => {
  const { currentUser } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all'); // Location filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [discountRate, setDiscountRate] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Credit' | 'Bank Transfer'>('Credit');
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<Order | null>(null);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  const loadData = async () => {
    const prods = await ApexDB.getAll<Product>('products');
    const custs = await ApexDB.getAll<Customer>('customers');
    const cats = await ApexDB.getAll<Category>('categories');

    setProducts(prods.filter((p) => p.active));
    setCustomers(custs.filter((c) => c.active));
    setCategories(cats);

    if (custs.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(custs[0].id);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = ApexDB.subscribe((store) => {
      if (store === 'products' || store === 'customers' || store === 'categories') {
        loadData();
      }
    });
    return unsub;
  }, []);

  // Distinct locations from customers list
  const availableLocations = Array.from(new Set(customers.map((c) => c.location).filter(Boolean)));

  // Customers filtered depending on selected location
  const locationFilteredCustomers = customers.filter(
    (c) => selectedLocation === 'all' || c.location === selectedLocation
  );

  // If selected customer is no longer in the filtered list, pick the first one
  useEffect(() => {
    if (locationFilteredCustomers.length > 0) {
      const exists = locationFilteredCustomers.some((c) => c.id === selectedCustomerId);
      if (!exists) {
        setSelectedCustomerId(locationFilteredCustomers[0].id);
      }
    }
  }, [selectedLocation, locationFilteredCustomers]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Cart operations
  const addToCart = (product: Product) => {
    if (product.stockQuantity <= 0) return;

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stockQuantity) {
          alert(`Cannot add more than remaining stock (${product.stockQuantity} ${product.unitName})`);
          return prevCart;
        }
        return prevCart.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                totalPrice: (item.quantity + 1) * item.unitPrice
              }
            : item
        );
      } else {
        return [
          ...prevCart,
          {
            productId: product.id,
            sku: product.sku,
            name: product.name,
            unit: product.unitName,
            quantity: 1,
            unitPrice: product.wholesalePrice,
            costPrice: product.costPrice,
            totalPrice: product.wholesalePrice
          }
        ];
      }
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setCart((prevCart) => {
      return prevCart
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > product.stockQuantity) {
              alert(`Maximum stock available: ${product.stockQuantity}`);
              return item;
            }
            return {
              ...item,
              quantity: newQty,
              totalPrice: newQty * item.unitPrice
            };
          }
          return item;
        })
        .filter(Boolean) as OrderItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountRate(0);
    setOrderNotes('');
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.totalPrice, 0);
  const totalCost = cart.reduce((acc, item) => acc + item.costPrice * item.quantity, 0);
  const discountAmount = (subtotal * discountRate) / 100;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxRate = 8.5;
  const taxAmount = (taxableAmount * taxRate) / 100;
  const grandTotal = taxableAmount + taxAmount;
  const totalProfit = grandTotal - totalCost;

  // Credit limit calculation
  const isCreditNearLimit =
    selectedCustomer &&
    paymentMethod === 'Credit' &&
    selectedCustomer.outstandingBalance + grandTotal > selectedCustomer.creditLimit * 0.9;

  const isCreditExceeded =
    selectedCustomer &&
    paymentMethod === 'Credit' &&
    selectedCustomer.outstandingBalance + grandTotal > selectedCustomer.creditLimit;

  // Order Submission
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      alert('Please select a customer.');
      return;
    }
    if (cart.length === 0) {
      alert('Your cart is empty. Add products to submit order.');
      return;
    }
    if (isCreditExceeded) {
      const proceed = confirm(
        `Warning: This order exceeds ${selectedCustomer.name}'s credit limit ($${selectedCustomer.creditLimit.toLocaleString()}). Proceed with manager authorization?`
      );
      if (!proceed) return;
    }

    setIsSubmitting(true);
    try {
      const orderNumber = `ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const orderId = `ord-${Date.now()}`;

      const newOrder: Order = {
        id: orderId,
        orderNumber,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.phone,
        customerCompany: selectedCustomer.company,
        customerAddress: selectedCustomer.address,
        customerLocation: selectedCustomer.location,
        salesmanId: currentUser.id,
        salesmanName: currentUser.name,
        items: [...cart],
        subtotal,
        taxRate,
        taxAmount,
        discountRate,
        discountAmount,
        totalAmount: grandTotal,
        totalCost,
        totalProfit,
        status: 'Confirmed',
        paymentMethod,
        notes: orderNotes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        synced: false
      };

      await ApexDB.put('orders', newOrder);

      const lowStockAlerts: Product[] = [];
      for (const item of cart) {
        const prod = products.find((p) => p.id === item.productId);
        if (prod) {
          const updatedStock = Math.max(0, prod.stockQuantity - item.quantity);
          const updatedProd: Product = {
            ...prod,
            stockQuantity: updatedStock,
            updatedAt: new Date().toISOString()
          };
          await ApexDB.put('products', updatedProd);

          if (updatedStock <= prod.minStockAlert) {
            lowStockAlerts.push(updatedProd);
          }
        }
      }

      if (paymentMethod === 'Credit') {
        const updatedCustomer: Customer = {
          ...selectedCustomer,
          outstandingBalance: selectedCustomer.outstandingBalance + grandTotal
        };
        await ApexDB.put('customers', updatedCustomer);
      }

      await SmsNotifier.sendOrderConfirmationSms(newOrder, lowStockAlerts);

      await ApexDB.addAuditLog({
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        action: 'ORDER_DISPATCH',
        targetEntity: orderNumber,
        details: `Order created for ${selectedCustomer.name} (${selectedCustomer.company}) [${selectedCustomer.location}]. Total: $${grandTotal.toFixed(2)}. Owner SMS dispatched.`
      });

      FirebaseSync.triggerSync().catch(() => {});

      try {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 }
        });
      } catch (e) {}

      setOrderSuccess(newOrder);
      clearCart();
      setIsMobileCartOpen(false);
      await loadData();
    } catch (err: any) {
      alert(`Error submitting order: ${err.message || 'Failed'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Mobile-first Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Field Order Entry
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Geographic customer routing, rapid product search, categories dropdown & instant owner SMS dispatch.
          </p>
        </div>

        {/* Mobile Cart Floating Button */}
        <button
          onClick={() => setIsMobileCartOpen(true)}
          className="lg:hidden flex items-center justify-between px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs shadow-md"
        >
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            <span>Review Order ({cart.reduce((a, b) => a + b.quantity, 0)} items)</span>
          </div>
          <span className="font-mono tabular-nums font-bold">${grandTotal.toFixed(2)}</span>
        </button>
      </div>

      {/* Success Modal / Order Voucher */}
      {orderSuccess && (
        <div className="mb-6 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-200">
                Order Dispatched Successfully #{orderSuccess.orderNumber}
              </h3>
              <p className="text-xs text-emerald-800 dark:text-emerald-300/90 mt-1">
                Client: <span className="font-semibold">{orderSuccess.customerName}</span> · Area:{' '}
                <span className="font-semibold">{orderSuccess.customerLocation}</span> · Total:{' '}
                <span className="font-mono font-bold">${orderSuccess.totalAmount.toFixed(2)}</span>
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Instant SMS delivered to company owner mobile number</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOrderSuccess(null)}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              Start New Order
            </button>
          </div>
        </div>
      )}

      {/* Split Layout: Catalog (Left) vs Cart Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Product Catalog Selection */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-5">
          {/* Customer Selection Card with Location Routing */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Customer Account Selection (Location Dependent)
              </label>
              {selectedCustomer && (
                <span className="text-[11px] font-mono text-slate-500">
                  Code: {selectedCustomer.code}
                </span>
              )}
            </div>

            {/* Geographic Location Filter & Customer Dropdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Step 1: Location Filter */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                  Filter by Area / Location
                </label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="all">All Locations ({customers.length} Accounts)</option>
                  {availableLocations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc} ({customers.filter((c) => c.location === loc).length} clients)
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Customer Dropdown Dependent on Location */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-indigo-500" />
                  Select Customer Account ({locationFilteredCustomers.length})
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  {locationFilteredCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.company} ({c.location})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Customer Financial Profile Strip */}
            {selectedCustomer && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Location Zone</span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {selectedCustomer.location}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Outstanding Balance</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                    ${selectedCustomer.outstandingBalance.toLocaleString()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Credit Limit</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                    ${selectedCustomer.creditLimit.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* Credit Warnings */}
            {isCreditExceeded && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
                <span>
                  <strong>Credit Exceeded:</strong> Order total exceeds authorized line of credit.
                </span>
              </div>
            )}
            {isCreditNearLimit && !isCreditExceeded && (
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Customer is approaching credit threshold (&gt;90% utilized).</span>
              </div>
            )}
          </div>

          {/* Search & Categories Dropdown List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Product Search */}
              <div className="sm:col-span-7 relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search products by SKU or title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Category Dropdown List */}
              <div className="sm:col-span-5 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="all">All Categories ({products.length} SKUs)</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({products.filter((p) => p.categoryId === cat.id).length})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category Quick Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                All ({products.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredProducts.map((product) => {
              const inCart = cart.find((i) => i.productId === product.id);
              const isLowStock = product.stockQuantity <= product.minStockAlert;
              const isOutOfStock = product.stockQuantity <= 0;

              return (
                <div
                  key={product.id}
                  className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 transition-all flex flex-col justify-between ${
                    inCart
                      ? 'border-indigo-400 dark:border-indigo-600 shadow-sm ring-1 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-mono text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                        {product.sku}
                      </span>
                      <span
                        className={`text-[11px] font-medium font-mono px-2 py-0.5 rounded-full ${
                          isOutOfStock
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                            : isLowStock
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {isOutOfStock ? 'Out of Stock' : `${product.stockQuantity} in stock`}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                      {product.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">{product.unitName}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block leading-none">Wholesale</span>
                      <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
                        ${product.wholesalePrice.toFixed(2)}
                      </span>
                    </div>

                    {inCart ? (
                      <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button
                          onClick={() => updateQuantity(product.id, -1)}
                          className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-slate-200 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center text-xs font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                          {inCart.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(product.id, 1)}
                          className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(product)}
                        disabled={isOutOfStock}
                        className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add to Order
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Cart Summary Panel */}
        <div
          className={`lg:col-span-5 xl:col-span-4 fixed lg:sticky lg:top-20 inset-0 z-50 lg:z-auto bg-slate-900/60 lg:bg-transparent backdrop-blur-xs lg:backdrop-blur-none transition-opacity ${
            isMobileCartOpen ? 'flex justify-end' : 'hidden lg:block'
          }`}
          onClick={() => setIsMobileCartOpen(false)}
        >
          <div
            className="w-full max-w-md lg:max-w-none h-full lg:h-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none lg:rounded-2xl p-5 shadow-lg flex flex-col justify-between max-h-[calc(100vh-6rem)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Order Summary</h2>
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {cart.reduce((a, b) => a + b.quantity, 0)}
                  </span>
                </div>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-xs text-rose-500 hover:text-rose-600 font-medium"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="py-3 space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">
                    <p className="text-xs">No items added yet.</p>
                    <p className="text-[11px] text-slate-500 mt-1">Select products from the catalog to populate this ticket.</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.productId}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2"
                    >
                      <div className="truncate flex-1">
                        <div className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {item.quantity} × ${item.unitPrice.toFixed(2)} ({item.unit})
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900 dark:text-white tabular-nums">
                          ${item.totalPrice.toFixed(2)}
                        </span>
                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="p-1 rounded text-slate-400 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  {(['Credit', 'Cash', 'Bank Transfer'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`py-1.5 px-2 rounded-lg font-medium border text-center transition-colors ${
                        paymentMethod === method
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Wholesale Discount:</span>
                  <div className="flex items-center gap-1.5">
                    {[0, 5, 10, 15].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setDiscountRate(pct)}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold transition-colors ${
                          discountRate === pct
                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="Delivery dock instructions or PO notes..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span className="font-mono tabular-nums text-slate-800 dark:text-slate-200">${subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Discount ({discountRate}%):</span>
                    <span className="font-mono tabular-nums">-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500">
                  <span>Estimated Tax (8.5%):</span>
                  <span className="font-mono tabular-nums text-slate-800 dark:text-slate-200">${taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">Total Payable:</span>
                  <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 font-mono tabular-nums">
                    ${grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={handleSubmitOrder}
                disabled={isSubmitting || cart.length === 0}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2 transition-colors"
              >
                {isSubmitting ? (
                  <span>Processing & Dispatched...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit & Dispatch Order</span>
                  </>
                )}
              </button>
              <div className="mt-2 text-center text-[10px] text-slate-400 flex items-center justify-center gap-1">
                <Smartphone className="w-3 h-3 text-emerald-500" />
                <span>Triggers instant Owner SMS alert & offline-first queue</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
