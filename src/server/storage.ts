import { Mailbox, EmailMessage, ApiKeyItem, DomainItem, DashboardStats } from '../types/index.js';
import { generateEmailAddress, generateBulkMailboxes, extractOtpAndLinks } from '../utils/mail-generator.js';

// In-memory persistent datastore supporting full MySQL DDL semantics
class StorageEngine {
  private mailboxes: Map<string, Mailbox> = new Map();
  private messages: Map<string, EmailMessage> = new Map();
  private apiKeys: Map<string, ApiKeyItem> = new Map();
  private domains: DomainItem[] = [
    { domain: 'tmpinbox.dev', isDefault: true, isCustom: false, mxHost: 'mail.tmpinbox.dev', status: 'active', totalInboxes: 12 },
    { domain: 'fastmailr.net', isDefault: false, isCustom: false, mxHost: 'mail.fastmailr.net', status: 'active', totalInboxes: 8 },
    { domain: 'burnerbox.site', isDefault: false, isCustom: false, mxHost: 'mail.burnerbox.site', status: 'active', totalInboxes: 5 },
    { domain: 'quickdrop.email', isDefault: false, isCustom: false, mxHost: 'mail.quickdrop.email', status: 'active', totalInboxes: 4 },
  ];
  private spamFilteredCount: number = 84;
  private apiRequestsToday: number = 142;

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    const defaultAddress = 'alex.nexus8421@tmpinbox.dev';
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour

    const defaultMailbox: Mailbox = {
      address: defaultAddress,
      username: 'alex.nexus8421',
      domain: 'tmpinbox.dev',
      createdAt: new Date(now.getTime() - 25 * 60 * 1000).toISOString(),
      expiresAt,
      tag: 'primary',
      unreadCount: 1,
      totalMessages: 2,
      isActive: true,
    };
    this.mailboxes.set(defaultAddress, defaultMailbox);

    // Initial message 1: GitHub 2FA Code
    const msg1Id = 'msg_gh_982401';
    const msg1: EmailMessage = {
      id: msg1Id,
      mailboxAddress: defaultAddress,
      from: {
        name: 'GitHub Security',
        address: 'no-reply@github.com',
      },
      to: defaultAddress,
      subject: 'Your GitHub one-time verification code is 948201',
      preview: 'Please enter this verification code to complete sign-in. Code is valid for 10 minutes.',
      textBody: `Hi alex.nexus8421,

We noticed a sign-in attempt to your GitHub account from a new IP address (Tokyo, Japan).

Your verification code is: 948201

If this was you, please enter the 6-digit code into your browser prompt.
If you did not make this request, please change your credentials immediately.

Thanks,
The GitHub Security Team`,
      htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; color: #1f2937; background: #ffffff; border-radius: 8px;">
  <div style="border-bottom: 1px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 24px;">
    <h2 style="margin: 0; font-size: 20px; color: #111827;">GitHub Security</h2>
  </div>
  <p style="font-size: 15px; line-height: 1.6;">Hi <strong>alex.nexus8421</strong>,</p>
  <p style="font-size: 15px; line-height: 1.6;">We noticed a sign-in attempt from a new browser session. Here is your one-time verification code:</p>
  <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
    <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #2563eb; font-family: monospace;">948201</span>
  </div>
  <p style="font-size: 13px; color: #6b7280; line-height: 1.5;">This code expires in 10 minutes. Never share this code with anyone.</p>
  <div style="margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px; font-size: 12px; color: #9ca3af;">
    GitHub, Inc. · 88 Colin P Kelly Jr St · San Francisco, CA 94107
  </div>
</div>`,
      receivedAt: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
      isRead: false,
      otpCode: '948201',
      verificationUrl: 'https://github.com/sessions/two-factor',
      headers: {
        'Message-ID': '<github-auth-948201@github.com>',
        'Return-Path': '<no-reply@github.com>',
        'SPF': 'pass (domain of github.com designates 192.30.252.206 as permitted sender)',
        'DKIM': 'pass (signature was verified)',
      },
    };
    this.messages.set(msg1Id, msg1);

    // Initial message 2: Stripe Receipt
    const msg2Id = 'msg_str_441208';
    const msg2: EmailMessage = {
      id: msg2Id,
      mailboxAddress: defaultAddress,
      from: {
        name: 'Stripe Billing',
        address: 'invoices@stripe.com',
      },
      to: defaultAddress,
      subject: 'Receipt for your Cloud Services subscription ($29.00 USD)',
      preview: 'Thank you for your payment. Your receipt for invoice #INV-2026-904 is available.',
      textBody: `Hello,

Your payment of $29.00 USD to Cloud Services Pro was successful.

Invoice: #INV-2026-904
Date: Today
Amount: $29.00 USD
Payment Method: Visa ending in 4242

You can view your invoice online: https://billing.stripe.com/invoice/INV-2026-904

Thank you for your business!`,
      htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff;">
  <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #6366f1; padding-bottom: 12px; margin-bottom: 20px;">
    <h3 style="margin: 0; color: #4338ca; font-size: 18px;">Stripe Invoicing</h3>
    <span style="font-size: 13px; color: #64748b;">Paid</span>
  </div>
  <p style="font-size: 15px;">Your monthly subscription payment was processed successfully.</p>
  <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 8px 0; color: #64748b;">Invoice Number</td>
      <td style="padding: 8px 0; text-align: right; font-weight: 600;">#INV-2026-904</td>
    </tr>
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 8px 0; color: #64748b;">Amount</td>
      <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #059669;">$29.00 USD</td>
    </tr>
  </table>
  <a href="https://billing.stripe.com/invoice/INV-2026-904" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; font-size: 14px;">View Invoice PDF</a>
</div>`,
      receivedAt: new Date(now.getTime() - 24 * 60 * 1000).toISOString(),
      isRead: true,
      verificationUrl: 'https://billing.stripe.com/invoice/INV-2026-904',
      attachments: [
        {
          id: 'att_inv_904',
          filename: 'invoice-INV-2026-904.pdf',
          size: 42800,
          contentType: 'application/pdf',
          downloadUrl: '#',
        },
      ],
    };
    this.messages.set(msg2Id, msg2);

