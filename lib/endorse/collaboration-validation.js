import { z } from 'zod';

const note = z.string().trim().min(1, 'Please enter a message.').max(4000, 'Keep messages under 4,000 characters.');
export const startSchema = z.object({ brandId: z.string().uuid(), creatorId: z.string().uuid().optional(), message: note, clientId: z.string().uuid() });
export const messageSchema = z.object({ message: note, clientId: z.string().uuid() });
export const termsSchema = z.object({
  title: z.string().trim().min(3).max(120),
  scope: z.string().trim().min(20, 'Describe the deliverables in at least 20 characters.').max(4000),
  usageRights: z.string().trim().min(3, 'Include usage rights and any exclusivity terms.').max(2000),
  revisions: z.number().int().min(0).max(50),
  milestones: z.array(z.object({
    title: z.string().trim().min(3).max(200),
    amount: z.number().int().min(100, 'Each milestone must be at least $1.').max(100000000),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a due date.').refine(value => {
      const date = new Date(`${value}T00:00:00Z`);
      return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
    }, 'Choose a valid date.'),
  })).min(1).max(12),
}).refine(value => value.milestones.every((item, i) => i === 0 || item.dueDate >= value.milestones[i - 1].dueDate), 'Milestones must be ordered by due date.');
export const actionSchema = z.object({
  action: z.enum(['offer', 'withdraw', 'accept', 'decline', 'submit', 'revise', 'approve', 'cancel', 'request-cancel', 'approve-cancel', 'reject-cancel']),
  version: z.number().int().min(0),
  terms: termsSchema.optional(),
  note: note.optional(),
  url: z.string().trim().url().max(2000).refine(value => new URL(value).protocol === 'https:', 'Use an HTTPS delivery link.').optional(),
});
export const reviewSchema = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().trim().min(10, 'Please write at least 10 characters.').max(2000) });

export const statusLabels = { discussion: 'Discussion', offer: 'Offer pending', active: 'In progress', submitted: 'In review', completed: 'Completed', cancelled: 'Cancelled' };
export const reviewWindow = 14 * 24 * 60 * 60;

export function allowedActions(room, userId) {
  if (![room.companyId, room.creatorId].includes(userId) || ['completed', 'cancelled'].includes(room.status)) return [];
  if (room.cancellationBy) return room.cancellationBy === userId ? [] : ['approve-cancel', 'reject-cancel'];
  const company = room.companyId === userId;
  if (room.status === 'discussion') return company ? ['offer', 'cancel'] : ['cancel'];
  if (room.status === 'offer') return company ? ['withdraw', 'cancel'] : ['accept', 'decline', 'cancel'];
  if (room.status === 'active') return company ? ['request-cancel'] : ['submit', 'request-cancel'];
  if (room.status === 'submitted') return company ? ['approve', 'revise', 'request-cancel'] : ['request-cancel'];
  return [];
}
