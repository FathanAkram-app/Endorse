import test from 'node:test';
import assert from 'node:assert/strict';

const base = process.env.COLLABORATION_TEST_URL;
test('private collaboration lifecycle, milestones, concurrency, cancellation, and blind reviews', { skip: !base }, async () => {
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Use a local test database.');
  const tag = `collab-${crypto.randomUUID().slice(0, 8)}`;
  const accounts = [];
  let creator, company, brand;
  const profile = { name: `${tag} creator`, bio: 'I create thoughtful travel videos for independent brands.', category: 'Travel', location: '', website: '', imageUrl: '', handle: '', startingRate: null, socialAccounts: [], published: true };
  const brandProfile = { name: `${tag} brand`, tagline: 'Travel creatively', description: 'We make useful products for curious travelers.', category: 'Travel', location: '', website: '', imageUrl: '', published: true };
  async function request(path, { method = 'GET', data, actor, status = 200, origin = base, html = false } = {}) {
    const response = await fetch(`${base}${path}`, { method, redirect: 'manual', signal: AbortSignal.timeout(20000), headers: {
      Origin: origin, ...(actor ? { Cookie: actor.cookie } : {}), ...(data ? { 'Content-Type': 'application/json' } : {}),
    }, ...(data ? { body: JSON.stringify(data) } : {}) });
    const text = await response.text();
    assert.equal(response.status, status, `${method} ${path}: ${text.slice(0, 500)}`);
    return html || !text ? text : JSON.parse(text);
  }
  async function account(role, suffix) {
    const response = await fetch(`${base}/api/auth/register`, { method: 'POST', signal: AbortSignal.timeout(20000), headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: `${tag} ${suffix}`, email: `${tag}-${suffix}@example.com`, password: 'collaboration-integration-password', role }) });
    const body = await response.json();
    assert.equal(response.status, 201, JSON.stringify(body));
    const result = { user: body.user, cookie: response.headers.get('set-cookie').split(';')[0] }; accounts.push(result); return result;
  }
  try {
    creator = await account('creator', 'creator');
    company = await account('company', 'company');
    const outsider = await account('company', 'outsider');
    await request('/api/profile', { method: 'PUT', actor: creator, data: profile });
    brand = (await request('/api/brands', { method: 'POST', actor: company, data: brandProfile, status: 201 })).brand;
    const start = { brandId: brand.id, creatorId: creator.user.id, message: 'Let us discuss a private collaboration.', clientId: crypto.randomUUID() };
    await request('/api/collaborations', { status: 401 });
    await request('/api/collaborations', { method: 'POST', data: start, status: 401 });
    await request('/api/collaborations', { method: 'POST', data: start, actor: outsider, status: 404 });
    await request('/api/collaborations', { method: 'POST', data: start, actor: company, origin: 'https://evil.example', status: 403 });
    const room = (await request('/api/collaborations', { method: 'POST', data: start, actor: company, status: 201 })).room;
    assert.equal((await request('/api/collaborations', { method: 'POST', data: start, actor: company, status: 201 })).room.id, room.id, 'Start retries must not duplicate rooms.');
    const path = `/api/collaborations/${room.id}`;
    const get = actor => request(path, { actor });
    const act = async (action, actor, extra = {}, status = 200) => {
      const current = await get(actor);
      return request(path, { method: 'PATCH', actor, data: { action, version: current.room.version, ...extra }, status });
    };
    await request(path, { actor: outsider, status: 404 });
    await request(`${path}/messages`, { actor: outsider, method: 'POST', data: { message: 'Intrusion', clientId: crypto.randomUUID() }, status: 404 });
    assert.equal((await request('/api/collaborations', { actor: outsider })).items.length, 0);
    assert.ok((await request('/api/collaborations', { actor: creator })).items.some(item => item.id === room.id));
    await request(`/collaborations/${room.id}`, { actor: outsider, html: true, status: 404 });
    await request(`/collaborations/${room.id}`, { actor: creator, html: true });
    await request('/collaborations', { html: true, status: 307 });
    await request(`/collaborations/new?creator=${creator.user.id}`, { actor: company, html: true });
    await request(`/collaborations/new?brand=${brand.id}`, { actor: creator, html: true });
    const message = { message: 'A private message that is not a formal submission.', clientId: crypto.randomUUID() };
    await request(`${path}/messages`, { actor: creator, method: 'POST', data: message });
    await request(`${path}/messages`, { actor: creator, method: 'POST', data: message });
    assert.equal((await get(company)).messages.filter(item => item.clientId === message.clientId).length, 1);
    assert.equal((await get(company)).room.status, 'discussion');
    await request(`${path}/reviews`, { actor: company, method: 'POST', data: { rating: 5, comment: 'Too early to review the creator.' }, status: 409 });
    const dueDate = new Date(Date.now() + 86400 * 1000 * 30).toISOString().slice(0, 10);
    const terms = { title: 'Travel launch', scope: 'Create a concept and deliver the final travel video.', usageRights: 'Organic social use for 90 days. No exclusivity or paid ads.', revisions: 2, milestones: [{ title: 'Concept direction', amount: 5000, dueDate }, { title: 'Final video', amount: 15000, dueDate }] };
    await act('offer', creator, { terms }, 409);
    await act('offer', company, { terms: { ...terms, milestones: [{ title: 'Invalid date', amount: 100, dueDate: '2026-02-30' }] } }, 400);
    await act('offer', company, { terms });
    await act('accept', company, {}, 409);
    await act('decline', creator);
    await act('offer', company, { terms });
    await act('withdraw', company);
    await act('offer', company, { terms });
    const offered = await get(creator);
    // Same version, simultaneous requests: exactly one transition and one activity event.
    const attempts = await Promise.all([0, 1].map(() => fetch(`${base}${path}`, { method: 'PATCH', headers: { Cookie: creator.cookie, Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'accept', version: offered.room.version }), signal: AbortSignal.timeout(20000) }).then(async response => ({ status: response.status, body: await response.json() }))));
    assert.deepEqual(attempts.map(item => item.status).sort(), [200, 409]);
    const active = await get(company);
    assert.equal(active.room.status, 'active');
    assert.deepEqual(active.room.terms, terms);
    assert.equal(active.messages.filter(item => item.body.startsWith('Accepted the contract.')).length, 1);
    await act('offer', company, { terms: { ...terms, title: 'Changed without consent' } }, 409);
    await act('approve', company, {}, 409);
    await act('submit', company, { note: 'I cannot submit as a company.', url: 'https://example.com/work' }, 409);
    await act('submit', creator, { note: 'Unsafe URL', url: 'javascript:alert(1)' }, 400);
    await act('submit', creator, { note: 'Concept for your review.', url: 'https://example.com/concept' });
    await act('revise', company, { note: 'Please include the product in the opening scene.' });
    await act('submit', creator, { note: 'Updated concept.', url: 'https://example.com/concept-v2' });
    const next = await act('approve', company);
    assert.equal(next.room.status, 'active'); assert.equal(next.room.milestone, 1); assert.equal(next.room.submission, null);
    await act('submit', creator, { note: 'Final video is ready.', url: 'https://example.com/final' });
    const completed = await act('approve', company);
    assert.equal(completed.room.status, 'completed');
    assert.equal(completed.actions.length, 0);
    await act('submit', creator, { note: 'No changes after completion.', url: 'https://example.com/extra' }, 409);
    const companyReview = `Excellent concept and delivery ${tag}.`;
    const creatorReview = `Clear brief and helpful communication ${tag}.`;
    await request(`${path}/reviews`, { method: 'POST', actor: outsider, data: { rating: 5, comment: companyReview }, status: 404 });
    await request(`${path}/reviews`, { method: 'POST', actor: company, data: { rating: 6, comment: companyReview }, status: 400 });
    await request(`${path}/reviews`, { method: 'POST', actor: company, data: { rating: 5, comment: companyReview }, status: 201 });
    await request(`${path}/reviews`, { method: 'POST', actor: company, data: { rating: 1, comment: 'Changing the review is not allowed.' }, status: 409 });
    assert.equal((await get(company)).reviews.length, 1);
    assert.equal((await get(creator)).reviews.length, 0, 'First review must be hidden from the other participant.');
    const hiddenProfile = await request(`/creators/${creator.user.id}`, { html: true });
    assert.ok(!hiddenProfile.includes(companyReview));
    assert.ok(!hiddenProfile.includes(message.message), 'Private chat cannot appear on profiles.');
    await request(`${path}/reviews`, { method: 'POST', actor: creator, data: { rating: 4, comment: creatorReview }, status: 201 });
    assert.equal((await get(creator)).reviews.length, 2);
    assert.equal((await get(company)).reviewsVisible, true);
    assert.ok((await request(`/creators/${creator.user.id}`, { html: true })).includes(companyReview));
    assert.ok((await request(`/brands/${brand.id}`, { html: true })).includes(creatorReview));
    // History is bounded and older messages remain accessible only to participants.
    for (let i = 0; i < 51; i++) await request(`${path}/messages`, { method: 'POST', actor: creator, data: { message: `History message ${i}`, clientId: crypto.randomUUID() } });
    const newest = await get(company);
    assert.equal(newest.messages.length, 50); assert.equal(newest.hasOlder, true);
    const older = await request(`${path}?before=${newest.messages[0].id}`, { actor: company });
    assert.ok(older.messages.every(item => item.id < newest.messages[0].id));
    assert.ok(older.messages.some(item => item.body === start.message));
    const catchup = await request(`${path}?after=${older.messages.at(-1).id}`, { actor: company });
    assert.deepEqual(catchup.messages.map(item => item.id), newest.messages.map(item => item.id));
    // A creator can initiate a new collaboration; cancellation requires both participants after acceptance.
    const second = (await request('/api/collaborations', { method: 'POST', actor: creator, data: { ...start, creatorId: outsider.user.id, clientId: crypto.randomUUID() }, status: 201 })).room;
    assert.equal(second.creatorId, creator.user.id, 'Creator identity comes from the session.');
    const secondPath = `/api/collaborations/${second.id}`;
    async function secondAction(action, actor, extra = {}, status = 200) {
      const current = await request(secondPath, { actor });
      return request(secondPath, { method: 'PATCH', actor, data: { action, version: current.room.version, ...extra }, status });
    }
    await secondAction('offer', company, { terms }); await secondAction('accept', creator);
    await secondAction('cancel', creator, {}, 409);
    await secondAction('request-cancel', creator, { note: 'The schedule has changed.' });
    await secondAction('approve-cancel', creator, {}, 409);
    await secondAction('submit', creator, { note: 'Paused work.', url: 'https://example.com/work' }, 409);
    await secondAction('reject-cancel', company);
    await secondAction('request-cancel', company, { note: 'We agreed to end the project.' });
    assert.equal((await secondAction('approve-cancel', creator)).room.status, 'cancelled');
    await request(`${secondPath}/reviews`, { method: 'POST', actor: company, data: { rating: 5, comment: companyReview }, status: 409 });
  } finally {
    const cleanup = [];
    if (creator) cleanup.push(request('/api/profile', { method: 'PUT', actor: creator, data: { ...profile, published: false } }));
    if (brand) cleanup.push(request(`/api/brands/${brand.id}`, { method: 'PUT', actor: company, data: { ...brandProfile, published: false } }));
    const results = await Promise.allSettled(cleanup);
    for (const actor of accounts) results.push(...await Promise.allSettled([request('/api/auth/logout', { method: 'POST', actor })]));
    for (const result of results) if (result.status === 'rejected') console.warn('Test cleanup failed:', result.reason.message);
  }
});
