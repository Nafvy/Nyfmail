import { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Download,
  Trash2,
  Copy,
  Check,
  Search,
  ExternalLink,
  Layers,
  FileSpreadsheet,
  FileCode,
  FileText,
  Key
} from 'lucide-react';
import { Mailbox, DomainItem, EmailMessage } from '../types/index.js';
import { formatExportData, formatRelativeTime } from '../utils/mail-generator.js';

interface BulkAccountViewProps {
  mailboxes: Mailbox[];
  domains: DomainItem[];
  allMessages: EmailMessage[];
  currentAddress?: string;
  onSelectAsActive: (address: string) => void;
  onGenerateBulk: (
    count: number,
    domain: string,
    prefix?: string,
    expiresInMinutes?: number,
    tag?: string
  ) => Promise<void>;
  onBatchDelete: (addresses: string[]) => Promise<void>;
  onSingleDelete: (address: string) => Promise<void>;
  onOpenTestModalForAddress: (address: string) => void;
}

export function BulkAccountView({
  mailboxes,
  domains,
  allMessages,
  currentAddress,
  onSelectAsActive,
  onGenerateBulk,
  onBatchDelete,
  onSingleDelete,
  onOpenTestModalForAddress,
}: BulkAccountViewProps) {
  // Generation state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [count, setCount] = useState(10);
  const [selectedDomain, setSelectedDomain] = useState(domains[0]?.domain || 'tmpinbox.dev');
  const [prefix, setPrefix] = useState('qa-bot');
  const [expiryMinutes, setExpiryMinutes] = useState(60);
  const [tag, setTag] = useState('automated-test');
  const [isGenerating, setIsGenerating] = useState(false);

  // Table & selection state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedAddresses, setSelectedAddresses] = useState<Set<string>>(new Set());
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Unified Inbox state
  const [showUnifiedFeed, setShowUnifiedFeed] = useState(false);

  // Unique tags list
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    mailboxes.forEach((m) => {
      if (m.tag) tags.add(m.tag);
    });
    return Array.from(tags);
  }, [mailboxes]);

  // Filtered mailboxes
  const filteredMailboxes = useMemo(() => {
    return mailboxes.filter((m) => {
      const matchesSearch =
        m.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.tag && m.tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesTag = selectedTag === 'all' || m.tag === selectedTag;
      return matchesSearch && matchesTag;
    });
  }, [mailboxes, searchQuery, selectedTag]);

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedAddresses.size === filteredMailboxes.length && filteredMailboxes.length > 0) {
      setSelectedAddresses(new Set());
    } else {
      setSelectedAddresses(new Set(filteredMailboxes.map((m) => m.address)));
    }
  };

  const toggleSelectOne = (address: string) => {
    const next = new Set(selectedAddresses);
    if (next.has(address)) {
      next.delete(address);
    } else {
      next.add(address);
    }
    setSelectedAddresses(next);
  };

  const handleCopy = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 1500);
  };

  // Export handlers
  const handleExport = (format: 'csv' | 'json' | 'txt') => {
    const targetList =
      selectedAddresses.size > 0
        ? mailboxes.filter((m) => selectedAddresses.has(m.address))
        : filteredMailboxes;

    if (targetList.length === 0) return;

    const data = formatExportData(targetList, format);
    const blob = new Blob([data], {
      type: format === 'json' ? 'application/json' : 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tempmail-bulk-${targetList.length}-accounts.${format}`;
    a.click();
    URL.revokeObjectURL(url);

    setExportNotice(`Exported ${targetList.length} accounts as .${format.toUpperCase()}`);
    setTimeout(() => setExportNotice(null), 3000);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      await onGenerateBulk(count, selectedDomain, prefix, expiryMinutes, tag);
      setShowCreateModal(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBatchDeleteClick = async () => {
    if (selectedAddresses.size === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedAddresses.size} selected mailboxes?`)) {
      await onBatchDelete(Array.from(selectedAddresses));
      setSelectedAddresses(new Set());
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">Bulk Account Management</h2>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-indigo-300">
              {mailboxes.length} Active Inboxes
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Generate and manage hundreds of disposable mailboxes simultaneously for QA pipelines, bot clusters, or stress testing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowUnifiedFeed((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
              showUnifiedFeed
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-600/30'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{showUnifiedFeed ? 'Hide Multi-Feed' : 'Unified Multi-Inbox'}</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm shadow-indigo-600/30 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Bulk Accounts</span>
          </button>
        </div>
      </div>

      {/* Export Toast Notification */}
      {exportNotice && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs rounded-lg flex items-center justify-between animate-in fade-in">
          <span>{exportNotice}</span>
          <Check className="w-4 h-4" />
        </div>
      )}

      {/* Unified Multi-Inbox Feed View (Collapsible) */}
      {showUnifiedFeed && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white">
                Live Unified Inbound Stream (All {mailboxes.length} Inboxes)
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              Showing <strong className="text-white font-mono">{allMessages.length}</strong> incoming emails
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-slate-800">
            {allMessages.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No incoming emails across bulk accounts yet. Send test emails to trigger the stream.
              </div>
            ) : (
              allMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="p-3 hover:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">{msg.from.name || msg.from.address}</span>
                      <span className="text-slate-500 font-mono text-[11px]">&rarr; {msg.mailboxAddress}</span>
                    </div>
                    <div className="text-slate-300 font-medium">{msg.subject}</div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {msg.otpCode && (
                      <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 rounded flex items-center gap-1">
                        <Key className="w-3 h-3 text-emerald-400" />
                        <span>{msg.otpCode}</span>
                      </span>
                    )}
                    <span className="text-slate-500 text-[11px]">{formatRelativeTime(msg.receivedAt)}</span>
                    <button
                      onClick={() => onSelectAsActive(msg.mailboxAddress)}
                      className="px-2.5 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded transition-colors"
                    >
                      View Inbox
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 2. Management Table Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search & Tag Filter */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by address or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">All Tags ({mailboxes.length})</option>
            {availableTags.map((t) => (
              <option key={t} value={t}>
                Tag: {t}
              </option>
            ))}
          </select>
        </div>

        {/* Batch Operations Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {selectedAddresses.size > 0 && (
            <button
              onClick={handleBatchDeleteClick}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-300 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/60 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete ({selectedAddresses.size})</span>
            </button>
          )}

          {/* Export Dropdown Group */}
          <div className="flex items-center border border-slate-700 rounded-lg overflow-hidden bg-slate-800">
            <span className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 flex items-center gap-1 border-r border-slate-700">
              <Download className="w-3 h-3" />
              <span>Export</span>
            </span>
            <button
              onClick={() => handleExport('csv')}
              title="Export as CSV spreadsheet"
              className="px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition-colors flex items-center gap-1"
            >
              <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
              <span>CSV</span>
            </button>
            <button
              onClick={() => handleExport('json')}
              title="Export as JSON array"
              className="px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition-colors flex items-center gap-1 border-l border-slate-700"
            >
              <FileCode className="w-3 h-3 text-amber-400" />
              <span>JSON</span>
            </button>
            <button
              onClick={() => handleExport('txt')}
              title="Export as raw list of email addresses"
              className="px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition-colors flex items-center gap-1 border-l border-slate-700"
            >
              <FileText className="w-3 h-3 text-indigo-400" />
              <span>TXT</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Bulk Accounts Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold tracking-wider uppercase text-[11px]">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={
                      selectedAddresses.size === filteredMailboxes.length &&
                      filteredMailboxes.length > 0
                    }
                    onChange={toggleSelectAll}
                    aria-label="Select all mailboxes"
                    className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Tag</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4">Expires</th>
                <th className="py-3 px-4 text-center">Messages</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredMailboxes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-sans">
                    No mailboxes found matching your search.
                  </td>
                </tr>
              ) : (
                filteredMailboxes.map((mb) => {
                  const isChecked = selectedAddresses.has(mb.address);
                  const isCurrent = currentAddress === mb.address;
                  return (
                    <tr
                      key={mb.address}
                      className={`transition-colors ${
                        isCurrent
                          ? 'bg-indigo-950/20'
                          : isChecked
                          ? 'bg-slate-800/60'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOne(mb.address)}
                          aria-label={`Select ${mb.address}`}
                          className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-200">
                        <div className="flex items-center gap-2">
                          <span className={isCurrent ? 'text-indigo-400' : 'text-slate-200'}>
                            {mb.address}
                          </span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 text-[10px] font-sans font-semibold bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
                              Active
                            </span>
                          )}
                          <button
                            onClick={() => handleCopy(mb.address)}
                            title="Copy address"
                            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                          >
                            {copiedAddress === mb.address ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-sans text-slate-400">
                        <span className="px-2 py-0.5 text-[11px] bg-slate-800 text-slate-300 rounded">
                          {mb.tag || 'none'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {formatRelativeTime(mb.createdAt)}
                      </td>

                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {mb.expiresAt === 'never' ? (
                          <span className="text-slate-500">Never</span>
                        ) : (
                          new Date(mb.expiresAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-bold tabular-nums px-2 py-0.5 rounded text-xs ${
                            mb.unreadCount > 0
                              ? 'bg-indigo-500/20 text-indigo-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {mb.totalMessages}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-sans">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenTestModalForAddress(mb.address)}
                            title="Send simulated email directly to this mailbox"
                            className="px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                          >
                            Test Mail
                          </button>

                          {!isCurrent && (
                            <button
                              onClick={() => onSelectAsActive(mb.address)}
                              title="Switch active webmail to this inbox"
                              className="px-2 py-1 text-[11px] font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/60 rounded border border-indigo-800/60 transition-colors flex items-center gap-1"
                            >
                              <span>Open</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}

                          <button
                            onClick={() => onSingleDelete(mb.address)}
                            title="Delete this mailbox"
                            className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Create Bulk Accounts Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-semibold text-white">Create Bulk Temporary Mailboxes</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Count selector with quick presets */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Number of Accounts to Generate:
                  </label>
                  <span className="text-xs font-mono font-bold text-indigo-400">{count} Inboxes</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  {[5, 10, 25, 50, 100].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCount(preset)}
                      className={`flex-1 py-1 text-xs font-mono font-semibold rounded border transition-colors ${
                        count === preset
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  min="1"
                  max="150"
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              {/* Domain & Prefix */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Domain Extension:
                  </label>
                  <select
                    value={selectedDomain}
                    onChange={(e) => setSelectedDomain(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {domains.map((d) => (
                      <option key={d.domain} value={d.domain}>
                        @{d.domain}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Username Prefix:
                  </label>
                  <input
                    type="text"
                    required
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                    placeholder="e.g. qa-test"
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Expiry duration & Tag */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Mailbox Expiration:
                  </label>
                  <select
                    value={expiryMinutes}
                    onChange={(e) => setExpiryMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={15}>15 Minutes</option>
                    <option value={60}>1 Hour (Standard)</option>
                    <option value={1440}>24 Hours (1 Day)</option>
                    <option value={10080}>7 Days</option>
                    <option value={0}>Never Expire</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Group / Project Tag:
                  </label>
                  <input
                    type="text"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    placeholder="e.g. auth-e2e"
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isGenerating ? 'Generating...' : `Generate ${count} Accounts`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
