// Browser transport. Persistence, authorization, and workflow validation remain on the server.
export class CollaborationSocket {
  constructor({ url, cursor, onState, onStatus, onError, checkAccess, WebSocketClass = globalThis.WebSocket }) {
    Object.assign(this, { url, cursor, onState, onStatus, onError, checkAccess, WebSocketClass });
    this.pending = new Map();
    this.attempt = 0;
    this.stopped = false;
    this.ready = false;
  }

  connect() {
    if (this.stopped) return;
    clearTimeout(this.retryTimer);
    const url = new URL(this.url);
    if (this.cursor()) url.searchParams.set('after', String(this.cursor()));
    this.onStatus(this.attempt ? 'reconnecting' : 'connecting');
    const socket = new this.WebSocketClass(url);
    let opened = false;
    this.socket = socket;
    this.ready = false;
    this.lastReceived = Date.now();
    this.openTimer = setTimeout(() => {
      if (socket === this.socket && !this.ready) this.reconnect();
    }, 15000);
    socket.onopen = () => {
      if (socket !== this.socket || this.stopped) return;
      opened = true;
      socket.send(JSON.stringify({ type: 'sync' }));
      this.heartbeat = setInterval(() => {
        if (Date.now() - this.lastReceived > 60000) { this.reconnect(); return; }
        if (socket.readyState === 1) socket.send(JSON.stringify({ type: 'ping' }));
      }, 25000);
    };
    socket.onmessage = event => {
      if (socket !== this.socket || this.stopped) return;
      this.lastReceived = Date.now();
      let packet;
      try { packet = JSON.parse(event.data); } catch { this.reconnect(); return; }
      if (packet.type === 'state') {
        this.onState(packet.data);
        if (!packet.data.hasNewer) {
          this.ready = true; this.attempt = 0;
          clearTimeout(this.openTimer); this.onStatus('live');
        }
      } else if (packet.type === 'catchup') socket.send(JSON.stringify({ type: 'sync' }));
      else if (packet.type === 'ack' || packet.type === 'error') {
        const pending = this.pending.get(packet.id);
        if (pending) {
          clearTimeout(pending.timer); this.pending.delete(packet.id);
          if (packet.type === 'ack') pending.resolve();
          else pending.reject(new Error(packet.error));
        } else if (packet.type === 'error') this.onError(packet.error);
      }
    };
    socket.onerror = () => { /* Close triggers reconnection; browsers deliberately hide handshake details. */ };
    socket.onclose = async event => {
      if (socket !== this.socket || this.stopped) return;
      this.clearConnection();
      if (event.code === 4401 || event.code === 4403) {
        this.stopped = true; this.onStatus('ended'); return;
      }
      this.onStatus('reconnecting');
      // Browsers hide failed-upgrade status codes. Diagnose access only on a failed handshake.
      if (!opened && this.checkAccess) {
        try {
          const status = await this.checkAccess();
          if (socket !== this.socket || this.stopped) return;
          if ([401, 403, 404].includes(status)) { this.stopped = true; this.onStatus('ended'); return; }
        } catch { /* Offline: keep the reconnect backoff. */ }
      }
      if (socket !== this.socket || this.stopped) return;
      const delay = Math.min(15000, 500 * 2 ** Math.min(this.attempt++, 5)) + Math.random() * 300;
      this.retryTimer = setTimeout(() => this.connect(), delay);
    };
  }

  clearConnection() {
    clearTimeout(this.openTimer); clearInterval(this.heartbeat);
    this.ready = false;
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error('Connection interrupted. Check the latest conversation before retrying; your changes may already be saved.'));
    }
    this.pending.clear();
  }

  reconnect() {
    if (this.stopped) return;
    const previous = this.socket;
    this.socket = null;
    this.clearConnection();
    if (previous) previous.close();
    this.attempt = Math.max(1, this.attempt);
    this.connect();
  }

  sync() {
    if (this.socket?.readyState === 1) this.socket.send(JSON.stringify({ type: 'sync' }));
    else this.reconnect();
  }

  command(kind, payload) {
    if (!this.ready || this.socket?.readyState !== 1) return Promise.reject(new Error('Wait for the live connection before sending. Your input is preserved.'));
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.reconnect(), 15000);
      this.pending.set(id, { resolve, reject, timer });
      try { this.socket.send(JSON.stringify({ type: 'command', id, kind, payload })); }
      catch { this.reconnect(); }
    });
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.retryTimer); this.clearConnection();
    const previous = this.socket; this.socket = null;
    if (previous) previous.close();
  }
}
