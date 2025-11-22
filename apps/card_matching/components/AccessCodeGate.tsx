'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { APP_KEY, verifyAccessCode, resendAccessCode } from '../lib/access';

const STORAGE_KEY = `${APP_KEY}:access-granted`;
const ACCESS_CONTEXT_KEY = `${APP_KEY}:access-context`;

interface AccessCodeGateProps {
  children: React.ReactNode;
  requiredRole?: 'user' | 'supervisor';
}

type GateState = 'checking' | 'prompt' | 'verifying' | 'granted' | 'error';
type AccessContextValue = {
  role: 'user' | 'supervisor' | null;
  userId?: string;
  userEmail?: string;
  supervisorId?: string;
  supervisorEmail?: string;
  appId?: string;
  appName?: string;
};

const AccessContext = createContext<AccessContextValue>({
  role: null,
});

function parseStoredContext(): AccessContextValue | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = window.sessionStorage.getItem(ACCESS_CONTEXT_KEY);
  if (!stored) {
    return null;
  }

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
  const [showForgotDialog, setShowForgotDialog] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [accessContext, setAccessContext] = useState<AccessContextValue>({ role: null });

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
    setError(null);

    const trimmedCode = code.trim();
    if (trimmedCode.length === 0) {
      setError('Please enter your 9-digit access code.');
      return;
    }

    try {
      setStatus('verifying');
      const result = await verifyAccessCode(trimmedCode);
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
          setError(`This page requires ${requiredRole} access. The code you entered is for ${context.role} access.`);
          setStatus('prompt');
          return;
        }
        
        setAccessContext(context);
        persistAccessContext(context);
        setStatus('granted');
      } else {
        setError('Invalid code. Please try again or contact an administrator.');
        setStatus('prompt');
      }
    } catch (verificationError) {
      console.error('Access code verification failed:', verificationError);
      setError('Unable to verify the code. Please try again in a moment.');
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
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl space-y-6">
        <div className="space-y-2 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Secure Access</p>
          <h1 className="text-2xl font-bold">Enter Access Code</h1>
          <p className="text-sm text-slate-300">
            This application requires an access code. Enter your 9-digit code to continue.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-slate-300">9-digit access code</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="\d*"
              maxLength={12}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-lg tracking-widest text-center font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
              placeholder="123456789"
              disabled={status === 'verifying'}
            />
          </div>
          {error && <p className="text-sm text-rose-300">{error}</p>}
          <button
            type="submit"
            disabled={status === 'verifying'}
            className="w-full rounded-2xl bg-emerald-400/90 px-4 py-3 text-slate-950 font-semibold hover:bg-emerald-300 transition disabled:opacity-50"
          >
            {status === 'verifying' ? 'Verifying…' : 'Access Application'}
          </button>
        </form>
        <div className="text-center">
          <button
            type="button"
            onClick={() => setShowForgotDialog(true)}
            className="text-sm text-slate-400 hover:text-slate-200 underline transition-colors"
          >
            Forgot your access code?
          </button>
        </div>
      </div>

      {/* Forgot Code Dialog */}
      {showForgotDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-8 shadow-2xl space-y-6">
            <div className="space-y-2 text-center">
              <div className="flex justify-center mb-4">
                <svg className="w-12 h-12 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold">Resend Access Code</h2>
              <p className="text-sm text-slate-300">
                Enter your email address and we&apos;ll send you your access code.
              </p>
            </div>
            <form onSubmit={handleForgotCode} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Email Address</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-lg text-center focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
                  placeholder="your.email@example.com"
                  disabled={forgotLoading}
                  required
                />
              </div>
              {forgotMessage && (
                <p className={`text-sm ${forgotMessage.includes('sent') ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {forgotMessage}
                </p>
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
                  className="flex-1 rounded-2xl bg-emerald-400/90 px-4 py-3 text-slate-950 font-semibold hover:bg-emerald-300 transition disabled:opacity-50"
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


