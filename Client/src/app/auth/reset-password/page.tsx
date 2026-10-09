'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import AuthLayout from '../../../components/layout/AuthLayout';
import { PasswordField, passwordIsStrong } from '../../../components/PasswordField';
import { Alert, Button, LinkButton } from '../../../components/ui';
import { api } from '../../../lib/api';

function ResetForm() {
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const mismatch = confirm.length > 0 && confirm !== password;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordIsStrong(password) || password !== confirm) return;
    setError(null);
    setLoading(true);
    const res = await api.post('/auth/reset-password', { token, password });
    setLoading(false);
    if (res.success) setDone(true);
    else setError(res.message || 'This reset link is invalid or has expired.');
  };

  if (!token) {
    return (
      <AuthLayout title="Reset link missing" description="Open the link from your reset email, or request a new one.">
        <LinkButton href="/auth/forgot-password" size="lg" className="w-full">Request a new link</LinkButton>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout title="Password updated">
        <div className="rounded-2xl border border-line bg-surface p-6 text-center">
          <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden />
          <p className="mt-3 text-sm text-ink-2">Your password has been changed and you’ve been signed out of all devices.</p>
        </div>
        <LinkButton href="/auth/login" size="lg" className="mt-6 w-full">Sign in</LinkButton>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Choose a new password"
      footer={<Link href="/auth/login" className="font-medium text-ink underline-offset-4 hover:underline">Back to sign in</Link>}
    >
      <form onSubmit={submit} className="space-y-5">
        {error && (
          <Alert tone="danger" action={<Link href="/auth/forgot-password" className="text-sm font-medium underline">New link</Link>}>
            {error}
          </Alert>
        )}
        <PasswordField label="New password" autoComplete="new-password" required showRules value={password} onChange={(e) => setPassword(e.target.value)} />
        <PasswordField
          label="Confirm password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={mismatch ? 'Passwords don’t match' : undefined}
        />
        <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!passwordIsStrong(password) || password !== confirm}>
          Update password
        </Button>
      </form>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
