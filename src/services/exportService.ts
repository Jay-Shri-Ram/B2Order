import { Order, Product, Customer, Category } from '../types';

/**
 * Trigger browser file download from string content
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 1. Sample CSV Templates
 */
export function downloadProductTemplate() {
  const csv =
    'sku,name,category,unit,wholesalePrice,costPrice,stockQuantity,minStockAlert\n' +
    'APX-BEV-101,Artisan Cold Brew Coffee,Beverages & Syrups,Carton (24 units),65.00,38.00,50,15\n' +
    'APX-DRY-102,Golden Semolina Pasta,Dry Provisions & Grains,Box (12 units),42.00,24.00,80,20\n' +
    'APX-PKG-103,Compostable Coffee Cups 12oz,Packaging & Disposables,Master Case (48 units),75.00,35.00,100,25\n';

  downloadFile(csv, 'Product_Import_Template.csv', 'text/csv;charset=utf-8;');
}

export function downloadCustomerTemplate() {
  const csv =
    'code,name,company,phone,email,address,location,creditLimit,outstandingBalance\n' +
    'CUST-0901,Elena Rossi,Bellissimo Trattoria,+1 (555) 321-4567,elena@bellissimobistro.com,120 Pine Street,Financial District,20000,1500\n' +
    'CUST-0902,Marcus Chen,Harbour Bay Seafood Co,+1 (555) 789-0123,m.chen@bayseafood.com,40 Pier Way,Harbour Bay,35000,4200\n' +
    'CUST-0903,Sophia Laurent,Verona Patisserie,+1 (555) 654-3210,sophia@veronabakes.com,88 Boulevard West,Westside Industrial,15000,0\n';

  downloadFile(csv, 'Customer_Import_Template.csv', 'text/csv;charset=utf-8;');
}

export function downloadCategoryTemplate() {
  const csv =
    'name,code\n' +
    'Frozen Seafood & Meats,SEA\n' +
    'Organic Dairy & Cheese,DRY\n' +
    'Bakery & Yeast Supplies,BAK\n' +
    'Commercial Coffee & Teas,HOT\n';

  downloadFile(csv, 'Category_Import_Template.csv', 'text/csv;charset=utf-8;');
}

/**
 * 2. CSV Parsers with validation
 */
export function parseProductCsv(
  csvText: string,
  categories: Category[]
): { products: Partial<Product>[]; errors: string[] } {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length <= 1) return { products: [], errors: ['CSV file is empty or missing data rows.'] };

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const skuIdx = headers.indexOf('sku');
  const nameIdx = headers.indexOf('name');
  const catIdx = headers.indexOf('category');
  const unitIdx = headers.indexOf('unit');
  const priceIdx = headers.indexOf('wholesaleprice');
  const costIdx = headers.indexOf('costprice');
  const qtyIdx = headers.indexOf('stockquantity');
  const alertIdx = headers.indexOf('minstockalert');

  if (skuIdx === -1 || nameIdx === -1) {
    return { products: [], errors: ['Header must contain at least "sku" and "name".'] };
  }

  const products: Partial<Product>[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    if (cols.length < 2) continue;

    const sku = cols[skuIdx];
    const name = cols[nameIdx];
    const catName = catIdx >= 0 ? cols[catIdx] : 'General';
    const unitName = unitIdx >= 0 ? cols[unitIdx] : 'Standard Unit';
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

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
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
    const cols = lines[i].split(',').map((c) => c.trim());
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

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const nameIdx = headers.indexOf('name');
  const codeIdx = headers.indexOf('code');

  if (nameIdx === -1) return { categories: [], errors: ['Header must contain "name" column.'] };

  const categories: Partial<Category>[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    if (!cols[nameIdx]) continue;

    const name = cols[nameIdx];
    const code = codeIdx >= 0 && cols[codeIdx] ? cols[codeIdx] : name.slice(0, 3).toUpperCase();
    categories.push({ name, code });
  }

  return { categories, errors };
}

/**
 * 3. Export Orders to CSV
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
    `"${(o.notes || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
}

/**
 * 4. Export Orders to Excel (.xls HTML table format with XML header for native Excel compatibility)
 */
export function exportOrdersToExcel(orders: Order[], filename: string = 'Apex_Orders_Report.xls') {
  const rowsHtml = orders
    .map(
      (o) => `
    <tr>
      <td>${o.orderNumber}</td>
      <td>${o.customerName}</td>
      <td>${o.customerCompany || ''}</td>
      <td>${o.customerLocation || ''}</td>
      <td>${new Date(o.createdAt).toLocaleDateString()}</td>
      <td>${o.salesmanName}</td>
      <td>${o.paymentMethod}</td>
      <td>${o.status}</td>
      <td align="right">${o.items.reduce((acc, i) => acc + i.quantity, 0)}</td>
      <td align="right">$${o.subtotal.toFixed(2)}</td>
      <td align="right">-$${o.discountAmount.toFixed(2)}</td>
      <td align="right">$${o.taxAmount.toFixed(2)}</td>
      <td align="right"><b>$${o.totalAmount.toFixed(2)}</b></td>
      <td>${o.notes || ''}</td>
    </tr>`
    )
    .join('');

  const excelTemplate = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Orders</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
      <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
      <style>
        th { background-color: #4F46E5; color: white; font-weight: bold; padding: 6px; }
        td { padding: 4px; border: 0.5pt solid #E2E8F0; }
      </style>
    </head>
    <body>
      <table>
        <thead>
          <tr>
            <th>Order #</th>
            <th>Customer Name</th>
            <th>Company</th>
            <th>Location</th>
            <th>Date</th>
            <th>Sales Rep</th>
            <th>Payment</th>
            <th>Status</th>
            <th>Items</th>
            <th>Subtotal</th>
            <th>Discount</th>
            <th>Tax</th>
            <th>Total Amount</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </body>
    </html>
  `;

  downloadFile(excelTemplate, filename, 'application/vnd.ms-excel');
}

/**
 * 5. Order Sharing Options
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
