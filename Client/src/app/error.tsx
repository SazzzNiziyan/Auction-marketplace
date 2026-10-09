'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button, LinkButton } from '../components/ui';

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-page flex min-h-[70dvh] flex-col items-center justify-center py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-danger-soft text-danger">
        <AlertTriangle className="size-7" aria-hidden />
      </span>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-2 max-w-md text-muted">An unexpected error stopped this page from loading. Try again, or head back to the marketplace.</p>
      {error.digest && <p className="tabular mt-3 text-xs text-muted">Reference: {error.digest}</p>}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button icon={RotateCw} onClick={reset}>Try again</Button>
        <LinkButton href="/" variant="secondary">Go to marketplace</LinkButton>
      </div>
    </div>
  );
}
