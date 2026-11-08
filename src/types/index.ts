export interface Mailbox {
  address: string;
  username: string;
  domain: string;
  createdAt: string;
  expiresAt: string; // ISO string or 'never'
  tag?: string;
  unreadCount: number;
  totalMessages: number;
  isActive: boolean;
}

export interface Attachment {
  id: string;
  filename: string;
  size: number;
  contentType: string;
  downloadUrl?: string;
}

export interface EmailMessage {
  id: string;
  mailboxAddress: string;
  from: {
    name: string;
    address: string;
  };
  to: string;
  subject: string;
  preview: string;
  textBody: string;
  htmlBody: string;
  receivedAt: string;
  isRead: boolean;
  otpCode?: string;
  verificationUrl?: string;
  headers?: Record<string, string>;
  attachments?: Attachment[];
}

export interface ApiKeyItem {
  id: string;
  key: string;
  name: string;
  createdAt: string;
  lastUsedAt?: string;
  requestCount: number;
  rateLimitPerMin: number;
}

export interface DomainItem {
  domain: string;
  isDefault: boolean;
  isCustom: boolean;
  mxHost: string;
  status: 'active' | 'warning' | 'offline';
  totalInboxes: number;
}

export interface DashboardStats {
  activeInboxes: number;
  totalMessagesToday: number;
  totalMessagesAllTime: number;
  spamFilteredCount: number;
  activeDomainsCount: number;
  apiRequestsToday: number;
  storageUsedBytes: number;
}
