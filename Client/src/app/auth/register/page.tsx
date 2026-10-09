'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, User } from 'lucide-react';
import AuthLayout from '../../../components/layout/AuthLayout';
import { PasswordField, passwordIsStrong } from '../../../components/PasswordField';
import { Alert, Button, Checkbox, Input } from '../../../components/ui';
import { useAuth } from '../../../lib/auth';

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { register, user, ready } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const nextParam = params.get('next');
  const next = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/';

  const submitted = useRef(false);

  useEffect(() => {
    if (ready && user && !submitted.current) router.replace(next);
  }, [ready, user, next, router]);

  const valid = displayName.trim().length >= 2 && /\S+@\S+\.\S+/.test(email) && passwordIsStrong(password) && agreed;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setError(null);
    setLoading(true);
    submitted.current = true;
    const res = await register({ displayName: displayName.trim(), email: email.trim(), password });
    setLoading(false);
    if (!res.ok) {
      submitted.current = false;
      setError(res.message || 'Registration failed');
      return;
    }
    router.replace(next);
  };

  return (
    <AuthLayout
      title="Create your account"
      description="Join collectors and sellers bidding live across India."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/auth/login" className="font-medium text-ink underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        {error && <Alert tone="danger">{error}</Alert>}
        <Input label="Full name" autoComplete="name" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} leading={<User className="size-4" />} />
        <Input label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} leading={<Mail className="size-4" />} />
        <PasswordField label="Password" autoComplete="new-password" required showRules value={password} onChange={(e) => setPassword(e.target.value)} />
        <Checkbox
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          label={
            <>
              I agree to the{' '}
              <Link href="/policies" className="underline underline-offset-2">
                terms and privacy policy
              </Link>
            </>
          }
        />
        <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!valid}>
          Create account
        </Button>
        <p className="text-center text-xs text-muted">Want to sell? Create an account first, then apply from the Sell page.</p>
      </form>
    </AuthLayout>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
