export const metadata = { title: 'Terms & policies' };

const SECTIONS = [
  {
    id: 'terms',
    title: 'Terms of service',
    body: [
      'By creating an account or using Auctio you agree to these terms. Auctio is a multi-vendor marketplace connecting buyers with independent, verified sellers in India. All prices and settlements are in Indian rupees.',
      'You must be at least 18 and legally able to enter binding contracts. One account can both buy and, once approved, sell.',
    ],
  },
  {
    id: 'auctions',
    title: 'Auction rules',
    list: [
      ['Caution deposit', 'A refundable deposit is required once per auction before your first bid.'],
      ['Minimum increment', 'Each bid must beat the current high bid by at least ₹100.'],
      ['Anti-sniping', 'A bid in the final 5 minutes extends the auction by 5 minutes, up to the maximum number of extensions for that lot.'],
      ['Auto-bid', 'Your auto-bid maximum is private and never shown to other bidders or the seller.'],
      ['Binding bids', 'Bids cannot be retracted. The highest bid when the auction closes wins, provided any reserve price is met.'],
    ],
  },
  {
    id: 'deposits',
    title: 'Deposits & winner payment',
    list: [
      ['Not winning', 'Your deposit is refunded in full when the auction closes.'],
      ['Winning', 'Your deposit is credited against the final price. The balance is due within 24 hours.'],
      ['Non-payment', 'If a winner doesn’t pay within 24 hours, the deposit is forfeited and the lot may be offered to the next-highest bidder.'],
    ],
  },
  {
    id: 'sellers',
    title: 'Seller standards',
    body: [
      'Sellers must pass verification (business details, PAN, GST where applicable, and a bank account) before listing. New listings are screened automatically and may be reviewed by a moderator.',
      'Counterfeit goods, undisclosed reproductions, prohibited items and shill bidding are banned and lead to permanent removal.',
    ],
  },
  {
    id: 'refunds',
    title: 'Returns & refunds',
    body: [
      'You can request a return within 7 days of delivery if an item is damaged, not authentic, or materially different from its description. Requests include a written reason and, ideally, photo evidence.',
      'The seller can accept the return or respond; unresolved requests are decided by the Auctio team. Approved refunds go back to the original payment method.',
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy',
    body: [
      'Bidder identities are masked in public bid histories. Your delivery address and phone number are shared only with the seller fulfilling your order and their courier.',
      'Payment details are handled by Razorpay and are never stored by Auctio.',
    ],
  },
];

export default function PoliciesPage() {
  return (
    <div className="container-page py-10 sm:py-14">
      <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Terms & policies</h1>
      <p className="mt-3 text-muted">The rules that keep Auctio fair for buyers and sellers.</p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Policy sections" className="lg:sticky lg:top-32 lg:self-start">
          <ul className="scrollbar-none flex gap-2 overflow-x-auto lg:flex-col lg:gap-1">
            {SECTIONS.map((s) => (
              <li key={s.id} className="shrink-0">
                <a href={`#${s.id}`} className="block rounded-lg px-3 py-2 text-sm text-ink-2 hover:bg-subtle hover:text-ink">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="max-w-3xl space-y-12">
          {SECTIONS.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-28">
              <h2 className="text-xl font-semibold">
                <span className="tabular mr-2 text-muted">{i + 1}.</span>
                {s.title}
              </h2>
              {s.body?.map((p) => (
                <p key={p} className="mt-3 leading-relaxed text-ink-2">{p}</p>
              ))}
              {s.list && (
                <dl className="mt-4 divide-y divide-line rounded-2xl border border-line bg-surface">
                  {s.list.map(([term, def]) => (
                    <div key={term} className="grid gap-1 px-5 py-4 sm:grid-cols-[180px_1fr] sm:gap-4">
                      <dt className="font-medium">{term}</dt>
                      <dd className="text-sm leading-relaxed text-ink-2">{def}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
