import { and, asc, desc, eq, gt, inArray, lt, or, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { brands, collaborationMessages as messages, collaborationReviews as reviews, collaborations as rooms, profiles, users } from '@/db/schema';
import { AuthError } from '@/lib/auth/server';
import { actionSchema, allowedActions, messageSchema, reviewSchema, reviewWindow, startSchema } from './collaboration-validation';

type User = { id: string; role: string };
const now = () => Math.floor(Date.now() / 1000);
function parse<T>(result: { success: true; data: T } | { success: false; error: { issues: { message: string }[] } }): T {
  if (!result.success) throw new AuthError(400, result.error.issues[0].message);
  return result.data;
}

export async function memberRoom(id: string, userId: string) {
  const [room] = await getDb().select().from(rooms).where(and(eq(rooms.id, id), or(eq(rooms.companyId, userId), eq(rooms.creatorId, userId)))).limit(1);
  if (!room) throw new AuthError(404, 'Collaboration not found.');
  return room;
}

export async function inbox(userId: string, offset = 0) {
  const results = await getDb().select().from(rooms).where(or(eq(rooms.companyId, userId), eq(rooms.creatorId, userId)))
    .orderBy(desc(rooms.updatedAt), desc(rooms.id)).limit(21).offset(offset);
  const ids = results.map(room => room.companyId === userId ? room.creatorId : room.companyId);
  const people = ids.length ? await getDb().select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, ids)) : [];
  return { items: results.slice(0, 20).map(room => ({ ...room, partner: people.find(person => person.id === (room.companyId === userId ? room.creatorId : room.companyId))?.name || 'Account' })), hasMore: results.length > 20 };
}

export async function roomData(id: string, userId: string, before?: number, after?: number) {
  const room = await memberRoom(id, userId);
  const db = getDb();
  const [history, people, feedback] = await Promise.all([
    db.select().from(messages).where(and(eq(messages.collaborationId, id), before ? lt(messages.id, before) : undefined, after ? gt(messages.id, after) : undefined)).orderBy(after ? asc(messages.id) : desc(messages.id)).limit(51),
    db.select({ id: users.id, name: users.name, role: users.role }).from(users).where(inArray(users.id, [room.companyId, room.creatorId])),
    db.select().from(reviews).where(eq(reviews.collaborationId, id)),
  ]);
  const reviewsVisible = feedback.length === 2 || !!(room.completedAt && now() >= room.completedAt + reviewWindow);
  return { room, people, messages: after ? history.slice(0, 50) : history.slice(0, 50).reverse(), hasOlder: !after && history.length > 50, hasNewer: !!after && history.length > 50,
    reviews: feedback.filter(review => reviewsVisible || review.reviewerId === userId), reviewsVisible,
    reviewOpen: room.status === 'completed' && !!room.completedAt && now() < room.completedAt + reviewWindow,
    actions: allowedActions(room, userId), userId };
}

export async function startCollaboration(user: User, body: unknown) {
  const input = parse(startSchema.safeParse(body));
  const db = getDb();
  const [previous] = await db.select().from(messages).where(and(eq(messages.senderId, user.id), eq(messages.clientId, input.clientId))).limit(1);
  if (previous) return memberRoom(previous.collaborationId, user.id);
  const [brand] = await db.select().from(brands).where(eq(brands.id, input.brandId)).limit(1);
  if (!brand || (user.role === 'company' ? brand.ownerId !== user.id : !brand.published)) throw new AuthError(404, 'Brand not found.');
  const creatorId = user.role === 'creator' ? user.id : input.creatorId;
  if (!creatorId) throw new AuthError(400, 'Choose a creator.');
  const [creator] = await db.select({ id: users.id, published: profiles.published }).from(users).leftJoin(profiles, eq(profiles.userId, users.id))
    .where(and(eq(users.id, creatorId), eq(users.role, 'creator'))).limit(1);
  if (!creator || (user.role === 'company' && !creator.published)) throw new AuthError(404, 'Creator not found.');
  const id = crypto.randomUUID();
  const timestamp = now();
  try {
    await db.batch([
      db.insert(rooms).values({ id, brandId: brand.id, brandName: brand.name, companyId: brand.ownerId, creatorId, createdAt: timestamp, updatedAt: timestamp }),
      db.insert(messages).values({ collaborationId: id, senderId: user.id, kind: 'message', body: input.message, createdAt: timestamp, clientId: input.clientId }),
    ]);
  } catch (error) {
    const [retry] = await db.select().from(messages).where(and(eq(messages.senderId, user.id), eq(messages.clientId, input.clientId))).limit(1);
    if (retry) return memberRoom(retry.collaborationId, user.id);
    throw error;
  }
  return memberRoom(id, user.id);
}

export async function sendMessage(id: string, userId: string, body: unknown) {
  const input = parse(messageSchema.safeParse(body));
  await memberRoom(id, userId);
  const db = getDb();
  const timestamp = now();
  await db.batch([
    db.insert(messages).values({ collaborationId: id, senderId: userId, kind: 'message', body: input.message, createdAt: timestamp, clientId: input.clientId }).onConflictDoNothing(),
    db.update(rooms).set({ updatedAt: timestamp }).where(eq(rooms.id, id)),
  ]);
}

