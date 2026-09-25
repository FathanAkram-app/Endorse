import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Building2, Camera, ArrowRight, Plus, Pencil } from 'lucide-react';
import { getSession } from '@/lib/auth/server';
import { ownBrands, ownProfile } from '@/lib/endorse/marketplace';
import Brand from '@/components/endorse/brand';
import { LogoutButton } from '@/components/endorse/account-nav';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your account | Endorse' };

async function AccountDetails({ role }: { role: string }) {
  if (role !== 'creator' && role !== 'company') notFound();
  const session = await getSession(await headers());
  if (!session) redirect('/login');
  if (session.user.role !== role) redirect(`/account/${session.user.role}`);
  const { user } = session;
  const creator = role === 'creator';
  const Icon = creator ? Camera : Building2;
  const profile = await ownProfile(user);
  const listings = creator ? [] : await ownBrands(user.id);
  return <>
    <header className="site-header"><div className="container header-inner"><Brand /><Link className="account-discover" href="/explore">Explore marketplace</Link><LogoutButton /></div></header>
    <main className="container account-page">
      <span className="account-role"><Icon size={18} />{creator ? 'Creator account' : 'Company account'}</span>
      <h1>Welcome, {user.name}.</h1>
      <p>{creator ? 'Find brands that fit your creativity.' : 'Discover the right creative talent for your brand.'}</p>
      <div className="account-card-actions"><Link className="button button-primary" href="/collaborations">Your collaborations<ArrowRight size={16} /></Link></div>
      <div className="account-workspace-grid">
        <section className="account-details" aria-labelledby="account-details-title">
          <div className="account-section-heading"><h2 id="account-details-title">{creator ? 'Your creator profile' : 'Company details'}</h2>{creator && <span className={`publication-badge ${profile.published ? 'published' : ''}`}>{profile.published ? 'Published' : 'Draft'}</span>}</div>
          <dl><div><dt>{creator ? 'Display name' : 'Company name'}</dt><dd>{profile.name}</dd></div><div><dt>Email address <span className="field-optional">Private</span></dt><dd>{user.email}</dd></div>{profile.category && <div><dt>{creator ? 'Category' : 'Industry'}</dt><dd>{profile.category}</dd></div>}</dl>
          <div className="account-card-actions"><Link href="/account/profile" className="button button-primary"><Pencil size={16} />Edit profile</Link>{creator && profile.published && <Link href={`/creators/${user.id}`}>View public profile <ArrowRight size={16} /></Link>}</div>
        </section>
        <section className="account-next-step"><Icon size={27} /><h2>{creator ? profile.published ? 'Your next connection starts here.' : 'Ready to be discovered?' : 'Give your brands a home.'}</h2><p>{creator ? profile.published ? 'Your profile is live. Explore brands and get to know their stories.' : 'Add a bio and category, then publish your profile to appear on Explore.' : 'Create a profile for each brand you represent. Save a draft or publish it for creators to discover.'}</p><Link className="button button-outline" href={creator ? profile.published ? '/explore?kind=brands' : '/account/profile' : '/account/brands/new'}>{creator ? profile.published ? 'Explore brands' : 'Complete your profile' : 'Post a brand'}<ArrowRight size={16} /></Link></section>
      </div>
      {!creator && <section className="managed-brands" aria-labelledby="brands-title"><div className="account-section-heading"><div><span className="section-kicker">YOUR BRAND PORTFOLIO</span><h2 id="brands-title">Brands you manage</h2></div><Link className="button button-primary" href="/account/brands/new"><Plus size={17} />Post a brand</Link></div>
        {listings.length ? <div className="managed-brand-list">{listings.map((brand) => <article key={brand.id} className="managed-brand-row"><div className="managed-brand-initials" aria-hidden="true">{brand.name.slice(0, 2).toUpperCase()}</div><div className="managed-brand-name"><h3>{brand.name}</h3><p>{brand.category || 'Category not set'}</p></div><span className={`publication-badge ${brand.published ? 'published' : ''}`}>{brand.published ? 'Published' : 'Draft'}</span><div className="managed-brand-actions">{brand.published && <Link href={`/brands/${brand.id}`}>View</Link>}<Link href={`/account/brands/${brand.id}/edit`} className="button button-outline" aria-label={`Edit ${brand.name}`}><Pencil size={15} />Edit</Link></div></article>)}</div>
          : <div className="empty-state"><Building2 size={28} /><h3>Your first brand starts here.</h3><p>Add a name, share its story, and publish when you’re ready.</p><Link href="/account/brands/new" className="button button-outline">Create your first brand</Link></div>}
      </section>}
      <Link className="account-explore-link" href={creator ? '/explore?kind=brands' : '/explore'}>{creator ? 'Explore brands' : 'Find creators'}<ArrowRight size={17} /></Link>
    </main>
  </>;
}

export default async function AccountPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  return <AccountDetails role={role} />;
}
