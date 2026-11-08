import { useState, useEffect, useRef, useCallback } from 'react';
import { Header, NavTab } from './components/Header.js';
import { InboxView } from './components/InboxView.js';
import { BulkAccountView } from './components/BulkAccountView.js';
import { ApiExplorerView } from './components/ApiExplorerView.js';
import { DashboardStatsView } from './components/DashboardStatsView.js';
import { DocumentationSourceView } from './components/DocumentationSourceView.js';
import { TestMailModal } from './components/TestMailModal.js';
import { Mailbox, EmailMessage, DomainItem, ApiKeyItem, DashboardStats } from './types/index.js';
import { notificationSound, sendDesktopNotification } from './utils/audio.js';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('inbox');
  const [currentMailbox, setCurrentMailbox] = useState<Mailbox | null>(null);
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [domains, setDomains] = useState<DomainItem[]>([]);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [allMessages, setAllMessages] = useState<EmailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    activeInboxes: 1,
    totalMessagesToday: 2,
    totalMessagesAllTime: 1822,
    spamFilteredCount: 84,
    activeDomainsCount: 4,
    apiRequestsToday: 142,
    storageUsedBytes: 48500,
  });

  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testModalAddress, setTestModalAddress] = useState<string>('');

  // Keep track of known message IDs to detect new arrivals for sound & push
  const knownMessageIdsRef = useRef<Set<string>>(new Set());

  // Check Notification API support
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    } else {
      setNotificationPermission('unsupported');
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === 'granted') {
        sendDesktopNotification('TempMail Pro Active', 'Desktop notifications enabled for incoming emails and OTP codes!');
      }
    }
  };

  // 1. Initial Load: domains, mailboxes, api-keys, stats
  const fetchInitialData = useCallback(async () => {
    try {
      const [domRes, mbRes, keyRes, statsRes] = await Promise.all([
        fetch('/api/v1/domains').then((r) => r.json()),
        fetch('/api/v1/mailboxes').then((r) => r.json()),
        fetch('/api/v1/api-keys').then((r) => r.json()),
        fetch('/api/v1/dashboard/stats').then((r) => r.json()),
      ]);

      if (domRes?.domains) setDomains(domRes.domains);
      if (keyRes?.apiKeys) setApiKeys(keyRes.apiKeys);
      if (statsRes?.stats) setStats(statsRes.stats);

      if (mbRes?.mailboxes && mbRes.mailboxes.length > 0) {
        setMailboxes(mbRes.mailboxes);
        // Default to first active mailbox if none set
        setCurrentMailbox((prev) => {
          if (prev) {
            const found = mbRes.mailboxes.find((m: Mailbox) => m.address === prev.address);
            return found || mbRes.mailboxes[0];
          }
          return mbRes.mailboxes[0];
        });
      } else {
        // Create initial mailbox if empty
        const created = await fetch('/api/v1/mailbox/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain: 'tmpinbox.dev' }),
        }).then((r) => r.json());
        if (created?.mailbox) {
          setCurrentMailbox(created.mailbox);
          setMailboxes([created.mailbox]);
        }
      }
    } catch (err) {
      console.error('[TempMail] Initial load failed:', err);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // 2. Poll Messages for active mailbox + all messages for unified feed
  const fetchMessages = useCallback(async (isBackground = false) => {
    if (!currentMailbox) return;
    if (!isBackground) setIsLoadingMessages(true);

    try {
      const [currentRes, allRes] = await Promise.all([
        fetch(`/api/v1/mailbox/${encodeURIComponent(currentMailbox.address)}/messages`).then((r) => r.json()),
        fetch('/api/v1/messages').then((r) => r.json()),
      ]);

      const fetchedMessages: EmailMessage[] = currentRes?.messages || [];
      const fetchedAll: EmailMessage[] = allRes?.messages || [];

      // Detect new incoming messages
      let hasNew = false;
      let newestMsg: EmailMessage | null = null;

      for (const m of fetchedMessages) {
        if (!knownMessageIdsRef.current.has(m.id)) {
          knownMessageIdsRef.current.add(m.id);
          if (isBackground) {
            hasNew = true;
            newestMsg = m;
          }
        }
      }

      setMessages(fetchedMessages);
      setAllMessages(fetchedAll);

      // Trigger audio & desktop notification if new message arrived in background
      if (hasNew && newestMsg) {
        if (soundEnabled) {
          notificationSound.playChime();
        }
        sendDesktopNotification(
          `New Email from ${newestMsg.from.name || newestMsg.from.address}`,
          newestMsg.otpCode
            ? `OTP Code: ${newestMsg.otpCode} · ${newestMsg.subject}`
            : newestMsg.subject
        );
      }

      // If no selected message, default to first one
      setSelectedMessage((prev) => {
        if (!prev && fetchedMessages.length > 0) return fetchedMessages[0];
        if (prev) {
          const updated = fetchedMessages.find((m) => m.id === prev.id);
          return updated || (fetchedMessages.length > 0 ? fetchedMessages[0] : null);
        }
        return null;
      });
    } catch (err) {
      console.error('[TempMail] Fetch messages error:', err);
    } finally {
      if (!isBackground) setIsLoadingMessages(false);
    }
  }, [currentMailbox, soundEnabled]);

  // Poll every 4 seconds
  useEffect(() => {
    if (!currentMailbox) return;
    fetchMessages(false);

    const interval = setInterval(() => {
      fetchMessages(true);
    }, 4000);

    return () => clearInterval(interval);
  }, [currentMailbox, fetchMessages]);

  // Handler: Select a message and mark it read
  const handleSelectMessage = async (msg: EmailMessage) => {
    setSelectedMessage(msg);
    if (!msg.isRead) {
      try {
        await fetch(`/api/v1/messages/${msg.id}/read`, { method: 'POST' });
        msg.isRead = true;
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, isRead: true } : m)));
        if (currentMailbox && currentMailbox.unreadCount > 0) {
          setCurrentMailbox({ ...currentMailbox, unreadCount: currentMailbox.unreadCount - 1 });
        }
      } catch (e) {
        console.error('Error marking as read:', e);
      }
    }
  };

  // Handler: Generate new random or custom mailbox
  const handleGenerateNew = async (domain: string, prefix?: string) => {
    try {
      const res = await fetch('/api/v1/mailbox/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, prefix, expiresInMinutes: 60 }),
      });
      const data = await res.json();
      if (data?.mailbox) {
        setCurrentMailbox(data.mailbox);
        setMailboxes((prev) => [data.mailbox, ...prev]);
        setMessages([]);
        setSelectedMessage(null);
      }
    } catch (err) {
      console.error('Failed to generate mailbox:', err);
    }
  };

  // Handler: Create bulk mailboxes
  const handleGenerateBulk = async (
    count: number,
    domain: string,
    prefix?: string,
    expiresInMinutes?: number,
    tag?: string
  ) => {
    try {
      const res = await fetch('/api/v1/mailbox/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count, domain, prefix, expiresInMinutes, tag }),
      });
      const data = await res.json();
      if (data?.mailboxes) {
        setMailboxes((prev) => [...data.mailboxes, ...prev]);
        // Set first of the new bulk accounts as active
        if (data.mailboxes[0]) {
          setCurrentMailbox(data.mailboxes[0]);
        }
      }
    } catch (err) {
      console.error('Failed to generate bulk mailboxes:', err);
    }
  };

  // Handler: Delete mailbox
  const handleDeleteMailbox = async (address: string) => {
    try {
      await fetch(`/api/v1/mailbox/${encodeURIComponent(address)}`, { method: 'DELETE' });
      setMailboxes((prev) => prev.filter((m) => m.address !== address));
      if (currentMailbox?.address === address) {
        const remaining = mailboxes.filter((m) => m.address !== address);
        if (remaining.length > 0) {
          setCurrentMailbox(remaining[0]);
        } else {
          handleGenerateNew('tmpinbox.dev');
        }
      }
    } catch (err) {
      console.error('Failed to delete mailbox:', err);
    }
  };

  // Handler: Batch delete mailboxes
  const handleBatchDelete = async (addresses: string[]) => {
    try {
      await fetch('/api/v1/mailbox/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresses }),
      });
      const addrSet = new Set(addresses);
      setMailboxes((prev) => prev.filter((m) => !addrSet.has(m.address)));
      if (currentMailbox && addrSet.has(currentMailbox.address)) {
        const remaining = mailboxes.filter((m) => !addrSet.has(m.address));
        if (remaining.length > 0) {
          setCurrentMailbox(remaining[0]);
        } else {
          handleGenerateNew('tmpinbox.dev');
        }
      }
    } catch (err) {
      console.error('Failed to batch delete:', err);
    }
  };

  // Handler: Extend expiry
  const handleExtendExpiry = async (address: string) => {
    try {
      const res = await fetch(`/api/v1/mailbox/${encodeURIComponent(address)}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes: 30 }),
      });
      const data = await res.json();
      if (data?.mailbox) {
        setCurrentMailbox(data.mailbox);
        setMailboxes((prev) => prev.map((m) => (m.address === address ? data.mailbox : m)));
      }
    } catch (err) {
      console.error('Failed to extend expiry:', err);
    }
  };

  // Handler: Clear all messages in current mailbox
  const handleClearMessages = async (address: string) => {
    if (confirm('Are you sure you want to delete all messages in this mailbox?')) {
      try {
        await fetch(`/api/v1/mailbox/${encodeURIComponent(address)}/messages`, { method: 'DELETE' });
        setMessages([]);
        setSelectedMessage(null);
        if (currentMailbox) {
          setCurrentMailbox({ ...currentMailbox, unreadCount: 0, totalMessages: 0 });
        }
      } catch (err) {
        console.error('Failed to clear messages:', err);
      }
    }
  };

  // Handler: API Keys
  const handleCreateApiKey = async (name: string) => {
    try {
      const res = await fetch('/api/v1/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (data?.apiKey) {
        setApiKeys((prev) => [data.apiKey, ...prev]);
      }
    } catch (err) {
      console.error('Failed to create API key:', err);
    }
  };

  const handleDeleteApiKey = async (key: string) => {
    try {
      await fetch(`/api/v1/api-keys/${encodeURIComponent(key)}`, { method: 'DELETE' });
      setApiKeys((prev) => prev.filter((k) => k.key !== key));
    } catch (err) {
      console.error('Failed to delete API key:', err);
    }
  };

  const totalUnreadCount = currentMailbox?.unreadCount || 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* 1. Header (Follows Top Bar Contract) */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenTestModal={() => {
          setTestModalAddress(currentMailbox?.address || '');
          setIsTestModalOpen(true);
        }}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        unreadTotal={totalUnreadCount}
      />

      {/* 2. Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'inbox' && (
          <InboxView
            currentMailbox={currentMailbox}
            domains={domains}
            messages={messages}
            selectedMessage={selectedMessage}
            isLoading={isLoadingMessages}
            onSelectMessage={handleSelectMessage}
            onRefresh={() => fetchMessages(false)}
            onGenerateNew={handleGenerateNew}
            onExtendExpiry={handleExtendExpiry}
            onDeleteMailbox={handleDeleteMailbox}
            onClearMessages={handleClearMessages}
            onOpenTestModal={() => {
              setTestModalAddress(currentMailbox?.address || '');
              setIsTestModalOpen(true);
            }}
          />
        )}

        {activeTab === 'bulk' && (
          <BulkAccountView
            mailboxes={mailboxes}
            domains={domains}
            allMessages={allMessages}
            currentAddress={currentMailbox?.address}
            onSelectAsActive={(address) => {
              const mb = mailboxes.find((m) => m.address === address);
              if (mb) {
                setCurrentMailbox(mb);
                setActiveTab('inbox');
              }
            }}
            onGenerateBulk={handleGenerateBulk}
            onBatchDelete={handleBatchDelete}
            onSingleDelete={handleDeleteMailbox}
            onOpenTestModalForAddress={(address) => {
              setTestModalAddress(address);
              setIsTestModalOpen(true);
            }}
          />
        )}

        {activeTab === 'api' && (
          <ApiExplorerView
            apiKeys={apiKeys}
            onCreateApiKey={handleCreateApiKey}
            onDeleteApiKey={handleDeleteApiKey}
            currentAddress={currentMailbox?.address || ''}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardStatsView
            stats={stats}
            domains={domains}
            notificationPermission={notificationPermission}
            onRequestNotificationPermission={requestNotificationPermission}
          />
        )}

        {activeTab === 'docs' && <DocumentationSourceView />}
      </main>

      {/* 3. In-App Incoming Email Simulation Modal */}
      <TestMailModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        currentAddress={testModalAddress || currentMailbox?.address || ''}
        onMailSent={() => {
          fetchMessages(false);
          notificationSound.playChime();
        }}
      />
    </div>
  );
}
