import { authenticate } from '@/lib/auth/server';
export const POST = (request: Request) => authenticate(request, true);
