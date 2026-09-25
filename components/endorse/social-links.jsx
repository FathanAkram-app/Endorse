import { ArrowUpRight } from 'lucide-react';

export default function SocialLinks({ accounts = [] }) {
  if (!accounts.length) return null;
  return <section className="public-socials" aria-label="Social accounts"><h2>Find me on</h2><div className="social-links">{accounts.map((account, index) =>
    <a key={`${account.url}-${index}`} href={account.url} target="_blank" rel="noopener noreferrer" className="social-link"><div><strong>{account.platform}</strong><span>{account.handle || new URL(account.url).hostname}</span></div><ArrowUpRight size={18} aria-hidden="true" /></a>
  )}</div></section>;
}
