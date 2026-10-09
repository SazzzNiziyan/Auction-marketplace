import Link from 'next/link';
import { cn } from '../../lib/format';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn('size-8', className)}>
      <rect width="32" height="32" rx="9" className="fill-ink" />
      <path d="M9.5 22.5 16 8.5l6.5 14" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.2 17.5h7.6" stroke="#f59e0b" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo({ href = '/', suffix, className }: { href?: string; suffix?: string; className?: string }) {
  return (
    <Link href={href} className={cn('flex shrink-0 items-center gap-2.5 rounded-lg', className)} aria-label="Auctio home">
      <LogoMark />
      <span className="text-lg font-semibold tracking-tight text-ink">Auctio</span>
      {suffix && <span className="rounded-md bg-subtle px-1.5 py-0.5 text-xs font-medium text-muted">{suffix}</span>}
    </Link>
  );
}
