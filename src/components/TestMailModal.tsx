import { useState } from 'react';
import { X, Send, Sparkles, AlertCircle } from 'lucide-react';

interface TestMailModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAddress: string;
  onMailSent: () => void;
}

export function TestMailModal({
  isOpen,
  onClose,
  currentAddress,
  onMailSent,
}: TestMailModalProps) {
  const [toAddress, setToAddress] = useState(currentAddress);
  const [fromName, setFromName] = useState('GitHub Security');
  const [fromAddress, setFromAddress] = useState('no-reply@github.com');
  const [subject, setSubject] = useState('Your verification code is 739104');
  const [otpCode, setOtpCode] = useState('739104');
  const [textBody, setTextBody] = useState(
    'Please enter the following one-time verification code: 739104 to complete sign-in. This code is valid for 10 minutes.'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const loadTemplate = (template: 'github' | 'discord' | 'stripe' | 'amazon') => {
    const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setOtpCode(randomOtp);

    if (template === 'github') {
      setFromName('GitHub Security');
      setFromAddress('no-reply@github.com');
      setSubject(`Your GitHub verification code is ${randomOtp}`);
      setTextBody(
        `Hi,\n\nWe detected a sign-in attempt from a new browser.\nYour one-time authentication code is: ${randomOtp}\n\nValid for 10 minutes.\n\nGitHub Support Team`
      );
    } else if (template === 'discord') {
      setFromName('Discord Team');
      setFromAddress('noreply@discord.com');
      setSubject(`Discord Security Code: ${randomOtp}`);
      setTextBody(
        `Hey there!\n\nYour Discord verification code is: ${randomOtp}\n\nPlease enter this on your sign-in prompt.\n\nDiscord Inc.`
      );
    } else if (template === 'stripe') {
      setFromName('Stripe Billing');
      setFromAddress('invoices@stripe.com');
      setSubject('Payment Receipt: $49.00 USD - API Subscription');
      setOtpCode('');
      setTextBody(
        `Hello,\n\nYour payment of $49.00 USD has been received for Invoice #INV-2026-881.\nPayment method: Mastercard ending in 1948.\n\nYou can review your statement at: https://billing.stripe.com/invoice/INV-2026-881`
      );
    } else if (template === 'amazon') {
      setFromName('Amazon Customer Service');
      setFromAddress('account-update@amazon.com');
      setSubject(`Amazon Verification OTP: ${randomOtp}`);
      setTextBody(
        `Your Amazon security code is: ${randomOtp}\nDon't share this code with anyone. Our employees will never ask for this code.`
      );
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const resp = await fetch('/api/v1/simulate/incoming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: toAddress || currentAddress,
          fromName,
          fromAddress,
          subject,
          textBody,
          otpCode: otpCode || undefined,
        }),
      });

      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.error || 'Failed to simulate incoming email');
      }

      onMailSent();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-semibold text-white">Simulate Inbound Email</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSend} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-rose-300 bg-rose-950/40 border border-rose-800/60 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Preset Buttons */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">
              Load Realistic Template:
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => loadTemplate('github')}
                className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md border border-slate-700 transition-colors"
              >
                GitHub 2FA
              </button>
              <button
                type="button"
                onClick={() => loadTemplate('discord')}
                className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md border border-slate-700 transition-colors"
              >
                Discord Code
              </button>
              <button
                type="button"
                onClick={() => loadTemplate('stripe')}
                className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md border border-slate-700 transition-colors"
              >
                Stripe Invoice
              </button>
              <button
                type="button"
                onClick={() => loadTemplate('amazon')}
                className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md border border-slate-700 transition-colors"
              >
                Amazon OTP
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Recipient Address (To):
            </label>
            <input
              type="email"
              required
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Sender Name:
              </label>
              <input
                type="text"
                required
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Sender Address:
              </label>
              <input
                type="email"
                required
                value={fromAddress}
                onChange={(e) => setFromAddress(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Subject Line:
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                OTP Code (Optional):
              </label>
              <input
                type="text"
                placeholder="e.g. 849201"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Email Body:
            </label>
            <textarea
              rows={4}
              required
              value={textBody}
              onChange={(e) => setTextBody(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Delivering...' : 'Send Incoming Email'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
