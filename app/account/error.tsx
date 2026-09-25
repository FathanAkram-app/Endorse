'use client';
import Link from 'next/link';
export default function AccountError({ reset }: { reset: () => void }) {
  return <main className="container workspace-page empty-state"><h1>We couldn’t load your account.</h1><p>Your saved details have not changed. Please try again.</p><button className="button button-primary" onClick={reset}>Try again</button><Link href="/">Back to home</Link></main>;
}
