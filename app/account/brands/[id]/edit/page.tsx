import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { brands } from '@/db/schema';
import { getSession } from '@/lib/auth/server';
import MarketplaceHeader from '@/components/endorse/marketplace-header';
import ListingEditor from '@/components/endorse/listing-editor';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Edit brand | Endorse' };
async function EditBrand({ id, created }: { id: string; created: boolean }) {
  const session = await getSession(await headers());
  if (!session) return redirect('/login');
  if (session.user.role !== 'company') return redirect('/account/creator');
  const [brand] = await getDb().select().from(brands).where(and(eq(brands.id, id), eq(brands.ownerId, session.user.id))).limit(1);
  if (!brand) return notFound();
  return <><MarketplaceHeader /><ListingEditor key={brand.id} role="company" mode="brand" initial={brand} created={created} /></>;
}
export default async function EditBrandPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const { id } = await params;
  return <EditBrand id={id} created={(await searchParams).created === '1'} />;
}
