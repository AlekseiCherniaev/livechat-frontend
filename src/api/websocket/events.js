export class WebSocketEventHandler {
  constructor() {
    this.handlers = new Map();
  }

  on(eventType, handler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType).add(handler);
    return () => this.off(eventType, handler);
  }

  off(eventType, handler) {
    if (this.handlers.has(eventType)) {
      this.handlers.get(eventType).delete(handler);
    }
  }

  emit(eventType, data) {
    if (this.handlers.has(eventType)) {
      this.handlers.get(eventType).forEach((handler) => handler(data));
    }
  }

  removeAllListeners() {
    this.handlers.clear();
  }
}