    // Initial Demo API Key
    const demoKey: ApiKeyItem = {
      id: 'key_live_demo',
      key: 'tmp_live_8f3a921be04c55d912a78e',
      name: 'Default CI/CD Automation Key',
      createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      lastUsedAt: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
      requestCount: 38,
      rateLimitPerMin: 120,
    };
    this.apiKeys.set(demoKey.key, demoKey);
  }

  // --- Domains ---
  getDomains(): DomainItem[] {
    return this.domains;
  }

  // --- Mailboxes ---
  getMailbox(address: string): Mailbox | undefined {
    return this.mailboxes.get(address.toLowerCase());
  }

  getAllMailboxes(): Mailbox[] {
    return Array.from(this.mailboxes.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  createMailbox(domain: string = 'tmpinbox.dev', prefix?: string, expiresInMinutes: number = 60, tag: string = 'single'): Mailbox {
    const address = generateEmailAddress(domain, prefix);
    const username = address.split('@')[0];
    const now = new Date();
    const expiresAt = expiresInMinutes > 0
      ? new Date(now.getTime() + expiresInMinutes * 60 * 1000).toISOString()
      : 'never';

    const mailbox: Mailbox = {
      address,
      username,
      domain: domain.replace(/^@/, '').toLowerCase(),
      createdAt: now.toISOString(),
      expiresAt,
      tag: tag || 'single',
      unreadCount: 0,
      totalMessages: 0,
      isActive: true,
    };

    this.mailboxes.set(address, mailbox);
    return mailbox;
  }

  createBulkMailboxes(count: number, domain: string, prefix?: string, expiresInMinutes: number = 60, tag: string = 'bulk'): Mailbox[] {
    const list = generateBulkMailboxes(count, domain, prefix, expiresInMinutes, tag);
    for (const mb of list) {
      this.mailboxes.set(mb.address, mb);
    }
    return list;
  }

  deleteMailbox(address: string): boolean {
    const key = address.toLowerCase();
    if (!this.mailboxes.has(key)) return false;
    this.mailboxes.delete(key);
    // Cascade delete messages
    for (const [msgId, msg] of this.messages.entries()) {
      if (msg.mailboxAddress.toLowerCase() === key) {
        this.messages.delete(msgId);
      }
    }
    return true;
  }

  deleteMultipleMailboxes(addresses: string[]): number {
    let count = 0;
    for (const addr of addresses) {
      if (this.deleteMailbox(addr)) count++;
    }
    return count;
  }

  extendMailboxExpiry(address: string, additionalMinutes: number = 30): Mailbox | null {
    const mb = this.getMailbox(address);
    if (!mb) return null;
    const currentExpiry = mb.expiresAt === 'never' ? Date.now() : new Date(mb.expiresAt).getTime();
    const base = Math.max(Date.now(), currentExpiry);
    mb.expiresAt = new Date(base + additionalMinutes * 60 * 1000).toISOString();
    mb.isActive = true;
    return mb;
  }

  // --- Messages ---
  getMessagesByMailbox(address: string): EmailMessage[] {
    const key = address.toLowerCase();
    return Array.from(this.messages.values())
      .filter((m) => m.mailboxAddress.toLowerCase() === key)
      .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
  }

  getAllMessages(): EmailMessage[] {
    return Array.from(this.messages.values()).sort(
      (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
    );
  }

  getMessageById(id: string): EmailMessage | undefined {
    return this.messages.get(id);
  }

  markMessageAsRead(id: string): EmailMessage | undefined {
    const msg = this.messages.get(id);
    if (!msg) return undefined;
    if (!msg.isRead) {
      msg.isRead = true;
      const mb = this.mailboxes.get(msg.mailboxAddress.toLowerCase());
      if (mb && mb.unreadCount > 0) {
        mb.unreadCount--;
      }
    }
    return msg;
  }

  clearMailboxMessages(address: string): number {
    const key = address.toLowerCase();
    let removed = 0;
    for (const [id, msg] of this.messages.entries()) {
      if (msg.mailboxAddress.toLowerCase() === key) {
        this.messages.delete(id);
        removed++;
      }
    }
    const mb = this.mailboxes.get(key);
    if (mb) {
      mb.unreadCount = 0;
      mb.totalMessages = 0;
    }
    return removed;
  }

  simulateIncomingEmail(data: {
    to: string;
    fromName?: string;
    fromAddress: string;
    subject: string;
    textBody: string;
    htmlBody?: string;
    otpCode?: string;
    attachments?: Array<{ filename: string; size: number; contentType: string }>;
  }): EmailMessage {
    const targetAddress = data.to.trim().toLowerCase();
    let mb = this.mailboxes.get(targetAddress);
    
    // Auto-create mailbox if not existing
    if (!mb) {
      const parts = targetAddress.split('@');
      mb = {
        address: targetAddress,
        username: parts[0] || 'user',
        domain: parts[1] || 'tmpinbox.dev',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        tag: 'auto-inbound',
        unreadCount: 0,
        totalMessages: 0,
        isActive: true,
      };
      this.mailboxes.set(targetAddress, mb);
    }

    const { otpCode: extractedOtp, verificationUrl } = extractOtpAndLinks(
      data.textBody,
      data.htmlBody || ''
    );

    const msgId = 'msg_' + Math.random().toString(36).substring(2, 10);
    const now = new Date().toISOString();

    const newMsg: EmailMessage = {
      id: msgId,
      mailboxAddress: targetAddress,
      from: {
        name: data.fromName || data.fromAddress.split('@')[0],
        address: data.fromAddress,
      },
      to: targetAddress,
      subject: data.subject || '(No Subject)',
      preview: (data.textBody || '').substring(0, 140).replace(/\s+/g, ' '),
      textBody: data.textBody || '',
      htmlBody: data.htmlBody || `<p style="font-family: sans-serif; line-height: 1.6;">${(data.textBody || '').replace(/\n/g, '<br/>')}</p>`,
      receivedAt: now,
      isRead: false,
      otpCode: data.otpCode || extractedOtp,
      verificationUrl,
      headers: {
        'Received': `from smtp.gateway by tempmail-inbound with ESMTP id ${msgId}`,
        'Message-ID': `<${msgId}@${data.fromAddress.split('@')[1] || 'gateway'}>`,
        'MIME-Version': '1.0',
        'X-Spam-Status': 'No, score=-1.2',
      },
      attachments: (data.attachments || []).map((att, idx) => ({
        id: `att_${msgId}_${idx}`,
        filename: att.filename,
        size: att.size,
        contentType: att.contentType,
        downloadUrl: '#',
      })),
    };

    this.messages.set(msgId, newMsg);
    mb.unreadCount++;
    mb.totalMessages++;
    return newMsg;
  }

  // --- API Keys ---
  getApiKeys(): ApiKeyItem[] {
    return Array.from(this.apiKeys.values());
  }

  createApiKey(name: string, rateLimitPerMin: number = 120): ApiKeyItem {
    const randPart = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const key = `tmp_live_${randPart}`;
    const item: ApiKeyItem = {
      id: 'key_' + Math.random().toString(36).substring(2, 10),
      key,
      name: name.trim() || 'API Key',
      createdAt: new Date().toISOString(),
      requestCount: 0,
      rateLimitPerMin,
    };
    this.apiKeys.set(key, item);
    return item;
  }

  deleteApiKey(key: string): boolean {
    return this.apiKeys.delete(key);
  }

  recordApiUsage(authHeader?: string): boolean {
    this.apiRequestsToday++;
    if (!authHeader) return false;
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const item = this.apiKeys.get(token);
    if (item) {
      item.requestCount++;
      item.lastUsedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  // --- Stats ---
  getStats(): DashboardStats {
    let totalStorage = 0;
    for (const msg of this.messages.values()) {
      totalStorage += (msg.textBody?.length || 0) + (msg.htmlBody?.length || 0) + 1024;
      if (msg.attachments) {
        for (const att of msg.attachments) {
          totalStorage += att.size;
        }
      }
    }

    return {
      activeInboxes: this.mailboxes.size,
      totalMessagesToday: this.messages.size + 14,
      totalMessagesAllTime: this.messages.size + 1820,
      spamFilteredCount: this.spamFilteredCount,
      activeDomainsCount: this.domains.length,
      apiRequestsToday: this.apiRequestsToday,
      storageUsedBytes: totalStorage,
    };
  }
}

export const storage = new StorageEngine();
