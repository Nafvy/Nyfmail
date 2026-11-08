import { useState } from 'react';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  Send,
  Code,
  Terminal,
  Clock,
  Sparkles,
  Zap,
} from 'lucide-react';
import { ApiKeyItem } from '../types/index.js';

interface ApiExplorerViewProps {
  apiKeys: ApiKeyItem[];
  onCreateApiKey: (name: string) => Promise<void>;
  onDeleteApiKey: (key: string) => Promise<void>;
  currentAddress: string;
}

type EndpointKey =
  | 'generateMailbox'
  | 'bulkMailbox'
  | 'getMessages'
  | 'getMessage'
  | 'simulateIncoming'
  | 'deleteMailbox';

interface EndpointMeta {
  id: EndpointKey;
  method: 'GET' | 'POST' | 'DELETE';
  path: string;
  title: string;
  description: string;
  defaultPayload?: any;
}

const ENDPOINTS: EndpointMeta[] = [
  {
    id: 'generateMailbox',
    method: 'POST',
    path: '/api/v1/mailbox/generate',
    title: 'Create Single Mailbox',
    description: 'Generates a new disposable mailbox with custom domain and expiration.',
    defaultPayload: {
      domain: 'tmpinbox.dev',
      prefix: 'api-user',
      expiresInMinutes: 60,
      tag: 'integration-test',
    },
  },
  {
    id: 'bulkMailbox',
    method: 'POST',
    path: '/api/v1/mailbox/bulk',
    title: 'Generate Bulk Mailboxes',
    description: 'Spawns multiple unique temporary email accounts in one call.',
    defaultPayload: {
      count: 5,
      domain: 'tmpinbox.dev',
      prefix: 'batch-worker',
      expiresInMinutes: 30,
      tag: 'e2e-cluster',
    },
  },
  {
    id: 'getMessages',
    method: 'GET',
    path: '/api/v1/mailbox/:address/messages',
    title: 'List Mailbox Messages',
    description: 'Retrieves all received messages with extracted OTP codes and previews.',
  },
  {
    id: 'simulateIncoming',
    method: 'POST',
    path: '/api/v1/simulate/incoming',
    title: 'Ingest Inbound Email Webhook',
    description: 'Deliver simulated or external webhook emails into any mailbox.',
    defaultPayload: {
      to: 'alex.nexus8421@tmpinbox.dev',
      fromName: 'Stripe Security',
      fromAddress: 'security@stripe.com',
      subject: 'Your 2FA Login Code is 582910',
      textBody: 'Verification token: 582910. Expires in 5 minutes.',
      otpCode: '582910',
    },
  },
  {
    id: 'deleteMailbox',
    method: 'DELETE',
    path: '/api/v1/mailbox/:address',
    title: 'Purge Mailbox',
    description: 'Immediately deletes a temporary mailbox and its associated messages.',
  },
];

