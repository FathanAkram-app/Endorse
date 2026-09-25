'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, ExternalLink, MessageCircle, Plus, Send, Star, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { statusLabels } from '@/lib/endorse/collaboration-validation';
import { CollaborationSocket } from '@/lib/endorse/collaboration-socket';

const money = amount => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount / 100);
const date = value => new Date(value * 1000).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' });
const labels = { offer: 'Create an offer', withdraw: 'Withdraw offer', accept: 'Accept contract', decline: 'Decline offer', submit: 'Submit work', revise: 'Request changes', approve: 'Approve milestone', cancel: 'Close conversation', 'request-cancel': 'Request cancellation', 'approve-cancel': 'Agree to cancel', 'reject-cancel': 'Continue contract' };
const instructions = {
  withdraw: 'Withdraw this offer to discuss or change its terms. The creator will no longer be able to accept this version.',
  accept: 'Accept the deliverables, dates, revision allowance, and usage rights below. Payments must be arranged directly with the company.',
  decline: 'Decline this offer and return to the discussion. The company can send another offer.',
  approve: 'Confirm this milestone meets the agreed deliverables. The final approval completes the contract and opens reviews. No money is transferred by Endorse.',
  cancel: 'Close this conversation without starting a contract. Its messages will remain available.',
  'approve-cancel': 'Cancel the accepted contract by mutual agreement. Arrange any outstanding payment directly. Cancelled contracts cannot be reviewed.',
  'reject-cancel': 'Decline the cancellation request and continue the current milestone.',
};

function Field({ label, id, children }) { return <div className="form-field"><Label htmlFor={id}>{label}</Label>{children}</div>; }

function OfferForm({ existing, busy, onSubmit, onClose }) {
  const [milestones, setMilestones] = useState(existing?.milestones?.map(m => ({ ...m, amount: (m.amount / 100).toFixed(2) })) || [{ title: '', amount: '', dueDate: '' }]);
  function update(index, key, value) { setMilestones(previous => previous.map((item, i) => i === index ? { ...item, [key]: value } : item)); }
  function submit(event) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    onSubmit({ terms: { title: fields.get('title'), scope: fields.get('scope'), usageRights: fields.get('rights'), revisions: Number(fields.get('revisions')), milestones: milestones.map(m => ({ ...m, amount: Math.round(Number(m.amount) * 100) })) } });
  }
  return <form onSubmit={submit}><fieldset disabled={busy} className="contract-form"><div className="account-section-heading"><h3>Make an offer</h3><button type="button" aria-label="Close offer form" onClick={onClose}><X size={20} /></button></div>
    <Field label="Contract title" id="offer-title"><Input id="offer-title" name="title" required minLength={3} maxLength={120} defaultValue={existing?.title} placeholder="Summer launch content" /></Field>
    <Field label="Deliverables and scope" id="offer-scope"><Textarea id="offer-scope" name="scope" required minLength={20} maxLength={4000} defaultValue={existing?.scope} placeholder="Include platforms, formats, number of posts, and what counts as finished." /></Field>
    <Field label="Usage rights and exclusivity" id="offer-rights"><Textarea id="offer-rights" name="rights" required minLength={3} maxLength={2000} defaultValue={existing?.usageRights} placeholder="Where and for how long can the brand use the content? Include paid ads and any exclusivity." /></Field>
    <Field label="Included revision rounds per milestone" id="offer-revisions"><Input id="offer-revisions" name="revisions" type="number" min="0" max="50" required defaultValue={existing?.revisions ?? 1} /></Field>
    <div className="milestone-editor"><h4>Milestones</h4><p>Break the work into clear steps, such as concept, draft, and published content.</p>{milestones.map((item, index) => <div className="milestone-edit" key={index}><div className="account-section-heading"><strong>Milestone {index + 1}</strong>{milestones.length > 1 && <button type="button" onClick={() => setMilestones(previous => previous.filter((_, i) => i !== index))} aria-label={`Remove milestone ${index + 1}`}><X size={17} /></button>}</div>
      <Field label="Deliverable" id={`milestone-title-${index}`}><Input id={`milestone-title-${index}`} required minLength={3} maxLength={200} value={item.title} onChange={e => update(index, 'title', e.target.value)} /></Field>
      <div className="editor-field-row"><Field label="Amount (USD)" id={`milestone-amount-${index}`}><Input id={`milestone-amount-${index}`} required type="number" min="1" max="1000000" step="0.01" value={item.amount} onChange={e => update(index, 'amount', e.target.value)} /></Field>
        <Field label="Due date" id={`milestone-date-${index}`}><Input id={`milestone-date-${index}`} required type="date" min={new Date().toISOString().slice(0, 10)} value={item.dueDate} onChange={e => update(index, 'dueDate', e.target.value)} /></Field></div>
    </div>)}{milestones.length < 12 && <button type="button" className="button button-outline" onClick={() => setMilestones(previous => [...previous, { title: '', amount: '', dueDate: '' }])}><Plus size={16} />Add milestone</button>}</div>
    <p className="payment-note">Total: <strong>{money(milestones.reduce((sum, m) => sum + Math.round((Number(m.amount) || 0) * 100), 0))}</strong>. Payments are handled outside Endorse. This offer does not collect or hold money.</p>
    <button className="button button-primary" type="submit">{busy ? 'Sending…' : 'Send offer'}</button>
  </fieldset></form>;
}

