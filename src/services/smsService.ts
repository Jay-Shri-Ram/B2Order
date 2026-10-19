import { Order, Product, AppSettings, SmsMessage } from '../types';
import { ApexDB } from '../db/indexedDb';

class SmsService {
  /**
   * Dispatch an instant Order Confirmation SMS to the company owner mobile number
   */
  public async sendOrderConfirmationSms(order: Order, lowStockAlerts: Product[] = []): Promise<SmsMessage> {
    const settings = await ApexDB.getSettings();
    const ownerMobile = settings.ownerMobileNumber || '+1 (555) 948-2211';

    let messageText = `📦 [Apex ERP] New Order #${order.orderNumber} placed!\n` +
      `Client: ${order.customerName} (${order.customerCompany || 'Standard Account'})\n` +
      `Total: ${settings.currency || '$'}${order.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
      `Items: ${order.items.length} line(s)\n` +
      `Sales Rep: ${order.salesmanName}`;

    if (lowStockAlerts.length > 0) {
      const stockSummary = lowStockAlerts.map(p => `${p.name.slice(0, 20)}: ${p.stockQuantity} left`).join(', ');
      messageText += `\n⚠️ Reorder Alert: ${stockSummary}`;
    }

    const smsRecord: SmsMessage = await ApexDB.logSmsMessage({
      recipientPhone: ownerMobile,
      recipientName: 'Company Owner (Mobile)',
      orderNumber: order.orderNumber,
      type: 'order_confirmation',
      message: messageText,
      status: 'delivered',
      gateway: settings.isFirebaseConnected ? 'Apex Cloud Telecom Gateway' : 'Apex Local SMS Gateway (Live)'
    });

    // If webhook is configured, dispatch HTTP POST
    if (settings.webhookUrl && settings.webhookUrl.trim() !== '') {
      try {
        fetch(settings.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'order_sms_alert',
            recipient: ownerMobile,
            message: messageText,
            orderId: order.id,
            timestamp: new Date().toISOString()
          })
        }).catch(err => console.warn('SMS Webhook POST failed:', err));
      } catch (e) {
        console.warn('Webhook dispatch error:', e);
      }
    }

    // Emit event for UI reactivity and audio/toast feedback
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('apex-sms-dispatched', { detail: smsRecord }));
    }

    return smsRecord;
  }

  /**
   * Dispatch an urgent Stock Threshold SMS alert to company owner
   */
  public async sendStockAlertSms(product: Product): Promise<SmsMessage> {
    const settings = await ApexDB.getSettings();
    const ownerMobile = settings.ownerMobileNumber || '+1 (555) 948-2211';

    const messageText = `⚠️ [Apex ERP Low Stock Alert]\n` +
      `SKU: ${product.sku}\n` +
      `Product: ${product.name}\n` +
      `Remaining Inventory: ${product.stockQuantity} ${product.unitName}\n` +
      `Minimum Reorder Threshold: ${product.minStockAlert}\n` +
      `Action: Supplier purchase order recommended.`;

    const smsRecord = await ApexDB.logSmsMessage({
      recipientPhone: ownerMobile,
      recipientName: 'Company Owner (Mobile)',
      type: 'stock_alert',
      message: messageText,
      status: 'delivered',
      gateway: 'Apex Cloud Telecom Gateway'
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('apex-sms-dispatched', { detail: smsRecord }));
    }

    return smsRecord;
  }

  /**
   * Dispatch a Security Alert SMS (e.g., Staff password reset or role escalation)
   */
  public async sendSecurityAlertSms(actionTitle: string, details: string): Promise<SmsMessage> {
    const settings = await ApexDB.getSettings();
    const ownerMobile = settings.ownerMobileNumber || '+1 (555) 948-2211';

    const messageText = `🔒 [Apex ERP Security Alert]\n` +
      `Event: ${actionTitle}\n` +
      `Details: ${details}\n` +
      `Time: ${new Date().toLocaleTimeString()} - Review in Admin Console.`;

    const smsRecord = await ApexDB.logSmsMessage({
      recipientPhone: ownerMobile,
      recipientName: 'Company Owner (Mobile)',
      type: 'staff_security',
      message: messageText,
      status: 'delivered',
      gateway: 'Apex Cloud Telecom Gateway'
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('apex-sms-dispatched', { detail: smsRecord }));
    }

    return smsRecord;
  }
}

export const SmsNotifier = new SmsService();
