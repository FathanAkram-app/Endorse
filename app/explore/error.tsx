'use client';
import Link from 'next/link';
export default function ExploreError({ reset }: { reset: () => void }) {
  return <main className="container workspace-page empty-state"><h1>Explore is temporarily unavailable.</h1><p>Please try again in a moment.</p><button className="button button-primary" onClick={reset}>Try again</button><Link href="/">Back to home</Link></main>;
}