function ActionForm({ action, busy, onSubmit, onClose }) {
  function submit(event) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    onSubmit({ ...(data.get('note') ? { note: data.get('note') } : {}), ...(data.get('url') ? { url: data.get('url') } : {}) });
  }
  return <form onSubmit={submit}><fieldset disabled={busy} className="contract-form"><h3>{labels[action]}</h3>{instructions[action] && <p>{instructions[action]}</p>}
    {action === 'submit' && <Field label="Delivery link (HTTPS)" id="delivery-url"><Input id="delivery-url" name="url" type="url" pattern="https://.*" maxLength={2000} required placeholder="https://…" /><p className="field-help">Link to the content or a shared folder the company can access.</p></Field>}
    {['submit', 'revise', 'request-cancel'].includes(action) && <Field label={action === 'submit' ? 'Delivery note' : action === 'revise' ? 'Changes needed' : 'Reason for cancellation'} id="action-note"><Textarea id="action-note" name="note" required maxLength={4000} /></Field>}
    <div className="collaboration-actions"><button type="submit" className="button button-primary">{busy ? 'Saving…' : labels[action]}</button><button type="button" className="button button-outline" onClick={onClose}>Back</button></div>
  </fieldset></form>;
}

function ReviewForm({ busy, onSubmit }) {
  const [rating, setRating] = useState('');
  function submit(event) { event.preventDefault(); onSubmit({ rating: Number(rating), comment: new FormData(event.currentTarget).get('comment') }); }
  return <form onSubmit={submit}><fieldset disabled={busy} className="contract-form"><h3>How was the collaboration?</h3><p>Your review is final once submitted. Both reviews stay hidden until both sides submit or 14 days pass after completion.</p>
    <Label id="rating-label">Overall rating</Label><RadioGroup aria-labelledby="rating-label" value={rating} onValueChange={setRating} className="rating-options" required>{[1, 2, 3, 4, 5].map(value => <div key={value}><RadioGroupItem value={String(value)} id={`rating-${value}`} /><Label htmlFor={`rating-${value}`}>{value}<Star size={14} aria-label={value === 1 ? 'star' : 'stars'} /></Label></div>)}</RadioGroup>
    <Field label="Your review" id="review-comment"><Textarea id="review-comment" name="comment" required minLength={10} maxLength={2000} placeholder="Share what went well and what could be improved." /></Field><button type="submit" disabled={!rating} className="button button-primary">{busy ? 'Submitting…' : 'Submit review'}</button>
  </fieldset></form>;
}

