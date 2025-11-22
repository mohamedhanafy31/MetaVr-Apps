'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { APP_KEY, verifyAccessCode, resendAccessCode } from '../lib/access';

const STORAGE_KEY = `${APP_KEY}:access-granted`;
const ACCESS_CONTEXT_KEY = `${APP_KEY}:access-context`;

interface AccessCodeGateProps {
  children: React.ReactNode;
  requiredRole?: 'user' | 'supervisor';
}

type GateState = 'checking' | 'prompt' | 'verifying' | 'granted';
type AccessContextValue = {
  role: 'user' | 'supervisor' | null;
  userId?: string;
  userEmail?: string;
  supervisorId?: string;
  supervisorEmail?: string;
  appId?: string;
  appName?: string;
};

const AccessContext = createContext<AccessContextValue>({ role: null });

function parseStoredContext(): AccessContextValue | null {
  if (typeof window === 'undefined') return null;
  const stored = window.sessionStorage.getItem(ACCESS_CONTEXT_KEY);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    if (parsed && typeof parsed === 'object') {
      return {
        role: (parsed.role as 'user' | 'supervisor') ?? null,
        userId: typeof parsed.userId === 'string' ? parsed.userId : undefined,
        userEmail: typeof parsed.userEmail === 'string' ? parsed.userEmail : undefined,
        supervisorId: typeof parsed.supervisorId === 'string' ? parsed.supervisorId : undefined,
        supervisorEmail: typeof parsed.supervisorEmail === 'string' ? parsed.supervisorEmail : undefined,
        appId: typeof parsed.appId === 'string' ? parsed.appId : undefined,
        appName: typeof parsed.appName === 'string' ? parsed.appName : undefined,
      };
    }
  } catch (error) {
    console.warn('Failed to parse stored access context', error);
  }
  return null;
}

export function useAccessContext() {
  return useContext(AccessContext);
}

