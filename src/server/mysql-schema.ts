/**
 * MySQL 8.0 Production Database Schema & Migration Script
 * Optimized for high-throughput disposable email ingestion & automatic cleanup.
 */
export const MYSQL_SCHEMA_SQL = `-- ====================================================================
-- TempMail Pro - High-Performance Production MySQL 8.0 Schema
-- Engineered for High-Volume Inbound Mail & Auto-Purging
-- ====================================================================

CREATE DATABASE IF NOT EXISTS \`tempmail_pro\` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE \`tempmail_pro\`;

-- 1. Domains Table (Multi-domain management)
CREATE TABLE IF NOT EXISTS \`domains\` (
  \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  \`domain\` VARCHAR(191) NOT NULL UNIQUE,
  \`is_default\` BOOLEAN NOT NULL DEFAULT FALSE,
  \`is_active\` BOOLEAN NOT NULL DEFAULT TRUE,
  \`mx_host\` VARCHAR(255) NOT NULL DEFAULT 'mail.yourserver.com',
  \`priority\` INT NOT NULL DEFAULT 10,
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX \`idx_domain_active\` (\`domain\`, \`is_active\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Mailboxes Table (Disposable Mailboxes)
CREATE TABLE IF NOT EXISTS \`mailboxes\` (
  \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  \`address\` VARCHAR(191) NOT NULL UNIQUE,
  \`username\` VARCHAR(100) NOT NULL,
  \`domain\` VARCHAR(191) NOT NULL,
  \`tag\` VARCHAR(100) NULL DEFAULT 'default',
  \`token_hash\` VARCHAR(255) NULL,
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`expires_at\` TIMESTAMP NULL,
  \`is_active\` BOOLEAN NOT NULL DEFAULT TRUE,
  \`message_count\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`unread_count\` INT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT \`fk_mailbox_domain\` FOREIGN KEY (\`domain\`) REFERENCES \`domains\` (\`domain\`) ON DELETE CASCADE,
  INDEX \`idx_mailbox_address\` (\`address\`),
  INDEX \`idx_mailbox_expires\` (\`expires_at\`, \`is_active\`),
  INDEX \`idx_mailbox_tag\` (\`tag\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Messages Table (Inbound Emails)
CREATE TABLE IF NOT EXISTS \`messages\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`mailbox_address\` VARCHAR(191) NOT NULL,
  \`sender_name\` VARCHAR(255) NULL,
  \`sender_address\` VARCHAR(255) NOT NULL,
  \`recipient\` VARCHAR(255) NOT NULL,
  \`subject\` VARCHAR(500) NOT NULL,
  \`preview\` VARCHAR(255) NULL,
  \`text_body\` MEDIUMTEXT NULL,
  \`html_body\` LONGTEXT NULL,
  \`raw_headers\` JSON NULL,
  \`otp_code\` VARCHAR(20) NULL,
  \`verification_url\` VARCHAR(1000) NULL,
  \`has_attachments\` BOOLEAN NOT NULL DEFAULT FALSE,
  \`size_bytes\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`is_read\` BOOLEAN NOT NULL DEFAULT FALSE,
  \`received_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT \`fk_message_mailbox\` FOREIGN KEY (\`mailbox_address\`) REFERENCES \`mailboxes\` (\`address\`) ON DELETE CASCADE,
  INDEX \`idx_msg_mailbox_received\` (\`mailbox_address\`, \`received_at\` DESC),
  INDEX \`idx_msg_otp\` (\`otp_code\`),
  INDEX \`idx_msg_read\` (\`is_read\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Message Attachments Table
CREATE TABLE IF NOT EXISTS \`message_attachments\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`message_id\` VARCHAR(64) NOT NULL,
  \`filename\` VARCHAR(255) NOT NULL,
  \`content_type\` VARCHAR(120) NOT NULL,
  \`size_bytes\` INT UNSIGNED NOT NULL,
  \`storage_path\` VARCHAR(500) NOT NULL,
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT \`fk_attachment_msg\` FOREIGN KEY (\`message_id\`) REFERENCES \`messages\` (\`id\`) ON DELETE CASCADE,
  INDEX \`idx_attachment_msg\` (\`message_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. API Keys Table (Third-Party Programmatic Access)
CREATE TABLE IF NOT EXISTS \`api_keys\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`api_key_hash\` VARCHAR(255) NOT NULL UNIQUE,
  \`key_prefix\` VARCHAR(16) NOT NULL,
  \`name\` VARCHAR(120) NOT NULL,
  \`rate_limit_per_min\` INT UNSIGNED NOT NULL DEFAULT 120,
  \`request_count\` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  \`last_used_at\` TIMESTAMP NULL,
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`is_active\` BOOLEAN NOT NULL DEFAULT TRUE,
  INDEX \`idx_api_key_lookup\` (\`api_key_hash\`, \`is_active\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Audit & Webhook Delivery Logs
CREATE TABLE IF NOT EXISTS \`webhook_deliveries\` (
  \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  \`message_id\` VARCHAR(64) NOT NULL,
  \`target_url\` VARCHAR(500) NOT NULL,
  \`status_code\` SMALLINT NULL,
  \`response_time_ms\` INT NULL,
  \`status\` ENUM('pending', 'delivered', 'failed') NOT NULL DEFAULT 'pending',
  \`retry_count\` TINYINT NOT NULL DEFAULT 0,
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX \`idx_webhook_status\` (\`status\`, \`created_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. High-Performance Auto-Purge Event (Runs every 10 minutes)
-- Automatically deletes expired mailboxes and associated cascading emails
DELIMITER $$
CREATE EVENT IF NOT EXISTS \`evt_purge_expired_mailboxes\`
ON SCHEDULE EVERY 10 MINUTE
STARTS CURRENT_TIMESTAMP
DO
BEGIN
  -- Delete mailboxes that have passed their expiration timestamp
  DELETE FROM \`mailboxes\` 
  WHERE \`expires_at\` IS NOT NULL 
    AND \`expires_at\` < NOW();
END$$
DELIMITER ;

-- Seed default domains
INSERT INTO \`domains\` (\`domain\`, \`is_default\`, \`is_active\`, \`mx_host\`, \`priority\`)
VALUES 
  ('tmpinbox.dev', 1, 1, 'mail.tmpinbox.dev', 10),
  ('fastmailr.net', 0, 1, 'mail.fastmailr.net', 10),
  ('burnerbox.site', 0, 1, 'mail.burnerbox.site', 10)
ON DUPLICATE KEY UPDATE \`is_active\` = VALUES(\`is_active\`);
`;

