'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, Camera } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import Brand from './brand';

export default function AuthForm({ mode, initialRole = 'creator' }) {
  const signup = mode === 'register';
  const [role, setRole] = useState(initialRole);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (pending) return;
    setError('');
    const data = new FormData(event.currentTarget);
    if (signup && data.get('password') !== data.get('confirmPassword')) {
      setError('Your passwords do not match.');
      return;
    }
    setPending(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.get('email'), password: data.get('password'),
          ...(signup ? { name: data.get('name'), role } : {}) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to continue. Please try again.');
      window.location.assign(`/account/${result.user.role}`);
    } catch (error) {
      setError(error instanceof TypeError ? 'Unable to connect. Check your connection and try again.' : error.message);
      setPending(false);
    }
  }

  return <main className="auth-page">
    <div className="auth-brand"><Brand /></div>
    <section className="auth-card" aria-labelledby="auth-title">
      <span className="section-kicker">YOUR NEXT CONNECTION</span>
      <h1 id="auth-title">{signup ? 'Join Endorse.' : 'Welcome back.'}</h1>
      <p>{signup ? 'Create your account and find your people.' : 'Log in to your creator or company account.'}</p>
      <form onSubmit={submit} className="auth-form" aria-busy={pending}>
        <fieldset disabled={pending}>
          {signup && <>
            <div className="auth-field"><Label id="account-type-label">Account type</Label>
              <RadioGroup value={role} onValueChange={setRole} className="account-options" aria-labelledby="account-type-label">
                {[['creator', Camera, 'Creator', 'I create content'], ['company', Building2, 'Company', 'I work with creators']].map(([value, Icon, title, description]) =>
                  <label key={value} className={`account-option ${role === value ? 'selected' : ''}`} htmlFor={`role-${value}`}>
                    <Icon size={22} /><strong>{title}</strong><span>{description}</span>
                    <RadioGroupItem value={value} id={`role-${value}`} />
                  </label>)}
              </RadioGroup>
            </div>
            <div className="auth-field"><Label htmlFor="name">{role === 'company' ? 'Company name' : 'Your name'}</Label><Input id="name" name="name" autoComplete={role === 'company' ? 'organization' : 'name'} minLength={2} maxLength={100} required /></div>
          </>}
          <div className="auth-field"><Label htmlFor="email">Email address</Label><Input id="email" name="email" type="email" autoComplete="email" maxLength={254} required /></div>
          <div className="auth-field"><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" autoComplete={signup ? 'new-password' : 'current-password'} minLength={signup ? 12 : 1} maxLength={128} aria-describedby={signup ? 'password-hint' : undefined} required />{signup && <small id="password-hint">Use 12–128 characters. A few memorable words work well.</small>}</div>
          {signup && <div className="auth-field"><Label htmlFor="confirm-password">Confirm password</Label><Input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></div>}
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="button button-primary auth-submit" type="submit" disabled={pending}>{pending ? 'Please wait…' : signup ? 'Create account' : 'Log in'}{!pending && <ArrowRight size={18} />}</button>
        </fieldset>
      </form>
      <p className="auth-switch">{signup ? 'Already have an account?' : 'New to Endorse?'} <a href={signup ? '/login' : '/register'}>{signup ? 'Log in' : 'Create an account'}</a></p>
    </section>
    <Link className="auth-back" href="/">Back to discovery</Link>
  </main>;
}
