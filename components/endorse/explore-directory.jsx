'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, ArrowLeft, ArrowRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { profileCategories } from '@/lib/endorse/profile-validation';
import ListingCard from './listing-card';

export default function ExploreDirectory({ result }) {
  const { kind, q, category, sort, page, pageSize, total, items } = result;
  const [query, setQuery] = useState(q);
  const [selectedCategory, setCategory] = useState(category || 'all');
  const [selectedSort, setSort] = useState(sort);
  const creator = kind === 'creators';
  function link(overrides = {}) {
    const params = new URLSearchParams({ kind, q, category, sort, page: String(page), ...overrides });
    return `/explore?${params}`;
  }
  function submit(event) {
    event.preventDefault();
    window.location.assign(link({ q: query.trim(), category: selectedCategory === 'all' ? '' : selectedCategory, sort: selectedSort, page: '1' }));
  }
  return <main className="container workspace-page explore-page">
    <div className="workspace-heading"><div><span className="section-kicker">FIND YOUR PEOPLE</span><h1>A world of possibility.</h1><p>Meet independent creators and discover brands ready for their next connection.</p></div><Link className="button button-outline" href="/account">Manage your profile <ArrowRight size={17} /></Link></div>
    <Tabs value={kind} onValueChange={(value) => window.location.assign(link({ kind: value, page: '1', sort: 'newest' }))}>
      <TabsList className="audience-tabs explore-tabs" aria-label="Explore listings"><TabsTrigger value="creators">Content creators</TabsTrigger><TabsTrigger value="brands">Brands</TabsTrigger></TabsList>
    <TabsContent value={kind}>
    <form className="explore-filters" onSubmit={submit} role="search">
      <div className="auth-field explore-search"><Label htmlFor="explore-search">Search {kind}</Label><div><Search size={18} /><Input id="explore-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={creator ? 'Name, interest, or location' : 'Brand, industry, or location'} maxLength={100} /></div></div>
      <div className="auth-field"><Label htmlFor="explore-category">Category</Label><Select value={selectedCategory} onValueChange={setCategory}><SelectTrigger id="explore-category"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{profileCategories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
      <div className="auth-field"><Label htmlFor="explore-sort">Sort by</Label><Select value={selectedSort} onValueChange={setSort}><SelectTrigger id="explore-sort"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="newest">Recently updated</SelectItem><SelectItem value="name">Name: A–Z</SelectItem>{creator && <SelectItem value="rate-low">Price: low to high</SelectItem>}</SelectContent></Select></div>
      <button className="button button-primary" type="submit">Search</button>
    </form>
    <div className="explore-results-heading"><p>{total} {creator ? total === 1 ? 'creator' : 'creators' : total === 1 ? 'brand' : 'brands'}{q ? ` matching “${q}”` : ''}{category ? ` in ${category}` : ''}</p>{(q || category) && <Link href={`/explore?kind=${kind}`}>Clear filters</Link>}</div>
    {items.length ? <div className="listing-grid">{items.map((item) => <ListingCard key={item.id} item={item} kind={kind} />)}</div>
      : <div className="empty-state marketplace-empty"><Search size={30} /><h2>{q || category ? 'No matches just yet.' : creator ? 'The next great creator could be you.' : 'Give your brand a place to connect.'}</h2><p>{q || category ? 'Try another search or clear your filters.' : creator ? 'Publish your creator profile to appear here.' : 'Company accounts can publish a brand for creators to discover.'}</p><Link className="button button-outline" href={q || category ? `/explore?kind=${kind}` : '/account'}>{q || category ? 'Reset filters' : creator ? 'Set up your profile' : 'Post a brand'}</Link></div>}
    {total > pageSize && <nav className="explore-pagination" aria-label="Results pages">{page > 1 ? <Link className="button button-outline" href={link({ page: String(page - 1) })}><ArrowLeft size={16} />Previous</Link> : <span /> }<span>Page {page} of {Math.ceil(total / pageSize)}</span>{page * pageSize < total ? <Link className="button button-outline" href={link({ page: String(page + 1) })}>Next<ArrowRight size={16} /></Link> : <span />}</nav>}
    </TabsContent></Tabs>
  </main>;
}