export default function CollaborationRoom({ initial }) {
  const [data, setData] = useState(initial);
  const [history, setHistory] = useState(initial.messages);
  const [hasOlder, setHasOlder] = useState(initial.hasOlder);
  const [busy, setBusy] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [message, setMessage] = useState('');
  const [action, setAction] = useState(null);
  const nonce = useRef(null);
  const transport = useRef(null);
  const busyRef = useRef(false);
  const lastSeenMessage = useRef(initial.messages.at(-1)?.id);
  const historyRef = useRef(null);
  const followLatest = useRef(true);
  const latestMessage = history.at(-1)?.id;
  const room = data.room;
  const endpoint = `/api/collaborations/${room.id}`;
  const partner = data.people.find(person => person.id !== data.userId);
  const myReview = data.reviews.find(review => review.reviewerId === data.userId);
  const step = room.status === 'completed' && (data.reviews.length === 2 || !data.reviewOpen) ? 5
    : { discussion: 0, offer: 1, active: 2, submitted: 3, completed: 4, cancelled: -1 }[room.status];

  const mergeMessages = useCallback(next => {
    if (next.length) lastSeenMessage.current = Math.max(lastSeenMessage.current || 0, next.at(-1).id);
    setHistory(previous => {
    const merged = new Map(previous.map(item => [item.id, item]));
    next.forEach(item => merged.set(item.id, item));
    return [...merged.values()].sort((a, b) => a.id - b.id);
    });
  }, []);
  useEffect(() => {
    const url = new URL(`${endpoint}/socket`, window.location.href);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    const connection = new CollaborationSocket({
      url: url.href, cursor: () => lastSeenMessage.current,
      onState: next => { setData(next); mergeMessages(next.messages); },
      onStatus: setConnectionStatus, onError: setError,
      checkAccess: async () => (await fetch(endpoint, { cache: 'no-store', signal: AbortSignal.timeout(10000) })).status,
    });
    transport.current = connection;
    connection.connect();
    const resume = () => { if (document.visibilityState === 'visible') connection.sync(); };
    const online = () => connection.reconnect();
    const offline = () => setConnectionStatus('offline');
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    document.addEventListener('visibilitychange', resume);
    return () => {
      connection.stop(); transport.current = null;
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [endpoint, mergeMessages]);
  useEffect(() => {
    if (followLatest.current && historyRef.current) historyRef.current.scrollTop = historyRef.current.scrollHeight;
  }, [latestMessage]);

  async function mutate(kind, payload, after) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError('');
    try {
      if (!transport.current) throw new Error('Wait for the live connection before sending.');
      await transport.current.command(kind, payload);
      after?.();
    } catch (problem) { setError(problem.message); }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function older() {
    setLoadingOlder(true); setError('');
    try {
      const response = await fetch(`${endpoint}?before=${history[0].id}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to load messages.');
      mergeMessages(result.messages); setHasOlder(result.hasOlder);
    } catch (problem) { setError(problem.message); } finally { setLoadingOlder(false); }
  }
  function send(event) {
    event.preventDefault();
    if (!nonce.current || nonce.current.message !== message) nonce.current = { id: crypto.randomUUID(), message };
    mutate('message', { message, clientId: nonce.current.id }, () => { setMessage(''); nonce.current = null; followLatest.current = true; });
  }

  return <main className="container workspace-page collaboration-workspace">
    <Link href="/collaborations" className="back-link"><ArrowLeft size={16} />All collaborations</Link>
    <div className="workspace-heading"><div><span className="section-kicker">{room.brandName}</span><h1>{room.terms?.title || `Conversation with ${partner?.name}`}</h1><p>{partner?.name} · {partner?.role === 'creator' ? 'Creator' : 'Company'}</p></div><span className={`publication-badge ${room.status === 'completed' ? 'published' : ''}`}>{room.cancellationBy ? 'Cancellation requested' : statusLabels[room.status]}</span></div>
    <ol className="collaboration-steps" aria-label="Collaboration progress">{['Discuss', 'Agree terms', 'Create', 'Review work', 'Rate'].map((label, index) => <li key={label} className={step === index ? 'current' : step > index ? 'done' : ''} aria-current={step === index ? 'step' : undefined}><span>{step > index ? <Check size={15} /> : index + 1}</span>{label}</li>)}</ol>
    {connectionStatus !== 'live' && <div className="connection-error" role="status">{connectionStatus === 'ended' ? <>Your session or access has ended. <Link href="/login">Log in again</Link></> : <>{connectionStatus === 'offline' ? 'You are offline. Your input is preserved.' : connectionStatus === 'connecting' ? 'Connecting to the conversation…' : 'Reconnecting and recovering the latest updates…'} <button onClick={() => transport.current?.reconnect()}>Reconnect</button></>}</div>}
    {error && <p className="form-error collaboration-error" role="alert">{error}</p>}
    <div className="collaboration-grid"><section className="conversation-panel" aria-labelledby="conversation-title"><div className="panel-heading"><h2 id="conversation-title"><MessageCircle size={20} />Conversation</h2><span className={`live-connection ${connectionStatus === 'live' ? 'connected' : ''}`} role="status"><i aria-hidden="true" />{connectionStatus === 'live' ? 'Live' : connectionStatus === 'offline' ? 'Offline' : connectionStatus === 'ended' ? 'Disconnected' : 'Connecting'}</span></div>
      <div className="message-history" ref={historyRef} onScroll={event => { const element = event.currentTarget; followLatest.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80; }} tabIndex={0} aria-label="Messages and activity">{hasOlder && <button className="load-messages" onClick={older} disabled={loadingOlder}>{loadingOlder ? 'Loading…' : 'Load earlier messages'}</button>}{history.map(item => <article key={item.id} className={`chat-message ${item.kind === 'event' ? 'chat-event' : item.senderId === data.userId ? 'chat-own' : ''}`}><div><strong>{data.people.find(person => person.id === item.senderId)?.name || 'Account'}{item.kind === 'event' ? ' · Activity' : ''}</strong><time dateTime={new Date(item.createdAt * 1000).toISOString()}>{date(item.createdAt)} UTC</time></div><p>{item.body}</p></article>)}</div>
      <form className="message-composer" onSubmit={send}><Label htmlFor="chat-message">Message {partner?.name}</Label><Textarea id="chat-message" required maxLength={4000} disabled={busy} value={message} onChange={event => setMessage(event.target.value)} placeholder="Keep the brief, questions, and updates here." /><div><span>Use Submit work for milestone delivery.</span><button className="button button-primary" disabled={busy || connectionStatus !== 'live' || !message.trim()} type="submit"><Send size={16} />Send</button></div></form>
    </section><aside className="contract-panel" aria-label="Contract and next steps"><div className="panel-heading"><h2>Contract & milestones</h2></div><div className="contract-content">
      {room.cancellationBy && <div className="cancellation-note"><strong>Cancellation requested</strong><p>{room.cancellationBy === data.userId ? 'Waiting for the other participant to respond.' : 'Review the reason in the conversation and choose whether to agree.'} Work actions are paused until this is resolved.</p></div>}
      {!room.terms && <div className="contract-empty"><h3>Start with a clear brief</h3><p>Discuss deliverables, deadlines, usage rights, and budget. The company sends an offer when you are ready.</p></div>}
      {room.terms && <><div className="contract-summary"><span>{room.acceptedAt ? 'ACCEPTED CONTRACT' : room.status === 'offer' ? 'PENDING OFFER' : 'PREVIOUS OFFER'}</span><h3>{room.terms.title}</h3><strong className="contract-total">{money(room.terms.milestones.reduce((sum, m) => sum + m.amount, 0))}<small> USD total</small></strong>{room.acceptedAt && <p>Accepted {date(room.acceptedAt)} UTC</p>}</div>
        <details className="contract-terms" open={room.status === 'offer'}><summary>Deliverables & terms</summary><h4>Scope</h4><p>{room.terms.scope}</p><h4>Usage rights & exclusivity</h4><p>{room.terms.usageRights}</p><h4>Revisions</h4><p>{room.terms.revisions} round{room.terms.revisions === 1 ? '' : 's'} per milestone. Discuss any extra work before proceeding.</p></details>
        <ol className="contract-milestones">{room.terms.milestones.map((milestone, index) => { const approved = room.status === 'completed' || !!room.acceptedAt && index < room.milestone; return <li key={index} className={approved ? 'approved' : room.acceptedAt && index === room.milestone ? 'current' : ''}><span className="milestone-number">{approved ? <Check size={15} /> : index + 1}</span><div><h4>{milestone.title}</h4><p>{money(milestone.amount)} · Due {milestone.dueDate}</p><span>{approved ? 'Approved' : room.status === 'cancelled' ? 'Cancelled' : !room.acceptedAt ? 'Proposed' : index === room.milestone ? room.status === 'submitted' ? 'Awaiting review' : 'In progress' : 'Upcoming'}</span></div></li>; })}</ol>
        <p className="payment-note">Payments are arranged outside Endorse. No escrow, payment collection, or automatic release is provided.</p>
      </>}
      {room.submission && <div className="delivery-card"><h3>{room.status === 'submitted' ? 'Submitted work' : 'Latest delivery'}</h3><p>{room.submission.note}</p><a href={room.submission.url} target="_blank" rel="noopener noreferrer">Open delivery<ExternalLink size={15} /></a></div>}
      {room.status === 'cancelled' && <p className="payment-note">This collaboration is closed. Messages remain available. Reviews are not available for cancelled contracts.</p>}
      {action && data.actions.includes(action) ? action === 'offer' ? <OfferForm key={room.version} existing={room.terms} busy={busy || connectionStatus !== 'live'} onClose={() => setAction(null)} onSubmit={values => mutate('action', { action, version: room.version, ...values }, () => setAction(null))} /> : <ActionForm action={action} busy={busy || connectionStatus !== 'live'} onClose={() => setAction(null)} onSubmit={values => mutate('action', { action, version: room.version, ...values }, () => setAction(null))} />
        : <div className="collaboration-actions">{data.actions.map(value => <button type="button" key={value} disabled={busy || connectionStatus !== 'live'} className={`button ${['offer', 'accept', 'submit', 'approve'].includes(value) ? 'button-primary' : 'button-outline'}`} onClick={() => { setError(''); setAction(value); }}>{labels[value]}</button>)}</div>}
      {room.status === 'active' && data.userId === room.companyId && !room.cancellationBy && <p className="next-step-note">Waiting for the creator to submit milestone {room.milestone + 1}.</p>}
      {room.status === 'submitted' && data.userId === room.creatorId && !room.cancellationBy && <p className="next-step-note">Waiting for the company to approve or request changes.</p>}
      {room.status === 'completed' && <section className="collaboration-reviews"><h3>Collaboration reviews</h3>{data.reviewOpen && !myReview && <ReviewForm busy={busy || connectionStatus !== 'live'} onSubmit={values => mutate('review', values)} />}{myReview && !data.reviewsVisible && <p className="next-step-note">Your review is saved. Reviews become visible after both sides submit or on {date(room.completedAt + 14 * 86400)} UTC.</p>}{!data.reviewOpen && !myReview && <p>The 14-day review window has closed.</p>}{data.reviews.map(review => <article className="review-card" key={review.id}><strong>{review.reviewerId === data.userId ? 'Your review' : partner?.name} · {review.rating}/5<Star size={14} /></strong><p>{review.comment}</p></article>)}</section>}
    </div></aside></div>
  </main>;
}
