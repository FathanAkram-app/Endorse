import { z } from 'zod';
import { PHOTO_PATH_PATTERN } from './profile-photo.js';

export const profileCategories = ['Lifestyle', 'Beauty', 'Travel', 'Fashion', 'Food', 'Fitness', 'Technology', 'Gaming', 'Business', 'Other'];
export const socialPlatforms = ['Instagram', 'TikTok', 'YouTube', 'Facebook', 'X', 'LinkedIn', 'Twitch', 'Pinterest', 'Snapchat', 'Threads', 'Bluesky', 'Other'];
export const MAX_SOCIAL_ACCOUNTS = 50;

const publicUrl = z.string().trim().max(500).refine((value) => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch { return false; }
}, 'Enter a full HTTPS URL, or leave this blank.');
const socialAccountsSchema = z.array(z.object({
  platform: z.enum(socialPlatforms),
  handle: z.string().trim().max(100).default(''),
  url: publicUrl.refine((value) => value.length > 0, 'Enter a URL for each social account, or remove the empty account.'),
})).max(MAX_SOCIAL_ACCOUNTS, `Add up to ${MAX_SOCIAL_ACCOUNTS} social accounts.`).superRefine((accounts, context) => {
  const seen = new Set();
  for (const account of accounts) {
    // Ignore fragments and a trailing slash when detecting the same profile.
    try {
      const url = new URL(account.url);
      url.hash = '';
      const key = url.href.replace(/\/$/, '');
      if (seen.has(key)) context.addIssue({ code: 'custom', message: 'This social profile URL is already in your list.' });
      seen.add(key);
    } catch { /* URL validation above supplies the useful error. */ }
  }
});
const category = z.union([z.literal(''), z.enum(profileCategories)]);
const shared = {
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(100),
  category,
  location: z.string().trim().max(100),
  website: publicUrl,
  imageUrl: publicUrl,
};
const companyProfileSchema = z.object({ ...shared, bio: z.string().trim().max(2000) });
const creatorProfileSchema = companyProfileSchema.extend({
  imageUrl: z.union([publicUrl, z.string().regex(PHOTO_PATH_PATTERN, 'Choose a valid uploaded photo.')]),
  handle: z.string().trim().max(100),
  // Omitted by older clients: preserve the saved list instead of clearing it.
  socialAccounts: socialAccountsSchema.optional(),
  // Stored in whole cents. Null means the creator has not listed a price.
  startingRate: z.number().int().min(0).max(100000000).nullable(),
  published: z.boolean(),
}).superRefine((value, context) => {
  if (value.published && (!value.category || value.bio.length < 20)) {
    context.addIssue({ code: 'custom', message: 'Choose a category and write at least 20 characters about yourself before publishing.' });
  }
});

export function profileSchema(role) {
  return role === 'creator' ? creatorProfileSchema : companyProfileSchema;
}

export const brandSchema = z.object({
  ...shared,
  tagline: z.string().trim().max(140),
  description: z.string().trim().max(2000),
  published: z.boolean(),
}).superRefine((value, context) => {
  if (value.published && (!value.category || value.description.length < 20)) {
    context.addIssue({ code: 'custom', message: 'Choose a category and write at least 20 characters about your brand before publishing.' });
  }
});
