import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/server';
import AuthForm from './auth-form';

export default async function AuthEntry({ mode, initialRole = 'creator' }: { mode: 'login' | 'register'; initialRole?: string }) {
  const session = await getSession(await headers());
  if (session) redirect(`/account/${session.user.role}`);
  return <AuthForm mode={mode} initialRole={initialRole} />;
}
