import { Order, Product, Customer, Category } from '../types';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Trigger browser file download from string/blob content
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadString(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob(blob, filename);
}

/**
 * =========================================================================
 * 1. SAMPLE CSV / EXCEL TEMPLATES FOR IMPORT
 * =========================================================================
 */
export function downloadProductTemplate() {
  const csv =
    'sku,name,category,unit,wholesalePrice,costPrice,stockQuantity,minStockAlert\n' +
    'APX-BEV-101,Artisan Cold Brew Coffee,Beverages & Syrups,Carton (24 units),65.00,38.00,50,15\n' +
    'APX-DRY-102,Golden Semolina Pasta,Dry Provisions & Grains,Box (12 units),42.00,24.00,80,20\n' +
    'APX-PKG-103,Compostable Coffee Cups 12oz,Packaging & Disposables,Master Case (48 units),75.00,35.00,100,25\n' +
    'APX-FRZ-104,Norwegian Atlantic Salmon,Frozen Seafood & Meats,Case (10 kg),145.00,95.00,30,8\n';

  downloadString(csv, 'Product_Import_Template.csv', 'text/csv;charset=utf-8;');
}

export function downloadCustomerTemplate() {
  const csv =
    'code,name,company,phone,email,address,location,creditLimit,outstandingBalance\n' +
    'CUST-0901,Elena Rossi,Bellissimo Trattoria,+1 (555) 321-4567,elena@bellissimobistro.com,120 Pine Street,Financial District,20000,1500\n' +
    'CUST-0902,Marcus Chen,Harbour Bay Seafood Co,+1 (555) 789-0123,m.chen@bayseafood.com,40 Pier Way,Harbour Bay,35000,4200\n' +
    'CUST-0903,Sophia Laurent,Verona Patisserie,+1 (555) 654-3210,sophia@veronabakes.com,88 Boulevard West,Westside Industrial,15000,0\n' +
    'CUST-0904,Rajesh Gupta,Curry Heights Hospitality,+1 (555) 432-8765,rajesh@curryheights.com,512 Market Ave,Downtown District,25000,3200\n';

  downloadString(csv, 'Customer_Import_Template.csv', 'text/csv;charset=utf-8;');
}

export function downloadCategoryTemplate() {
  const csv =
    'name,code\n' +
    'Frozen Seafood & Meats,SEA\n' +
    'Organic Dairy & Cheese,DRY\n' +
    'Bakery & Yeast Supplies,BAK\n' +
    'Commercial Coffee & Teas,HOT\n' +
    'Packaging & Disposables,PKG\n';

  downloadString(csv, 'Category_Import_Template.csv', 'text/csv;charset=utf-8;');
}

/**
 * =========================================================================
 * 2. CSV / EXCEL PARSERS FOR DATA IMPORT
 * =========================================================================
 */
export function parseProductCsv(
  csvText: string,
  categories: Category[]
): { products: Partial<Product>[]; errors: string[] } {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length <= 1) return { products: [], errors: ['CSV file is empty or missing data rows.'] };

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/[\s_]/g, ''));
  const skuIdx = headers.indexOf('sku');
  const nameIdx = headers.indexOf('name');
  const catIdx = headers.indexOf('category');
  const unitIdx = headers.indexOf('unit');
  const priceIdx = headers.indexOf('wholesaleprice');
  const costIdx = headers.indexOf('costprice');
  const qtyIdx = headers.indexOf('stockquantity');
  const alertIdx = headers.indexOf('minstockalert');

  if (skuIdx === -1 || nameIdx === -1) {
    return { products: [], errors: ['Header must contain at least "sku" and "name" columns.'] };
  }

  const products: Partial<Product>[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < 2) continue;

    const sku = cols[skuIdx];
    const name = cols[nameIdx];
    const catName = catIdx >= 0 ? cols[catIdx] : 'General';
    const unitName = unitIdx >= 0 && cols[unitIdx] ? cols[unitIdx] : 'Standard Unit';
    const wholesalePrice = priceIdx >= 0 ? parseFloat(cols[priceIdx]) || 0 : 0;
    const costPrice = costIdx >= 0 ? parseFloat(cols[costIdx]) || 0 : 0;
    const stockQuantity = qtyIdx >= 0 ? parseInt(cols[qtyIdx]) || 0 : 0;
    const minStockAlert = alertIdx >= 0 ? parseInt(cols[alertIdx]) || 5 : 5;

    if (!sku || !name) {
      errors.push(`Row ${i + 1}: SKU and Name are required.`);
      continue;
    }

    const matchedCat = categories.find((c) => c.name.toLowerCase() === catName.toLowerCase()) || categories[0];

    products.push({
      sku,
      name,
      categoryId: matchedCat ? matchedCat.id : 'cat-gen',
      categoryName: matchedCat ? matchedCat.name : catName,
      unitId: 'unit-ea',
      unitName,
      wholesalePrice,
      costPrice,
      stockQuantity,
      minStockAlert,
      active: true,
      updatedAt: new Date().toISOString()
    });
  }

  return { products, errors };
}

