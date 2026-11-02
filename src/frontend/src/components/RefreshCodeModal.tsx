import { Eye, EyeOff, KeyRound, Loader2, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { getRefreshQuota, type RefreshQuota } from '../api';
import { Card } from './UIAtoms';

interface RefreshCodeModalProps {
  isOpen: boolean;
  submitting: boolean;
  error: { code: string; message: string; retryAt: number | null } | null;
  onSubmit: (code: string) => void;
  onClose: () => void;
}

export function formatRetry(retryAt: number | null, nowMs = Date.now()): string {
  if (retryAt === null) return '';
  const seconds = Math.max(0, Math.round(retryAt - nowMs / 1000));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.ceil((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${Math.max(1, minutes)}m`;
}

export function RefreshCodeModal({ isOpen, submitting, error, onSubmit, onClose }: RefreshCodeModalProps) {
  const [code, setCode] = useState('');
  const [quota, setQuota] = useState<RefreshQuota | null>(null);
  const [showCode, setShowCode] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCode('');
      setShowCode(false);
      return;
    }
    let cancelled = false;
    getRefreshQuota()
      .then((q) => {
        if (!cancelled) setQuota(q);
      })
      .catch(() => {
        if (!cancelled) setQuota(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, error]);

  if (!isOpen) return null;

  const missing = quota?.missing ?? [];
  const canSubmit = code.trim().length > 0 && !submitting && missing.length === 0;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="refresh-code-title">
      <Card className="mx-4 w-full max-w-sm border-amber-500/50 bg-[#0d1420] p-6 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-500">
            <KeyRound size={18} />
            <h2 id="refresh-code-title" className="font-['Bebas_Neue'] text-xl tracking-wider">Refresh code required</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-500 hover:text-slate-300">
            <X size={16} />
          </button>
        </div>
        <p className="mb-4 text-xs leading-relaxed text-slate-400">
          A live refresh runs the AI agents and uses paid tokens. Enter the access code to continue.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) onSubmit(code.trim());
          }}
        >
          <div className="relative mb-3">
            <input
              type={showCode ? 'text' : 'password'}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              aria-label="Refresh code"
              disabled={missing.length > 0}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pl-3 pr-10 font-mono text-sm text-slate-100 outline-none focus:border-amber-500"
            />
            <button
              type="button"
              onClick={() => setShowCode((v) => !v)}
              aria-label={showCode ? 'Hide code' : 'Show code'}
              aria-pressed={showCode}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-300"
            >
              {showCode ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {missing.length > 0 && (
            <div role="alert" className="mb-3 rounded border border-red-500/40 bg-red-500/10 p-2 font-mono text-[11px] text-red-300">
              Refresh is unavailable. Add the missing setting to the server environment (.env) and restart the backend: {missing.join(', ')}.
            </div>
          )}
          {error && missing.length === 0 && (
            <div role="alert" className="mb-3 font-mono text-[11px] text-red-400">
              {error.message}
              {error.retryAt !== null && ` Try again in ${formatRetry(error.retryAt)}.`}
            </div>
          )}
          {quota && (
            <div className="mb-3 font-mono text-[10px] text-slate-500">
              {quota.used} of {quota.limit} access-code refreshes used in the last 3 days
              {quota.resets_at !== null && ` · next slot in ${formatRetry(quota.resets_at)}`}
            </div>
          )}
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {submitting ? 'Checking…' : 'Continue'}
          </button>
        </form>
      </Card>
    </div>
  );
}
