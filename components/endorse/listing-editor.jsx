'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Globe, Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { profileCategories } from '@/lib/endorse/profile-validation';
import ListingCard from './listing-card';
import SocialAccountsEditor from './social-accounts-editor';
import ProfilePhotoInput from './profile-photo-input';

export default function ListingEditor({ initial, role, mode = 'profile', created = false }) {
  const router = useRouter();
  const brand = mode === 'brand';
  const creator = role === 'creator';
  const publicListing = brand || creator;
  const [form, setForm] = useState(initial);
  const [rate, setRate] = useState(initial.startingRate === null || initial.startingRate === undefined ? '' : String(initial.startingRate / 100));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(created);
  const [published, setPublished] = useState(initial.published);
  const [photo, setPhoto] = useState(null);
  const [uploadedPhoto, setUploadedPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.preview); }, [photo]);
  function choosePhoto(file) {
    setPhoto({ file, preview: URL.createObjectURL(file) });
    setUploadedPhoto(null); setSaved(false); setError('');
  }
  function removePhoto() { setPhoto(null); setUploadedPhoto(null); update('imageUrl', ''); }
  const back = `/account/${role}`;
  function update(field, value) { setForm((previous) => ({ ...previous, [field]: value })); setSaved(false); }
  async function save(event) {
    event.preventDefault();
    if (pending) return;
    setError(''); setSaved(false);
    if (creator && rate && !/^\d{1,7}(\.\d{1,2})?$/.test(rate)) { setError('Enter a price with up to two decimal places.'); return; }
    setPending(true);
    try {
      let imageUrl = form.imageUrl;
      if (creator && photo) {
        if (uploadedPhoto?.file === photo.file) imageUrl = uploadedPhoto.imageUrl;
        else {
          setUploading(true);
          const upload = await fetch('/api/profile/photo', { method: 'POST', headers: { 'Content-Type': photo.file.type }, body: photo.file });
          const result = await upload.json();
          if (!upload.ok) throw new Error(upload.status === 401 ? 'Your session has expired. Log in again before saving.' : result.error || 'Unable to upload this photo. Please try again.');
          imageUrl = result.imageUrl;
          // Keep the uploaded reference for a retry if saving the profile fails.
          setUploadedPhoto({ file: photo.file, imageUrl });
          setUploading(false);
        }
      }
      const endpoint = brand ? initial.id ? `/api/brands/${initial.id}` : '/api/brands' : '/api/profile';
      const response = await fetch(endpoint, {
        method: brand && !initial.id ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, imageUrl, ...(creator ? { startingRate: rate ? Math.round(Number(rate) * 100) : null } : {}) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(response.status === 401 ? 'Your session has expired. Log in again before saving.' : result.error || 'Unable to save. Please try again.');
      if (brand && !initial.id) { window.location.assign(`/account/brands/${result.brand.id}/edit?created=1`); return; }
      const record = brand ? result.brand : result.profile;
      setForm(record); setPublished(record.published); setSaved(true);
      setPhoto(null); setUploadedPhoto(null);
      router.refresh();
    } catch (error) { setError(error instanceof TypeError ? 'Unable to connect. Your changes are still here; please try again.' : error.message); }
    finally { setPending(false); setUploading(false); }
  }
  const title = brand ? initial.id ? 'Edit your brand.' : 'Introduce your brand.' : creator ? 'Make it yours.' : 'Your company profile.';
  const bodyField = brand ? 'description' : 'bio';
  const publicUrl = brand ? initial.id ? `/brands/${initial.id}` : null : `/creators/${initial.userId}`;
  return <main className="container workspace-page">
    <Link className="back-link" href={back}><ArrowLeft size={16} />Back to account</Link>
    <div className="workspace-heading"><div><span className="section-kicker">{brand ? 'BRAND PROFILE' : creator ? 'CREATOR PROFILE' : 'COMPANY DETAILS'}</span><h1>{title}</h1><p>{brand ? 'Tell creators what your brand is all about.' : creator ? 'Show brands your interests, your style, and what you bring to a collaboration.' : 'Keep your company details up to date. Manage your public brands from your account.'}</p></div>
      {publicListing && <span className={`publication-badge ${published ? 'published' : ''}`}>{published ? 'Published' : 'Draft'}</span>}
    </div>
    <div className={`editor-grid ${!publicListing ? 'company-editor' : ''}`}>
      <form className="editor-form" onSubmit={save} aria-busy={pending}>
        <fieldset disabled={pending}>
          <section className="editor-section"><h2>The essentials</h2><p>A clear introduction makes a good first impression.</p>
            <div className="auth-field"><Label htmlFor="listing-name">{brand ? 'Brand name' : creator ? 'Display name' : 'Company name'}</Label><Input id="listing-name" value={form.name} onChange={(e) => update('name', e.target.value)} required minLength={2} maxLength={100} autoComplete={creator ? 'name' : 'organization'} /></div>
            {brand && <div className="auth-field"><Label htmlFor="tagline">Tagline <span className="field-optional">Optional</span></Label><Input id="tagline" value={form.tagline} onChange={(e) => update('tagline', e.target.value)} maxLength={140} placeholder="A short line that captures your brand" /></div>}
            <div className="editor-field-row"><div className="auth-field"><Label htmlFor="category">{creator ? 'Content category' : 'Industry'}</Label><Select value={form.category || 'none'} onValueChange={(value) => update('category', value === 'none' ? '' : value)} disabled={pending}><SelectTrigger id="category"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Choose a category</SelectItem>{profileCategories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent></Select></div>
              <div className="auth-field"><Label htmlFor="location">Location <span className="field-optional">Optional</span></Label><Input id="location" value={form.location} onChange={(e) => update('location', e.target.value)} maxLength={100} placeholder="City, country" /></div></div>
            <div className="auth-field"><Label htmlFor="bio">{brand ? 'About the brand' : creator ? 'About you' : 'About the company'}</Label><Textarea id="bio" value={form[bodyField]} onChange={(e) => update(bodyField, e.target.value)} maxLength={2000} rows={6} placeholder={creator ? 'What do you create? What kinds of partnerships would you love?' : 'Share your story, what you do, and what makes your brand different.'} /><small>{form[bodyField].length}/2,000 characters{publicListing ? ' · At least 20 to publish' : ''}</small></div>
          </section>
          <section className="editor-section"><h2>{creator ? 'Your presence & pricing' : 'Your brand identity'}</h2><p>{publicListing ? 'Add a picture and a link so people can get to know you.' : 'Add a logo and website for your company.'}</p>
            {creator ? <ProfilePhotoInput imageUrl={photo?.preview ?? form.imageUrl} name={form.name} filename={photo?.file.name} disabled={pending} onSelect={choosePhoto} onRemove={removePhoto} /> : <div className="auth-field"><Label htmlFor="image-url">Logo URL <span className="field-optional">Optional</span></Label><Input id="image-url" type="url" value={form.imageUrl} onChange={(e) => update('imageUrl', e.target.value)} maxLength={500} placeholder="https://example.com/image.jpg" /><small>Use an HTTPS image link. Leave blank to use your initials.</small></div>}
            <div className="auth-field"><Label htmlFor="website">{creator ? 'Website or portfolio URL' : 'Website'} <span className="field-optional">Optional</span></Label><Input id="website" type="url" value={form.website} onChange={(e) => update('website', e.target.value)} maxLength={500} placeholder="https://" /></div>
            {creator && <div className="editor-field-row"><div className="auth-field"><Label htmlFor="handle">Display handle <span className="field-optional">Optional</span></Label><Input id="handle" value={form.handle} onChange={(e) => update('handle', e.target.value)} maxLength={100} placeholder="@yourname" /></div><div className="auth-field"><Label htmlFor="rate">Starting rate (USD) <span className="field-optional">Optional</span></Label><Input id="rate" type="number" min="0" max="1000000" step="0.01" value={rate} onChange={(e) => { setRate(e.target.value); setSaved(false); }} placeholder="Rate on request" /><small>Per collaboration. Leave blank if you prefer to discuss pricing.</small></div></div>}
          </section>
          {creator && <SocialAccountsEditor accounts={form.socialAccounts ?? []} onChange={(accounts) => update('socialAccounts', accounts)} disabled={pending} />}
          {publicListing && <section className="editor-section publish-section"><div><Label htmlFor="published"><Globe size={18} />Show on Explore</Label><p>{brand ? 'Publish this brand so creators can discover it.' : 'Make your profile visible to companies and visitors.'} Turn this off and save to return to draft.</p></div><Switch id="published" checked={form.published} onCheckedChange={(value) => update('published', value)} disabled={pending} /></section>}
          {error && <p className="auth-error" role="alert">{error} {error.includes('session') && <a href="/login" target="_blank" rel="noreferrer">Log in in a new tab</a>}</p>}
          {saved && <p className="save-success" role="status"><Check size={18} />{publicListing ? published ? 'Saved and published on Explore.' : 'Saved as a draft. Only you can see it.' : 'Company profile saved.'}{published && publicUrl && <Link href={publicUrl}>View profile</Link>}</p>}
          <div className="editor-actions"><button type="submit" className="button button-primary" disabled={pending}><Save size={17} />{uploading ? 'Uploading photo…' : pending ? 'Saving…' : brand && !initial.id ? form.published ? 'Publish brand' : 'Save brand draft' : 'Save changes'}</button><Link href={back}>Back to account</Link></div>
        </fieldset>
      </form>
      {publicListing && <aside className="editor-preview"><span className="section-kicker">PROFILE PREVIEW</span><ListingCard preview kind={creator ? 'creators' : 'brands'} item={{ ...form, imageUrl: photo?.preview ?? form.imageUrl, startingRate: rate && Number.isFinite(Number(rate)) ? Math.round(Number(rate) * 100) : null }} /><p>Your changes appear here as you type. Save to update your profile.</p></aside>}
    </div>
  </main>;
}
