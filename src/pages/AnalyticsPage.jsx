import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { analyticsApi } from '../api/analytics';

const SimpleBarChart = ({ data, title, color = 'blue' }) => {
  const maxValue = Math.max(...data.map((item) => item.value));

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="font-semibold mb-4">{title}</h3>
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center">
            <span className="w-32 text-sm truncate">{item.label}</span>
            <div className="flex-1 ml-2">
              <div
                className={`h-6 rounded bg-${color}-500 transition-all duration-500`}
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              ></div>
            </div>
            <span className="ml-2 text-sm font-medium w-12 text-right">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const StatCard = ({ title, value, subtitle, icon, color = 'blue' }) => (
  <div className={`bg-white p-6 rounded-lg shadow border-l-4 border-${color}-500`}>
    <div className="flex items-center">
      <div className={`p-3 rounded-full bg-${color}-100 text-${color}-600`}>{icon}</div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
  </div>
);

export default function AnalyticsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const [userActivity, setUserActivity] = useState(null);
  const [topRooms, setTopRooms] = useState([]);
  const [topUsers, setTopUsers] = useState([]);
  const [messageStats, setMessageStats] = useState(null);
  const [retentionRate, setRetentionRate] = useState(0);
  const [messagesPerMinute, setMessagesPerMinute] = useState({});
  const [roomNames, setRoomNames] = useState({});

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      const [activityRes, topRoomsRes, topUsersRes, messageStatsRes, retentionRes] =
        await Promise.all([
          analyticsApi.getUserActivity(user.id),
          analyticsApi.getTopActiveRooms(10),
          analyticsApi.getTopSocialUsers(10),
          analyticsApi.getMessageEditDeleteRatio(),
          analyticsApi.getUserRetention(30),
        ]);

      setUserActivity(activityRes.data);
      setTopRooms(topRoomsRes.data);
      setTopUsers(topUsersRes.data);
      setMessageStats(messageStatsRes.data);
      setRetentionRate(retentionRes.data);

      const roomMessages = {};
      const namesMap = {};

      for (let room of topRoomsRes.data.slice(0, 3)) {
        try {
          namesMap[room.room_id] = `Комната ${room.room_id}`;

          const messagesRes = await analyticsApi.getMessagesPerMinute(room.room_id, 60);
          roomMessages[room.room_id] = messagesRes.data;
        } catch (err) {
          console.error(`Ошибка загрузки данных для комнаты ${room.room_id}:`, err);
        }
      }

      setMessagesPerMinute(roomMessages);
      setRoomNames(namesMap);
    } catch (err) {
      console.error('Ошибка загрузки аналитики:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка аналитики...</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const correctedMessageStats = messageStats
    ? {
        edit_ratio: Math.min(messageStats.edit_ratio * 100, 100),
        delete_ratio: Math.min(messageStats.delete_ratio * 100, 100),
      }
    : null;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Аналитика платформы</h1>
              <p className="text-gray-600">Статистика и метрики в реальном времени</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/me')}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                ← К комнатам
              </button>
              <button
                onClick={logout}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {['overview', 'users', 'messages'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'overview' && 'Обзор'}
                {tab === 'users' && 'Пользователи'}
                {tab === 'messages' && 'Сообщения'}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <StatCard
                title="Сообщений отправлено"
                value={userActivity?.messages || 0}
                subtitle="за все время"
                icon="💬"
                color="blue"
              />
              <StatCard
                title="Ретеншн пользователей"
                value={`${retentionRate.toFixed(1)}%`}
                subtitle="за 30 дней"
                icon="📊"
                color="purple"
              />
              <StatCard
                title="Активных комнат"
                value={topRooms.length}
                subtitle="в топе"
                icon="🚀"
                color="orange"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Топ комнат по активности</h2>
                <div className="space-y-4">
                  {topRooms.slice(0, 5).map((room, index) => (
                    <div
                      key={room.room_id}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 rounded"
                    >
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                          {index + 1}
                        </div>
                        <div className="ml-3">
                          <p className="font-medium">
                            {roomNames[room.room_id] || `Комната ${room.room_id.slice(0, 8)}`}
                          </p>
                          <p className="text-sm text-gray-500">
                            {room.users_amount} пользователей • Обновлено{' '}
                            {formatDate(room.last_updated)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{room.total_messages}</p>
                        <p className="text-sm text-gray-500">сообщений</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Статистика сообщений</h2>
                {correctedMessageStats && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                      <span>Соотношение редактирования</span>
                      <span className="font-bold text-blue-600">
                        {Math.round(100 - correctedMessageStats.edit_ratio)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                      <span>Соотношение удаления</span>
                      <span className="font-bold text-red-600">
                        {Math.round(100 - correctedMessageStats.delete_ratio)}%
                      </span>
                    </div>
                    <div className="mt-4 p-3 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600">
                        Из всех отправленных сообщений редактируется{' '}
                        <strong>{Math.round(100 - correctedMessageStats.edit_ratio)}%</strong> и
                        удаляется{' '}
                        <strong> {Math.round(100 - correctedMessageStats.delete_ratio)}%</strong>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SimpleBarChart
                title="Топ пользователей по комнатам"
                data={topUsers.slice(0, 8).map((user) => ({
                  label: `Пользователь ${user.user_id?.slice(0, 8) || 'Unknown'}...`,
                  value: user.rooms,
                }))}
                color="purple"
              />
              <SimpleBarChart
                title="Топ пользователей по сообщениям"
                data={topUsers.slice(0, 8).map((user) => ({
                  label: `Пользователь ${user.user_id?.slice(0, 8) || 'Unknown'}...`,
                  value: user.messages,
                }))}
                color="orange"
              />
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-xl font-semibold">Самые социальные пользователи</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {topUsers.map((user, index) => (
                    <div
                      key={user.user_id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                          {index + 1}
                        </div>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          ID: {user.user_id?.slice(0, 8)}...
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Комнат:</span>
                          <span className="font-semibold">{user.rooms}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Сообщений:</span>
                          <span className="font-semibold">{user.messages}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Активность:</span>
                          <span className="font-semibold text-green-600">Высокая</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Распределение сообщений</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Всего сообщений</span>
                    <span className="font-bold text-lg">
                      {topRooms.reduce((sum, room) => sum + room.total_messages, 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Среднее на комнату</span>
                    <span className="font-bold text-lg">
                      {Math.round(
                        topRooms.reduce((sum, room) => sum + room.total_messages, 0) /
                          topRooms.length,
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Максимум в комнате</span>
                    <span className="font-bold text-lg">
                      {Math.max(...topRooms.map((room) => room.total_messages))}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Темпы отправки сообщений</h2>
                <div className="space-y-3">
                  {Object.entries(messagesPerMinute)
                    .slice(0, 3)
                    .map(([roomId, count]) => (
                      <div
                        key={roomId}
                        className="flex justify-between items-center p-2 hover:bg-gray-50 rounded"
                      >
                        <span className="text-sm">
                          {roomNames[roomId] || `Комната ${roomId.slice(0, 8)}`}
                        </span>
                        <div className="text-right">
                          <span className="font-semibold">{count}</span>
                          <span className="text-xs text-gray-500 ml-1">сообщ/час</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
