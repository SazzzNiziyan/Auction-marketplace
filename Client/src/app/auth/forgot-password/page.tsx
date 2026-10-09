'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, MailCheck } from 'lucide-react';
import AuthLayout from '../../../components/layout/AuthLayout';
import { Alert, Button, Input } from '../../../components/ui';
import { api } from '../../../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    // The response is deliberately ignored beyond success/failure: we never
    // reveal whether an account exists, and never use any token it returns.
    const res = await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
    setLoading(false);
    if (res.success || res.status === 404) setSent(true);
    else setError(res.message || 'Something went wrong. Please try again.');
  };

  return (
    <AuthLayout
      title={sent ? 'Check your inbox' : 'Reset your password'}
      description={sent ? undefined : 'Enter the email on your account and we’ll send you a reset link.'}
      footer={
        <Link href="/auth/login" className="inline-flex items-center gap-1.5 font-medium text-ink underline-offset-4 hover:underline">
          <ArrowLeft className="size-4" aria-hidden /> Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="rounded-2xl border border-line bg-surface p-6 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-success-soft text-success">
            <MailCheck className="size-6" aria-hidden />
          </span>
          <p className="mt-4 text-sm text-ink-2">
            If an account exists for <span className="font-medium text-ink">{email}</span>, a reset link is on its way. It expires in one hour.
          </p>
          <Button variant="link" className="mt-4 text-sm" onClick={() => setSent(false)}>
            Use a different email
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          {error && <Alert tone="danger">{error}</Alert>}
          <Input label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} leading={<Mail className="size-4" />} />
          <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!/\S+@\S+\.\S+/.test(email)}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