export function ApiExplorerView({
  apiKeys,
  onCreateApiKey,
  onDeleteApiKey,
  currentAddress,
}: ApiExplorerViewProps) {
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointKey>('bulkMailbox');
  const [codeLanguage, setCodeLanguage] = useState<'curl' | 'node' | 'python' | 'php'>('curl');
  const [addressParam, setAddressParam] = useState(currentAddress || 'alex.nexus8421@tmpinbox.dev');
  const [requestPayload, setRequestPayload] = useState<string>(
    JSON.stringify(ENDPOINTS[1].defaultPayload, null, 2)
  );
  const [responseResult, setResponseResult] = useState<any>(null);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const currentMeta = ENDPOINTS.find((e) => e.id === selectedEndpoint)!;
  const activeToken = apiKeys[0]?.key || 'tmp_live_your_api_token_here';

  const handleSelectEndpoint = (id: EndpointKey) => {
    setSelectedEndpoint(id);
    const meta = ENDPOINTS.find((e) => e.id === id)!;
    if (meta.defaultPayload) {
      if (id === 'simulateIncoming' && currentAddress) {
        setRequestPayload(
          JSON.stringify({ ...meta.defaultPayload, to: currentAddress }, null, 2)
        );
      } else {
        setRequestPayload(JSON.stringify(meta.defaultPayload, null, 2));
      }
    } else {
      setRequestPayload('');
    }
    setResponseResult(null);
    setResponseStatus(null);
  };

  const handleExecute = async () => {
    setIsLoading(true);
    setResponseResult(null);
    setResponseStatus(null);
    const start = performance.now();

    try {
      let resolvedPath = currentMeta.path.replace(':address', encodeURIComponent(addressParam));
      const options: RequestInit = {
        method: currentMeta.method,
        headers: {
          'Authorization': `Bearer ${activeToken}`,
          'Content-Type': 'application/json',
        },
      };

      if (currentMeta.method !== 'GET') {
        try {
          options.body = requestPayload ? JSON.stringify(JSON.parse(requestPayload)) : undefined;
        } catch {
          throw new Error('Invalid JSON payload formatted in editor');
        }
      }

      const res = await fetch(resolvedPath, options);
      const data = await res.json();
      const end = performance.now();

      setResponseStatus(res.status);
      setResponseTime(Math.round(end - start));
      setResponseResult(data);
    } catch (err: any) {
      setResponseStatus(500);
      setResponseResult({ error: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  // Generate code snippet
  const generateSnippet = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://tempmail-api.dev';
    const resolvedPath = currentMeta.path.replace(':address', addressParam);
    const fullUrl = `${origin}${resolvedPath}`;

    if (codeLanguage === 'curl') {
      if (currentMeta.method === 'GET') {
        return `curl -X GET "${fullUrl}" \\
  -H "Authorization: Bearer ${activeToken}"`;
      }
      return `curl -X ${currentMeta.method} "${fullUrl}" \\
  -H "Authorization: Bearer ${activeToken}" \\
  -H "Content-Type: application/json" \\
  -d '${requestPayload.replace(/\n/g, '').replace(/\s+/g, ' ')}'`;
    }

    if (codeLanguage === 'node') {
      return `// Node.js (fetch)
const response = await fetch('${fullUrl}', {
  method: '${currentMeta.method}',
  headers: {
    'Authorization': 'Bearer ${activeToken}',
    'Content-Type': 'application/json'
  }${currentMeta.method !== 'GET' ? `,\n  body: JSON.stringify(${requestPayload})` : ''}
});

const data = await response.json();
console.log('Result:', data);`;
    }

    if (codeLanguage === 'python') {
      return `# Python (requests)
import requests

url = "${fullUrl}"
headers = {
    "Authorization": "Bearer ${activeToken}",
    "Content-Type": "application/json"
}
${currentMeta.method !== 'GET' ? `payload = ${requestPayload}\n\nresponse = requests.${currentMeta.method.toLowerCase()}(url, json=payload, headers=headers)` : `response = requests.get(url, headers=headers)`}

print(response.status_code)
print(response.json())`;
    }

    if (codeLanguage === 'php') {
      return `<?php
// PHP cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "${fullUrl}");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "${currentMeta.method}");
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer ${activeToken}",
    "Content-Type: application/json"
]);
${currentMeta.method !== 'GET' ? `curl_setopt($ch, CURLOPT_POSTFIELDS, '${requestPayload.replace(/\n/g, '')}');\n` : ''}
$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);
print_r($data);
?>`;
    }

    return '';
  };

  const copySnippet = () => {
    navigator.clipboard.writeText(generateSnippet());
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">Developer API &amp; Webhooks</h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-semibold">
              REST v1.0
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Programmatically spawn inboxes, scrape OTP codes, automate end-to-end verification tests, and ingest external mail.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-300">
          <span className="font-mono bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            Base URL: <strong className="text-indigo-400">/api/v1</strong>
          </span>
        </div>
      </div>

      {/* 2. API Key Management */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">API Authentication Keys</h3>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (newKeyName.trim()) {
                await onCreateApiKey(newKeyName.trim());
                setNewKeyName('');
              }
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Key label (e.g. CI/CD Bot)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Generate Key</span>
            </button>
          </form>
        </div>

        <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
          {apiKeys.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">
              No API keys generated yet. Click "Generate Key" above to create an authentication token.
            </div>
          ) : (
            apiKeys.map((k) => (
              <div
                key={k.key}
                className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">{k.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {k.rateLimitPerMin} req/min
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-indigo-300 text-[11px]">
                    <span>{k.key}</span>
                    <button
                      onClick={() => handleCopyKey(k.key)}
                      title="Copy Key"
                      className="p-1 hover:text-white rounded"
                    >
                      {copiedKey === k.key ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-slate-400">
                  <span className="tabular-nums font-mono text-[11px]">
                    Requests: <strong className="text-white">{k.requestCount}</strong>
                  </span>
                  <button
                    onClick={() => onDeleteApiKey(k.key)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. Interactive API Runner & Endpoint Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Endpoints Menu (lg:col-span-4) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">
            Available Endpoints
          </div>
          {ENDPOINTS.map((ep) => {
            const isSelected = selectedEndpoint === ep.id;
            return (
              <button
                key={ep.id}
                onClick={() => handleSelectEndpoint(ep.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all flex flex-col gap-1 ${
                  isSelected
                    ? 'bg-slate-800 border-indigo-500 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      ep.method === 'GET'
                        ? 'bg-emerald-950 text-emerald-400'
                        : ep.method === 'POST'
                        ? 'bg-indigo-950 text-indigo-400'
                        : 'bg-rose-950 text-rose-400'
                    }`}
                  >
                    {ep.method}
                  </span>
                  <span className="text-slate-300 font-semibold truncate">{ep.path}</span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-1">{ep.title}</p>
              </button>
            );
          })}
        </div>

        {/* Right: Request & Response Inspector (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2 font-mono text-sm">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold ${
                      currentMeta.method === 'GET'
                        ? 'bg-emerald-950 text-emerald-400'
                        : currentMeta.method === 'POST'
                        ? 'bg-indigo-950 text-indigo-400'
                        : 'bg-rose-950 text-rose-400'
                    }`}
                  >
                    {currentMeta.method}
                  </span>
                  <span className="font-bold text-white">{currentMeta.path}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{currentMeta.description}</p>
              </div>

              <button
                onClick={handleExecute}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm shadow-indigo-600/30 transition-all shrink-0 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isLoading ? 'Executing...' : 'Send Request'}</span>
              </button>
            </div>

            {/* Path Parameter if required */}
            {currentMeta.path.includes(':address') && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Parameter (:address):
                </label>
                <input
                  type="text"
                  value={addressParam}
                  onChange={(e) => setAddressParam(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}

            {/* Request Body Editor */}
            {currentMeta.method !== 'GET' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  JSON Request Body:
                </label>
                <textarea
                  rows={6}
                  value={requestPayload}
                  onChange={(e) => setRequestPayload(e.target.value)}
                  className="w-full p-3 text-xs bg-slate-950 border border-slate-800 rounded-lg text-indigo-300 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}

            {/* Live Server Response Window */}
            {responseResult && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-slate-400">Status:</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                        responseStatus && responseStatus < 300
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                          : 'bg-rose-950 text-rose-300 border border-rose-800/60'
                      }`}
                    >
                      {responseStatus} {responseStatus === 200 || responseStatus === 201 ? 'OK' : 'Error'}
                    </span>
                  </div>
                  {responseTime !== null && (
                    <div className="flex items-center gap-1 text-slate-400 font-mono text-[11px]">
                      <Clock className="w-3 h-3" />
                      <span>{responseTime}ms</span>
                    </div>
                  )}
                </div>

                <pre className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-emerald-400 max-h-64 overflow-y-auto">
                  {JSON.stringify(responseResult, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Code Snippet Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-white">Client Code Snippet</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Language Switcher */}
                <div className="flex items-center p-0.5 bg-slate-950 border border-slate-800 rounded-lg">
                  {(['curl', 'node', 'python', 'php'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setCodeLanguage(lang)}
                      className={`px-2.5 py-1 text-[11px] font-mono rounded transition-colors uppercase ${
                        codeLanguage === lang
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>

                <button
                  onClick={copySnippet}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
                >
                  {copiedSnippet ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <pre className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 overflow-x-auto whitespace-pre-wrap">
              {generateSnippet()}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