export function parseCustomerCsv(csvText: string): { customers: Partial<Customer>[]; errors: string[] } {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length <= 1) return { customers: [], errors: ['CSV file is empty or missing data rows.'] };

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/[\s_]/g, ''));
  const codeIdx = headers.indexOf('code');
  const nameIdx = headers.indexOf('name');
  const companyIdx = headers.indexOf('company');
  const phoneIdx = headers.indexOf('phone');
  const emailIdx = headers.indexOf('email');
  const addressIdx = headers.indexOf('address');
  const locIdx = headers.indexOf('location');
  const limitIdx = headers.indexOf('creditlimit');
  const balIdx = headers.indexOf('outstandingbalance');

  if (nameIdx === -1 || companyIdx === -1) {
    return { customers: [], errors: ['CSV must contain "name" and "company" columns.'] };
  }

  const customers: Partial<Customer>[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < 2) continue;

    const name = cols[nameIdx];
    const company = cols[companyIdx];
    const code = codeIdx >= 0 && cols[codeIdx] ? cols[codeIdx] : `CUST-${Math.floor(1000 + Math.random() * 9000)}`;
    const phone = phoneIdx >= 0 ? cols[phoneIdx] : '';
    const email = emailIdx >= 0 ? cols[emailIdx] : '';
    const address = addressIdx >= 0 ? cols[addressIdx] : '';
    const location = locIdx >= 0 && cols[locIdx] ? cols[locIdx] : 'Downtown District';
    const creditLimit = limitIdx >= 0 ? parseFloat(cols[limitIdx]) || 15000 : 15000;
    const outstandingBalance = balIdx >= 0 ? parseFloat(cols[balIdx]) || 0 : 0;

    if (!name || !company) {
      errors.push(`Row ${i + 1}: Name and Company are required.`);
      continue;
    }

    customers.push({
      code,
      name,
      company,
      phone,
      email,
      address,
      location,
      creditLimit,
      outstandingBalance,
      active: true,
      createdAt: new Date().toISOString()
    });
  }

  return { customers, errors };
}

export function parseCategoryCsv(csvText: string): { categories: Partial<Category>[]; errors: string[] } {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length <= 1) return { categories: [], errors: ['CSV is empty.'] };

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/[\s_]/g, ''));
  const nameIdx = headers.indexOf('name');
  const codeIdx = headers.indexOf('code');

  if (nameIdx === -1) return { categories: [], errors: ['Header must contain "name" column.'] };

  const categories: Partial<Category>[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    if (!cols[nameIdx]) continue;

    const name = cols[nameIdx];
    const code = codeIdx >= 0 && cols[codeIdx] ? cols[codeIdx] : name.slice(0, 3).toUpperCase();
    categories.push({ name, code });
  }

  return { categories, errors };
}

/**
 * =========================================================================
 * 3. ORDER REPORTS EXPORT (CSV, EXCEL .XLSX, PDF)
 * =========================================================================
 */
