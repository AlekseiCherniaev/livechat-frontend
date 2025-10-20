import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { roomsApi } from '../api/rooms';
import { messagesApi } from '../api/messages';
import { useAuth } from '../context/AuthContext';
import { useWebSocket, webSocketApi } from '../api/websocket';

export default function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [room, setRoom] = useState(null);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editedMessage, setEditedMessage] = useState('');
  const [editRoomMode, setEditRoomMode] = useState(false);
  const [roomForm, setRoomForm] = useState({ description: '', is_public: true });
  const [joinRequests, setJoinRequests] = useState([]);
  const [showJoinRequests, setShowJoinRequests] = useState(false);
  const messagesEndRef = useRef(null);

  const [onlineUsers, setOnlineUsers] = useState(new Set([user?.id]));

  const loadUsers = async () => {
    try {
      const usersRes = await roomsApi.getUsers(roomId);
      setUsers(usersRes.data || []);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const loadOnlineUsers = async () => {
    try {
      const response = await webSocketApi.getActiveUsers(roomId);
      const onlineUsersSet = new Set(response.data);
      onlineUsersSet.add(user?.id);
      setOnlineUsers(onlineUsersSet);
    } catch (err) {
      console.error('Error loading online users:', err);
      setOnlineUsers(new Set([user?.id]));
    }
  };

  useWebSocket(roomId, {
    onMessage: (data) => {
      setMessages((prev) => {
        const newMsg = {
          id: data.message_id,
          content: data.message,
          user_id: data.user_id,
          username: data.username || 'Unknown',
          created_at: new Date().toISOString(),
          edited: false,
        };

        if (prev.some((msg) => msg.id === data.message_id)) {
          return prev;
        }

        return [...prev, newMsg];
      });
      scrollToBottom();
    },

    onMessageEdited: (data) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.message_id ? { ...msg, content: data.message, edited: true } : msg,
        ),
      );
    },

    onMessageDeleted: (data) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== data.message_id));
    },

    onUserJoined: async (data) => {
      if (data.room_id === roomId) {
        await loadUsers();
        if (data.user_id !== user?.id) {
          setOnlineUsers((prev) => new Set([...prev, data.user_id]));
        }
      }
    },

    onUserLeft: async (data) => {
      if (data.room_id === roomId) {
        await loadUsers();
        if (data.user_id !== user?.id) {
          setOnlineUsers((prev) => {
            const newSet = new Set(prev);
            newSet.delete(data.user_id);
            return newSet;
          });
        }
      }
    },

    onUserOnline: (data) => {
      if (data.room_id === roomId && data.user_id !== user?.id) {
        setOnlineUsers((prev) => new Set([...prev, data.user_id]));
      }
    },

    onUserOffline: (data) => {
      if (data.room_id === roomId && data.user_id !== user?.id) {
        setOnlineUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(data.user_id);
          return newSet;
        });
      }
    },

    onConnected: async () => {
      await loadUsers();
      await loadOnlineUsers();
    },

    onError: (error) => {
      console.error('WebSocket error:', error);
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchRoomData = async () => {
    try {
      const roomRes = await roomsApi.getById(roomId);
      setRoom(roomRes.data);
      setRoomForm({
        description: roomRes.data?.description || '',
        is_public: roomRes.data?.is_public ?? true,
      });

      await loadUsers();
      await loadOnlineUsers();

      const messagesRes = await messagesApi.getRecentMessages(roomId);
      const sortedMessages =
        messagesRes.data?.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)) || [];
      setMessages(sortedMessages);
    } catch (err) {
      console.error(err);
      alert('Ошибка загрузки комнаты');
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  const fetchJoinRequests = async () => {
    if (!room) return;
    try {
      const res = await roomsApi.getJoinRequestsByRoom(room.id);
      setJoinRequests(res.data || []);
      setShowJoinRequests(true);
    } catch (err) {
      alert(err.customMessage || 'Ошибка загрузки запросов');
    }
  };

  const handleJoinRequestAction = async (requestId, accept) => {
    try {
      await roomsApi.handleJoinRequest(requestId, accept);
      setJoinRequests((prev) => prev.filter((r) => r.id !== requestId));
      if (accept) {
        await loadUsers();
      }
    } catch (err) {
      alert(err.customMessage || 'Ошибка обработки запроса');
    }
  };

  useEffect(() => {
    fetchRoomData();
  }, [roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleRoomFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setRoomForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSaveRoom = async () => {
    if (!room) return;
    try {
      await roomsApi.update(room.id, {
        description: roomForm.description,
        is_public: roomForm.is_public,
      });
      setEditRoomMode(false);
      fetchRoomData();
    } catch (err) {
      alert(err.customMessage || 'Ошибка редактирования комнаты');
    }
  };

  const handleDeleteRoom = () => {
    if (!room) return;
    if (!confirm('Удалить комнату?')) return;
    roomsApi
      .delete(room.id)
      .then(() => {
        alert('Комната удалена');
        navigate('/me');
      })
      .catch((err) => alert(err.customMessage || 'Ошибка удаления комнаты'));
  };

  const handleSendMessage = async () => {
    if (!room || !newMessage.trim()) return;

    try {
      await messagesApi.sendMessage(room.id, { content: newMessage });
      setNewMessage('');
    } catch (err) {
      alert(err.customMessage || 'Ошибка отправки сообщения');
    }
  };

  const handleEditMessage = async (messageId) => {
    if (!editedMessage.trim()) return;
    try {
      await messagesApi.editMessage(messageId, { new_content: editedMessage });
      setEditingMessageId(null);
      setEditedMessage('');
    } catch (err) {
      alert(err.customMessage || 'Ошибка редактирования сообщения');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!confirm('Удалить сообщение?')) return;
    try {
      await messagesApi.deleteMessage(messageId);
    } catch (err) {
      alert(err.customMessage || 'Ошибка удаления сообщения');
    }
  };

  const handleRemoveUser = async (userId) => {
    if (!room) return;
    if (!confirm('Удалить пользователя из комнаты?')) return;
    try {
      await roomsApi.removeUser(room.id, userId);
      await webSocketApi.disconnectUser(room.id, userId);
      await loadUsers();

      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    } catch (err) {
      alert(err.customMessage || 'Ошибка при удалении пользователя');
    }
  };

  const handleLeaveRoom = async () => {
    if (!room) return;
    if (!confirm('Покинуть комнату?')) return;
    try {
      await roomsApi.leaveRoom(room.id);
      alert('Вы покинули комнату');
      navigate('/me');
    } catch (err) {
      alert(err.customMessage || 'Ошибка при выходе из комнаты');
    }
  };

  const isUserOnline = (userId) => {
    if (userId === user?.id) return true;
    return onlineUsers.has(userId);
  };

  if (loading) return <div className="text-center mt-10 text-gray-500">Загрузка...</div>;
  if (!room) return <div className="text-center mt-10 text-red-500">Комната не найдена</div>;

  const isOwner = room?.created_by === user?.id;

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex flex-col">
      <div className="mb-2">
        <button
          onClick={() => navigate('/me')}
          className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600 text-sm"
        >
          Все комнаты
        </button>
      </div>

      <header className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">
          Комната {room?.name} ({room?.is_public ? 'Публичная' : 'Приватная'})
        </h1>
      </header>

      <div className="mb-4 text-gray-600">{room?.description || 'Без описания'}</div>

      <div className="mb-4 flex gap-2">
        {isOwner ? (
          <>
            <button
              onClick={() => setEditRoomMode(true)}
              className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
            >
              Редактировать комнату
            </button>
            <button
              onClick={handleDeleteRoom}
              className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
            >
              Удалить комнату
            </button>
            <button
              onClick={fetchJoinRequests}
              className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
            >
              Просмотреть запросы
            </button>
          </>
        ) : (
          <button
            onClick={handleLeaveRoom}
            className="bg-orange-500 text-white px-3 py-1 rounded hover:bg-orange-600"
          >
            Покинуть комнату
          </button>
        )}
      </div>

      {editRoomMode && (
        <div className="mb-4 p-4 bg-white border rounded shadow">
          <h2 className="font-semibold mb-2">Редактировать описание комнаты</h2>
          <textarea
            name="description"
            value={roomForm.description}
            onChange={handleRoomFormChange}
            className="border p-2 w-full mb-2"
            rows={4}
          />
          <div className="flex items-center mb-2">
            <label htmlFor="is_public" className="mr-2">
              Публичная
            </label>
            <input
              type="checkbox"
              name="is_public"
              checked={roomForm.is_public}
              onChange={handleRoomFormChange}
              id="is_public"
            />
          </div>
          <button
            onClick={handleSaveRoom}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Сохранить
          </button>
          <button
            onClick={() => setEditRoomMode(false)}
            className="bg-gray-300 text-black px-4 py-2 rounded ml-2"
          >
            Отмена
          </button>
        </div>
      )}

      {showJoinRequests && (
        <div className="mb-4 p-4 bg-white border rounded shadow">
          <h2 className="font-semibold mb-2">Запросы на вступление</h2>
          {joinRequests.length === 0 && <div className="text-sm text-gray-500">Нет запросов</div>}
          {joinRequests.map((req) => (
            <div key={req.id} className="flex justify-between items-center p-2 border-b">
              <div>
                <div className="font-semibold">{req.username}</div>
                {req.message && <div className="text-sm text-gray-500">{req.message}</div>}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleJoinRequestAction(req.id, true)}
                  className="bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 text-sm"
                >
                  Принять
                </button>
                <button
                  onClick={() => handleJoinRequestAction(req.id, false)}
                  className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 text-sm"
                >
                  Отклонить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-1 gap-6">
        <section className="flex-1 flex flex-col max-w-[78%]">
          <h2 className="text-lg font-semibold mb-2">Сообщения</h2>
          <div
            className="flex-1 space-y-3 overflow-y-auto p-3 border rounded bg-white"
            style={{ maxHeight: '62vh' }}
          >
            {messages.map((m) => {
              const isMyMessage = m.user_id === user.id;
              return (
                <div
                  key={m.id}
                  className={`p-3 rounded-lg shadow ${
                    isMyMessage
                      ? 'bg-blue-100/80 border-l-4 border-blue-400'
                      : 'bg-gray-100/80 border-l-4 border-gray-300'
                  }`}
                  style={{
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                    maxWidth: '100%',
                  }}
                >
                  <div className="flex justify-between items-center text-sm text-gray-600 mb-1">
                    <span className="font-bold text-base">{m.username}</span>
                    <span className="text-sm">
                      {new Date(m.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {m.edited ? ' (ред.)' : ''}
                    </span>
                  </div>

                  {editingMessageId === m.id ? (
                    <div className="mt-1 flex gap-2">
                      <input
                        value={editedMessage}
                        onChange={(e) => setEditedMessage(e.target.value)}
                        className="border p-1 rounded w-full"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleEditMessage(m.id);
                          }
                        }}
                      />
                      <button
                        onClick={() => handleEditMessage(m.id)}
                        className="bg-blue-600 text-white px-2 rounded hover:bg-blue-700"
                      >
                        Сохранить
                      </button>
                      <button
                        onClick={() => setEditingMessageId(null)}
                        className="bg-gray-300 px-2 rounded"
                      >
                        Отмена
                      </button>
                    </div>
                  ) : (
                    <div className="mt-1 text-[16px] leading-relaxed">{m.content}</div>
                  )}

                  {isMyMessage && editingMessageId !== m.id && (
                    <div className="flex gap-2 mt-1 text-sm text-gray-500">
                      <button
                        onClick={() => {
                          setEditingMessageId(m.id);
                          setEditedMessage(m.content);
                        }}
                      >
                        Редактировать
                      </button>
                      <button onClick={() => handleDeleteMessage(m.id)}>Удалить</button>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <section className="mt-3 flex flex-col">
            <textarea
              placeholder="Написать сообщение..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="border p-2 rounded w-full mb-2"
              rows={3}
            />
            <button
              onClick={handleSendMessage}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Отправить
            </button>
          </section>
        </section>

        <aside className="w-80 flex-shrink-0">
          <h2 className="text-lg font-semibold mb-2">Участники</h2>
          <div className="mb-2 text-sm text-gray-500">
            Создатель: {users?.find((u) => u.id === room?.created_by)?.username || 'Не найден'}
          </div>
          <ul className="flex flex-col gap-2 overflow-y-auto max-h-[62vh]">
            {users?.map((u) => (
              <li
                key={u.id}
                className="bg-white p-2 rounded shadow text-base flex justify-between items-center"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isUserOnline(u.id) ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                    title={isUserOnline(u.id) ? 'Онлайн' : 'Офлайн'}
                  />
                  <span className="font-medium">{u.username}</span>
                  {u.id === room?.created_by && (
                    <span
                      className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded"
                      title="Создатель комнаты"
                    >
                      👑
                    </span>
                  )}
                </div>
                {isOwner && u.id !== user.id && (
                  <button
                    onClick={() => handleRemoveUser(u.id)}
                    className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 text-xs"
                    title="Удалить из комнаты"
                  >
                    Удалить
                  </button>
                )}
              </li>
            ))}
          </ul>

          <div className="mt-3 text-sm text-gray-500">
            Онлайн: {Array.from(onlineUsers).length} из {users.length}
          </div>
        </aside>
      </div>
    </div>
  );
}
