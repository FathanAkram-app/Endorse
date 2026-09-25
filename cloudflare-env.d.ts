declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    JWT_SECRET?: string;
    COLLABORATION_ROOMS?: DurableObjectNamespace<import('./worker/collaboration-room').CollaborationRoom>;
  }
}
