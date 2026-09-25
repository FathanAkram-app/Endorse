import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { AuthError, getSession } from '@/lib/auth/server';
import { roomData } from '@/lib/endorse/collaborations';
import MarketplaceHeader from '@/components/endorse/marketplace-header';
import CollaborationRoom from '@/components/endorse/collaboration-room';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Collaboration workspace | Endorse' };
async function Details({ id }: { id: string }) {
  const session = await getSession(await headers());
  if (!session) redirect('/login');
  let data;
  try { data = await roomData(id, session.user.id); } catch (error) { if (error instanceof AuthError && error.status === 404) notFound(); throw error; }
  return <><MarketplaceHeader /><CollaborationRoom key={id} initial={data} /></>;
}
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <Details id={(await params).id} />; }
