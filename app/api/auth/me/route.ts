import { failure, json, requireSession } from '@/lib/auth/server';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try { return json({ user: (await requireSession(request.headers)).user }); }
  catch (error) { return failure(error); }
}
