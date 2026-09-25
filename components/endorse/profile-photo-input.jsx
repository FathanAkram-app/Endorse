'use client';

import { useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MAX_PHOTO_BYTES, PHOTO_TYPES } from '@/lib/endorse/profile-photo';
import { ListingImage } from './listing-card';

export default function ProfilePhotoInput({ imageUrl, name, filename, disabled, onSelect, onRemove }) {
  const input = useRef(null);
  const [error, setError] = useState('');
  function choose(event) {
    const file = event.target.files?.[0];
    event.target.value = ''; // Allow picking the same file again after removal.
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) { setError('Choose a JPEG, PNG, or WebP photo.'); return; }
    if (!file.size || file.size > MAX_PHOTO_BYTES) { setError('Choose a photo smaller than 5 MB.'); return; }
    setError(''); onSelect(file);
  }
  return <div className="auth-field profile-photo-field">
    <Label htmlFor="profile-photo">Profile photo <span className="field-optional">Optional</span></Label>
    <div className="profile-photo-control"><ListingImage src={imageUrl} name={name} /><div className="profile-photo-picker">
      <Input ref={input} id="profile-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={choose} disabled={disabled} aria-describedby="profile-photo-hint profile-photo-feedback" aria-invalid={!!error} />
      <small id="profile-photo-hint">JPEG, PNG, or WebP, up to 5 MB. Your photo is saved when you save changes.</small>
      <div id="profile-photo-feedback" aria-live="polite">{error ? <p className="auth-error" role="alert">{error}</p> : filename && <span className="photo-selection"><ImagePlus size={16} />{filename}</span>}</div>
      {imageUrl && <button className="photo-remove" type="button" disabled={disabled} onClick={() => { setError(''); if (input.current) input.current.value = ''; onRemove(); }}><X size={15} />Remove photo</button>}
    </div></div>
  </div>;
}
