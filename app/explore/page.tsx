import MarketplaceHeader from '@/components/endorse/marketplace-header';
import ExploreDirectory from '@/components/endorse/explore-directory';
import { explore } from '@/lib/endorse/marketplace';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Explore creators & brands | Endorse' };
export default async function ExplorePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const result = await explore(await searchParams);
  return <><MarketplaceHeader /><ExploreDirectory key={`${result.kind}:${result.q}:${result.category}:${result.sort}:${result.page}`} result={result} /></>;
}
