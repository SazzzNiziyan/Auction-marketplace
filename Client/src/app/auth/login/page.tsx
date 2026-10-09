'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail } from 'lucide-react';
import AuthLayout from '../../../components/layout/AuthLayout';
import { PasswordField } from '../../../components/PasswordField';
import { Alert, Button, Input } from '../../../components/ui';
import { isAdminRole, useAuth } from '../../../lib/auth';

function safeNext(next: string | null) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login, user, ready } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const next = safeNext(params.get('next'));
  const submitted = useRef(false);

  // Already signed in when landing here — skip the form.
  useEffect(() => {
    if (ready && user && !submitted.current) router.replace(next || '/');
  }, [ready, user, next, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    submitted.current = true;
    const res = await login(email.trim(), password);
    setLoading(false);
    if (!res.ok) {
      submitted.current = false;
      setError(res.message || 'Invalid email or password');
      return;
    }
    const role = res.user?.role;
    router.replace(next || (isAdminRole(role) ? '/admin/dashboard' : role === 'SELLER' ? '/seller/dashboard' : '/'));
  };

  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in to bid, track orders and manage your store."
      footer={
        <>
          New to Auctio?{' '}
          <Link href={next ? `/auth/register?next=${encodeURIComponent(next)}` : '/auth/register'} className="font-medium text-ink underline-offset-4 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        {error && <Alert tone="danger">{error}</Alert>}
        <Input label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} leading={<Mail className="size-4" />} />
        <div>
          <PasswordField label="Password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          <div className="mt-2 text-right">
            <Link href="/auth/forgot-password" className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!email || !password}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