export function AccessCodeGate({ children, requiredRole }: AccessCodeGateProps) {
  const [status, setStatus] = useState<GateState>('checking');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [showForgotDialog, setShowForgotDialog] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [accessContext, setAccessContext] = useState<AccessContextValue>({ role: null });

  const formattedCode = useMemo(() => {
    const parts = code.match(/.{1,3}/g) || [];
    return parts.join('-');
  }, [code]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const flag = window.sessionStorage.getItem(STORAGE_KEY);
    if (flag === 'true') {
      const storedContext = parseStoredContext();
      if (storedContext) {
        // Check if stored role matches required role
        if (requiredRole && storedContext.role !== requiredRole) {
          // Clear invalid session
          window.sessionStorage.removeItem(STORAGE_KEY);
          window.sessionStorage.removeItem(ACCESS_CONTEXT_KEY);
          setStatus('prompt');
          setError(`This page requires ${requiredRole} access. Please use the correct access code.`);
          return;
        }
        setAccessContext(storedContext);
        setStatus('granted');
      } else {
        setStatus('prompt');
      }
    } else {
      setStatus('prompt');
    }
  }, [requiredRole]);

  const persistAccessContext = useCallback((context: AccessContextValue) => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(STORAGE_KEY, 'true');
    window.sessionStorage.setItem(ACCESS_CONTEXT_KEY, JSON.stringify(context));
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const sanitized = code.replace(/\D/g, '');
    setError(null);

    if (sanitized.length !== 9) {
      setError('Please enter the 9-digit code exactly as provided.');
      return;
    }

    try {
      setStatus('verifying');
      const result = await verifyAccessCode(sanitized);
      if (result.valid) {
        const context: AccessContextValue = {
          role: (result.role as 'user' | 'supervisor') ?? null,
          userId: result.userId,
          userEmail: result.userEmail,
          supervisorId: result.supervisorId,
          supervisorEmail: result.supervisorEmail,
          appId: result.appId,
          appName: result.appName,
        };
        
        // Check if role matches required role
        if (requiredRole && context.role !== requiredRole) {
          setAttempts((prev) => prev + 1);
          setError(`This page requires ${requiredRole} access. The code you entered is for ${context.role} access.`);
          setStatus('prompt');
          return;
        }
        
        setAccessContext(context);
        persistAccessContext(context);
        setStatus('granted');
      } else {
        setAttempts((prev) => prev + 1);
        setError('Invalid code. Please try again.');
        setStatus('prompt');
      }
    } catch (verificationError) {
      console.error('IQ access code verification error:', verificationError);
      setError('Unable to verify code. Please try again later.');
      setStatus('prompt');
    }
  };

  const handleForgotCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setForgotMessage(null);
    setError(null);

    if (!forgotEmail || !forgotEmail.includes('@')) {
      setForgotMessage('Please enter a valid email address.');
      return;
    }

    try {
      setForgotLoading(true);
      const result = await resendAccessCode(forgotEmail);
      if (result.success) {
        setForgotMessage('Access code has been sent to your email. Please check your inbox.');
        setTimeout(() => {
          setShowForgotDialog(false);
          setForgotEmail('');
          setForgotMessage(null);
        }, 3000);
      }
    } catch (forgotError) {
      console.error('Resend access code failed:', forgotError);
      setForgotMessage(
        forgotError instanceof Error ? forgotError.message : 'Failed to resend access code. Please try again.'
      );
    } finally {
      setForgotLoading(false);
    }
  };

  const gateContent =
    status === 'granted' ? (
      <>{children}</>
    ) : (
      <div className="min-h-screen bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600 flex items-center justify-center px-4 py-12 sm:py-16 lg:py-20 text-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-repeat pattern-dots" />
      </div>
      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-slate-950/70 p-8 shadow-2xl backdrop-blur-sm space-y-6">
        <div className="space-y-2 text-center">
          <p className="text-sm uppercase tracking-[0.4em] text-cyan-200/80">Secure Entry</p>
          <h1 className="text-2xl font-bold text-white drop-shadow-lg">Enter Access Code</h1>
          <p className="text-sm text-slate-200">
            This application requires an access code. Enter your 9-digit code to continue.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-slate-200">Access Code</label>
            <input
              type="text"
              inputMode="numeric"
                value={formattedCode}
                onChange={(event) => {
                  const digits = event.target.value.replace(/\D/g, '').slice(0, 9);
                  setCode(digits);
                }}
              placeholder="123-456-789"
              pattern="\d{3}[-\s]?\d{3}[-\s]?\d{3}"
              className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-center text-lg font-mono tracking-[0.4em] focus:outline-none focus:ring-4 focus:ring-cyan-400/40 focus:border-cyan-300 text-white placeholder:text-slate-400"
              disabled={status === 'verifying'}
            />
          </div>
          {error && (
            <div className="rounded-xl border border-rose-200/60 bg-rose-100/15 px-4 py-3 text-center text-sm text-rose-100">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={status === 'verifying'}
            className="w-full rounded-2xl bg-gradient-to-r from-cyan-300 to-indigo-300 px-4 py-3 text-slate-900 font-semibold tracking-wide hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {status === 'verifying' && (
              <svg className="w-4 h-4 animate-spin text-slate-900" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 108 8h-4l3 3 3-3h-4a8 8 0 01-8 8z"
                />
              </svg>
            )}
            {status === 'verifying' ? 'Verifying' : 'Access Application'}
          </button>
          {attempts > 0 && !error && (
            <p className="text-xs text-slate-300 text-center">
              {attempts} {attempts === 1 ? 'attempt' : 'attempts'} so far.
            </p>
          )}
        </form>
        <div className="text-center">
          <button
            type="button"
            onClick={() => setShowForgotDialog(true)}
            className="text-sm text-cyan-200/80 hover:text-cyan-100 underline transition-colors"
          >
            Forgot your access code?
          </button>
        </div>
      </div>

      {/* Forgot Code Dialog */}
      {showForgotDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-slate-950/90 p-8 shadow-2xl backdrop-blur-sm space-y-6">
            <div className="space-y-2 text-center">
              <div className="flex justify-center mb-4">
                <svg className="w-12 h-12 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white drop-shadow-lg">Resend Access Code</h2>
              <p className="text-sm text-slate-200">
                Enter your email address and we'll send you your access code.
              </p>
            </div>
            <form onSubmit={handleForgotCode} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-200">Email Address</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-lg text-center text-white focus:outline-none focus:ring-4 focus:ring-cyan-400/40 focus:border-cyan-300 placeholder:text-slate-400"
                  placeholder="your.email@example.com"
                  disabled={forgotLoading}
                  required
                />
              </div>
              {forgotMessage && (
                <div className={`rounded-xl border px-4 py-3 text-center text-sm ${
                  forgotMessage.includes('sent')
                    ? 'border-emerald-200/60 bg-emerald-100/15 text-emerald-100'
                    : 'border-rose-200/60 bg-rose-100/15 text-rose-100'
                }`}>
                  {forgotMessage}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotDialog(false);
                    setForgotEmail('');
                    setForgotMessage(null);
                  }}
                  disabled={forgotLoading}
                  className="flex-1 rounded-2xl border border-white/20 bg-slate-800/50 px-4 py-3 text-white font-semibold hover:bg-slate-800 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading || !forgotEmail}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-cyan-300 to-indigo-300 px-4 py-3 text-slate-900 font-semibold tracking-wide hover:opacity-90 transition disabled:opacity-50"
                >
                  {forgotLoading ? 'Sending…' : 'Send Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    );

  return <AccessContext.Provider value={accessContext}>{gateContent}</AccessContext.Provider>;
}


