import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/server';
import MarketplaceHeader from '@/components/endorse/marketplace-header';
import ListingEditor from '@/components/endorse/listing-editor';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Post a brand | Endorse' };
async function NewBrand() {
  const session = await getSession(await headers());
  if (!session) return redirect('/login');
  if (session.user.role !== 'company') return redirect('/account/creator');
  return <><MarketplaceHeader /><ListingEditor role="company" mode="brand" initial={{ name: '', tagline: '', description: '', category: '', location: '', website: '', imageUrl: '', published: false }} /></>;
}
export default function NewBrandPage() { return <NewBrand />; }
