'use client';

import { useEffect, useState } from 'react';

export function LogoutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function logout() {
    setPending(true); setError('');
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Unable to log out. Please try again.');
      window.location.assign('/login');
    } catch { setError('Unable to log out. Please try again.'); setPending(false); }
  }
  return <div className="logout-control"><button className="button button-outline" onClick={logout} disabled={pending}>{pending ? 'Logging out…' : 'Log out'}</button>{error && <span className="auth-error" role="alert">{error}</span>}</div>;
}

export default function AccountNav() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/auth/me', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => response.ok ? (await response.json()).user : null)
      .then(setUser).catch(() => {}).finally(() => setLoading(false));
    return () => controller.abort();
  }, []);
  return <div className="account-nav" aria-label="Account">
    {loading ? <span className="account-loading" role="status">Loading account…</span> : user
      ? <a href={`/account/${user.role}`} className="button button-dark">My account</a>
      : <><a href="/login" className="login-link">Log in</a><a href="/register" className="button button-dark">Join Endorse</a></>}
  </div>;
}
