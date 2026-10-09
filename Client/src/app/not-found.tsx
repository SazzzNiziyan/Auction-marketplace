import { Compass } from 'lucide-react';
import { LinkButton } from '../components/ui';

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[70dvh] flex-col items-center justify-center py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-subtle text-ink-2">
        <Compass className="size-7" aria-hidden />
      </span>
      <p className="tabular mt-6 text-sm font-medium text-accent">404</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">We couldn’t find that page</h1>
      <p className="mt-2 max-w-md text-muted">The listing may have sold, the auction may have closed, or the link may be wrong.</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <LinkButton href="/">Go to marketplace</LinkButton>
        <LinkButton href="/explore" variant="secondary">Browse listings</LinkButton>
      </div>
    </div>
  );
}
