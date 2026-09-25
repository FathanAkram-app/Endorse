import { failure, json, requireSession } from '@/lib/auth/server';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, context: { params: Promise<{ role: string }> }) {
  const { role } = await context.params;
  if (role !== 'creator' && role !== 'company') return json({ error: 'Account type not found.' }, 404);
  try { return json({ user: (await requireSession(request.headers, role)).user }); }
  catch (error) { return failure(error); }
}
