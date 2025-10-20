import { useEffect, useState } from 'react';
import { roomsApi } from '../api/rooms';
import { useAuth } from '../context/AuthContext';
import { notificationsApi } from '../api/notifications';
import { useNavigate } from 'react-router-dom';

export default function RoomsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [myRooms, setMyRooms] = useState([]);
  const [topRooms, setTopRooms] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchText, setSearchText] = useState('');

  const [joinMessageRoom, setJoinMessageRoom] = useState({ search: null, top: null });
  const [joinMessage, setJoinMessage] = useState({ search: '', top: '' });

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_public: true,
  });

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await notificationsApi.getAll();
      const formattedNotifications = res.data.map((notif) => {
        const roomName = notif.payload?.room_name || 'Не указано';
        const username = notif.payload?.username || 'Неизвестный пользователь';
        let message = '';

        switch (notif.type) {
          case 'JOIN_REQUEST_CREATED':
            message = `Запрос на вступление в комнату: ${roomName}`;
            break;
          case 'JOIN_REQUEST_ACCEPTED':
            message = `Ваш запрос на вступление в комнату ${roomName} был принят.`;
            break;
          case 'JOIN_REQUEST_REJECTED':
            message = `Ваш запрос на вступление в комнату ${roomName} был отклонен.`;
            break;
          default:
            message = `Новое уведомление: ${notif.type}`;
            break;
        }

        return { ...notif, message };
      });

      setNotifications(formattedNotifications);
    } catch (err) {
      console.error('Ошибка при загрузке уведомлений:', err);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await notificationsApi.getUnreadCount();
      setUnreadCount(res.data.unread_count);
    } catch (err) {
      setError('Ошибка при получении количества уведомлений');
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationsApi.markAsRead(notificationId);
      fetchNotifications();
    } catch (err) {
      console.error('Ошибка при отметке уведомления как прочитанное:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      fetchNotifications();
      fetchUnreadCount();
    } catch (err) {
      setError(err.customMessage || 'Ошибка при отметке всех уведомлений');
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      await notificationsApi.delete(notificationId);
      fetchNotifications();
    } catch (err) {
      setError(err.customMessage || 'Ошибка при удалении уведомления');
    }
  };

  const fetchMyRooms = async () => {
    const res = await roomsApi.getAll();
    setMyRooms(res.data);
  };

  const fetchTopRooms = async () => {
    const res = await roomsApi.getTop();
    setTopRooms(res.data);
  };

  const fetchJoinRequests = async () => {
    const res = await roomsApi.getJoinRequestsByUser();
    setJoinRequests(res.data);
  };

  const fetchAllData = async () => {
    try {
      const [myRes, topRes, reqRes] = await Promise.all([
        roomsApi.getAll(),
        roomsApi.getTop(),
        roomsApi.getJoinRequestsByUser(),
      ]);
      setMyRooms(myRes.data);
      setTopRooms(topRes.data);
      setJoinRequests(reqRes.data);
    } catch (err) {
      setError(err.customMessage || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    fetchNotifications();
    fetchUnreadCount();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await roomsApi.create(formData);
      await Promise.all([fetchMyRooms(), fetchTopRooms()]);
      setFormData({ name: '', description: '', is_public: true });
      setShowCreateForm(false);
    } catch (err) {
      setError(err.customMessage || 'Ошибка при создании комнаты');
    }
  };

  const handleJoin = async (roomId, message = null) => {
    try {
      await roomsApi.sendJoinRequest({ room_id: roomId, message });
      await Promise.all([fetchMyRooms(), fetchJoinRequests()]);
    } catch (err) {
      alert(err.customMessage || 'Ошибка при отправке запроса');
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchText.trim()) return;
    try {
      const res = await roomsApi.search(searchText);
      setSearchResults(res.data);
    } catch (err) {
      setError(err.customMessage || 'Ошибка при поиске комнат');
    }
  };

  if (loading) return <div className="text-center mt-10 text-gray-500">Загрузка...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Привет, {user?.username || 'пользователь'} 👋</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/analytics')}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
          >
            Аналитика
          </button>
          <button
            onClick={logout}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Выйти
          </button>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Уведомления
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 bg-red-600 text-white text-xs rounded-full px-2 py-1">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {showNotifications && (
        <div className="absolute top-16 right-6 w-80 bg-white shadow-lg rounded-md p-4 max-h-96 overflow-y-auto">
          <h3 className="font-semibold text-lg mb-3">Уведомления</h3>
          {notifications.length === 0 ? (
            <p className="text-gray-500">Нет уведомлений</p>
          ) : (
            <ul className="space-y-2">
              {notifications.map((notif) => (
                <li key={notif.id} className="flex justify-between items-center">
                  <div>
                    <p className="text-sm">{notif.message}</p>
                    <p className="text-xs text-gray-500">{notif.created_at}</p>
                  </div>
                  <div className="flex gap-2">
                    {!notif.read && (
                      <button
                        onClick={() => handleMarkAsRead(notif.id)}
                        className="text-blue-600 text-xs"
                      >
                        Прочитать
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteNotification(notif.id)}
                      className="text-red-600 text-xs"
                    >
                      Удалить
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {notifications.length > 0 && (
            <button onClick={handleMarkAllAsRead} className="text-blue-600 text-xs mt-4">
              Отметить все как прочитанные
            </button>
          )}
        </div>
      )}

      {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-4 text-sm">{error}</div>}

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Поиск комнаты..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="border p-2 rounded w-full"
        />
        <button type="submit" className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700">
          Искать
        </button>
      </form>

      {searchResults.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Результаты поиска</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchResults.map((room) => {
              const isInMyRooms = myRooms.some((r) => r.id === room.id);
              const isJoinMessageRoom = joinMessageRoom.search === room.id;
              return (
                <div key={room.id} className="bg-white p-4 rounded shadow">
                  <h3 className="font-bold text-lg">{room.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{room.description || 'Без описания'}</p>
                  <div className="flex justify-between items-center text-sm">
                    <span>
                      👥 {room.participants_count} | {room.is_public ? 'Публичная' : 'Приватная'}
                    </span>

                    {isInMyRooms ? (
                      <span className="text-gray-500 text-sm">Вы уже состоите в группе</span>
                    ) : room.is_public ? (
                      <button
                        onClick={() => handleJoin(room.id)}
                        className="text-green-600 hover:underline"
                      >
                        Присоединиться
                      </button>
                    ) : isJoinMessageRoom ? (
                      <div className="w-full mt-2">
                        <textarea
                          placeholder="Сообщение владельцу..."
                          value={joinMessage.search}
                          onChange={(e) =>
                            setJoinMessage((prev) => ({ ...prev, search: e.target.value }))
                          }
                          className="border p-2 rounded w-full mb-2 text-sm"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              handleJoin(room.id, joinMessage.search);
                              setJoinMessage((prev) => ({ ...prev, search: '' }));
                              setJoinMessageRoom((prev) => ({ ...prev, search: null }));
                            }}
                            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                          >
                            Отправить
                          </button>
                          <button
                            onClick={() =>
                              setJoinMessageRoom((prev) => ({ ...prev, search: null }))
                            }
                            className="bg-gray-300 px-3 py-1 rounded"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setJoinMessageRoom((prev) => ({ ...prev, search: room.id }))}
                        className="text-green-600 hover:underline"
                      >
                        Отправить запрос
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-semibold">Мои комнаты</h2>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
          >
            {showCreateForm ? 'Отмена' : 'Создать комнату'}
          </button>
        </div>

        {showCreateForm && (
          <form
            onSubmit={handleCreate}
            className="bg-white p-4 rounded shadow mb-4 space-y-2 w-full md:w-96"
          >
            <input
              type="text"
              placeholder="Название"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="border p-2 rounded w-full"
              required
              maxLength={32}
            />
            <textarea
              placeholder="Описание"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="border p-2 rounded w-full"
            />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_public}
                onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
              />
              Публичная
            </label>
            <button
              type="submit"
              className="bg-blue-600 text-white w-full py-2 rounded hover:bg-blue-700"
            >
              Создать
            </button>
          </form>
        )}

        {myRooms.length === 0 ? (
          <p className="text-gray-500">У вас нет комнат</p>
        ) : (
          <div className="max-h-[720px] overflow-y-auto border p-2 rounded">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myRooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => (window.location.href = `/room/${room.id}`)}
                  className="bg-white p-4 rounded shadow cursor-pointer hover:shadow-lg transition-shadow duration-200"
                >
                  <h3 className="font-bold text-lg">{room.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{room.description || 'Без описания'}</p>
                  <div className="flex justify-between text-sm items-center text-gray-500">
                    <span>
                      👥 {room.participants_count} | {room.is_public ? 'Публичная' : 'Приватная'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Популярные комнаты</h2>
        {topRooms.length === 0 ? (
          <p className="text-gray-500">Нет публичных комнат</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topRooms.map((room) => {
              const isInMyRooms = myRooms.some((r) => r.id === room.id);
              const isJoinMessageRoom = joinMessageRoom.top === room.id;
              return (
                <div key={room.id} className="bg-white p-4 rounded shadow">
                  <h3 className="font-bold text-lg">{room.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{room.description || 'Без описания'}</p>
                  <div className="flex justify-between items-center text-sm">
                    <span>
                      👥 {room.participants_count} | {room.is_public ? 'Публичная' : 'Приватная'}
                    </span>
                    {isInMyRooms ? (
                      <span className="text-gray-500 text-sm">Вы уже состоите в группе</span>
                    ) : room.is_public ? (
                      <button
                        onClick={() => handleJoin(room.id)}
                        className="text-green-600 hover:underline"
                      >
                        Присоединиться
                      </button>
                    ) : isJoinMessageRoom ? (
                      <div className="w-full mt-2">
                        <textarea
                          placeholder="Сообщение владельцу..."
                          value={joinMessage.top}
                          onChange={(e) =>
                            setJoinMessage((prev) => ({ ...prev, top: e.target.value }))
                          }
                          className="border p-2 rounded w-full mb-2 text-sm"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              handleJoin(room.id, joinMessage.top);
                              setJoinMessage((prev) => ({ ...prev, top: '' }));
                              setJoinMessageRoom((prev) => ({ ...prev, top: null }));
                            }}
                            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                          >
                            Отправить
                          </button>
                          <button
                            onClick={() => setJoinMessageRoom((prev) => ({ ...prev, top: null }))}
                            className="bg-gray-300 px-3 py-1 rounded"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setJoinMessageRoom((prev) => ({ ...prev, top: room.id }))}
                        className="text-green-600 hover:underline"
                      >
                        Отправить запрос
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Мои запросы на вступление</h2>
        {joinRequests.length === 0 ? (
          <p className="text-gray-500">У вас нет активных запросов на вступление</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {joinRequests.map((request) => (
              <div key={request.id} className="bg-white p-4 rounded shadow">
                <h3 className="font-bold text-lg">{request.room_name}</h3>
                <p className="text-sm text-gray-600 mb-2">
                  {request.message || 'Без дополнительного сообщения'}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
