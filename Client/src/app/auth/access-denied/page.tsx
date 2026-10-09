import { ShieldAlert } from 'lucide-react';
import { LinkButton } from '../../../components/ui';

export const metadata = { title: 'Access denied' };

export default function AccessDeniedPage() {
  return (
    <div className="container-page flex min-h-[70dvh] flex-col items-center justify-center py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-danger-soft text-danger">
        <ShieldAlert className="size-7" aria-hidden />
      </span>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">You don’t have access to this page</h1>
      <p className="mt-2 max-w-md text-muted">
        This area is for a different account type. Sellers need an approved application; the admin console is for platform staff.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <LinkButton href="/">Go to marketplace</LinkButton>
        <LinkButton href="/seller/apply" variant="secondary">Apply to sell</LinkButton>
      </div>
    </div>
  );
}