export function exportOrdersToCsv(orders: Order[], filename: string = 'Apex_Orders_Report.csv') {
  const headers = [
    'OrderNumber',
    'CustomerName',
    'Company',
    'Location',
    'Date',
    'SalesRep',
    'PaymentMethod',
    'Status',
    'ItemsCount',
    'Subtotal',
    'DiscountAmount',
    'TaxAmount',
    'TotalAmount',
    'TotalProfit',
    'Notes'
  ];

  const rows = orders.map((o) => [
    `"${o.orderNumber}"`,
    `"${o.customerName.replace(/"/g, '""')}"`,
    `"${(o.customerCompany || '').replace(/"/g, '""')}"`,
    `"${(o.customerLocation || '').replace(/"/g, '""')}"`,
    `"${new Date(o.createdAt).toLocaleDateString()}"`,
    `"${o.salesmanName}"`,
    `"${o.paymentMethod}"`,
    `"${o.status}"`,
    o.items.reduce((acc, i) => acc + i.quantity, 0),
    o.subtotal.toFixed(2),
    o.discountAmount.toFixed(2),
    o.taxAmount.toFixed(2),
    o.totalAmount.toFixed(2),
    (o.totalProfit || 0).toFixed(2),
    `"${(o.notes || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadString(csvContent, filename, 'text/csv;charset=utf-8;');
}

export function exportOrdersToExcel(orders: Order[], filename: string = 'Apex_Orders_Report.xlsx') {
  // Worksheet 1: Order Details Summary
  const orderSummaryData = orders.map((o) => ({
    'Order #': o.orderNumber,
    'Customer Name': o.customerName,
    Company: o.customerCompany || '',
    Location: o.customerLocation || '',
    Date: new Date(o.createdAt).toLocaleDateString(),
    'Sales Rep': o.salesmanName,
    'Payment Method': o.paymentMethod,
    Status: o.status,
    'Total Items Count': o.items.reduce((acc, i) => acc + i.quantity, 0),
    'Subtotal ($)': o.subtotal,
    'Discount ($)': o.discountAmount,
    'Tax ($)': o.taxAmount,
    'Grand Total ($)': o.totalAmount,
    'Total Cost ($)': o.totalCost,
    'Est. Profit ($)': o.totalProfit || 0,
    'Special Instructions / Notes': o.notes || ''
  }));

  // Worksheet 2: Order Items Breakdown
  const orderItemsData = orders.flatMap((o) =>
    o.items.map((item) => ({
      'Order #': o.orderNumber,
      'Order Date': new Date(o.createdAt).toLocaleDateString(),
      'Customer Name': o.customerName,
      'Customer Location': o.customerLocation || '',
      'SKU': item.sku,
      'Product Name': item.name,
      'Packaging Unit': item.unit,
      'Quantity Ordered': item.quantity,
      'Unit Price ($)': item.unitPrice,
      'Unit Cost ($)': item.costPrice,
      'Total Price ($)': item.totalPrice,
      'Item Profit ($)': item.totalPrice - item.costPrice * item.quantity,
      'Order Status': o.status
    }))
  );

  const workbook = XLSX.utils.book_new();

  const wsOrders = XLSX.utils.json_to_sheet(orderSummaryData);
  XLSX.utils.book_append_sheet(workbook, wsOrders, 'Order Details');

  const wsItems = XLSX.utils.json_to_sheet(orderItemsData);
  XLSX.utils.book_append_sheet(workbook, wsItems, 'Order Items Breakdown');

  XLSX.writeFile(workbook, filename);
}


export function exportOrdersToPdf(
  orders: Order[],
  companyName: string = 'Apex Logistics ERP',
  filename: string = 'Apex_Orders_Report.pdf'
) {
  const doc = new jsPDF({ orientation: 'landscape' });

  // Header
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  doc.text(`${companyName} - Orders Executive Report`, 14, 16);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${new Date().toLocaleString()} | Total Orders: ${orders.length}`, 14, 22);

  const totalRevenue = orders.reduce((acc, o) => acc + o.totalAmount, 0);
  const totalProfit = orders.reduce((acc, o) => acc + (o.totalProfit || 0), 0);
  doc.text(
    `Gross Revenue: $${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })} | Total Est. Profit: $${totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    14,
    28
  );

  const tableBody = orders.map((o) => [
    o.orderNumber,
    o.customerName,
    o.customerLocation || 'General',
    new Date(o.createdAt).toLocaleDateString(),
    o.salesmanName,
    o.status,
    o.items.reduce((s, i) => s + i.quantity, 0).toString(),
    `$${o.totalAmount.toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: 32,
    head: [['Order #', 'Customer', 'Location', 'Date', 'Sales Rep', 'Status', 'Items', 'Total ($)']],
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 3 },
    alternateRowStyles: { fillColor: [248, 250, 252] }
  });

  doc.save(filename);
}

