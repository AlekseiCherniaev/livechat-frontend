import { WebSocketMessageTypes } from './constants';
import { WebSocketEventHandler } from './events';

class WebSocketClient {
  constructor() {
    this.socket = null;
    this.eventHandler = new WebSocketEventHandler();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.pingInterval = null;
    this.isConnected = false;
    this.currentRoomId = null;
  }

  connect(roomId) {
    if (this.socket && this.isConnected && this.currentRoomId === roomId) {
      return;
    }

    this.disconnect();
    this.currentRoomId = roomId;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//localhost:8000/api/ws/stream?room_id=${roomId}`;

    const cva = 21;
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.startPingInterval();
      this.eventHandler.emit('connected', { roomId });
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'PING') {
          this.sendPong();
          return;
        }

        if (data.event_type) {
          this.eventHandler.emit(data.event_type, data.payload);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.socket.onclose = (event) => {
      this.isConnected = false;
      this.stopPingInterval();
      this.eventHandler.emit('disconnected', {
        roomId: this.currentRoomId,
        code: event.code,
        reason: event.reason,
      });

      if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.attemptReconnect();
      }
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.eventHandler.emit('error', { error, roomId: this.currentRoomId });
    };
  }

  sendTypingIndicator(isTyping, username) {
    this.sendMessage({
      type: WebSocketMessageTypes.USER_TYPING,
      is_typing: isTyping,
      username: username,
    });
  }

  sendPong() {
    this.sendMessage({
      type: WebSocketMessageTypes.PONG,
    });
  }

  sendMessage(message) {
    if (this.socket && this.isConnected) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  }

  startPingInterval() {
    this.stopPingInterval();
    this.pingInterval = setInterval(() => {
      if (this.socket && this.isConnected) {
      }
    }, 25000);
  }

  stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);

    setTimeout(() => {
      if (this.currentRoomId) {
        this.reconnectAttempts++;
        this.connect(this.currentRoomId);
      }
    }, delay);
  }

  disconnect() {
    this.stopPingInterval();

    if (this.socket) {
      this.socket.close(1000, 'Manual disconnect');
      this.socket = null;
    }

    this.isConnected = false;
    this.currentRoomId = null;
    this.reconnectAttempts = 0;
  }

  on(eventType, handler) {
    return this.eventHandler.on(eventType, handler);
  }

  off(eventType, handler) {
    this.eventHandler.off(eventType, handler);
  }
}

export const webSocketClient = new WebSocketClient();
