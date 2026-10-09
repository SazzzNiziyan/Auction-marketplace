'use client';

import React, { useEffect, useId, useRef } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Info, Loader2, X, type LucideIcon } from 'lucide-react';
import { cn, FALLBACK_IMAGE, initials } from '../../lib/format';

/* ─── Button ───────────────────────────────────────────────────────────────── */

type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger' | 'link';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] select-none';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-white hover:bg-ink-2 shadow-card',
  accent: 'bg-accent text-white hover:bg-accent-strong shadow-card',
  secondary: 'border border-line-strong bg-surface text-ink hover:bg-subtle hover:border-muted/40',
  ghost: 'text-ink-2 hover:bg-subtle hover:text-ink',
  danger: 'bg-danger text-white hover:bg-red-800 shadow-card',
  link: 'text-ink underline-offset-4 hover:underline px-0 h-auto active:scale-100',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
  icon: 'size-11 p-0',
};

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) {
  return cn(BUTTON_BASE, BUTTON_VARIANTS[variant], variant !== 'link' && BUTTON_SIZES[size], className);
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading, disabled, icon: Icon, iconRight: IconRight, children, type = 'button', ...props },
  ref
) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={buttonClasses(variant, size, className)} {...props}>
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : Icon && <Icon className="size-4" aria-hidden />}
      {children}
      {IconRight && !loading && <IconRight className="size-4" aria-hidden />}
    </button>
  );
});

export function LinkButton({
  href,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  className,
  children,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize; icon?: LucideIcon; iconRight?: LucideIcon }) {
  return (
    <Link href={href} className={buttonClasses(variant, size, className)} {...props}>
      {Icon && <Icon className="size-4" aria-hidden />}
      {children}
      {IconRight && <IconRight className="size-4" aria-hidden />}
    </Link>
  );
}

/* ─── Badge ────────────────────────────────────────────────────────────────── */

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'danger' | 'info' | 'warning' | 'live' | 'dark';

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-subtle text-ink-2 ring-line',
  accent: 'bg-accent-soft text-accent-strong ring-accent-line/60',
  success: 'bg-success-soft text-success ring-emerald-200',
  danger: 'bg-danger-soft text-danger ring-red-200',
  info: 'bg-info-soft text-info ring-blue-200',
  warning: 'bg-warning-soft text-warning ring-yellow-200',
  live: 'bg-live text-white ring-live',
  dark: 'bg-ink/85 text-white ring-transparent backdrop-blur',
};

export function Badge({
  tone = 'neutral',
  dot,
  className,
  children,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', BADGE_TONES[tone], className)}>
      {dot && <span className={cn('size-1.5 rounded-full bg-current', tone === 'live' && 'live-dot')} aria-hidden />}
      {children}
    </span>
  );
}

/* ─── Card ─────────────────────────────────────────────────────────────────── */

export function Card({ className, children, as: As = 'div', ...props }: React.HTMLAttributes<HTMLElement> & { as?: 'div' | 'section' | 'article' }) {
  return (
    <As className={cn('rounded-2xl border border-line bg-surface shadow-card', className)} {...props}>
      {children}
    </As>
  );
}

export function CardHeader({ title, description, action, className }: { title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6', className)}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/* ─── Form controls ────────────────────────────────────────────────────────── */

const FIELD_BASE =
  'block w-full rounded-lg border bg-surface px-3.5 text-ink placeholder:text-muted/70 shadow-[inset_0_1px_1px_rgb(28_25_23/0.03)] transition-colors focus:outline-none focus:ring-2 focus:ring-ink/10 disabled:bg-subtle disabled:text-muted';

function FieldShell({
  id,
  label,
  required,
  hint,
  error,
  children,
  className,
}: {
  id: string;
  label?: React.ReactNode;
  required?: boolean;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
          {label}
          {required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 flex items-center gap-1 text-sm text-danger">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  wrapperClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leading, trailing, className, wrapperClassName, id, required, ...props },
  ref
) {
  const auto = useId();
  const inputId = id || auto;
  return (
    <FieldShell id={inputId} label={label} required={required} hint={hint} error={error} className={wrapperClassName}>
      <div className="relative">
        {leading && <div className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted">{leading}</div>}
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cn(
            FIELD_BASE,
            'h-11',
            error ? 'border-danger focus:ring-danger/15' : 'border-line-strong focus:border-ink',
            !!leading && 'pl-10',
            !!trailing && 'pr-11',
            className
          )}
          {...props}
        />
        {trailing && <div className="absolute inset-y-0 right-1.5 flex items-center">{trailing}</div>}
      </div>
    </FieldShell>
  );
});

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  wrapperClassName?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className, wrapperClassName, id, required, rows = 4, ...props },
  ref
) {
  const auto = useId();
  const inputId = id || auto;
  return (
    <FieldShell id={inputId} label={label} required={required} hint={hint} error={error} className={wrapperClassName}>
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        required={required}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={cn(FIELD_BASE, 'py-2.5 leading-relaxed', error ? 'border-danger' : 'border-line-strong focus:border-ink', className)}
        {...props}
      />
    </FieldShell>
  );
});

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  wrapperClassName?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, options, placeholder, className, wrapperClassName, id, required, ...props },
  ref
) {
  const auto = useId();
  const inputId = id || auto;
  return (
    <FieldShell id={inputId} label={label} required={required} hint={hint} error={error} className={wrapperClassName}>
      <div className="relative">
      <select
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={!!error || undefined}
          className={cn(
            FIELD_BASE,
            'h-11 appearance-none pr-10',
            error ? 'border-danger' : 'border-line-strong focus:border-ink',
            className
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
      </div>
    </FieldShell>
  );
});

export function Checkbox({ label, description, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode; description?: React.ReactNode }) {
  const id = useId();
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <input id={id} type="checkbox" className="mt-0.5 size-5 shrink-0 rounded border-line-strong accent-ink" {...props} />
      <label htmlFor={id} className="text-sm">
        <span className="font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-muted">{description}</span>}
      </label>
    </div>
  );
}

