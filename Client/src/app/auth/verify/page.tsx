'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import AuthLayout from '../../../components/layout/AuthLayout';
import { LinkButton } from '../../../components/ui';
import { api } from '../../../lib/api';

function Verify() {
  const params = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState<'pending' | 'ok' | 'error'>(token ? 'pending' : 'error');
  const [message, setMessage] = useState(token ? '' : 'This verification link is missing its token.');

  useEffect(() => {
    if (!token) return;
    api.get(`/auth/verify-email/${encodeURIComponent(token)}`).then((res) => {
      setState(res.success ? 'ok' : 'error');
      setMessage(res.success ? '' : res.message || 'This link is invalid or has expired.');
    });
  }, [token]);

  return (
    <AuthLayout title={state === 'ok' ? 'Email verified' : state === 'pending' ? 'Verifying your email…' : 'Verification failed'}>
      <div className="rounded-2xl border border-line bg-surface p-6 text-center">
        {state === 'pending' && <Loader2 className="mx-auto size-10 animate-spin text-muted" aria-hidden />}
        {state === 'ok' && <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden />}
        {state === 'error' && <XCircle className="mx-auto size-10 text-danger" aria-hidden />}
        <p className="mt-3 text-sm text-ink-2" role="status">
          {state === 'ok' ? 'Your account is active. You can now bid, buy and sell on Auctio.' : state === 'pending' ? 'This only takes a moment.' : message}
        </p>
      </div>
      {state !== 'pending' && (
        <LinkButton href={state === 'ok' ? '/auth/login' : '/'} size="lg" className="mt-6 w-full">
          {state === 'ok' ? 'Sign in' : 'Go to homepage'}
        </LinkButton>
      )}
    </AuthLayout>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <Verify />
    </Suspense>
  );
}
