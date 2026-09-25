import test from 'node:test';
import assert from 'node:assert/strict';
import { brandSchema, MAX_SOCIAL_ACCOUNTS, profileSchema } from '../lib/endorse/profile-validation.js';

const common = { name: 'Example', category: '', location: '', website: '', imageUrl: '' };

test('creators can list multiple accounts per platform and remove every account', () => {
  const data = { ...common, bio: '', handle: '', startingRate: null, published: false };
  const accounts = Array.from({ length: MAX_SOCIAL_ACCOUNTS }, (_, i) => ({ platform: 'Instagram', handle: `@creator${i}`, url: `https://instagram.com/creator${i}` }));
  assert.deepEqual(profileSchema('creator').parse({ ...data, socialAccounts: accounts }).socialAccounts, accounts);
  assert.deepEqual(profileSchema('creator').parse({ ...data, socialAccounts: [] }).socialAccounts, []);
  assert.equal(profileSchema('creator').parse(data).socialAccounts, undefined, 'Omission must not overwrite existing accounts');
  assert.equal(profileSchema('creator').safeParse({ ...data, socialAccounts: [...accounts, { platform: 'YouTube', handle: '', url: 'https://youtube.com/@creator' }] }).success, false);
  assert.equal(profileSchema('company').parse({ ...data, socialAccounts: accounts }).socialAccounts, undefined);
});

test('social links reject unsafe URLs, empty rows, unknown platforms, and duplicate profiles', () => {
  const data = { ...common, bio: '', handle: '', startingRate: null, published: false };
  const account = { platform: 'Instagram', handle: '@creator', url: 'https://instagram.com/creator' };
  for (const url of ['', 'javascript:alert(1)', 'http://instagram.com/creator', 'https://user:pass@instagram.com/creator']) {
    assert.equal(profileSchema('creator').safeParse({ ...data, socialAccounts: [{ ...account, url }] }).success, false);
  }
  assert.equal(profileSchema('creator').safeParse({ ...data, socialAccounts: [{ ...account, platform: 'Unknown' }] }).success, false);
  assert.equal(profileSchema('creator').safeParse({ ...data, socialAccounts: [account, { ...account, url: `${account.url}/#profile` }] }).success, false);
});

test('drafts allow unfinished content but published listings require a category and description', () => {
  const creator = { ...common, bio: '', handle: '', startingRate: null, published: false };
  assert.ok(profileSchema('creator').safeParse(creator).success);
  assert.equal(profileSchema('creator').safeParse({ ...creator, published: true }).success, false);
  assert.ok(profileSchema('creator').safeParse({ ...creator, category: 'Beauty', bio: 'An introduction with enough detail.', published: true }).success);
  const brand = { ...common, tagline: '', description: '', published: false };
  assert.ok(brandSchema.safeParse(brand).success);
  assert.equal(brandSchema.safeParse({ ...brand, published: true }).success, false);
  assert.equal(brandSchema.safeParse({ ...brand, published: 'false' }).success, false);
});

test('profile validation rejects unsafe links and prices and ignores ownership and account fields', () => {
  const data = { ...common, bio: '', handle: '', startingRate: null, published: false };
  for (const website of ['javascript:alert(1)', 'data:text/html,test', 'https://user:pass@example.com', 'not a URL']) {
    assert.equal(profileSchema('creator').safeParse({ ...data, website }).success, false);
  }
  for (const startingRate of [-1, 1.5, 100000001]) assert.equal(profileSchema('creator').safeParse({ ...data, startingRate }).success, false);
  const company = profileSchema('company').parse({ ...data, role: 'creator', userId: 'someone-else', email: 'new@example.com', published: true });
  assert.equal(company.role, undefined);
  assert.equal(company.userId, undefined);
  assert.equal(company.email, undefined);
  assert.equal(company.published, undefined);
});
