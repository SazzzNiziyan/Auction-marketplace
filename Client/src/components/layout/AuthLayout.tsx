import React from 'react';
import { Gavel, Lock, ShieldCheck } from 'lucide-react';

export default function AuthLayout({ title, description, children, footer }: { title: string; description?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="grid min-h-[calc(100dvh-4rem)] lg:grid-cols-2">
      <div className="flex items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          {description && <p className="mt-2 text-sm text-muted sm:text-base">{description}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-center text-sm text-muted">{footer}</div>}
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <div aria-hidden className="absolute -right-32 -top-32 size-[28rem] rounded-full bg-accent/25 blur-3xl" />
        <div aria-hidden className="absolute -bottom-40 -left-20 size-96 rounded-full bg-amber-200/10 blur-3xl" />
        <div className="relative flex h-full flex-col justify-end p-12 xl:p-16">
          <p className="font-display text-5xl leading-[1.05] tracking-tight text-white xl:text-6xl">
            Every lot,
            <br />
            <span className="italic text-amber-300">a fair fight.</span>
          </p>
          <ul className="mt-10 space-y-4 text-stone-300">
            {[
              { icon: Lock, text: 'Refundable caution deposits keep bidding serious.' },
              { icon: Gavel, text: 'Late bids extend the clock — sniping never wins.' },
              { icon: ShieldCheck, text: 'Every seller is KYC and bank verified.' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-white/10 text-white">
                  <Icon className="size-4" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
