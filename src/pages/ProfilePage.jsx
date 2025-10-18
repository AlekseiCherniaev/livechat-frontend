import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [error, setError] = useState(null);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка выхода');
    }
  };

  if (!user) return <div>Загрузка...</div>;

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 space-y-4">
      <h1 className="text-2xl font-bold">Профиль</h1>
      {error && <div className="text-red-600">{error}</div>}

      <div className="bg-white p-6 rounded-2xl shadow-lg w-80 space-y-2">
        <p>
          <strong>Имя пользователя:</strong> {user.usernamestring || user.username}
        </p>
        <p>
          <strong>Дата создания:</strong> {new Date(user.created_at).toLocaleString()}
        </p>
        <p>
          <strong>Последний вход:</strong>{' '}
          {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Нет данных'}
        </p>
      </div>

      <button
        onClick={handleLogout}
        className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700"
      >
        Выйти
      </button>
    </div>
  );
}
