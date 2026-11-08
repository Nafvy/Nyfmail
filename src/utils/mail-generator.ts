import { Mailbox, EmailMessage } from '../types/index.js';

const RANDOM_ADJECTIVES = [
  'swift', 'silent', 'cyber', 'nova', 'hyper', 'shadow', 'quantum', 'rapid',
  'delta', 'lunar', 'solar', 'alpha', 'vector', 'omega', 'echo', 'prism'
];

const RANDOM_NOUNS = [
  'fox', 'falcon', 'wave', 'stream', 'spark', 'matrix', 'pilot', 'nexus',
  'vault', 'shield', 'runner', 'relay', 'beacon', 'orbit', 'pulse', 'drift'
];

/**
 * Generate a random memorable username or prefixed username
 */
export function generateRandomUsername(prefix?: string): string {
  const cleanPrefix = prefix ? prefix.trim().toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  const randNum = Math.floor(1000 + Math.random() * 9000);
  
  if (cleanPrefix) {
    return `${cleanPrefix}${randNum}`;
  }

  const adj = RANDOM_ADJECTIVES[Math.floor(Math.random() * RANDOM_ADJECTIVES.length)];
  const noun = RANDOM_NOUNS[Math.floor(Math.random() * RANDOM_NOUNS.length)];
  return `${adj}.${noun}${randNum}`;
}

/**
 * Generate a full email address
 */
export function generateEmailAddress(domain: string, prefix?: string): string {
  const cleanDomain = domain.replace(/^@/, '').toLowerCase();
  const username = generateRandomUsername(prefix);
  return `${username}@${cleanDomain}`;
}

/**
 * Generate bulk mailboxes with unique addresses
 */
export function generateBulkMailboxes(
  count: number,
  domain: string,
  prefix?: string,
  expiresInMinutes: number = 60,
  tag: string = 'batch'
): Mailbox[] {
  const safeCount = Math.max(1, Math.min(count, 500));
  const cleanDomain = domain.replace(/^@/, '').toLowerCase();
  const now = new Date();
  
  const expiresAt = expiresInMinutes > 0
    ? new Date(now.getTime() + expiresInMinutes * 60 * 1000).toISOString()
    : 'never';

  const usedUsernames = new Set<string>();
  const mailboxes: Mailbox[] = [];

  for (let i = 0; i < safeCount; i++) {
    let username: string;
    let attempts = 0;
    do {
      if (prefix && safeCount > 5) {
        // e.g. prefix_001, prefix_002
        const paddedIndex = String(i + 1).padStart(3, '0');
        const randSuffix = Math.random().toString(36).substring(2, 6);
        const cleanPre = prefix.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
        username = `${cleanPre || 'user'}_${paddedIndex}_${randSuffix}`;
      } else {
        username = generateRandomUsername(prefix);
      }
      attempts++;
    } while (usedUsernames.has(username) && attempts < 50);

    usedUsernames.add(username);
    const address = `${username}@${cleanDomain}`;

    mailboxes.push({
      address,
      username,
      domain: cleanDomain,
      createdAt: now.toISOString(),
      expiresAt,
      tag: tag.trim() || 'default',
      unreadCount: 0,
      totalMessages: 0,
      isActive: true,
    });
  }

  return mailboxes;
}

/**
 * Extract OTP / 2FA verification codes and confirmation URLs from text and HTML
 */
export function extractOtpAndLinks(textBody: string, htmlBody: string): { otpCode?: string; verificationUrl?: string } {
  const combined = `${textBody}\n${htmlBody}`;

  let otpCode: string | undefined;
  let verificationUrl: string | undefined;

  // Common OTP patterns:
  // "code is 123456", "verification code: 948201", "OTP: 4892", "pin: 123456"
  const otpPatterns = [
    /(?:verification|security|confirmation|login|access|one-time|otp)?\s*(?:code|pin|password|token)\s*(?:is|:|=)?\s*[:\s-]*\b([0-9]{4,8})\b/i,
    /\b([0-9]{6})\b(?:\s+is\s+your\s+(?:verification|security|login|otp)\s+code)/i,
    /<strong[^>]*>([0-9]{4,8})<\/strong>/i,
    /<b[^>]*>([0-9]{4,8})<\/b>/i,
    /<span[^>]*class="[^"]*otp[^"]*"[^>]*>([0-9]{4,8})<\/span>/i,
  ];

  for (const pattern of otpPatterns) {
    const match = combined.match(pattern);
    if (match && match[1]) {
      otpCode = match[1];
      break;
    }
  }

  // Common verification link patterns:
  const linkPatterns = [
    /href=["'](https?:\/\/[^"']*(?:verify|confirm|activate|validation|token|auth)[^"']*)["']/i,
    /(https?:\/\/[^\s<>"']*(?:verify|confirm|activate|validation|token)[^\s<>"']*)/i,
  ];

  for (const pattern of linkPatterns) {
    const match = combined.match(pattern);
    if (match && match[1]) {
      verificationUrl = match[1];
      break;
    }
  }

  return { otpCode, verificationUrl };
}

/**
 * Export mailbox list to CSV, JSON, or newline-delimited TXT
 */
export function formatExportData(
  mailboxes: Mailbox[],
  format: 'csv' | 'json' | 'txt'
): string {
  if (format === 'json') {
    return JSON.stringify(
      mailboxes.map((m) => ({
        address: m.address,
        username: m.username,
        domain: m.domain,
        tag: m.tag,
        createdAt: m.createdAt,
        expiresAt: m.expiresAt,
        messagesCount: m.totalMessages,
      })),
      null,
      2
    );
  }

  if (format === 'csv') {
    const headers = ['Address', 'Username', 'Domain', 'Tag', 'Created At', 'Expires At', 'Total Messages', 'Status'];
    const rows = mailboxes.map((m) => [
      `"${m.address}"`,
      `"${m.username}"`,
      `"${m.domain}"`,
      `"${m.tag || ''}"`,
      `"${m.createdAt}"`,
      `"${m.expiresAt}"`,
      m.totalMessages,
      m.isActive ? 'Active' : 'Expired',
    ]);
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  // TXT: pure list of email addresses, one per line (ideal for pasting into scripts/automation)
  return mailboxes.map((m) => m.address).join('\n');
}

/**
 * Format bytes to human readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format relative timestamp (e.g. "Just now", "2m ago", "1h ago")
 */
export function formatRelativeTime(dateString: string): string {
  const now = Date.now();
  const past = new Date(dateString).getTime();
  const diffInSec = Math.floor((now - past) / 1000);

  if (diffInSec < 5) return 'Just now';
  if (diffInSec < 60) return `${diffInSec}s ago`;
  const diffInMin = Math.floor(diffInSec / 60);
  if (diffInMin < 60) return `${diffInMin}m ago`;
  const diffInHours = Math.floor(diffInMin / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
}

/**
 * Basic sanitization for rendering HTML emails in an isolated sandboxed iframe
 */
export function sanitizeEmailHtml(rawHtml: string): string {
  if (!rawHtml) return '';
  // Strip out malicious scripts, form actions, and external redirects while keeping formatting
  return rawHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:[^"']*/gi, '#');
}
