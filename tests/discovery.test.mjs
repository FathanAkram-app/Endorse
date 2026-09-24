import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creators } from '../lib/endorse/data.js';
import { discoverCreators } from '../lib/endorse/discovery.js';

test('budget sorting compares equivalent packages without mutating the source', () => {
  const original = creators.map(({ id }) => id);
  assert.deepEqual(discoverCreators(creators, { sort: 'price-low' }).map(({ price }) => price), [150, 280, 450]);
  assert.deepEqual(discoverCreators(creators, { sort: 'price-high' }).map(({ price }) => price), [450, 280, 150]);
  assert.deepEqual(creators.map(({ id }) => id), original);
});
test('search is case insensitive and combines with category', () => {
  assert.equal(discoverCreators(creators, { query: ' SOFIA ', category: 'Beauty' })[0].id, 'sofia');
  assert.equal(discoverCreators(creators, { query: 'SOFIA', category: 'Travel' }).length, 0);
  assert.equal(discoverCreators(creators, { query: 'Austin' })[0].id, 'alex');
  assert.equal(discoverCreators(creators, { query: 'unknown' }).length, 0);
});
test('rating sort surfaces highest rated creator and defaults preserve curation', () => {
  assert.equal(discoverCreators(creators, { sort: 'rating' })[0].id, 'sofia');
  assert.deepEqual(discoverCreators(creators), creators);
});
