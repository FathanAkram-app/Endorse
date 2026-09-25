import { Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function Brand() {
  return <Link href="/" className="brand" aria-label="Endorse home"><span className="brand-symbol"><Sparkles size={22} strokeWidth={2.5} /></span>endorse<span className="brand-period">.</span></Link>;
}
