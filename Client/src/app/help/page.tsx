import Link from 'next/link';
import { ChevronDown, Gavel, LifeBuoy, Mail, Package, Store, Wallet } from 'lucide-react';

export const metadata = { title: 'Help centre' };

const SECTIONS = [
  {
    id: 'deposits',
    icon: Wallet,
    title: 'Deposits & payments',
    faqs: [
      {
        q: 'What is a caution deposit?',
        a: 'Before your first bid on an auction you place a small refundable deposit (set by the seller, usually ₹500 or more). It keeps bidding serious. If you don’t win, it is refunded in full when the auction closes. If you win, it is credited against the final price.',
      },
      {
        q: 'When is a deposit forfeited?',
        a: 'Only if you win an auction and don’t complete payment within 24 hours of it closing. The lot is then offered to the next-highest bidder.',
      },
      {
        q: 'Which payment methods are accepted?',
        a: 'Payments are processed by Razorpay in Indian rupees — UPI, cards, net banking and wallets are supported. Auctio never sees or stores your card details.',
      },
    ],
  },
  {
    id: 'bidding',
    icon: Gavel,
    title: 'Bidding',
    faqs: [
      {
        q: 'How does anti-sniping work?',
        a: 'Any bid placed in the final 5 minutes extends the auction by 5 minutes, up to the limit the seller sets. Everyone in the room sees the new end time instantly, so a last-second bid can always be answered.',
      },
      {
        q: 'What is auto-bid?',
        a: 'Set a private maximum and we bid the smallest increment needed to keep you on top, only when someone outbids you. Your maximum is never shown to other bidders or the seller.',
      },
      {
        q: 'Can I retract a bid?',
        a: 'No. Every bid is a binding commitment to buy at that price if you win.',
      },
    ],
  },
  {
    id: 'orders',
    icon: Package,
    title: 'Orders, shipping & returns',
    faqs: [
      {
        q: 'Why did my cart become several orders?',
        a: 'Items from different sellers ship separately, so checkout creates one order per seller with its own shipping charge and tracking number.',
      },
      {
        q: 'How do I return an item?',
        a: 'Within 7 days of delivery, open the order under My account → Orders and choose “Request a return”. Describe the problem and add a photo link. The seller responds first; unresolved cases are decided by our team.',
      },
    ],
  },
  {
    id: 'selling',
    icon: Store,
    title: 'Selling on Auctio',
    faqs: [
      {
        q: 'How do I become a seller?',
        a: 'Create an account, then apply from the Sell page with your business, PAN/GST and bank details. Our team reviews applications and you’ll be able to list as soon as you’re approved.',
      },
      {
        q: 'What does it cost?',
        a: 'Listing is free. A platform commission (currently 5%) is deducted from completed sales before payout.',
      },
      {
        q: 'Why is my listing “In review”?',
        a: 'New listings are screened automatically for prohibited or misleading content. Flagged listings are checked by a moderator before they go live.',
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="container-page max-w-4xl py-10 sm:py-14">
      <div className="text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-subtle text-ink">
          <LifeBuoy className="size-6" aria-hidden />
        </span>
        <h1 className="mt-5 font-display text-4xl tracking-tight sm:text-5xl">How can we help?</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted">Answers about bidding, deposits, orders and selling.</p>
      </div>

      <nav aria-label="Help topics" className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SECTIONS.map(({ id, icon: Icon, title }) => (
          <a key={id} href={`#${id}`} className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-surface p-4 text-center text-sm font-medium hover:border-line-strong">
            <Icon className="size-5 text-accent" aria-hidden />
            {title}
          </a>
        ))}
      </nav>

      <div className="mt-12 space-y-12">
        {SECTIONS.map(({ id, title, faqs }) => (
          <section key={id} id={id} className="scroll-mt-24">
            <h2 className="text-xl font-semibold">{title}</h2>
            <div className="mt-4 divide-y divide-line rounded-2xl border border-line bg-surface">
              {faqs.map((f) => (
                <details key={f.q} className="group px-5 py-1">
                  <summary className="flex min-h-12 list-none items-center justify-between gap-4 py-3 font-medium [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <ChevronDown className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="pb-4 text-sm leading-relaxed text-ink-2">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-14 flex flex-col items-start gap-4 rounded-2xl bg-ink p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <h2 className="text-lg font-semibold">Still need help?</h2>
          <p className="mt-1 text-sm text-stone-300">Ask the assistant in the corner of any page, or email our support team.</p>
        </div>
        <Link href="mailto:support@auctio.in" className="inline-flex h-11 items-center gap-2 rounded-lg bg-white px-4 text-sm font-medium text-ink hover:bg-stone-100">
          <Mail className="size-4" aria-hidden /> support@auctio.in
        </Link>
      </div>
    </div>
  );
}
