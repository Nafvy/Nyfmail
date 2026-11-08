import React from 'react';
import { Mail, Send, Bell, BellOff } from 'lucide-react';

export type NavTab = 'inbox' | 'bulk' | 'api' | 'dashboard' | 'docs';

interface HeaderProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onOpenTestModal: () => void;
  soundEnabled: boolean;
  setSoundEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  unreadTotal: number;
}

export function Header({
  activeTab,
  setActiveTab,
  onOpenTestModal,
  soundEnabled,
  setSoundEnabled,
  unreadTotal,
}: HeaderProps) {
  const navItems: { id: NavTab; label: string; count?: number }[] = [
    { id: 'inbox', label: 'Inbox', count: unreadTotal > 0 ? unreadTotal : undefined },
    { id: 'bulk', label: 'Bulk Accounts' },
    { id: 'api', label: 'API & Webhooks' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'docs', label: 'MySQL & Docs' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('inbox');
          }}
          className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 hover:text-indigo-400 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
            <Mail className="w-4 h-4" />
          </div>
          <span>TempMail Pro</span>
        </a>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 sm:gap-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
                  isActive
                    ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <span>{item.label}</span>
                {item.count !== undefined && (
                  <span className="px-1.5 py-0.2 text-xs font-semibold bg-indigo-500/20 text-indigo-400 rounded-full tabular-nums">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action & Quick Tools */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setSoundEnabled((prev) => !prev)}
            aria-label={soundEnabled ? 'Disable email sound notifications' : 'Enable email sound notifications'}
            title={soundEnabled ? 'Sound alerts: ON' : 'Sound alerts: OFF'}
            className="p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            {soundEnabled ? (
              <Bell className="w-4 h-4 text-indigo-400" />
            ) : (
              <BellOff className="w-4 h-4 text-slate-500" />
            )}
          </button>

          <button
            onClick={onOpenTestModal}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm shadow-indigo-600/30 transition-all whitespace-nowrap shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Test Email</span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation bar */}
      <div className="md:hidden flex items-center justify-around px-2 py-2 border-t border-slate-800/80 bg-slate-900/95 overflow-x-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
              activeTab === item.id
                ? 'bg-indigo-600/20 text-indigo-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {item.label}
            {item.count !== undefined && ` (${item.count})`}
          </button>
        ))}
      </div>
    </header>
  );
}
