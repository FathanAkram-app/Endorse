'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, MapPin } from 'lucide-react';

function ImageOrInitials({ src, name }) {
  const [failed, setFailed] = useState(false);
  return src && !failed
    ? <img src={src} alt={name} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
    : <span className="listing-initials" aria-label={name}>{name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'E'}</span>;
}

export function ListingImage({ src = '', name = '', kind = 'creators' }) {
  return <div className={`listing-image ${kind === 'brands' ? 'brand-image' : ''}`}><ImageOrInitials key={src} src={src} name={name} /></div>;
}

export function formatRate(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
}

export default function ListingCard({ item, kind, preview = false }) {
  const creator = kind === 'creators';
  return <article className="listing-card">
    <ListingImage src={item.imageUrl} name={item.name} kind={kind} />
    <div className="listing-card-body">
      <span className="listing-category">{item.category || (creator ? 'Creator' : 'Brand')}</span>
      <h3>{item.name || (creator ? 'Your name' : 'Your brand')}</h3>
      {item.location && <p className="listing-location"><MapPin size={14} />{item.location}</p>}
      <p className="listing-description">{creator ? item.bio || 'Tell brands about your creativity.' : item.tagline || item.description || 'Introduce your brand to creators.'}</p>
      {creator && item.socialAccounts?.length > 0 && <div className="social-platform-tags" aria-label="Social platforms">{[...new Set(item.socialAccounts.map((account) => account.platform))].map((platform) => <span key={platform}>{platform}</span>)}</div>}
      <div className="listing-card-footer"><span>{creator
        ? item.startingRate !== null && item.startingRate !== undefined ? <>From <strong>{formatRate(item.startingRate)}</strong></> : 'Rate on request'
        : item.companyName ? `By ${item.companyName}` : 'Brand profile'}</span>
        {!preview && <Link href={`/${kind}/${item.id}`} aria-label={`View ${item.name}`}><ArrowUpRight size={21} /></Link>}
      </div>
    </div>
  </article>;
}
