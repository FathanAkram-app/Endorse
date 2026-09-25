import { notFound } from 'next/navigation';
import { publicBrand } from '@/lib/endorse/marketplace';
import PublicListing from '@/components/endorse/public-listing';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Brand profile | Endorse' };
export default async function BrandPage({ params }: { params: Promise<{ id: string }> }) {
  const record = await publicBrand((await params).id);
  if (!record) return notFound();
  return <PublicListing item={record} kind="brands" />;
}