/* ─── Feedback ─────────────────────────────────────────────────────────────── */

export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return (
    <span role="status" className={cn('inline-flex items-center', className)}>
      <Loader2 className="size-5 animate-spin text-muted" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('skeleton rounded-lg', className)} />;
}

const ALERT_TONES = {
  info: { cls: 'border-blue-200 bg-info-soft text-info', icon: Info },
  success: { cls: 'border-emerald-200 bg-success-soft text-success', icon: CheckCircle2 },
  warning: { cls: 'border-yellow-200 bg-warning-soft text-warning', icon: AlertCircle },
  danger: { cls: 'border-red-200 bg-danger-soft text-danger', icon: AlertCircle },
};

export function Alert({
  tone = 'info',
  title,
  children,
  action,
  className,
}: {
  tone?: keyof typeof ALERT_TONES;
  title?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  const { cls, icon: Icon } = ALERT_TONES[tone];
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('flex gap-3 rounded-xl border p-4 text-sm', cls, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn('text-ink-2', title && 'mt-0.5')}>{children}</div>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry, className }: { message?: string; onRetry?: () => void; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-12 text-center', className)}>
      <div className="flex size-12 items-center justify-center rounded-full bg-danger-soft text-danger">
        <AlertCircle className="size-6" aria-hidden />
      </div>
      <h3 className="mt-4 text-base font-semibold text-ink">Something went wrong</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{message || 'We couldn’t load this content.'}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-14 text-center', className)}>
      <div className="flex size-12 items-center justify-center rounded-full bg-subtle text-ink-2">
        <Icon className="size-6" aria-hidden />
      </div>
      <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/* ─── Modal ────────────────────────────────────────────────────────────────── */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector<HTMLElement>('input, textarea, select, button:not([data-close])')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-fade-in bg-ink/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'relative flex max-h-[92dvh] w-full animate-rise flex-col rounded-t-2xl bg-surface shadow-overlay sm:rounded-2xl',
          size === 'sm' && 'sm:max-w-md',
          size === 'md' && 'sm:max-w-lg',
          size === 'lg' && 'sm:max-w-2xl'
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-ink">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          <button data-close onClick={onClose} className="-mr-2 rounded-lg p-2 text-muted hover:bg-subtle hover:text-ink" aria-label="Close dialog">
            <X className="size-5" />
          </button>
        </div>
        {children && <div className="overflow-y-auto px-5 py-5 sm:px-6">{children}</div>}
        {footer && <div className="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end sm:px-6">{footer}</div>}
      </div>
    </div>
  );
}

/* ─── Layout helpers ───────────────────────────────────────────────────────── */

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && <div className="mb-2 text-sm font-medium text-accent">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  loading,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  loading?: boolean;
  className?: string;
}) {
  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        {Icon && (
          <span className="flex size-9 items-center justify-center rounded-lg bg-subtle text-ink-2">
            <Icon className="size-4" aria-hidden />
          </span>
        )}
      </div>
      {loading ? <Skeleton className="mt-3 h-8 w-24" /> : <p className="tabular mt-2 text-2xl font-semibold tracking-tight text-ink">{value}</p>}
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    </Card>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: Array<{ value: T; label: string; count?: number }>;
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={cn('scrollbar-none -mx-1 flex gap-1 overflow-x-auto px-1', className)}>
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cn(
              'inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors',
              active ? 'bg-ink text-white' : 'text-ink-2 hover:bg-subtle'
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={cn('tabular rounded-full px-1.5 text-xs', active ? 'bg-white/20' : 'bg-subtle text-muted')}>{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4 pt-6">
      <Button variant="secondary" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </Button>
      <span className="tabular text-sm text-muted">
        Page {page} of {totalPages}
      </span>
      <Button variant="secondary" size="sm" iconRight={ChevronRight} disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Next
      </Button>
    </nav>
  );
}

export function Avatar({ name, src, size = 'md', className }: { name?: string | null; src?: string | null; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const [failed, setFailed] = React.useState(false);
  const dims = size === 'sm' ? 'size-8 text-xs' : size === 'lg' ? 'size-14 text-lg' : 'size-10 text-sm';
  return src && !failed ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" onError={() => setFailed(true)} className={cn('shrink-0 rounded-full bg-line object-cover', dims, className)} />
  ) : (
    <span aria-hidden className={cn('flex shrink-0 items-center justify-center rounded-full bg-ink font-semibold text-white', dims, className)}>
      {initials(name)}
    </span>
  );
}

export function SafeImage({ src, alt, className, ...props }: Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & { src?: string | null }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={typeof src === 'string' && src ? src : FALLBACK_IMAGE}
      alt={alt || ''}
      loading="lazy"
      decoding="async"
      onError={(e) => {
        if (e.currentTarget.src !== FALLBACK_IMAGE) e.currentTarget.src = FALLBACK_IMAGE;
      }}
      className={cn('bg-subtle object-cover', className)}
      {...props}
    />
  );
}

export function DescriptionList({ items, className }: { items: Array<{ label: string; value: React.ReactNode }>; className?: string }) {
  return (
    <dl className={cn('divide-y divide-line', className)}>
      {items.map((it) => (
        <div key={it.label} className="flex items-start justify-between gap-4 py-2.5 text-sm">
          <dt className="text-muted">{it.label}</dt>
          <dd className="text-right font-medium text-ink">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}
