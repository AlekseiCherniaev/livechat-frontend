import { useEffect, useRef, useCallback, useState } from 'react';
import { webSocketClient } from './index';
import { webSocketApi } from './http';
import { WebSocketEventTypes } from './constants';

export const useWebSocket = (roomId, options = {}) => {
  const {
    onMessage,
    onMessageEdited,
    onMessageDeleted,
    onUserTyping,
    onUserJoined,
    onUserLeft,
    onUserOnline,
    onUserOffline,
    onConnected,
    onDisconnected,
    onError,
    autoConnect = true,
  } = options;

  const handlersRef = useRef({
    onMessage,
    onMessageEdited,
    onMessageDeleted,
    onUserTyping,
    onUserJoined,
    onUserLeft,
    onUserOnline,
    onUserOffline,
    onConnected,
    onDisconnected,
    onError,
  });

  const [activeUsers, setActiveUsers] = useState(new Set());
  const [isLoadingActiveUsers, setIsLoadingActiveUsers] = useState(false);

  useEffect(() => {
    handlersRef.current = {
      onMessage,
      onMessageEdited,
      onMessageDeleted,
      onUserTyping,
      onUserJoined,
      onUserLeft,
      onUserOnline,
      onUserOffline,
      onConnected,
      onDisconnected,
      onError,
    };
  });

  useEffect(() => {
    if (!roomId || !autoConnect) return;

    const unsubscribeCallbacks = [];

    const handleUserOnline = (data) => {
      setActiveUsers((prev) => new Set([...prev, data.user_id]));
      handlersRef.current.onUserOnline?.(data);
    };

    const handleUserOffline = (data) => {
      setActiveUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(data.user_id);
        return newSet;
      });
      handlersRef.current.onUserOffline?.(data);
    };

    const handleUserJoined = (data) => {
      setActiveUsers((prev) => new Set([...prev, data.user_id]));
      handlersRef.current.onUserJoined?.(data);
    };

    const handleUserLeft = (data) => {
      setActiveUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(data.user_id);
        return newSet;
      });
      handlersRef.current.onUserLeft?.(data);
    };

    unsubscribeCallbacks.push(
      webSocketClient.on(WebSocketEventTypes.ROOM_USER_ONLINE, handleUserOnline),
      webSocketClient.on(WebSocketEventTypes.ROOM_USER_OFFLINE, handleUserOffline),
      webSocketClient.on(WebSocketEventTypes.USER_JOINED, handleUserJoined),
      webSocketClient.on(WebSocketEventTypes.USER_LEFT, handleUserLeft),
    );

    if (handlersRef.current.onMessage) {
      unsubscribeCallbacks.push(
        webSocketClient.on(WebSocketEventTypes.MESSAGE_CREATED, handlersRef.current.onMessage),
      );
    }

    if (handlersRef.current.onMessageEdited) {
      unsubscribeCallbacks.push(
        webSocketClient.on(WebSocketEventTypes.MESSAGE_EDITED, handlersRef.current.onMessageEdited),
      );
    }

    if (handlersRef.current.onMessageDeleted) {
      unsubscribeCallbacks.push(
        webSocketClient.on(
          WebSocketEventTypes.MESSAGE_DELETED,
          handlersRef.current.onMessageDeleted,
        ),
      );
    }

    if (handlersRef.current.onUserTyping) {
      unsubscribeCallbacks.push(
        webSocketClient.on(WebSocketEventTypes.USER_TYPING, handlersRef.current.onUserTyping),
      );
    }

    if (handlersRef.current.onUserJoined) {
      unsubscribeCallbacks.push(
        webSocketClient.on(WebSocketEventTypes.USER_JOINED, handlersRef.current.onUserJoined),
      );
    }

    if (handlersRef.current.onUserLeft) {
      unsubscribeCallbacks.push(
        webSocketClient.on(WebSocketEventTypes.USER_LEFT, handlersRef.current.onUserLeft),
      );
    }

    if (handlersRef.current.onUserOnline) {
      unsubscribeCallbacks.push(
        webSocketClient.on(WebSocketEventTypes.ROOM_USER_ONLINE, handlersRef.current.onUserOnline),
      );
    }

    if (handlersRef.current.onUserOffline) {
      unsubscribeCallbacks.push(
        webSocketClient.on(
          WebSocketEventTypes.ROOM_USER_OFFLINE,
          handlersRef.current.onUserOffline,
        ),
      );
    }

    if (handlersRef.current.onConnected) {
      unsubscribeCallbacks.push(webSocketClient.on('connected', handlersRef.current.onConnected));
    }

    if (handlersRef.current.onDisconnected) {
      unsubscribeCallbacks.push(
        webSocketClient.on('disconnected', handlersRef.current.onDisconnected),
      );
    }

    if (handlersRef.current.onError) {
      unsubscribeCallbacks.push(webSocketClient.on('error', handlersRef.current.onError));
    }

    const handleConnected = async () => {
      try {
        setIsLoadingActiveUsers(true);
        const response = await webSocketApi.getActiveUsers(roomId);
        setActiveUsers(new Set(response.data));
      } catch (error) {
        console.error('Failed to load active users:', error);
      } finally {
        setIsLoadingActiveUsers(false);
      }
      handlersRef.current.onConnected?.();
    };

    unsubscribeCallbacks.push(webSocketClient.on('connected', handleConnected));

    webSocketClient.connect(roomId);

    return () => {
      unsubscribeCallbacks.forEach((unsubscribe) => unsubscribe());
      setActiveUsers(new Set());
    };
  }, [roomId, autoConnect]);

  const refreshActiveUsers = useCallback(async () => {
    if (!roomId) return;

    try {
      setIsLoadingActiveUsers(true);
      const response = await webSocketApi.getActiveUsers(roomId);
      setActiveUsers(new Set(response.data));
      return response.data;
    } catch (error) {
      console.error('Failed to refresh active users:', error);
      throw error;
    } finally {
      setIsLoadingActiveUsers(false);
    }
  }, [roomId]);

  const disconnectUser = useCallback(
    async (targetUserId) => {
      if (!roomId) return;

      try {
        await webSocketApi.disconnectUser(roomId, targetUserId);
        await refreshActiveUsers();
      } catch (error) {
        console.error('Failed to disconnect user:', error);
        throw error;
      }
    },
    [roomId, refreshActiveUsers],
  );

  const sendTypingIndicator = useCallback((isTyping, username) => {
    webSocketClient.sendTypingIndicator(isTyping, username);
  }, []);

  const disconnect = useCallback(() => {
    webSocketClient.disconnect();
    setActiveUsers(new Set());
  }, []);

  return {
    isConnected: webSocketClient.isConnected,
    activeUsers: Array.from(activeUsers),
    isLoadingActiveUsers,
    sendTypingIndicator,
    disconnect,
    refreshActiveUsers,
    disconnectUser,
  };
};

export const useRoomWebSocketManagement = (roomId) => {
  const [activeUsers, setActiveUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadActiveUsers = useCallback(async () => {
    if (!roomId) return;

    try {
      setIsLoading(true);
      const response = await webSocketApi.getActiveUsers(roomId);
      setActiveUsers(response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to load active users:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  const forceDisconnectUser = useCallback(
    async (targetUserId) => {
      if (!roomId) return;

      try {
        await webSocketApi.disconnectUser(roomId, targetUserId);
        await loadActiveUsers();
      } catch (error) {
        console.error('Failed to force disconnect user:', error);
        throw error;
      }
    },
    [roomId, loadActiveUsers],
  );

  return {
    activeUsers,
    isLoading,
    loadActiveUsers,
    forceDisconnectUser,
  };
};
