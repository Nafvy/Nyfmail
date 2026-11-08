import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { storage } from './src/server/storage.js';
import {
  MYSQL_SCHEMA_SQL,
  NODE_SMTP_SERVER_CODE,
  DOCKER_COMPOSE_YML,
  PYTHON_AUTOMATION_SCRIPT,
} from './src/server/mysql-schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware to record API usage when auth header is present
app.use('/api', (req, res, next) => {
  const authHeader = req.headers.authorization;
  storage.recordApiUsage(authHeader);
  next();
});

// ==========================================
// REST API v1 ENDPOINTS
// ==========================================

// 1. Domains
app.get('/api/v1/domains', (req: Request, res: Response) => {
  res.json({ domains: storage.getDomains() });
});

// 2. Mailboxes
app.get('/api/v1/mailboxes', (req: Request, res: Response) => {
  res.json({ mailboxes: storage.getAllMailboxes() });
});

app.post('/api/v1/mailbox/generate', (req: Request, res: Response) => {
  const { domain, prefix, expiresInMinutes, tag } = req.body || {};
  const mailbox = storage.createMailbox(
    domain || 'tmpinbox.dev',
    prefix,
    expiresInMinutes !== undefined ? Number(expiresInMinutes) : 60,
    tag || 'single'
  );
  res.status(201).json({ success: true, mailbox });
});

app.post('/api/v1/mailbox/bulk', (req: Request, res: Response) => {
  const { count, domain, prefix, expiresInMinutes, tag } = req.body || {};
  const numCount = Math.max(1, Math.min(Number(count) || 5, 200));
  const mailboxes = storage.createBulkMailboxes(
    numCount,
    domain || 'tmpinbox.dev',
    prefix,
    expiresInMinutes !== undefined ? Number(expiresInMinutes) : 60,
    tag || 'bulk'
  );
  res.status(201).json({
    success: true,
    count: mailboxes.length,
    mailboxes,
  });
});

app.get('/api/v1/mailbox/:address', (req: Request, res: Response) => {
  const mailbox = storage.getMailbox(req.params.address);
  if (!mailbox) {
    return res.status(404).json({ error: 'Mailbox not found' });
  }
  res.json({ mailbox });
});

app.delete('/api/v1/mailbox/:address', (req: Request, res: Response) => {
  const success = storage.deleteMailbox(req.params.address);
  if (!success) {
    return res.status(404).json({ error: 'Mailbox not found' });
  }
  res.json({ success: true, message: 'Mailbox deleted' });
});

app.post('/api/v1/mailbox/:address/extend', (req: Request, res: Response) => {
  const { minutes } = req.body || {};
  const mb = storage.extendMailboxExpiry(req.params.address, Number(minutes) || 30);
  if (!mb) {
    return res.status(404).json({ error: 'Mailbox not found' });
  }
  res.json({ success: true, mailbox: mb });
});

app.post('/api/v1/mailbox/batch-delete', (req: Request, res: Response) => {
  const { addresses } = req.body || {};
  if (!Array.isArray(addresses)) {
    return res.status(400).json({ error: 'addresses array required' });
  }
  const deletedCount = storage.deleteMultipleMailboxes(addresses);
  res.json({ success: true, deletedCount });
});

// 3. Messages
app.get('/api/v1/messages', (req: Request, res: Response) => {
  // Returns all messages across inboxes (unified view)
  res.json({ messages: storage.getAllMessages() });
});

app.get('/api/v1/mailbox/:address/messages', (req: Request, res: Response) => {
  const messages = storage.getMessagesByMailbox(req.params.address);
  res.json({
    address: req.params.address,
    count: messages.length,
    messages,
  });
});

app.delete('/api/v1/mailbox/:address/messages', (req: Request, res: Response) => {
  const cleared = storage.clearMailboxMessages(req.params.address);
  res.json({ success: true, clearedCount: cleared });
});

app.get('/api/v1/messages/:id', (req: Request, res: Response) => {
  const message = storage.getMessageById(req.params.id);
  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }
  res.json({ message });
});

app.post('/api/v1/messages/:id/read', (req: Request, res: Response) => {
  const message = storage.markMessageAsRead(req.params.id);
  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }
  res.json({ success: true, message });
});

// 4. Inbound Email Simulation / Webhook Receiver
app.post('/api/v1/simulate/incoming', (req: Request, res: Response) => {
  const { to, fromName, fromAddress, subject, textBody, htmlBody, otpCode, attachments } = req.body || {};
  if (!to) {
    return res.status(400).json({ error: 'Recipient "to" address is required' });
  }

  const message = storage.simulateIncomingEmail({
    to,
    fromName,
    fromAddress: fromAddress || 'notification@service.com',
    subject: subject || 'Notice / Verification',
    textBody: textBody || 'Hello from TempMail Pro test pipeline.',
    htmlBody,
    otpCode,
    attachments,
  });

  res.status(201).json({
    success: true,
    messageId: message.id,
    recipient: message.to,
    otpCode: message.otpCode,
    receivedAt: message.receivedAt,
  });
});

// 5. API Keys
app.get('/api/v1/api-keys', (req: Request, res: Response) => {
  res.json({ apiKeys: storage.getApiKeys() });
});

app.post('/api/v1/api-keys', (req: Request, res: Response) => {
  const { name, rateLimitPerMin } = req.body || {};
  const apiKey = storage.createApiKey(name, Number(rateLimitPerMin) || 120);
  res.status(201).json({ success: true, apiKey });
});

app.delete('/api/v1/api-keys/:key', (req: Request, res: Response) => {
  const success = storage.deleteApiKey(req.params.key);
  res.json({ success });
});

// 6. Dashboard Stats
app.get('/api/v1/dashboard/stats', (req: Request, res: Response) => {
  res.json({ stats: storage.getStats() });
});

// 7. System Sources & MySQL Schema
app.get('/api/v1/system/mysql-schema', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(MYSQL_SCHEMA_SQL);
});

app.get('/api/v1/system/source-code', (req: Request, res: Response) => {
  res.json({
    mysqlSchema: MYSQL_SCHEMA_SQL,
    smtpServerNode: NODE_SMTP_SERVER_CODE,
    dockerCompose: DOCKER_COMPOSE_YML,
    pythonAutomation: PYTHON_AUTOMATION_SCRIPT,
  });
});

// ==========================================
// Vite Dev Server / Static File Serving
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[TempMail Pro] Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
