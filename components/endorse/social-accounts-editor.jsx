'use client';

import { useId } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MAX_SOCIAL_ACCOUNTS, socialPlatforms } from '@/lib/endorse/profile-validation';

export default function SocialAccountsEditor({ accounts, onChange, disabled }) {
  const prefix = useId();
  function update(index, field, value) {
    onChange(accounts.map((account, i) => i === index ? { ...account, [field]: value } : account));
  }
  return <section className="editor-section social-editor" aria-labelledby={`${prefix}-title`}>
    <h2 id={`${prefix}-title`}>Your social accounts</h2>
    <p>Add every channel you create on, including multiple accounts on the same platform. These links appear on your public profile.</p>
    {!accounts.length && <div className="social-editor-empty">No social accounts yet. Add your first profile below.</div>}
    <div className="social-account-rows">{accounts.map((account, index) => <div className="social-account-row" key={index}>
      <div className="social-account-heading"><h3>Account {index + 1}</h3><button type="button" className="social-remove" onClick={() => onChange(accounts.filter((_, i) => i !== index))} disabled={disabled} aria-label={`Remove ${account.platform} account ${index + 1}`}><Trash2 size={16} />Remove</button></div>
      <div className="editor-field-row"><div className="auth-field"><Label htmlFor={`${prefix}-${index}-platform`}>Platform</Label><Select value={account.platform} onValueChange={(value) => update(index, 'platform', value)} disabled={disabled}><SelectTrigger id={`${prefix}-${index}-platform`}><SelectValue /></SelectTrigger><SelectContent>{socialPlatforms.map((platform) => <SelectItem key={platform} value={platform}>{platform}</SelectItem>)}</SelectContent></Select></div>
        <div className="auth-field"><Label htmlFor={`${prefix}-${index}-handle`}>Handle or channel name <span className="field-optional">Optional</span></Label><Input id={`${prefix}-${index}-handle`} value={account.handle} onChange={(e) => update(index, 'handle', e.target.value)} maxLength={100} placeholder="@yourname" disabled={disabled} /></div></div>
      <div className="auth-field"><Label htmlFor={`${prefix}-${index}-url`}>Profile URL</Label><Input id={`${prefix}-${index}-url`} type="url" value={account.url} onChange={(e) => update(index, 'url', e.target.value)} placeholder="https://" required maxLength={500} disabled={disabled} /></div>
    </div>)}</div>
    <div className="social-add-row"><button className="button button-outline" type="button" disabled={disabled || accounts.length >= MAX_SOCIAL_ACCOUNTS} onClick={() => onChange([...accounts, { platform: 'Instagram', handle: '', url: '' }])}><Plus size={17} />Add social account</button><span>{accounts.length}/{MAX_SOCIAL_ACCOUNTS} accounts</span></div>
  </section>;
}