/**
 * Production Node.js SMTP Inbound Server Source Code
 * Receives incoming SMTP emails on port 25 and stores them in MySQL
 */
export const NODE_SMTP_SERVER_CODE = `// ====================================================================
// production-smtp-receiver.ts
// Inbound SMTP Daemon using 'smtp-server' & 'mailparser'
// Run on your Linux VPS (Port 25) with MySQL Connection Pool
// ====================================================================

import { SMTPServer } from 'smtp-server';
import { simpleParser, ParsedMail } from 'mailparser';
import mysql from 'mysql2/promise';
import { crypto } from 'crypto';

// 1. MySQL Connection Pool
const db = mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  user: process.env.MYSQL_USER || 'tempmail',
  password: process.env.MYSQL_PASSWORD || 'secret',
  database: process.env.MYSQL_DATABASE || 'tempmail_pro',
  waitForConnections: true,
  connectionLimit: 50,
  queueLimit: 0,
});

// 2. SMTP Server Configuration
const server = new SMTPServer({
  secure: false,
  disabledCommands: ['AUTH'], // Open inbound relay for incoming MX recipient checks
  size: 15 * 1024 * 1024, // 15MB max email size

  // Validate recipient mailbox exists in database
  async onRcptTo(address, session, callback) {
    try {
      const recipient = address.address.toLowerCase();
      const [rows]: any = await db.query(
        'SELECT address FROM mailboxes WHERE address = ? AND (expires_at IS NULL OR expires_at > NOW()) AND is_active = 1',
        [recipient]
      );
      if (rows.length === 0) {
        return callback(new Error('550 Mailbox does not exist or expired'));
      }
      return callback();
    } catch (err: any) {
      return callback(new Error('451 Temporary lookup failure'));
    }
  },

  // Process data stream
  onData(stream, session, callback) {
    simpleParser(stream, async (err: Error | null, parsed: ParsedMail) => {
      if (err) return callback(err);

      try {
        const messageId = 'msg_' + crypto.randomBytes(12).toString('hex');
        const recipient = (session.envelope.rcptTo[0].address || '').toLowerCase();
        const senderAddress = parsed.from?.value[0]?.address || 'unknown@sender.com';
        const senderName = parsed.from?.value[0]?.name || '';
        const subject = parsed.subject || '(No Subject)';
        const textBody = parsed.text || '';
        const htmlBody = parsed.html || '';

        // Extract OTP
        const otpMatch = (textBody + ' ' + htmlBody).match(/\\b([0-9]{4,8})\\b/);
        const otpCode = otpMatch ? otpMatch[1] : null;

        // Insert into MySQL
        await db.query(
          \`INSERT INTO messages 
            (id, mailbox_address, sender_name, sender_address, recipient, subject, preview, text_body, html_body, otp_code, size_bytes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\`,
          [
            messageId,
            recipient,
            senderName,
            senderAddress,
            recipient,
            subject,
            textBody.substring(0, 150).replace(/\\s+/g, ' '),
            textBody,
            htmlBody,
            otpCode,
            parsed.text?.length || 0,
          ]
        );

        // Increment mailbox message counters
        await db.query(
          'UPDATE mailboxes SET message_count = message_count + 1, unread_count = unread_count + 1 WHERE address = ?',
          [recipient]
        );

        console.log(\`[SMTP] Received email for \${recipient} from \${senderAddress}: "\${subject}"\`);
        return callback(null, 'OK: Message delivered to temp-mailbox');
      } catch (insertError: any) {
        console.error('[SMTP] DB Insert Error:', insertError);
        return callback(new Error('451 Internal delivery failure'));
      }
    });
  },
});

server.listen(25, '0.0.0.0', () => {
  console.log('[SMTP] TempMail Pro Daemon listening on port 25');
});
`;

