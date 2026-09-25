'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CollaborationStart({ brands, creatorId, company }) {
  const router = useRouter();
  const [brandId, setBrandId] = useState(brands[0].id);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const nonce = useRef(null);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    nonce.current ||= crypto.randomUUID();
    try {
      const response = await fetch('/api/collaborations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brandId, creatorId, message, clientId: nonce.current }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to start the conversation.');
      router.push(`/collaborations/${data.room.id}`);
    } catch (problem) { setError(problem.message); setBusy(false); }
  }
  return <form onSubmit={submit} className="editor-form"><fieldset disabled={busy} className="editor-section">
    {company && <div className="form-field"><Label htmlFor="conversation-brand">Representing</Label><Select value={brandId} onValueChange={setBrandId}><SelectTrigger id="conversation-brand"><SelectValue /></SelectTrigger><SelectContent>{brands.map(brand => <SelectItem value={brand.id} key={brand.id}>{brand.name}</SelectItem>)}</SelectContent></Select></div>}
    <div className="form-field"><Label htmlFor="first-message">Your message</Label><Textarea id="first-message" required maxLength={4000} value={message} onChange={event => setMessage(event.target.value)} placeholder="Share your idea, the content you have in mind, and your timeline." /></div>
    {error && <p role="alert" className="form-error">{error}</p>}<button className="button button-primary" type="submit"><Send size={16} />{busy ? 'Starting conversation…' : 'Start conversation'}</button>
  </fieldset></form>;
}
