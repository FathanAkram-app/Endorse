import { json } from '@/lib/auth/server';
import { explore, marketplaceFailure } from '@/lib/endorse/marketplace';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try { return json(await explore(Object.fromEntries(new URL(request.url).searchParams))); }
  catch (error) { return marketplaceFailure(error); }
}
