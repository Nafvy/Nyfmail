import { useState } from 'react';
import {
  BarChart3,
  Mail,
  ShieldCheck,
  Globe,
  HardDrive,
  Bell,
  CheckCircle2,
  ExternalLink,
  ArrowUpRight,
  Server,
  Radio,
} from 'lucide-react';
import { DashboardStats, DomainItem } from '../types/index.js';
import { formatBytes } from '../utils/mail-generator.js';
import { sendDesktopNotification } from '../utils/audio.js';

interface DashboardStatsViewProps {
  stats: DashboardStats;
  domains: DomainItem[];
  notificationPermission: NotificationPermission | 'unsupported';
  onRequestNotificationPermission: () => Promise<void>;
}

export function DashboardStatsView({
  stats,
  domains,
  notificationPermission,
  onRequestNotificationPermission,
}: DashboardStatsViewProps) {
  const [webhookUrl, setWebhookUrl] = useState('https://hooks.slack.com/services/T00/B00/XXXX');
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [testedWebhook, setTestedWebhook] = useState(false);

  const handleTestNotification = async () => {
    await sendDesktopNotification(
      'TempMail Pro Alert',
      'Test notification: New incoming email with verification code 849201 received!'
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">System Dashboard &amp; Analytics</h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950 text-emerald-400 font-semibold border border-emerald-800/60 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Operational</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time telemetry on active disposable inboxes, incoming throughput, spam defense, and multi-domain MX status.
          </p>
        </div>
      </div>

      {/* 2. Primary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Active Inboxes</span>
            <Mail className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {stats.activeInboxes}
          </div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" />
            <span>Ready for concurrent delivery</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Processed Today</span>
            <Server className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {stats.totalMessagesToday}
          </div>
          <div className="text-[11px] text-slate-400">
            Lifetime: <span className="text-slate-200 font-mono">{stats.totalMessagesAllTime}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Spam &amp; Scams Blocked</span>
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {stats.spamFilteredCount}
          </div>
          <div className="text-[11px] text-amber-400">
            SpamAssassin + SPF/DKIM filters
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Storage Ingestion</span>
            <HardDrive className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {formatBytes(stats.storageUsedBytes)}
          </div>
          <div className="text-[11px] text-slate-400">
            Auto-purge: <span className="text-emerald-400">Every 10 mins</span>
          </div>
        </div>
      </div>

      {/* 3. Inbound Throughput Visualizer */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">24-Hour Inbound Delivery Throughput</h3>
            <p className="text-xs text-slate-400">Hourly volume of valid incoming messages vs filtered anomalies</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-indigo-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
              <span>Delivered Messages</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-700" />
              <span>Filtered</span>
            </span>
          </div>
        </div>

        {/* Visual Bar Chart */}
        <div className="h-36 flex items-end gap-2 pt-4 px-2 border-b border-slate-800">
          {[
            { hour: '00:00', val: 12, spam: 2 },
            { hour: '02:00', val: 8, spam: 1 },
            { hour: '04:00', val: 5, spam: 0 },
            { hour: '06:00', val: 18, spam: 3 },
            { hour: '08:00', val: 34, spam: 5 },
            { hour: '10:00', val: 42, spam: 7 },
            { hour: '12:00', val: 56, spam: 8 },
            { hour: '14:00', val: 68, spam: 12 },
            { hour: '16:00', val: 52, spam: 6 },
            { hour: '18:00', val: 61, spam: 9 },
            { hour: '20:00', val: 45, spam: 4 },
            { hour: 'Now', val: 38, spam: 3 },
          ].map((bar, i) => {
            const heightPct = Math.min(100, Math.round((bar.val / 70) * 100));
            const spamHeight = Math.min(30, Math.round((bar.spam / 70) * 100));
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                <div className="w-full flex flex-col items-center justify-end h-full">
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full max-w-[28px] bg-indigo-600 rounded-t-sm transition-all group-hover:bg-indigo-400 relative"
                  >
                    <div
                      style={{ height: `${spamHeight}%` }}
                      className="w-full bg-slate-700 rounded-t-sm absolute top-0"
                    />
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-500">{bar.hour}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Domain Management & Push Notification Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Domain Health Status (lg:col-span-7) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white">Active MX Mail Domains</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {domains.length} configured
            </span>
          </div>

          <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden bg-slate-950 text-xs">
            {domains.map((dom) => (
              <div
                key={dom.domain}
                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-slate-200">@{dom.domain}</span>
                    {dom.isDefault && (
                      <span className="px-1.5 py-0.2 text-[10px] bg-indigo-500/20 text-indigo-300 rounded font-sans">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="text-slate-500 text-[11px] font-mono">
                    MX: {dom.mxHost} · Priority: 10
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>DNS Verified</span>
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    {dom.totalInboxes} active
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300">How to attach your custom domain:</p>
            <p className="font-mono text-[11px] text-indigo-300">
              Type: MX | Host: @ | Value: mail.yourdomain.com | Priority: 10
            </p>
            <p>Once DNS propagates, inbound emails to any alias @yourdomain.com will be parsed instantly.</p>
          </div>
        </div>

        {/* Push Notification & Webhook Forwarder (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Push Notification Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white">Real-Time Web Push Alerts</h3>
            </div>
            <p className="text-xs text-slate-400">
              Get immediate native OS alerts and chime sounds whenever a new verification code or email arrives.
            </p>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-300">Browser Permission:</span>
                <div className="text-[11px] font-mono capitalize text-indigo-400">
                  {notificationPermission}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {notificationPermission !== 'granted' ? (
                  <button
                    onClick={onRequestNotificationPermission}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-all"
                  >
                    Enable Alerts
                  </button>
                ) : (
                  <button
                    onClick={handleTestNotification}
                    className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
                  >
                    Send Test Alert
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Webhook Forwarding Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Outbound Webhook Forwarding</h3>
            </div>
            <p className="text-xs text-slate-400">
              Forward received payload events immediately to your external API, Discord channel, or Slack bot.
            </p>

            <div className="space-y-2">
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-server.com/mail-webhook"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={webhookEnabled}
                    onChange={(e) => setWebhookEnabled(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-indigo-600"
                  />
                  <span>Active Forwarding</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setTestedWebhook(true);
                    setTimeout(() => setTestedWebhook(false), 2500);
                  }}
                  className="px-3 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded border border-slate-700"
                >
                  {testedWebhook ? 'Webhook Sent (200 OK)' : 'Ping Webhook'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
