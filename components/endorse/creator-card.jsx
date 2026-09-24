import { ArrowUpRight, BadgeCheck, Check, GitCompareArrows, Camera, MapPin, Star } from 'lucide-react';

export default function CreatorCard({ creator, selected, onCompare, onProfile }) {
  return <article className="creator-card">
    <div className={`creator-photo ${creator.color}`}>
      <img src={creator.image} alt={`${creator.name}, ${creator.category.toLowerCase()} creator`} loading="lazy" width="600" height="650" />
      <span className="talent-badge"><span className="badge-dot" />{creator.tier}</span>
      <button className={`compare-icon ${selected ? 'is-selected' : ''}`} onClick={() => onCompare(creator.id)} aria-label={`${selected ? 'Remove' : 'Add'} ${creator.name} ${selected ? 'from' : 'to'} comparison`} aria-pressed={selected}>{selected ? <Check size={18} /> : <GitCompareArrows size={18} />}</button>
      <span className="photo-category">{creator.category}</span>
    </div>
    <div className="creator-body">
      <div className="creator-name-row"><h3>{creator.name}<BadgeCheck size={18} className="verified" aria-label="Sample verified profile" /></h3><span className="rating"><Star size={14} fill="currentColor" />{creator.rating.toFixed(1)}</span></div>
      <p className="creator-location"><MapPin size={13} />{creator.location}</p>
      <div className="creator-stats"><span><Camera size={16} /><strong>{creator.followers}</strong> followers</span><span><strong>{creator.engagement}</strong> engagement</span></div>
      <div className="creator-footer"><span>Starting at <strong>${creator.price}</strong><small> / collaboration</small></span><button aria-label={`View ${creator.name}'s profile`} onClick={() => onProfile(creator)}><ArrowUpRight size={22} /></button></div>
    </div>
  </article>;
}

