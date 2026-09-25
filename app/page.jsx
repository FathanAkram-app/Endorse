import LandingPage from '@/components/endorse/landing-page';

export default async function Home({ searchParams }) {
  const { audience } = await searchParams;
  return <LandingPage initialTab={audience === 'creators' ? 'companies' : 'creators'} />;
}
