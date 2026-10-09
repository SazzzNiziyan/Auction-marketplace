import { redirect } from 'next/navigation';

// Legacy route — search lives on /explore.
export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (typeof v === 'string' && v) qs.set(k, v);
  });
  redirect(qs.toString() ? `/explore?${qs}` : '/explore');
}
