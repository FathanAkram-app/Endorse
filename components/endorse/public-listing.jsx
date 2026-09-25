import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, MapPin, Globe } from 'lucide-react';
import MarketplaceHeader from './marketplace-header';
import { ListingImage } from './listing-card';
import SocialLinks from './social-links';
import { publicReviews } from '@/lib/endorse/collaborations';

export default async function PublicListing({ item, kind }) {
  const feedback = await publicReviews(kind, item.id);
  const creator = kind === 'creators';
  const rate = item.startingRate === null || item.startingRate === undefined ? null : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: item.startingRate % 100 ? 2 : 0 }).format(item.startingRate / 100);
  return <><MarketplaceHeader /><main className="container workspace-page public-profile">
    <Link className="back-link" href={`/explore?kind=${kind}`}><ArrowLeft size={16} />Explore {kind}</Link>
    <div className="public-profile-grid"><aside><ListingImage src={item.imageUrl} name={item.name} kind={kind} />{creator && <div className="public-rate"><span>Starting rate</span><strong>{rate || 'Let’s discuss'}</strong><p>{rate ? 'USD per collaboration' : 'Pricing available on request'}</p></div>}</aside>
      <div className="public-profile-copy"><span className="section-kicker">{item.category} {creator ? 'CREATOR' : 'BRAND'}</span><h1>{item.name}</h1>
        {creator && item.handle && <p className="public-handle">{item.handle}</p>}
        {!creator && item.tagline && <p className="public-tagline">{item.tagline}</p>}
        {item.location && <p className="listing-location"><MapPin size={17} />{item.location}</p>}
        {!creator && <p className="brand-company">A brand by <strong>{item.companyName}</strong></p>}
        <section className="public-about"><h2>{creator ? 'Meet the creator' : 'About the brand'}</h2><p>{creator ? item.bio : item.description}</p></section>
        {item.website && <a className="button button-primary" href={item.website} target="_blank" rel="noopener noreferrer"><Globe size={17} />{creator ? 'Visit website or portfolio' : 'Visit website'}<ArrowUpRight size={17} /></a>}
        {creator && <SocialLinks accounts={item.socialAccounts} />}
        <div className="profile-contact"><Link className="button button-primary" href={`/collaborations/new?${creator ? 'creator' : 'brand'}=${item.id}`}>Start a conversation<ArrowUpRight size={17} /></Link><p>{creator ? 'Discuss a collaboration on behalf of your brand.' : 'Introduce yourself and share a collaboration idea.'}</p></div>
        <section className="public-reviews"><h2>Collaboration reviews {feedback.count > 0 && <span>{Number(feedback.average).toFixed(1)} / 5 · {feedback.count} review{feedback.count === 1 ? '' : 's'}</span>}</h2>{feedback.items.length ? feedback.items.map(review => <article className="review-card" key={review.id}><strong>{review.name} · {review.rating}/5</strong><p>{review.comment}</p></article>) : <p>No completed collaboration reviews yet.</p>}</section>
      </div>
    </div>
  </main></>;
}
