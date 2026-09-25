import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/server';
import { ownBrands, publicBrand, publicCreator } from '@/lib/endorse/marketplace';
import MarketplaceHeader from '@/components/endorse/marketplace-header';
import CollaborationStart from '@/components/endorse/collaboration-start';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Start a conversation | Endorse' };
async function Start({ query }: { query: Record<string, string> }) {
  const session = await getSession(await headers());
  if (!session) redirect('/login');
  const company = session.user.role === 'company';
  const target = company ? query.creator && await publicCreator(query.creator) : query.brand && await publicBrand(query.brand);
  if (!target) return <><MarketplaceHeader /><main className="container workspace-page"><div className="empty-state"><h1>{company ? 'Choose a creator to work with' : 'Choose a brand to work with'}</h1><p>{company ? 'Company accounts can contact creators on behalf of a brand.' : 'Creator accounts can contact brands.'}</p><Link className="button button-primary" href={`/explore?kind=${company ? 'creators' : 'brands'}`}>Explore {company ? 'creators' : 'brands'}</Link></div></main></>;
  const choices = company ? (await ownBrands(session.user.id)).map(item => ({ id: item.id, name: item.name })) : [{ id: target.id, name: target.name }];
  if (company && !query.creator) notFound();
  return <><MarketplaceHeader /><main className="container workspace-page collaboration-start"><Link className="back-link" href={company ? `/creators/${target.id}` : `/brands/${target.id}`}>Back to profile</Link><div className="workspace-heading"><div><span className="section-kicker">MAKE THE FIRST CONNECTION</span><h1>Talk with {target.name}</h1><p>Introduce yourself and discuss the brief before agreeing to a contract.</p></div></div>
    {choices.length ? <CollaborationStart key={target.id} brands={choices} creatorId={company ? target.id : undefined} company={company} /> : <div className="empty-state"><h2>Add a brand first</h2><p>Every collaboration belongs to a brand you manage.</p><Link href="/account/brands/new" className="button button-primary">Post a brand</Link></div>}
  </main></>;
}
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) { return <Start query={await searchParams} />; }
