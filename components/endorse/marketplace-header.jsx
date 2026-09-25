import Link from 'next/link';
import Brand from './brand';
import AccountNav from './account-nav';

export default function MarketplaceHeader() {
  return <header className="site-header"><div className="container header-inner marketplace-header">
    <Brand /><nav aria-label="Marketplace navigation"><Link href="/explore">Explore</Link><Link href="/collaborations">Collaborations</Link></nav><AccountNav />
  </div></header>;
}