/**
 * =========================================================================
 * 4. CUSTOMER MASTER EXPORT (CSV, EXCEL .XLSX, PDF)
 * =========================================================================
 */
export function exportCustomersToCsv(customers: Customer[], filename: string = 'Apex_Customers_Report.csv') {
  const headers = [
    'CustomerCode',
    'Name',
    'Company',
    'Phone',
    'Email',
    'Location',
    'Address',
    'CreditLimit',
    'OutstandingBalance',
    'AvailableCredit',
    'Status'
  ];

  const rows = customers.map((c) => [
    `"${c.code}"`,
    `"${c.name.replace(/"/g, '""')}"`,
    `"${c.company.replace(/"/g, '""')}"`,
    `"${c.phone}"`,
    `"${c.email}"`,
    `"${c.location}"`,
    `"${(c.address || '').replace(/"/g, '""')}"`,
    c.creditLimit.toFixed(2),
    c.outstandingBalance.toFixed(2),
    (c.creditLimit - c.outstandingBalance).toFixed(2),
    c.active ? 'Active' : 'Inactive'
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadString(csvContent, filename, 'text/csv;charset=utf-8;');
}

export function exportCustomersToExcel(customers: Customer[], filename: string = 'Apex_Customers_Report.xlsx') {
  const data = customers.map((c) => ({
    'Customer Code': c.code,
    'Client Name': c.name,
    'Company / Business': c.company,
    Phone: c.phone,
    Email: c.email,
    Location: c.location,
    Address: c.address || '',
    'Credit Limit ($)': c.creditLimit,
    'Outstanding Balance ($)': c.outstandingBalance,
    'Available Credit ($)': c.creditLimit - c.outstandingBalance,
    Status: c.active ? 'Active' : 'Inactive'
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');
  XLSX.writeFile(workbook, filename);
}

export function exportCustomersToPdf(
  customers: Customer[],
  companyName: string = 'Apex Logistics ERP',
  filename: string = 'Apex_Customers_Report.pdf'
) {
  const doc = new jsPDF({ orientation: 'landscape' });

  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  doc.text(`${companyName} - Customer Directory & Credit Ledger`, 14, 16);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${new Date().toLocaleString()} | Total Accounts: ${customers.length}`, 14, 22);

  const totalOutstanding = customers.reduce((acc, c) => acc + c.outstandingBalance, 0);
  const totalCredit = customers.reduce((acc, c) => acc + c.creditLimit, 0);
  doc.text(
    `Total Credit Line: $${totalCredit.toLocaleString()} | Outstanding Balance: $${totalOutstanding.toLocaleString()} | Total Accounts: ${customers.length}`,
    14,
    28
  );

  const tableBody = customers.map((c) => [
    c.code,
    c.name,
    c.company,
    c.location,
    c.phone,
    `$${c.creditLimit.toLocaleString()}`,
    `$${c.outstandingBalance.toLocaleString()}`,
    c.active ? 'Active' : 'Disabled'
  ]);

  autoTable(doc, {
    startY: 32,
    head: [['Code', 'Contact Name', 'Company', 'Location', 'Phone', 'Credit Limit', 'Balance', 'Status']],
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 3 },
    alternateRowStyles: { fillColor: [248, 250, 252] }
  });

  doc.save(filename);
}

/**
 * =========================================================================
 * 5. PRODUCT CATALOG EXPORT (CSV, EXCEL .XLSX, PDF)
 * =========================================================================
 */
export function exportProductsToCsv(products: Product[], filename: string = 'Apex_Products_Report.csv') {
  const headers = [
    'SKU',
    'ProductName',
    'Category',
    'Unit',
    'WholesalePrice',
    'CostPrice',
    'GrossMargin',
    'StockQuantity',
    'MinStockAlert',
    'StockStatus',
    'Active'
  ];

  const rows = products.map((p) => {
    const margin = p.wholesalePrice > 0 ? (((p.wholesalePrice - p.costPrice) / p.wholesalePrice) * 100).toFixed(1) + '%' : '0%';
    const stockStatus = p.stockQuantity <= 0 ? 'Out of Stock' : p.stockQuantity <= p.minStockAlert ? 'Low Stock' : 'In Stock';
    return [
      `"${p.sku}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.categoryName}"`,
      `"${p.unitName}"`,
      p.wholesalePrice.toFixed(2),
      p.costPrice.toFixed(2),
      `"${margin}"`,
      p.stockQuantity,
      p.minStockAlert,
      `"${stockStatus}"`,
      p.active ? 'Active' : 'Archived'
    ];
  });

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadString(csvContent, filename, 'text/csv;charset=utf-8;');
}

export function exportProductsToExcel(products: Product[], filename: string = 'Apex_Products_Report.xlsx') {
  const data = products.map((p) => {
    const margin = p.wholesalePrice > 0 ? Number((((p.wholesalePrice - p.costPrice) / p.wholesalePrice) * 100).toFixed(1)) : 0;
    const stockStatus = p.stockQuantity <= 0 ? 'Out of Stock' : p.stockQuantity <= p.minStockAlert ? 'Low Stock' : 'In Stock';
    return {
      SKU: p.sku,
      'Product Name': p.name,
      Category: p.categoryName,
      Packaging: p.unitName,
      'Wholesale Price ($)': p.wholesalePrice,
      'Cost Price ($)': p.costPrice,
      'Margin (%)': margin,
      'Stock Level': p.stockQuantity,
      'Min Alert Level': p.minStockAlert,
      Status: stockStatus
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
  XLSX.writeFile(workbook, filename);
}

export function exportProductsToPdf(
  products: Product[],
  companyName: string = 'Apex Logistics ERP',
  filename: string = 'Apex_Products_Report.pdf'
) {
  const doc = new jsPDF({ orientation: 'landscape' });

  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  doc.text(`${companyName} - Product Catalog & Inventory Matrix`, 14, 16);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${new Date().toLocaleString()} | Total Items: ${products.length}`, 14, 22);

  const totalValue = products.reduce((acc, p) => acc + p.stockQuantity * p.wholesalePrice, 0);
  const totalCost = products.reduce((acc, p) => acc + p.stockQuantity * p.costPrice, 0);
  doc.text(
    `Retail Inventory Valuation: $${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })} | Total Inventory Cost: $${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    14,
    28
  );

  const tableBody = products.map((p) => [
    p.sku,
    p.name,
    p.categoryName,
    p.unitName,
    `$${p.wholesalePrice.toFixed(2)}`,
    `$${p.costPrice.toFixed(2)}`,
    p.stockQuantity.toString(),
    p.stockQuantity <= p.minStockAlert ? 'LOW' : 'OK'
  ]);

  autoTable(doc, {
    startY: 32,
    head: [['SKU', 'Product Name', 'Category', 'Unit', 'Price', 'Cost', 'Stock', 'Alert']],
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 3 },
    alternateRowStyles: { fillColor: [248, 250, 252] }
  });

  doc.save(filename);
}

/**
 * =========================================================================
 * 6. DIRECT ORDER SHARING ACTIONS
 * =========================================================================
 */
export function shareOrderViaWhatsApp(order: Order) {
  const itemsText = order.items.map((i) => `• ${i.name} (${i.quantity} ${i.unit}) - $${i.totalPrice.toFixed(2)}`).join('\n');
  const message =
    `*Apex B2B Order Confirmation*\n` +
    `Order Number: *#${order.orderNumber}*\n` +
    `Customer: ${order.customerName} (${order.customerCompany || 'Client'})\n` +
    `Date: ${new Date(order.createdAt).toLocaleDateString()}\n` +
    `Status: ${order.status}\n\n` +
    `*Items:*\n${itemsText}\n\n` +
    `*Total Payable:* $${order.totalAmount.toFixed(2)}\n` +
    `Sales Rep: ${order.salesmanName}\n` +
    `Thank you for your business!`;

  const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

export function shareOrderViaEmail(order: Order) {
  const subject = `Order Confirmation #${order.orderNumber} - ${order.customerCompany || order.customerName}`;
  const body =
    `Dear ${order.customerName},\n\n` +
    `Your order #${order.orderNumber} has been received and confirmed.\n\n` +
    `Order Total: $${order.totalAmount.toFixed(2)}\n` +
    `Payment Method: ${order.paymentMethod}\n` +
    `Sales Representative: ${order.salesmanName}\n\n` +
    `Delivery Address:\n${order.customerAddress || 'On file'}\n\n` +
    `Thank you for partnering with Apex B2B Logistics.`;

  const url = `mailto:${encodeURIComponent(order.customerPhone ? '' : '')}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
  window.location.href = url;
}
