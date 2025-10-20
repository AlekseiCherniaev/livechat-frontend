import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { webSocketClient } from '../api/websocket/websocket-client';
import { webSocketApi } from '../api/websocket/http';
import { WebSocketEventTypes } from '../api/websocket/constants';

const WebSocketContext = createContext();

export const WebSocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [globalActiveUsers, setGlobalActiveUsers] = useState(new Map());

  const forceDisconnectUser = useCallback(async (roomId, targetUserId) => {
    try {
      await webSocketApi.disconnectUser(roomId, targetUserId);
    } catch (error) {
      console.error('Failed to force disconnect user:', error);
      throw error;
    }
  }, []);

  useEffect(() => {
    const handleUserOnline = (data) => {
      setGlobalActiveUsers((prev) => {
        const newMap = new Map(prev);
        const roomUsers = newMap.get(data.room_id) || new Set();
        roomUsers.add(data.user_id);
        newMap.set(data.room_id, roomUsers);
        return newMap;
      });
    };

    const handleUserOffline = (data) => {
      setGlobalActiveUsers((prev) => {
        const newMap = new Map(prev);
        const roomUsers = newMap.get(data.room_id);
        if (roomUsers) {
          roomUsers.delete(data.user_id);
          newMap.set(data.room_id, roomUsers);
        }
        return newMap;
      });
    };

    const unsubOnline = webSocketClient.on(WebSocketEventTypes.ROOM_USER_ONLINE, handleUserOnline);
    const unsubOffline = webSocketClient.on(
      WebSocketEventTypes.ROOM_USER_OFFLINE,
      handleUserOffline,
    );

    return () => {
      unsubOnline();
      unsubOffline();
    };
  }, []);

  useEffect(() => {
    const handleConnected = () => setConnectionStatus('connected');
    const handleDisconnected = () => setConnectionStatus('disconnected');
    const handleError = () => setConnectionStatus('error');

    const unsubConnected = webSocketClient.on('connected', handleConnected);
    const unsubDisconnected = webSocketClient.on('disconnected', handleDisconnected);
    const unsubError = webSocketClient.on('error', handleError);

    return () => {
      unsubConnected();
      unsubDisconnected();
      unsubError();
      webSocketClient.disconnect();
    };
  }, []);

  const connectToRoom = (roomId) => {
    if (activeRoomId === roomId && connectionStatus === 'connected') {
      return;
    }

    setActiveRoomId(roomId);
    webSocketClient.connect(roomId);
  };

  const disconnectFromRoom = () => {
    setActiveRoomId(null);
    webSocketClient.disconnect();
  };

  const value = {
    activeRoomId,
    connectionStatus,
    globalActiveUsers,
    connectToRoom,
    disconnectFromRoom,
    forceDisconnectUser,
    webSocketClient,
  };

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider');
  }
  return context;
};
