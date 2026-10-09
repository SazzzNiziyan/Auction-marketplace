import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const inrCompact = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1 });
const num = new Intl.NumberFormat('en-IN');

export function formatINR(paise: number | null | undefined): string {
  return inr.format((paise || 0) / 100);
}

export function formatINRCompact(paise: number | null | undefined): string {
  return inrCompact.format((paise || 0) / 100);
}

export function formatNumber(n: number | null | undefined): string {
  return num.format(n || 0);
}

export function rupeesToPaise(value: string | number): number {
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function formatDate(value: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', opts);
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export function timeAgo(value: string | Date | null | undefined): string {
  if (!value) return '';
  const diff = Date.now() - new Date(value).getTime();
  const s = Math.round(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return formatDate(value);
}

export function timeRemaining(end: string | Date | null | undefined, now = Date.now()) {
  if (!end) return { totalMs: 0, ended: true, label: 'Ended', days: 0, hours: 0, minutes: 0, seconds: 0 };
  const totalMs = new Date(end).getTime() - now;
  if (totalMs <= 0) return { totalMs: 0, ended: true, label: 'Ended', days: 0, hours: 0, minutes: 0, seconds: 0 };
  const seconds = Math.floor(totalMs / 1000) % 60;
  const minutes = Math.floor(totalMs / 60000) % 60;
  const hours = Math.floor(totalMs / 3600000) % 24;
  const days = Math.floor(totalMs / 86400000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const label = days > 0 ? `${days}d ${hours}h ${pad(minutes)}m` : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return { totalMs, ended: false, label, days, hours, minutes, seconds };
}

export const CONDITION_LABELS: Record<string, string> = {
  new: 'New',
  like_new: 'Like new',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
};

export function conditionLabel(c?: string | null) {
  if (!c) return '';
  return CONDITION_LABELS[c] || CONDITION_LABELS[c.toLowerCase()] || c.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (x) => x.toUpperCase());
}

export function humanize(value?: string | null) {
  if (!value) return '';
  return value.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (x) => x.toUpperCase());
}

export function initials(name?: string | null) {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

export const FALLBACK_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#f5f5f4"/><path d="M170 170l25-30 20 22 15-16 30 34H150z" fill="#d6d3d1"/><circle cx="180" cy="125" r="12" fill="#d6d3d1"/></svg>'
  );
