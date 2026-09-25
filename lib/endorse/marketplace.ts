import { and, asc, count, desc, eq, or, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { brands, profiles, users } from '@/db/schema';
import { AuthError, json } from '@/lib/auth/server';
import { profileCategories } from './profile-validation';

export function marketplaceFailure(error: unknown) {
  if (error instanceof AuthError) return json({ error: error.message }, error.status);
  console.error('Marketplace request failed. Check the database configuration and migrations.');
  return json({ error: 'Unable to load or save your changes. Please try again.' }, 503);
}

export async function ownProfile(user: { id: string; name: string }) {
  const [profile] = await getDb().select().from(profiles).where(eq(profiles.userId, user.id)).limit(1);
  return profile ?? {
    userId: user.id, name: user.name, bio: '', category: '', location: '', website: '',
    imageUrl: '', handle: '', socialAccounts: [], startingRate: null, published: false, updatedAt: null,
  };
}

export async function ownBrands(userId: string) {
  return getDb().select().from(brands).where(eq(brands.ownerId, userId)).orderBy(desc(brands.createdAt), asc(brands.id));
}

// Explicit public projections: account emails, session data and owner IDs stay private.
export const publicCreatorFields = {
  id: profiles.userId, name: profiles.name, bio: profiles.bio, category: profiles.category,
  location: profiles.location, website: profiles.website, imageUrl: profiles.imageUrl,
  handle: profiles.handle, socialAccounts: profiles.socialAccounts, startingRate: profiles.startingRate,
};
export const publicBrandFields = {
  id: brands.id, name: brands.name, tagline: brands.tagline, description: brands.description,
  category: brands.category, location: brands.location, website: brands.website,
  imageUrl: brands.imageUrl, companyName: users.name,
};

export async function publicCreator(id: string) {
  const [record] = await getDb().select(publicCreatorFields).from(profiles).innerJoin(users, eq(users.id, profiles.userId))
    .where(and(eq(profiles.userId, id), eq(profiles.published, true), eq(users.role, 'creator'))).limit(1);
  return record;
}

export async function publicBrand(id: string) {
  const [record] = await getDb().select(publicBrandFields).from(brands).innerJoin(users, eq(users.id, brands.ownerId))
    .where(and(eq(brands.id, id), eq(brands.published, true), eq(users.role, 'company'))).limit(1);
  return record;
}

export function exploreFilters(input: Record<string, string | string[] | undefined>) {
  const value = (key: string) => typeof input[key] === 'string' ? input[key] as string : '';
  const kind = value('kind') === 'brands' ? 'brands' : 'creators';
  const category = profileCategories.includes(value('category')) ? value('category') : '';
  const sort = ['newest', 'name', 'rate-low'].includes(value('sort')) ? value('sort') : 'newest';
  const page = /^\d+$/.test(value('page')) ? Math.min(10000, Math.max(1, Number(value('page')))) : 1;
  return { kind, category, sort: kind === 'brands' && sort === 'rate-low' ? 'newest' : sort, q: value('q').trim().slice(0, 100), page };
}

export async function explore(input: Record<string, string | string[] | undefined>) {
  const filters = exploreFilters(input);
  const { kind, category, sort, q } = filters;
  const db = getDb();
  const pageSize = 12;
  if (kind === 'creators') {
    const where = and(eq(profiles.published, true), eq(users.role, 'creator'), category ? eq(profiles.category, category) : undefined,
      q ? or(sql`instr(lower(${profiles.name}), lower(${q})) > 0`, sql`instr(lower(${profiles.bio}), lower(${q})) > 0`, sql`instr(lower(${profiles.location}), lower(${q})) > 0`, sql`instr(lower(${profiles.handle}), lower(${q})) > 0`,
        sql`exists (select 1 from json_each(${profiles.socialAccounts}) as social where instr(lower(json_extract(social.value, '$.handle')), lower(${q})) > 0 or instr(lower(json_extract(social.value, '$.platform')), lower(${q})) > 0)`) : undefined);
    const [{ total }] = await db.select({ total: count() }).from(profiles).innerJoin(users, eq(users.id, profiles.userId)).where(where);
    const page = Math.min(filters.page, Math.max(1, Math.ceil(total / pageSize)));
    const order = sort === 'name' ? [asc(profiles.name), asc(profiles.userId)] : sort === 'rate-low'
      ? [sql`${profiles.startingRate} is null`, asc(profiles.startingRate), asc(profiles.userId)]
      : [desc(profiles.updatedAt), asc(profiles.userId)];
    const items = await db.select(publicCreatorFields).from(profiles).innerJoin(users, eq(users.id, profiles.userId)).where(where)
      .orderBy(...order).limit(pageSize).offset((page - 1) * pageSize);
    return { ...filters, page, pageSize, total, items };
  }
  const where = and(eq(brands.published, true), eq(users.role, 'company'), category ? eq(brands.category, category) : undefined,
    q ? or(sql`instr(lower(${brands.name}), lower(${q})) > 0`, sql`instr(lower(${brands.description}), lower(${q})) > 0`, sql`instr(lower(${brands.tagline}), lower(${q})) > 0`, sql`instr(lower(${brands.location}), lower(${q})) > 0`) : undefined);
  const [{ total }] = await db.select({ total: count() }).from(brands).innerJoin(users, eq(users.id, brands.ownerId)).where(where);
  const page = Math.min(filters.page, Math.max(1, Math.ceil(total / pageSize)));
  const order = sort === 'name' ? [asc(brands.name), asc(brands.id)] : [desc(brands.updatedAt), asc(brands.id)];
  const items = await db.select(publicBrandFields).from(brands).innerJoin(users, eq(users.id, brands.ownerId)).where(where)
    .orderBy(...order).limit(pageSize).offset((page - 1) * pageSize);
  return { ...filters, page, pageSize, total, items };
}
