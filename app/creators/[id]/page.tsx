import { notFound } from 'next/navigation';
import { publicCreator } from '@/lib/endorse/marketplace';
import PublicListing from '@/components/endorse/public-listing';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Creator profile | Endorse' };
export default async function CreatorPage({ params }: { params: Promise<{ id: string }> }) {
  const record = await publicCreator((await params).id);
  if (!record) return notFound();
  return <PublicListing item={record} kind="creators" />;
}
