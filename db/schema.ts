import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: text('role', { enum: ['creator', 'company'] }).notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => [check('users_role_check', sql`${table.role} in ('creator', 'company')`)]);

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at').notNull(),
}, (table) => [index('sessions_user_idx').on(table.userId), index('sessions_expiry_idx').on(table.expiresAt)]);

export const authAttempts = sqliteTable('auth_attempts', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  expiresAt: integer('expires_at').notNull(),
}, (table) => [index('auth_attempts_expiry_idx').on(table.expiresAt)]);

export const profiles = sqliteTable('profiles', {
  userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  bio: text('bio').notNull().default(''),
  category: text('category').notNull().default(''),
  location: text('location').notNull().default(''),
  website: text('website').notNull().default(''),
  imageUrl: text('image_url').notNull().default(''),
  handle: text('handle').notNull().default(''),
  socialAccounts: text('social_accounts', { mode: 'json' }).$type<{ platform: string; handle: string; url: string }[]>().notNull().default(sql`'[]'`),
  startingRate: integer('starting_rate'),
  published: integer('published', { mode: 'boolean' }).notNull().default(false),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [
  index('profiles_published_category_idx').on(table.published, table.category),
  check('profiles_rate_check', sql`${table.startingRate} is null or ${table.startingRate} >= 0`),
]);

export const brands = sqliteTable('brands', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  tagline: text('tagline').notNull().default(''),
  description: text('description').notNull().default(''),
  category: text('category').notNull().default(''),
  location: text('location').notNull().default(''),
  website: text('website').notNull().default(''),
  imageUrl: text('image_url').notNull().default(''),
  published: integer('published', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [
  index('brands_owner_idx').on(table.ownerId),
  index('brands_published_category_idx').on(table.published, table.category),
]);

export type ContractTerms = {
  title: string; scope: string; usageRights: string; revisions: number;
  milestones: { title: string; amount: number; dueDate: string }[];
};

export const collaborations = sqliteTable('collaborations', {
  id: text('id').primaryKey(),
  brandId: text('brand_id').notNull().references(() => brands.id),
  brandName: text('brand_name').notNull(),
  companyId: text('company_id').notNull().references(() => users.id),
  creatorId: text('creator_id').notNull().references(() => users.id),
  status: text('status', { enum: ['discussion', 'offer', 'active', 'submitted', 'completed', 'cancelled'] }).notNull().default('discussion'),
  terms: text('terms', { mode: 'json' }).$type<ContractTerms>(),
  milestone: integer('milestone').notNull().default(0),
  submission: text('submission', { mode: 'json' }).$type<{ note: string; url: string }>(),
  cancellationBy: text('cancellation_by'),
  acceptedAt: integer('accepted_at'),
  completedAt: integer('completed_at'),
  version: integer('version').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [
  index('collaborations_company_idx').on(table.companyId, table.updatedAt),
  index('collaborations_creator_idx').on(table.creatorId, table.updatedAt),
  check('collaborations_status_check', sql`${table.status} in ('discussion', 'offer', 'active', 'submitted', 'completed', 'cancelled')`),
  check('collaborations_participants_check', sql`${table.companyId} != ${table.creatorId}`),
]);

export const collaborationMessages = sqliteTable('collaboration_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  collaborationId: text('collaboration_id').notNull().references(() => collaborations.id, { onDelete: 'cascade' }),
  senderId: text('sender_id').notNull().references(() => users.id),
  kind: text('kind', { enum: ['message', 'event'] }).notNull(),
  body: text('body').notNull(),
  createdAt: integer('created_at').notNull(),
  clientId: text('client_id').notNull(),
}, (table) => [
  index('collaboration_messages_room_idx').on(table.collaborationId, table.id),
  uniqueIndex('collaboration_messages_nonce_idx').on(table.senderId, table.clientId),
]);

export const collaborationReviews = sqliteTable('collaboration_reviews', {
  id: text('id').primaryKey(),
  collaborationId: text('collaboration_id').notNull().references(() => collaborations.id, { onDelete: 'cascade' }),
  reviewerId: text('reviewer_id').notNull().references(() => users.id),
  rating: integer('rating').notNull(),
  comment: text('comment').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => [
  uniqueIndex('collaboration_reviews_author_idx').on(table.collaborationId, table.reviewerId),
  check('collaboration_reviews_rating_check', sql`${table.rating} between 1 and 5`),
]);
