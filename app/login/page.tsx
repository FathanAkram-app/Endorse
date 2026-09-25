import AuthEntry from '@/components/endorse/auth-entry';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Log in | Endorse' };
export default function LoginPage() { return <AuthEntry mode="login" />; }
