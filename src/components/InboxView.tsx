import { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Clock,
  Key,
  ExternalLink,
  Plus,
  Mail,
  Search,
  FileText,
  Code2,
  Paperclip,
  CheckCheck,
  Share2
} from 'lucide-react';
import { Mailbox, EmailMessage, DomainItem } from '../types/index.js';
import { formatRelativeTime, formatBytes } from '../utils/mail-generator.js';

interface InboxViewProps {
  currentMailbox: Mailbox | null;
  domains: DomainItem[];
  messages: EmailMessage[];
  selectedMessage: EmailMessage | null;
  isLoading: boolean;
  onSelectMessage: (msg: EmailMessage) => void;
  onRefresh: () => void;
  onGenerateNew: (domain: string, prefix?: string) => void;
  onExtendExpiry: (address: string) => void;
  onDeleteMailbox: (address: string) => void;
  onClearMessages: (address: string) => void;
  onOpenTestModal: () => void;
}

export function InboxView({
  currentMailbox,
  domains,
  messages,
  selectedMessage,
  isLoading,
  onSelectMessage,
  onRefresh,
  onGenerateNew,
  onExtendExpiry,
  onDeleteMailbox,
  onClearMessages,
  onOpenTestModal,
}: InboxViewProps) {
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedOtp, setCopiedOtp] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'html' | 'text' | 'headers' | 'attachments'>('html');
  const [selectedDomain, setSelectedDomain] = useState(domains[0]?.domain || 'tmpinbox.dev');
  const [customPrefix, setCustomPrefix] = useState('');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [remainingTime, setRemainingTime] = useState<string>('--:--');

  // Sync selectedDomain if domains list loads
  useEffect(() => {
    if (domains.length > 0 && !selectedDomain) {
      setSelectedDomain(domains[0].domain);
    }
  }, [domains]);

  // Expiration Countdown calculation
  useEffect(() => {
    if (!currentMailbox || currentMailbox.expiresAt === 'never') {
      setRemainingTime('Never');
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const expiry = new Date(currentMailbox.expiresAt).getTime();
      const diff = Math.max(0, Math.floor((expiry - now) / 1000));

      if (diff === 0) {
        setRemainingTime('Expired');
      } else {
        const mins = Math.floor(diff / 60);
        const secs = diff % 60;
        setRemainingTime(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentMailbox]);

  const copyToClipboard = (text: string, type: 'address' | 'otp') => {
    navigator.clipboard.writeText(text);
    if (type === 'address') {
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } else {
      setCopiedOtp(text);
      setTimeout(() => setCopiedOtp(null), 2000);
    }
  };

  const filteredMessages = messages.filter((m) => {
    const q = searchQuery.toLowerCase();
    return (
      m.subject.toLowerCase().includes(q) ||
      m.from.name.toLowerCase().includes(q) ||
      m.from.address.toLowerCase().includes(q) ||
      (m.otpCode && m.otpCode.includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* 1. Active Address Command Center */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
              Your Temporary Email Address
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xl sm:text-2xl font-mono font-bold text-white tracking-tight break-all">
                {currentMailbox?.address || 'Generating address...'}
              </span>
              {currentMailbox && (
                <button
                  onClick={() => copyToClipboard(currentMailbox.address, 'address')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-sm shadow-indigo-600/30 transition-all shrink-0"
                >
                  {copiedAddress ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Address</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Quick Action Controls */}
          <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0">
            {/* Domain Dropdown */}
            <select
              value={selectedDomain}
              onChange={(e) => {
                setSelectedDomain(e.target.value);
                onGenerateNew(e.target.value);
              }}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {domains.map((d) => (
                <option key={d.domain} value={d.domain}>
                  @{d.domain}
                </option>
              ))}
            </select>

            {/* Random New Address */}
            <button
              onClick={() => onGenerateNew(selectedDomain)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
              <span>New Random</span>
            </button>

            {/* Custom Alias */}
            <button
              onClick={() => setShowCustomModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Custom Alias</span>
            </button>

            {/* QR Code */}
            <button
              onClick={() => setShowQrCode((prev) => !prev)}
              aria-label="Toggle QR Code"
              className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
              title="Show QR Code"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status bar: Expiry timer & extend */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Expires in:</span>
              <span className="font-mono font-bold text-white tabular-nums bg-slate-800 px-2 py-0.5 rounded">
                {remainingTime}
              </span>
            </div>
            {currentMailbox && (
              <button
                onClick={() => onExtendExpiry(currentMailbox.address)}
                className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
              >
                +10 min extend
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <span>
              Total Received: <strong className="text-white font-mono">{messages.length}</strong>
            </span>
            {currentMailbox && (
              <button
                onClick={() => onDeleteMailbox(currentMailbox.address)}
                className="text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Address</span>
              </button>
            )}
          </div>
        </div>

        {/* QR Code Dropdown Card */}
        {showQrCode && currentMailbox && (
          <div className="mt-4 p-4 bg-slate-950 border border-slate-800 rounded-lg flex flex-col sm:flex-row items-center gap-4 animate-in fade-in duration-150">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                currentMailbox.address
              )}&color=6366f1&bgcolor=020617`}
              alt="QR Code for temporary email"
              className="w-28 h-28 rounded-lg border border-slate-800"
            />
            <div className="text-xs text-slate-400 space-y-1">
              <p className="font-semibold text-slate-200">Scan to copy address on mobile:</p>
              <p className="font-mono text-indigo-300 break-all">{currentMailbox.address}</p>
              <p>Scan with your smartphone camera to quickly paste into mobile signup forms.</p>
            </div>
          </div>
        )}
      </div>

      {/* Custom Alias Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-semibold text-white">Choose Custom Username</h3>
            <p className="text-xs text-slate-400">
              Create a personalized temporary address with your chosen alias name and domain.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Prefix / Alias Name:
                </label>
                <div className="flex items-center">
                  <input
                    type="text"
                    placeholder="mycustomname"
                    value={customPrefix}
                    onChange={(e) => setCustomPrefix(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                    className="flex-1 px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-l-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="px-3 py-2 bg-slate-800 border-y border-r border-slate-700 text-slate-300 text-sm font-mono rounded-r-lg">
                    @{selectedDomain}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCustomModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (customPrefix.trim()) {
                    onGenerateNew(selectedDomain, customPrefix.trim());
                    setShowCustomModal(false);
                    setCustomPrefix('');
                  }
                }}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm"
              >
                Create Mailbox
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Main 2-Column Mail Client */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[560px]">
        {/* Left Column: Email List (lg:col-span-5) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
          {/* Email list header with search & refresh */}
          <div className="p-3.5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search messages, OTP, sender..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <button
              onClick={onRefresh}
              disabled={isLoading}
              title="Refresh inbox"
              className="p-2 text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>

            {messages.length > 0 && currentMailbox && (
              <button
                onClick={() => onClearMessages(currentMailbox.address)}
                title="Clear all messages in this mailbox"
                className="p-2 text-rose-400 hover:text-rose-300 bg-slate-950 border border-slate-800 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/70">
            {filteredMessages.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center space-y-3 my-auto">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                  <Mail className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-slate-200">Inbox is waiting for mail</h4>
                  <p className="text-xs text-slate-400 max-w-xs">
                    Emails sent to <span className="font-mono text-indigo-300">{currentMailbox?.address}</span> will appear here automatically.
                  </p>
                </div>
                <button
                  onClick={onOpenTestModal}
                  className="mt-2 px-3 py-1.5 text-xs font-semibold text-indigo-400 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-800/60 rounded-lg transition-colors"
                >
                  Send Test Email Now
                </button>
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isSelected = selectedMessage?.id === msg.id;
                return (
                  <button
                    key={msg.id}
                    onClick={() => onSelectMessage(msg)}
                    className={`w-full text-left p-4 transition-colors relative flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-slate-800/90'
                        : msg.isRead
                        ? 'bg-slate-900 hover:bg-slate-800/50'
                        : 'bg-indigo-950/20 hover:bg-indigo-950/30'
                    }`}
                  >
                    {!msg.isRead && (
                      <span className="absolute left-1.5 top-5 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-xs font-semibold truncate ${
                          msg.isRead ? 'text-slate-300' : 'text-white'
                        }`}
                      >
                        {msg.from.name || msg.from.address}
                      </span>
                      <span className="text-[11px] text-slate-500 whitespace-nowrap shrink-0">
                        {formatRelativeTime(msg.receivedAt)}
                      </span>
                    </div>

                    <div
                      className={`text-xs truncate ${
                        msg.isRead ? 'text-slate-400' : 'text-slate-100 font-medium'
                      }`}
                    >
                      {msg.subject}
                    </div>

                    <p className="text-[11px] text-slate-500 line-clamp-1">{msg.preview}</p>

                    {/* Detected OTP pill */}
                    {msg.otpCode && (
                      <div className="mt-1 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
                          <Key className="w-3 h-3 text-emerald-400" />
                          <span>OTP: {msg.otpCode}</span>
                        </span>

                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(msg.otpCode!, 'otp');
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.stopPropagation();
                              copyToClipboard(msg.otpCode!, 'otp');
                            }
                          }}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 cursor-pointer"
                        >
                          {copiedOtp === msg.otpCode ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy OTP</span>
                            </>
                          )}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Full Email Reader (lg:col-span-7) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
          {selectedMessage ? (
            <div className="flex flex-col h-full">
              {/* Message Header Bar */}
              <div className="p-5 border-b border-slate-800 bg-slate-900 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
                    {selectedMessage.subject}
                  </h3>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-slate-400">
                      {new Date(selectedMessage.receivedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
                  <div className="space-y-0.5">
                    <div>
                      From:{' '}
                      <strong className="text-slate-200">
                        {selectedMessage.from.name}
                      </strong>{' '}
                      <span className="font-mono text-slate-400">
                        &lt;{selectedMessage.from.address}&gt;
                      </span>
                    </div>
                    <div>
                      To:{' '}
                      <span className="font-mono text-slate-300">
                        {selectedMessage.to}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 rounded">
                      SPF: PASS
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 rounded">
                      DKIM: PASS
                    </span>
                  </div>
                </div>

                {/* Detected Verification Code Callout */}
                {selectedMessage.otpCode && (
                  <div className="p-3.5 bg-indigo-950/40 border border-indigo-800/70 rounded-lg flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
                        <Key className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider">
                          Extracted One-Time Password (OTP)
                        </div>
                        <div className="text-2xl font-mono font-bold text-white tracking-widest">
                          {selectedMessage.otpCode}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => copyToClipboard(selectedMessage.otpCode!, 'otp')}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm shadow-indigo-600/30 transition-all shrink-0"
                    >
                      {copiedOtp === selectedMessage.otpCode ? (
                        <>
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy OTP</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Detected Verification Link */}
                {selectedMessage.verificationUrl && (
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-300 truncate">
                      Verification Link detected: <span className="font-mono text-indigo-400">{selectedMessage.verificationUrl}</span>
                    </span>
                    <a
                      href={selectedMessage.verificationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-800/80 rounded-md transition-colors shrink-0"
                    >
                      <span>Open Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {/* View Tabs */}
                <div className="flex items-center gap-1 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => setActiveTab('html')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      activeTab === 'html'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>HTML View</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('text')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      activeTab === 'text'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Plain Text</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('headers')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      activeTab === 'headers'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>Headers &amp; RFC</span>
                  </button>
                  {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                    <button
                      onClick={() => setActiveTab('attachments')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        activeTab === 'attachments'
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>Attachments ({selectedMessage.attachments.length})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Message Content Body */}
              <div className="flex-1 p-5 overflow-y-auto bg-slate-950">
                {activeTab === 'html' && (
                  <div className="bg-white rounded-lg p-4 overflow-x-auto min-h-[320px]">
                    <iframe
                      title="HTML Email Content"
                      srcDoc={selectedMessage.htmlBody || `<p>${selectedMessage.textBody}</p>`}
                      sandbox="allow-popups allow-popups-to-escape-sandbox"
                      className="w-full min-h-[340px] border-none"
                    />
                  </div>
                )}

                {activeTab === 'text' && (
                  <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed p-4 bg-slate-900 rounded-lg border border-slate-800">
                    {selectedMessage.textBody}
                  </pre>
                )}

                {activeTab === 'headers' && (
                  <div className="space-y-3 font-mono text-xs">
                    <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 space-y-2">
                      <div className="text-indigo-400 font-semibold mb-2">// RFC 822 Email Headers</div>
                      {Object.entries(selectedMessage.headers || {}).map(([key, val]) => (
                        <div key={key} className="flex flex-col sm:flex-row sm:gap-2">
                          <span className="text-slate-400 shrink-0">{key}:</span>
                          <span className="text-slate-200 break-all">{val}</span>
                        </div>
                      ))}
                      <div className="flex flex-col sm:flex-row sm:gap-2">
                        <span className="text-slate-400 shrink-0">Received-Date:</span>
                        <span className="text-slate-200">{selectedMessage.receivedAt}</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'attachments' && (
                  <div className="space-y-3">
                    {selectedMessage.attachments?.map((att) => (
                      <div
                        key={att.id}
                        className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <Paperclip className="w-4 h-4 text-slate-400" />
                          <div>
                            <div className="text-xs font-semibold text-slate-200">{att.filename}</div>
                            <div className="text-[11px] text-slate-500">
                              {formatBytes(att.size)} · {att.contentType}
                            </div>
                          </div>
                        </div>
                        <a
                          href={att.downloadUrl}
                          download={att.filename}
                          className="px-3 py-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-950/60 rounded-md border border-indigo-800/60 transition-colors"
                        >
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400">
                <Mail className="w-8 h-8" />
              </div>
              <h4 className="text-base font-semibold text-slate-300">No message selected</h4>
              <p className="text-xs text-slate-400 max-w-sm">
                Select an email from the left list to read its content, inspect headers, copy 2FA codes, or preview HTML formatting.
              </p>
              <button
                onClick={onOpenTestModal}
                className="mt-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm shadow-indigo-600/30 transition-all"
              >
                Send Test Email to this Address
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
