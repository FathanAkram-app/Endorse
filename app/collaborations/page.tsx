import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { getSession } from '@/lib/auth/server';
import { inbox } from '@/lib/endorse/collaborations';
import { statusLabels } from '@/lib/endorse/collaboration-validation';
import MarketplaceHeader from '@/components/endorse/marketplace-header';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Collaborations | Endorse' };
async function Inbox({ page }: { page: number }) {
  const session = await getSession(await headers());
  if (!session) redirect('/login');
  const data = await inbox(session.user.id, (page - 1) * 20);
  return <><MarketplaceHeader /><main className="container workspace-page">
    <div className="workspace-heading"><div><span className="section-kicker">YOUR WORK, TOGETHER</span><h1>Collaborations</h1><p>Conversations, contracts, and deliverables in one place.</p></div><Link href={`/explore?kind=${session.user.role === 'creator' ? 'brands' : 'creators'}`} className="button button-outline">Find a collaboration<ArrowRight size={16} /></Link></div>
    {data.items.length ? <div className="collaboration-list">{data.items.map(room => <Link className="collaboration-row" href={`/collaborations/${room.id}`} key={room.id}><div className="collaboration-avatar" aria-hidden="true">{room.partner.slice(0, 2).toUpperCase()}</div><div><h2>{room.terms?.title || room.brandName}</h2><p>{room.partner} · {room.brandName}</p></div><span className={`publication-badge ${room.status === 'completed' ? 'published' : ''}`}>{room.cancellationBy ? 'Cancellation requested' : statusLabels[room.status]}</span><ArrowRight size={18} /></Link>)}</div>
      : <div className="empty-state"><MessageCircle size={30} /><h2>{page > 1 ? 'No more collaborations' : 'Start with a conversation'}</h2><p>Open a creator or brand profile on Explore and choose Start a conversation.</p><Link className="button button-primary" href="/explore">Explore the marketplace</Link></div>}
    {(page > 1 || data.hasMore) && <nav className="explore-pagination" aria-label="Collaboration pages">{page > 1 ? <Link href={`/collaborations?page=${page - 1}`} className="button button-outline">Previous</Link> : <span />}<span>Page {page}</span>{data.hasMore && <Link href={`/collaborations?page=${page + 1}`} className="button button-outline">Next</Link>}</nav>}
  </main></>;
}
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const query = await searchParams;
  const page = Math.max(1, Math.min(10000, Math.floor(Number(query.page) || 1)));
  return <Inbox page={page} />;
}
