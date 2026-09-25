import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/server';
export const dynamic = 'force-dynamic';
async function AccountRedirect() {
  const session = await getSession(await headers());
  return redirect(session ? `/account/${session.user.role}` : '/login');
}
export default function AccountPage() { return <AccountRedirect />; }
