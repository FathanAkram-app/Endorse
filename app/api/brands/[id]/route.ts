import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { brands } from '@/db/schema';
import { assertSameOrigin, AuthError, json, readBody, requireSession } from '@/lib/auth/server';
import { marketplaceFailure } from '@/lib/endorse/marketplace';
import { brandSchema } from '@/lib/endorse/profile-validation';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const body = await readBody(request);
    assertSameOrigin(request);
    const { user } = await requireSession(request.headers, 'company');
    const { id } = await context.params;
    const result = brandSchema.safeParse(body);
    if (!result.success) throw new AuthError(400, result.error.issues[0].message);
    const [brand] = await getDb().update(brands).set({ ...result.data, updatedAt: Math.floor(Date.now() / 1000) })
      .where(and(eq(brands.id, id), eq(brands.ownerId, user.id))).returning();
    if (!brand) throw new AuthError(404, 'Brand not found.');
    return json({ brand });
  } catch (error) { return marketplaceFailure(error); }
}
