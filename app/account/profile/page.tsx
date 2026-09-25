import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/server';
import { ownProfile } from '@/lib/endorse/marketplace';
import MarketplaceHeader from '@/components/endorse/marketplace-header';
import ListingEditor from '@/components/endorse/listing-editor';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Edit profile | Endorse' };
async function ProfileEditor() {
  const session = await getSession(await headers());
  if (!session) return redirect('/login');
  return <><MarketplaceHeader /><ListingEditor initial={await ownProfile(session.user)} role={session.user.role} /></>;
}
export default function ProfilePage() { return <ProfileEditor />; }
