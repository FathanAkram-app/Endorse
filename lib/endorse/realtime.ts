import { env } from 'cloudflare:workers';

// Only a server-side binding can reach this endpoint; the public Worker never forwards it.
export async function publishCollaboration(id: string) {
  if (!env.COLLABORATION_ROOMS) return;
  try {
    const response = await env.COLLABORATION_ROOMS.getByName(id).fetch(`https://collaboration.internal/notify/${id}`, { method: 'POST' });
    if (!response.ok) throw new Error('Notification failed');
  } catch {
    // The D1 write is already committed. Do not report it as failed or encourage duplicate work.
    console.error('Collaboration saved but live notification failed. Reconnecting will recover current state.');
  }
}
