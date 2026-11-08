import { useState } from 'react';
import {
  Database,
  Server,
  Container,
  Terminal,
  Cpu,
  Copy,
  Check,
  Download,
  BookOpen,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import {
  MYSQL_SCHEMA_SQL,
  NODE_SMTP_SERVER_CODE,
  DOCKER_COMPOSE_YML,
  PYTHON_AUTOMATION_SCRIPT,
} from '../server/mysql-schema.js';

type DocSection = 'mysql' | 'smtp' | 'docker' | 'python' | 'architecture';

export function DocumentationSourceView() {
  const [activeSection, setActiveSection] = useState<DocSection>('mysql');
  const [copied, setCopied] = useState<string | null>(null);

  const sections: { id: DocSection; title: string; icon: any; file: string }[] = [
    { id: 'mysql', title: 'MySQL 8.0 Schema DDL', icon: Database, file: 'schema.sql' },
    { id: 'smtp', title: 'Inbound SMTP Receiver', icon: Server, file: 'smtp-server.ts' },
    { id: 'docker', title: 'Docker Compose Stack', icon: Container, file: 'docker-compose.yml' },
    { id: 'python', title: 'Automated Bulk Python Client', icon: Terminal, file: 'bulk_automation.py' },
    { id: 'architecture', title: 'System Architecture & Scaling', icon: Cpu, file: 'ARCHITECTURE.md' },
  ];

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDownload = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">
              Technical Documentation &amp; Production Source Code
            </h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 font-semibold">
              Ready to Deploy
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Complete database scripts, SMTP receiver daemons, Docker Compose orchestrations, and automated bulk integration scripts.
          </p>
        </div>
      </div>

      {/* 2. Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-xl">
        {sections.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{sec.title}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Section Content */}
      <div className="space-y-4">
        {/* TAB 1: MySQL Schema */}
        {activeSection === 'mysql' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-400" />
                  <span>Production MySQL 8.0 Schema (`schema.sql`)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Optimized with InnoDB, composite indexes on (mailbox_address, received_at DESC), foreign key cascades, and automated 10-minute auto-purge event.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(MYSQL_SCHEMA_SQL, 'mysql')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
                >
                  {copied === 'mysql' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy SQL</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDownload(MYSQL_SCHEMA_SQL, 'schema.sql')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-300 hover:text-white bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-800/80 rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .sql</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Cascade Deletions</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  When a mailbox expires or is deleted, all related messages and attachments are automatically cleared via InnoDB FOREIGN KEY ON DELETE CASCADE.
                </p>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>MySQL Event Scheduler</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  The built-in event `evt_purge_expired_mailboxes` runs every 10 minutes, eliminating the need for external cron jobs.
                </p>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>High-Speed Indexing</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Optimized indexes on `(mailbox_address, received_at)` ensure sub-millisecond inbox queries even with millions of rows.
                </p>
              </div>
            </div>

            <pre className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-indigo-300 max-h-[450px] overflow-y-auto leading-relaxed whitespace-pre">
              {MYSQL_SCHEMA_SQL}
            </pre>
          </div>
        )}

        {/* TAB 2: SMTP Receiver */}
        {activeSection === 'smtp' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-400" />
                  <span>Node.js Inbound SMTP Daemon (`smtp-server.ts`)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Standalone high-performance mail daemon that listens on port 25, parses raw RFC 822 MIME streams, extracts OTPs, and saves directly to MySQL.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(NODE_SMTP_SERVER_CODE, 'smtp')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
                >
                  {copied === 'smtp' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDownload(NODE_SMTP_SERVER_CODE, 'smtp-server.ts')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-300 hover:text-white bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-800/80 rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .ts</span>
                </button>
              </div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400 space-y-1">
              <span className="font-semibold text-slate-200">How to run in production:</span>
              <p className="font-mono text-emerald-400 text-[11px]">
                npm install smtp-server mailparser mysql2 dotenv
              </p>
              <p className="font-mono text-indigo-300 text-[11px]">
                npx tsx smtp-server.ts
              </p>
            </div>

            <pre className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 max-h-[450px] overflow-y-auto leading-relaxed whitespace-pre">
              {NODE_SMTP_SERVER_CODE}
            </pre>
          </div>
        )}

        {/* TAB 3: Docker Compose */}
        {activeSection === 'docker' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Container className="w-4 h-4 text-sky-400" />
                  <span>Docker Compose Production Stack (`docker-compose.yml`)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Zero-configuration container setup running MySQL 8.0, Redis cache, API web server, and port 25 SMTP daemon.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(DOCKER_COMPOSE_YML, 'docker')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
                >
                  {copied === 'docker' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy YAML</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDownload(DOCKER_COMPOSE_YML, 'docker-compose.yml')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-300 hover:text-white bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-800/80 rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .yml</span>
                </button>
              </div>
            </div>

            <pre className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-sky-300 max-h-[450px] overflow-y-auto leading-relaxed whitespace-pre">
              {DOCKER_COMPOSE_YML}
            </pre>
          </div>
        )}

        {/* TAB 4: Python Automation */}
        {activeSection === 'python' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-amber-400" />
                  <span>Python Automated Bulk Client (`bulk_automation.py`)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Complete automation script to generate 50 temporary emails, trigger account registrations, and poll for verification OTPs with timeout and regex parsing.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(PYTHON_AUTOMATION_SCRIPT, 'python')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
                >
                  {copied === 'python' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Script</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDownload(PYTHON_AUTOMATION_SCRIPT, 'bulk_automation.py')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-300 hover:text-white bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-800/80 rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .py</span>
                </button>
              </div>
            </div>

            <pre className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-amber-300 max-h-[450px] overflow-y-auto leading-relaxed whitespace-pre">
              {PYTHON_AUTOMATION_SCRIPT}
            </pre>
          </div>
        )}

        {/* TAB 5: Architecture & Scaling */}
        {activeSection === 'architecture' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg space-y-6 text-xs text-slate-300">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-400" />
                <span>Modular System Architecture &amp; Scalability Blueprint</span>
              </h3>
              <p className="text-slate-400 mt-1">
                Engineered for horizontal scalability across millions of disposable addresses and high-volume inbound traffic.
              </p>
            </div>

            {/* Architecture Flow Diagram */}
            <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
              <span className="font-semibold text-slate-200 block text-xs tracking-wider uppercase">
                End-to-End Inbound &amp; Verification Pipeline
              </span>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                  <div className="font-mono font-bold text-indigo-400 text-xs">1. Inbound SMTP</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Port 25 (Haraka / Node SMTP daemon) checks recipient existence in Redis cache in 0.5ms.
                  </div>
                </div>

                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                  <div className="font-mono font-bold text-emerald-400 text-xs">2. MIME &amp; OTP Engine</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Streams RFC 822 body into `mailparser`, runs regex extraction for OTPs &amp; verification URLs.
                  </div>
                </div>

                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                  <div className="font-mono font-bold text-amber-400 text-xs">3. MySQL 8.0 Cluster</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Stores parsed messages with foreign key constraints. Automatically purges expired rows.
                  </div>
                </div>

                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                  <div className="font-mono font-bold text-sky-400 text-xs">4. Real-time Push &amp; API</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Web push notification, audio chime, and external webhooks trigger instantaneously.
                  </div>
                </div>
              </div>
            </div>

            {/* Production Installation Steps */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-white">Production Deployment Instructions</h4>
              <ol className="list-decimal pl-5 space-y-2 text-slate-300">
                <li>
                  <strong className="text-white">Configure DNS MX Records:</strong> Point your domain's MX record to your VPS IP address (e.g. `mail.yourdomain.com` with priority 10). Ensure port 25 is opened by your hosting provider.
                </li>
                <li>
                  <strong className="text-white">Import MySQL 8.0 Database:</strong> Run `mysql -u root -p &lt; schema.sql` to initialize the database, tables, indexes, and automated event scheduler.
                </li>
                <li>
                  <strong className="text-white">Run with Docker:</strong> Execute `docker-compose up -d` to launch the entire stack (MySQL, Redis, API Server, and SMTP Daemon).
                </li>
                <li>
                  <strong className="text-white">SSL &amp; Reverse Proxy:</strong> Point Nginx or Caddy to port 3000 with Let's Encrypt certificates for HTTPS and TLS encryption.
                </li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
