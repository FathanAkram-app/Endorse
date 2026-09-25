import AuthEntry from '@/components/endorse/auth-entry';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Create an account | Endorse' };
export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const { role } = await searchParams;
  return <AuthEntry mode="register" initialRole={role === 'company' ? 'company' : 'creator'} />;
}
