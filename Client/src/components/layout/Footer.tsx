import Link from 'next/link';
import { Lock, ShieldCheck, Truck } from 'lucide-react';
import Logo from './Logo';

const COLUMNS = [
  {
    title: 'Marketplace',
    links: [
      { href: '/explore?type=AUCTION', label: 'Live auctions' },
      { href: '/explore?type=FIXED_PRICE', label: 'Buy now' },
      { href: '/explore?sort=ending_soon', label: 'Ending soon' },
      { href: '/explore', label: 'All categories' },
    ],
  },
  {
    title: 'Sell',
    links: [
      { href: '/seller/apply', label: 'Become a seller' },
      { href: '/seller/dashboard', label: 'Seller hub' },
      { href: '/help#selling', label: 'Seller guide' },
    ],
  },
  {
    title: 'Support',
    links: [
      { href: '/help', label: 'Help centre' },
      { href: '/help#deposits', label: 'Caution deposits' },
      { href: '/policies#refunds', label: 'Returns & refunds' },
      { href: '/policies', label: 'Terms & privacy' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="container-page grid gap-4 border-b border-line py-8 sm:grid-cols-3">
        {[
          { icon: ShieldCheck, title: 'Verified sellers', body: 'Every seller passes KYC and bank verification.' },
          { icon: Lock, title: 'Refundable deposits', body: 'Non-winning bidders are refunded automatically.' },
          { icon: Truck, title: 'Tracked delivery', body: 'Courier tracking on every shipped order.' },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-subtle text-ink">
              <Icon className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">{title}</p>
              <p className="text-sm text-muted">{body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Real-time auctions and a curated marketplace for collectors and makers across India.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h3 className="text-sm font-semibold text-ink">{col.title}</h3>
            <ul className="mt-4 space-y-3">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm text-muted transition-colors hover:text-ink">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-2 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Auctio Marketplace. All prices in INR.</p>
          <p>Payments processed securely by Razorpay.</p>
        </div>
      </div>
    </footer>
  );
}