/**
 * Docker Compose Production Stack
 */
export const DOCKER_COMPOSE_YML = `# ====================================================================
# docker-compose.yml - TempMail Pro Production Infrastructure
# Includes MySQL 8.0, Redis Cache, API Web Server & Inbound Mail Daemon
# ====================================================================

version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: tempmail_mysql
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: root_super_password
      MYSQL_DATABASE: tempmail_pro
      MYSQL_USER: tempmail_app
      MYSQL_PASSWORD: app_secure_password
    volumes:
      - mysql_data:/var/lib/mysql
      - ./schema.sql:/docker-entrypoint-initdb.d/01_schema.sql
    ports:
      - "3306:3306"
    command: --event-scheduler=ON --default-authentication-plugin=mysql_native_password

  redis:
    image: redis:7-alpine
    container_name: tempmail_redis
    restart: always
    ports:
      - "6379:6379"

  api_app:
    build: .
    container_name: tempmail_api
    restart: always
    depends_on:
      - mysql
      - redis
    environment:
      NODE_ENV: production
      PORT: 3000
      MYSQL_HOST: mysql
      MYSQL_USER: tempmail_app
      MYSQL_PASSWORD: app_secure_password
      MYSQL_DATABASE: tempmail_pro
      REDIS_URL: redis://redis:6379
    ports:
      - "80:3000"

  smtp_daemon:
    build:
      context: .
      dockerfile: Dockerfile.smtp
    container_name: tempmail_smtp
    restart: always
    depends_on:
      - mysql
    environment:
      MYSQL_HOST: mysql
      MYSQL_USER: tempmail_app
      MYSQL_PASSWORD: app_secure_password
      MYSQL_DATABASE: tempmail_pro
    ports:
      - "25:25"

volumes:
  mysql_data:
`;

/**
 * Python Automated Bulk Testing Script
 */
export const PYTHON_AUTOMATION_SCRIPT = `#!/usr/bin/env python3
"""
TempMail Pro - Python Automation Client
Demonstrates bulk mailbox creation, registration triggering, and automatic OTP polling.
"""

import requests
import time
import re

API_BASE = "https://your-tempmail-service.com/api/v1"
API_KEY = "tmp_live_your_api_key_here"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

def create_bulk_inboxes(count=5, prefix="worker-bot", domain="tmpinbox.dev", expiry_min=30):
    print(f"[*] Generating {count} temporary mailboxes...")
    resp = requests.post(
        f"{API_BASE}/mailbox/bulk",
        json={"count": count, "prefix": prefix, "domain": domain, "expiresInMinutes": expiry_min},
        headers=headers
    )
    resp.raise_for_status()
    data = resp.json()
    print(f"[+] Created {len(data['mailboxes'])} mailboxes successfully.")
    return data['mailboxes']

def wait_for_otp(email_address, timeout_seconds=60, poll_interval=2):
    print(f"[*] Waiting for OTP sent to {email_address} (Timeout: {timeout_seconds}s)...")
    start = time.time()
    
    while time.time() - start < timeout_seconds:
        resp = requests.get(f"{API_BASE}/mailbox/{email_address}/messages", headers=headers)
        if resp.status_code == 200:
            messages = resp.json().get("messages", [])
            if messages:
                latest = messages[0]
                otp = latest.get("otpCode")
                if otp:
                    print(f"[SUCCESS] OTP found for {email_address}: {otp} (Subject: {latest['subject']})")
                    return otp
                else:
                    # Fallback regex extraction
                    found = re.search(r'\\b(\\d{6})\\b', latest.get('textBody', ''))
                    if found:
                        print(f"[SUCCESS] Extracted 6-digit code: {found.group(1)}")
                        return found.group(1)
        time.sleep(poll_interval)
    
    print(f"[-] Timeout waiting for email at {email_address}")
    return None

if __name__ == "__main__":
    # 1. Spawn 5 accounts
    boxes = create_bulk_inboxes(count=3, prefix="e2e-test", domain="tmpinbox.dev")
    target = boxes[0]['address']
    
    # 2. Trigger test email simulation (or replace with your real app's signup POST)
    print(f"[*] Simulating incoming email to {target}...")
    requests.post(f"{API_BASE}/simulate/incoming", json={
        "to": target,
        "fromName": "GitHub Auth",
        "fromAddress": "no-reply@github.com",
        "subject": "Your GitHub verification code is 849102",
        "textBody": "Use 849102 to verify your sign-in attempt. Valid for 10 minutes.",
        "otpCode": "849102"
    }, headers=headers)

    # 3. Poll for OTP
    otp = wait_for_otp(target)
    print(f"[*] Final verified OTP: {otp}")
`;