export async function transition(id: string, userId: string, body: unknown) {
  const input = parse(actionSchema.safeParse(body));
  const room = await memberRoom(id, userId);
  if (input.version !== room.version) throw new AuthError(409, 'This collaboration changed. Refresh and try again.');
  if (!allowedActions(room, userId).includes(input.action)) throw new AuthError(409, 'This action is not available at this step.');
  const timestamp = now();
  const changes: Partial<typeof rooms.$inferInsert> = { updatedAt: timestamp, version: room.version + 1 };
  let event = '';
  switch (input.action) {
    case 'offer': {
      if (!input.terms) throw new AuthError(400, 'Complete the contract terms.');
      if (input.terms.milestones.some(m => m.dueDate < new Date().toISOString().slice(0, 10))) throw new AuthError(400, 'Milestone dates cannot be in the past.');
      changes.terms = input.terms; changes.status = 'offer';
      event = `Sent an offer: ${input.terms.title}\n${input.terms.scope}\nUsage and exclusivity: ${input.terms.usageRights}\nIncluded revision rounds per milestone: ${input.terms.revisions}\n${input.terms.milestones.map((m, i) => `${i + 1}. ${m.title} — USD ${(m.amount / 100).toFixed(2)} — due ${m.dueDate}`).join('\n')}\nPayments are arranged outside Endorse.`;
      break;
    }
    case 'withdraw': changes.status = 'discussion'; event = 'Withdrew the offer. Discuss changes before sending a new offer.'; break;
    case 'decline': changes.status = 'discussion'; event = 'Declined the offer. The conversation stays open for new terms.'; break;
    case 'accept': changes.status = 'active'; changes.acceptedAt = timestamp; event = 'Accepted the contract. Work can begin on milestone 1.'; break;
    case 'submit':
      if (!input.note || !input.url) throw new AuthError(400, 'Add a delivery link and a note.');
      changes.status = 'submitted'; changes.submission = { note: input.note, url: input.url };
      event = `Submitted milestone ${room.milestone + 1} for review.\n${input.note}\n${input.url}`; break;
    case 'revise':
      if (!input.note) throw new AuthError(400, 'Describe the changes needed.');
      changes.status = 'active'; event = `Requested changes to milestone ${room.milestone + 1}.\n${input.note}`; break;
    case 'approve': {
      const last = room.milestone + 1 === room.terms!.milestones.length;
      changes.status = last ? 'completed' : 'active'; changes.milestone = last ? room.milestone : room.milestone + 1;
      changes.submission = null;
      if (last) changes.completedAt = timestamp;
      event = `Approved milestone ${room.milestone + 1}. ${last ? 'The contract is complete. Both sides can leave a review within 14 days.' : `Work can begin on milestone ${room.milestone + 2}.`} Approval does not transfer payment.`;
      break;
    }
    case 'cancel': changes.status = 'cancelled'; event = 'Closed the conversation before a contract was accepted.'; break;
    case 'request-cancel':
      if (!input.note) throw new AuthError(400, 'Explain why you want to cancel.');
      changes.cancellationBy = userId; event = `Requested cancellation. The other participant must agree.\n${input.note}`; break;
    case 'approve-cancel': changes.status = 'cancelled'; changes.cancellationBy = null; event = 'Agreed to cancel the contract. Settle any outstanding payments directly.'; break;
    case 'reject-cancel': changes.cancellationBy = null; event = 'Declined the cancellation request. The contract continues.'; break;
  }
  // D1 batch is transactional. The event is inserted only when the version-guarded update succeeds.
  const db = getDb();
  const [updated] = await db.batch([
    db.update(rooms).set(changes).where(and(eq(rooms.id, id), eq(rooms.version, input.version))).returning({ id: rooms.id }),
    db.insert(messages).select(sql`select null, ${id}, ${userId}, 'event', ${event}, ${timestamp}, ${crypto.randomUUID()} where changes() = 1`),
  ]);
  if (!updated.length) throw new AuthError(409, 'This collaboration changed. Refresh and try again.');
}

export async function leaveReview(id: string, userId: string, body: unknown) {
  const input = parse(reviewSchema.safeParse(body));
  const room = await memberRoom(id, userId);
  if (room.status !== 'completed' || !room.completedAt || now() >= room.completedAt + reviewWindow) throw new AuthError(409, 'Reviews are available for 14 days after completion.');
  const inserted = await getDb().insert(reviews).values({ ...input, id: crypto.randomUUID(), collaborationId: id, reviewerId: userId, createdAt: now() }).onConflictDoNothing().returning({ id: reviews.id });
  if (!inserted.length) throw new AuthError(409, 'You already reviewed this collaboration.');
}

export async function publicReviews(kind: string, id: string) {
  const target = kind === 'creators' ? and(eq(rooms.creatorId, id), eq(reviews.reviewerId, rooms.companyId)) : and(eq(rooms.brandId, id), eq(reviews.reviewerId, rooms.creatorId));
  const where = and(eq(rooms.status, 'completed'), target, or(lt(rooms.completedAt, now() - reviewWindow),
    sql`(select count(*) from collaboration_reviews as feedback where feedback.collaboration_id = ${rooms.id}) = 2`));
  const db = getDb();
  const [summary] = await db.select({ count: sql<number>`count(*)`, average: sql<number | null>`avg(${reviews.rating})` }).from(reviews).innerJoin(rooms, eq(rooms.id, reviews.collaborationId)).where(where);
  const items = await db.select({ id: reviews.id, rating: reviews.rating, comment: reviews.comment, createdAt: reviews.createdAt, name: users.name })
    .from(reviews).innerJoin(rooms, eq(rooms.id, reviews.collaborationId)).innerJoin(users, eq(users.id, reviews.reviewerId)).where(where).orderBy(desc(reviews.createdAt), desc(reviews.id)).limit(20);
  return { ...summary, items };
}
