'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, ArrowUpRight, BadgeCheck, Check, ChevronRight, GitCompareArrows, Handshake, Camera, Menu, Search, ShieldCheck, SlidersHorizontal, Sparkles, Star, X, Zap } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Brand from './brand';
import CreatorCard from './creator-card';
import { creators, companies } from '@/lib/endorse/data';
import { discoverCreators } from '@/lib/endorse/discovery';
import { useDiscoveryTools } from './use-discovery-tools';

const categories = ['All creators', 'Lifestyle', 'Beauty', 'Travel'];

export default function LandingPage() {
  const [tab, setTab] = useState('creators');
  const [category, setCategory] = useState('All creators');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('recommended');
  const [selected, setSelected] = useState([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [company, setCompany] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  useDiscoveryTools({ setTab, setQuery, setCategory, setSort });
  const visibleCreators = useMemo(() => discoverCreators(creators, { category, query, sort }), [category, query, sort]);
  const compared = creators.filter((creator) => selected.includes(creator.id));
  const visibleCompanies = companies.filter((item) => `${item.name} ${item.category} ${item.description}`.toLowerCase().includes(query.trim().toLowerCase()));

  function explore(kind) {
    setTab(kind); setQuery(''); setMenuOpen(false);
    document.getElementById('discover')?.scrollIntoView({ behavior: 'smooth' });
  }
  function toggleCompare(id) {
    setSelected((previous) => previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id]);
  }

  return <>
    <a href="#main" className="skip-link">Skip to content</a>
    <header className="site-header"><div className="container header-inner">
      <Brand />
      <nav className={`main-nav ${menuOpen ? 'menu-open' : ''}`} aria-label="Main navigation">
        <button onClick={() => explore('creators')}>Find creators</button><button onClick={() => explore('companies')}>Explore brands</button><a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a>
      </nav>
      <button className="button button-dark header-cta" onClick={() => explore('companies')}>I’m a creator <ArrowUpRight size={16} /></button>
      <button className="mobile-menu" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
    </div></header>
    <main id="main">
      <section className="hero"><div className="container hero-grid">
        <div className="hero-copy"><div className="eyebrow"><span className="small-spark"><Sparkles size={14} /></span> GOOD CONTENT. GREAT CONNECTIONS.</div>
          <h1>Your brand.<br />Their creativity.<br /><span>A perfect match.</span></h1>
          <p>Connect with creators who get your brand.<br className="desktop-break" /> Find the right voice, the right audience, and the right<br className="desktop-break" /> fit for your budget. All in one place.</p>
          <div className="hero-actions"><button className="button button-primary" onClick={() => explore('creators')}>Find your creator <ArrowUpRight size={19} /></button><button className="button button-outline" onClick={() => explore('companies')}>I’m a content creator <ArrowRight size={18} /></button></div>
          <div className="hero-benefits"><span><Check size={15} />Transparent pricing</span><span><Check size={15} />Talent for every budget</span></div>
        </div>
        <div className="hero-art" aria-label="Discover creative talent in lifestyle, travel, and beauty">
          <div className="hero-orbit" />
          <div className="floating-note"><span><Handshake size={21} /></span><div>Great things start<br /><strong>with the right connection.</strong></div></div>
          <div className="hero-photo hero-photo-main"><img src="/images/lifestyle.jpg" alt="Lifestyle creator sharing her creative perspective" width="360" height="460" fetchPriority="high" /><div className="hero-person"><span>Maya Thompson <BadgeCheck size={15} /></span><small>Lifestyle creator</small></div></div>
          <div className="hero-photo hero-photo-secondary"><img src="/images/travel.jpg" alt="Travel creator ready for a new adventure" width="260" height="320" /><div className="mini-person"><Camera size={15} /><span>Stories that connect.</span></div></div>
          <span className="art-spark"><Sparkles size={54} strokeWidth={1.5} /></span>
          <div className="match-tag"><span className="match-icon"><Check size={19} strokeWidth={3} /></span><div>Made for your brand<strong>Find your perfect match</strong></div><Sparkles size={20} /></div>
          <div className="creative-note">a little creativity,<br />a lot of possibility.</div>
        </div>
      </div></section>
      <section className="value-strip" aria-label="The Endorse approach"><div className="container value-inner"><p>Big ideas meet<br /><strong>the right people.</strong></p><span><ShieldCheck />Profiles with a purpose</span><span><GitCompareArrows />Compare with confidence</span><span><Handshake />Partnerships that fit</span></div></section>

      <section id="discover" className="discovery-section container">
        <Tabs value={tab} onValueChange={(value) => { setTab(value); setQuery(''); }}>
          <div className="section-heading"><div><span className="section-kicker">FIND YOUR PEOPLE</span><h2>{tab === 'creators' ? 'Small budgets. Big talent.' : 'Your next brand partnership.'}</h2><p>{tab === 'creators' ? 'From fresh perspectives to seasoned pros. There’s a creator for you.' : 'Discover brands looking for a voice just like yours.'}</p></div><TabsList className="audience-tabs"><TabsTrigger value="creators">For brands</TabsTrigger><TabsTrigger value="companies">For creators</TabsTrigger></TabsList></div>
          <div className="discovery-toolbar"><div className="category-chips" aria-label="Creator categories">{tab === 'creators' ? categories.map((item) => <button key={item} className={category === item ? 'active' : ''} aria-pressed={category === item} onClick={() => setCategory(item)}>{item === 'All creators' && <Sparkles size={14} />}{item}</button>) : <span className="opportunity-label"><Handshake size={17} /> Brand opportunities</span>}</div><div className="discovery-controls"><label className="search-input"><Search size={17} /><span className="sr-only">Search {tab}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tab === 'creators' ? 'Search creators...' : 'Search brands...'} /></label>{tab === 'creators' && <Select value={sort} onValueChange={setSort}><SelectTrigger className="sort-trigger" aria-label="Sort creators"><SlidersHorizontal size={15} /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="recommended">Recommended</SelectItem><SelectItem value="price-low">Price: low to high</SelectItem><SelectItem value="price-high">Price: high to low</SelectItem><SelectItem value="rating">Highest rated</SelectItem></SelectContent></Select>}</div></div>
          <TabsContent value="creators"><div className="creator-grid">{visibleCreators.map((creator) => <CreatorCard key={creator.id} creator={creator} selected={selected.includes(creator.id)} onCompare={toggleCompare} onProfile={setProfile} />)}</div>{visibleCreators.length === 0 && <div className="empty-state"><Search size={28} /><h3>No creators found</h3><p>Try another name or explore a different category.</p><button className="button button-outline" onClick={() => { setQuery(''); setCategory('All creators'); }}>Reset filters</button></div>}</TabsContent>
          <TabsContent value="companies"><div className="creator-grid">{visibleCompanies.map((item) => <article className="company-card" key={item.id}><div className={`company-logo ${item.color}`}>{item.initials}</div><span className="section-kicker">{item.category}</span><h3>{item.name}</h3><h4>{item.title}</h4><p>{item.description}</p><div className="company-bottom"><span>Campaign budget<strong>{item.budget}</strong></span><button aria-label={`View ${item.name} opportunity`} onClick={() => setCompany(item)}><ArrowUpRight /></button></div></article>)}</div>{visibleCompanies.length === 0 && <div className="empty-state"><h3>No brands found</h3><p>Try “beauty”, “travel”, or “lifestyle”.</p><button className="button button-outline" onClick={() => setQuery('')}>Clear search</button></div>}</TabsContent>
          <div className="directory-footnote"><span>Explore sample profiles. Names, rates, and opportunities are illustrative.</span>{tab === 'creators' && <button onClick={() => { setSelected(creators.map((creator) => creator.id)); setComparisonOpen(true); }}>Compare creators <ArrowRight size={16} /></button>}</div>
        </Tabs>
      </section>

      <section id="how-it-works" className="how-section"><div className="container"><div className="section-heading"><div><span className="section-kicker">LESS SEARCHING. MORE CREATING.</span><h2>A good partnership starts here.</h2></div><p>From the first discovery to the perfect fit.<br />Make your next collaboration count.</p></div><div className="steps-grid">{[{ icon: Search, title: 'Find your people', body: 'Explore creators by niche and style, or discover brands that share your interests.' }, { icon: GitCompareArrows, title: 'Compare your options', body: 'See rates, audience, and experience side by side. Find the fit that works for you.' }, { icon: Zap, title: 'Make something great', body: 'Choose your ideal partner and start a conversation about your next big idea.' }].map((step, index) => <article className="step" key={step.title}><div className="step-top"><span className="step-icon"><step.icon size={23} /></span><span className="step-number">0{index + 1}</span></div><h3>{step.title}</h3><p>{step.body}</p></article>)}</div></div></section>
      <section className="container"><div className="bottom-cta"><div><span className="section-kicker">YOUR NEXT GREAT COLLABORATION</span><h2>Better together.<br />Start with Endorse.</h2><p>The right creator. The right brand. A world of possibilities.</p></div><div className="bottom-cta-actions"><button className="button button-white" onClick={() => explore('creators')}>Discover your match <ArrowUpRight size={19} /></button><button className="creator-text-link" onClick={() => explore('companies')}>Creators, meet your next brand <ArrowRight size={17} /></button></div></div></section>
    </main>
    <footer className="site-footer container"><Brand /><p>A little connection goes a long way.</p><span>© {new Date().getFullYear()} Endorse</span></footer>

    {selected.length > 0 && <div className="compare-bar" role="region" aria-label="Selected creators"><div><GitCompareArrows size={20} /><span><strong>{selected.length} creator{selected.length > 1 ? 's' : ''}</strong> selected</span></div><button className="button button-primary" disabled={selected.length < 2} onClick={() => setComparisonOpen(true)}>Compare {selected.length < 2 ? '(select 2+)' : 'now'} <ArrowRight size={16} /></button><button className="clear-selection" onClick={() => setSelected([])} aria-label="Clear comparison"><X size={19} /></button></div>}
    <Dialog open={comparisonOpen} onOpenChange={setComparisonOpen}><DialogContent className="comparison-dialog"><DialogHeader><DialogTitle>Find the right fit.</DialogTitle><DialogDescription>Compare sample creators for the same deliverable: one 30–60 second Instagram Reel. All rates are illustrative, in USD.</DialogDescription></DialogHeader><Table><TableHeader><TableRow><TableHead>What matters to you</TableHead>{compared.map((item) => <TableHead key={item.id}>{item.name}</TableHead>)}</TableRow></TableHeader><TableBody>{[['Starting price', (item) => `$${item.price}`], ['Experience', (item) => item.tier], ['Category', (item) => item.category], ['Followers', (item) => item.followers], ['Engagement rate', (item) => item.engagement], ['Rating', (item) => `${item.rating.toFixed(1)} / 5 (${item.reviews} reviews)`], ['Turnaround', (item) => item.turnaround]].map(([label, value]) => <TableRow key={label}><TableCell>{label}</TableCell>{compared.map((item) => <TableCell key={item.id}>{value(item)}</TableCell>)}</TableRow>)}</TableBody></Table><p className="modal-note">Follower count and engagement are examples, not guarantees of campaign results.</p></DialogContent></Dialog>
    <Dialog open={!!profile} onOpenChange={(open) => !open && setProfile(null)}><DialogContent className="profile-dialog">{profile && <><DialogHeader><DialogTitle>{profile.name}</DialogTitle><DialogDescription>{profile.handle} · {profile.location}</DialogDescription></DialogHeader><div className="profile-intro"><img src={profile.image} alt={profile.name} /><div><span className="profile-category">{profile.category} · {profile.tier}</span><p>{profile.description}</p></div></div><div className="profile-package"><span>Sample content package</span><h3>{profile.deliverable}</h3><p>From <strong>${profile.price} USD</strong> · {profile.turnaround} turnaround</p></div><button className="button button-primary" onClick={() => toggleCompare(profile.id)}>{selected.includes(profile.id) ? <Check size={18} /> : <GitCompareArrows size={18} />}{selected.includes(profile.id) ? 'Added to comparison' : 'Add to comparison'}</button><p className="modal-note">This is a demonstration profile. Live registration and booking are not available yet.</p></>}</DialogContent></Dialog>
    <Dialog open={!!company} onOpenChange={(open) => !open && setCompany(null)}><DialogContent>{company && <><DialogHeader><DialogTitle>{company.name}</DialogTitle><DialogDescription>{company.category} · Sample brand opportunity</DialogDescription></DialogHeader><h3>{company.title}</h3><p>{company.description}</p><div className="profile-package"><span>Campaign budget</span><h3>{company.budget} USD</h3><p>Deliverable: one 30–60 second Instagram Reel.</p></div><p className="modal-note">This is an illustrative opportunity. Live company registration, applications, and messaging will be available when the marketplace is connected.</p></>}</DialogContent></Dialog>
  </>;
}

